-- Enable realtime for behavior tracking
BEGIN;

-- Remove the default publication
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create the supabase_realtime publication with specific configuration
CREATE PUBLICATION supabase_realtime 
WITH (publish = 'insert, update, delete');

-- Add behavior_events table to the publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.behavior_events;

-- Add adaptations table to the publication for real-time updates  
ALTER PUBLICATION supabase_realtime ADD TABLE public.adaptations;

-- Add user_profiles table to the publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;

COMMIT;

-- Create a function to broadcast changes to specific channels
CREATE OR REPLACE FUNCTION public.broadcast_adaptation_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast to session-specific channel
    PERFORM pg_notify(
        'adapt_session_' || NEW.session_id::text,
        json_build_object(
            'type', 'adaptation_applied',
            'session_id', NEW.session_id,
            'form_id', NEW.form_id,
            'adaptation_type', NEW.adaptation_type,
            'config', NEW.config,
            'applied_at', NEW.applied_at
        )::text
    );
    
    -- Broadcast to form-specific channel
    PERFORM pg_notify(
        'adapt_form_' || NEW.form_id,
        json_build_object(
            'type', 'form_adaptation',
            'session_id', NEW.session_id,
            'form_id', NEW.form_id,
            'adaptation_type', NEW.adaptation_type,
            'applied_at', NEW.applied_at
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for adaptation broadcasts
CREATE TRIGGER broadcast_adaptation_changes_trigger
    AFTER INSERT ON public.adaptations
    FOR EACH ROW
    EXECUTE FUNCTION public.broadcast_adaptation_changes();

-- Create a function to broadcast behavior events for real-time analysis
CREATE OR REPLACE FUNCTION public.broadcast_behavior_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Only broadcast certain event types to avoid spam
    IF NEW.event_type IN ('form_submit', 'field_change', 'focus', 'blur') THEN
        PERFORM pg_notify(
            'adapt_behavior_' || NEW.session_id::text,
            json_build_object(
                'type', 'behavior_event',
                'session_id', NEW.session_id,
                'form_id', NEW.form_id,
                'event_type', NEW.event_type,
                'field_name', NEW.field_name,
                'timestamp', NEW.timestamp
            )::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for behavior event broadcasts
CREATE TRIGGER broadcast_behavior_events_trigger
    AFTER INSERT ON public.behavior_events
    FOR EACH ROW
    EXECUTE FUNCTION public.broadcast_behavior_events();

-- Create a function to handle user profile updates with broadcasting
CREATE OR REPLACE FUNCTION public.broadcast_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast profile updates for real-time adaptation
    PERFORM pg_notify(
        'adapt_profile_' || NEW.session_id::text,
        json_build_object(
            'type', 'profile_updated',
            'session_id', NEW.session_id,
            'behavior_type', NEW.behavior_type,
            'confidence_score', NEW.confidence_score,
            'updated_at', NEW.updated_at
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile update broadcasts
CREATE TRIGGER broadcast_profile_updates_trigger
    AFTER INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.broadcast_profile_updates();

-- Create materialized view for real-time analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.realtime_form_analytics AS
SELECT 
    form_id,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) as submissions,
    COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END)::float / 
        NULLIF(COUNT(DISTINCT session_id), 0) as conversion_rate,
    AVG(
        CASE 
            WHEN event_type = 'form_submit' 
            THEN timestamp - (
                SELECT MIN(timestamp) 
                FROM public.behavior_events be2 
                WHERE be2.session_id = behavior_events.session_id 
                AND be2.form_id = behavior_events.form_id
            )
        END
    ) as avg_completion_time_ms,
    DATE_TRUNC('hour', created_at) as hour_bucket
FROM public.behavior_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY form_id, DATE_TRUNC('hour', created_at)
ORDER BY hour_bucket DESC;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_realtime_analytics_form_hour 
ON public.realtime_form_analytics(form_id, hour_bucket);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION public.refresh_realtime_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.realtime_form_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create a policy for realtime access
CREATE POLICY "realtime_access_policy" ON public.behavior_events
    FOR SELECT USING (true);

CREATE POLICY "realtime_access_policy" ON public.adaptations  
    FOR SELECT USING (true);

CREATE POLICY "realtime_access_policy" ON public.user_profiles
    FOR SELECT USING (true);

-- Grant realtime permissions
GRANT SELECT ON public.realtime_form_analytics TO authenticated, anon;

-- Create function to get active sessions for monitoring
CREATE OR REPLACE FUNCTION public.get_active_sessions(time_window_minutes integer DEFAULT 5)
RETURNS TABLE (
    session_id UUID,
    form_id VARCHAR(255),
    last_activity TIMESTAMPTZ,
    event_count BIGINT,
    behavior_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        be.session_id,
        be.form_id,
        MAX(be.created_at) as last_activity,
        COUNT(*) as event_count,
        COALESCE(up.behavior_type, 'unclassified') as behavior_type
    FROM public.behavior_events be
    LEFT JOIN public.user_profiles up ON up.session_id = be.session_id
    WHERE be.created_at >= NOW() - (time_window_minutes || ' minutes')::interval
    GROUP BY be.session_id, be.form_id, up.behavior_type
    HAVING MAX(be.created_at) >= NOW() - (time_window_minutes || ' minutes')::interval
    ORDER BY last_activity DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_active_sessions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.refresh_realtime_analytics TO authenticated, service_role;