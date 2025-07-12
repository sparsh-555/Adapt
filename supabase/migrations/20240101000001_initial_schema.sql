-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create behavior_events table
CREATE TABLE IF NOT EXISTS public.behavior_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    form_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN (
            'mouse_move', 'mouse_click', 'key_press', 'scroll', 
            'focus', 'blur', 'form_submit', 'field_change'
        )
    ),
    field_name VARCHAR(255),
    timestamp BIGINT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_agent TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create adaptations table
CREATE TABLE IF NOT EXISTS public.adaptations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    form_id VARCHAR(255) NOT NULL,
    adaptation_type VARCHAR(50) NOT NULL CHECK (
        adaptation_type IN (
            'field_reorder', 'progressive_disclosure', 
            'context_switching', 'error_prevention'
        )
    ),
    config JSONB NOT NULL,
    applied_at BIGINT NOT NULL,
    performance_impact JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE NOT NULL,
    behavior_type VARCHAR(50) CHECK (
        behavior_type IN (
            'fast_user', 'methodical_user', 'mobile_user', 
            'desktop_user', 'error_prone'
        )
    ),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavior_events_session_id ON public.behavior_events(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_form_id ON public.behavior_events(form_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_timestamp ON public.behavior_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_behavior_events_event_type ON public.behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_behavior_events_created_at ON public.behavior_events(created_at);

CREATE INDEX IF NOT EXISTS idx_adaptations_session_id ON public.adaptations(session_id);
CREATE INDEX IF NOT EXISTS idx_adaptations_form_id ON public.adaptations(form_id);
CREATE INDEX IF NOT EXISTS idx_adaptations_type ON public.adaptations(adaptation_type);
CREATE INDEX IF NOT EXISTS idx_adaptations_applied_at ON public.adaptations(applied_at);

CREATE INDEX IF NOT EXISTS idx_user_profiles_session_id ON public.user_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_behavior_type ON public.user_profiles(behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_confidence ON public.user_profiles(confidence_score);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_behavior_events_session_form ON public.behavior_events(session_id, form_id);
CREATE INDEX IF NOT EXISTS idx_adaptations_session_form ON public.adaptations(session_id, form_id);

-- Create JSONB indexes for faster queries on JSON data
CREATE INDEX IF NOT EXISTS idx_behavior_events_data_gin ON public.behavior_events USING gin(data);
CREATE INDEX IF NOT EXISTS idx_adaptations_config_gin ON public.adaptations USING gin(config);
CREATE INDEX IF NOT EXISTS idx_user_profiles_characteristics_gin ON public.user_profiles USING gin(characteristics);

-- Enable Row Level Security (RLS)
ALTER TABLE public.behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for behavior_events
CREATE POLICY "behavior_events_insert_policy" ON public.behavior_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "behavior_events_select_policy" ON public.behavior_events
    FOR SELECT USING (true);

-- Create RLS policies for adaptations
CREATE POLICY "adaptations_insert_policy" ON public.adaptations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "adaptations_select_policy" ON public.adaptations
    FOR SELECT USING (true);

-- Create RLS policies for user_profiles
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
    FOR UPDATE USING (true);

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions to anon users (for public API access)
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT, SELECT ON public.behavior_events TO anon;
GRANT INSERT, SELECT ON public.adaptations TO anon;
GRANT INSERT, SELECT, UPDATE ON public.user_profiles TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM NOW()) * 1000;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up old behavior events (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_behavior_events()
RETURNS void AS $$
BEGIN
    DELETE FROM public.behavior_events 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- Create function to get session summary
CREATE OR REPLACE FUNCTION public.get_session_summary(session_uuid UUID)
RETURNS TABLE (
    session_id UUID,
    total_events BIGINT,
    unique_forms BIGINT,
    session_duration_ms BIGINT,
    adaptations_applied BIGINT,
    user_behavior_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        be.session_id,
        COUNT(be.id) as total_events,
        COUNT(DISTINCT be.form_id) as unique_forms,
        COALESCE(MAX(be.timestamp) - MIN(be.timestamp), 0) as session_duration_ms,
        COUNT(DISTINCT a.id) as adaptations_applied,
        COALESCE(up.behavior_type, 'unknown') as user_behavior_type
    FROM public.behavior_events be
    LEFT JOIN public.adaptations a ON a.session_id = be.session_id
    LEFT JOIN public.user_profiles up ON up.session_id = be.session_id
    WHERE be.session_id = session_uuid
    GROUP BY be.session_id, up.behavior_type;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE public.behavior_events IS 'Stores all user behavior events during form interactions';
COMMENT ON TABLE public.adaptations IS 'Stores form adaptations applied to improve user experience';
COMMENT ON TABLE public.user_profiles IS 'Stores behavioral classification and characteristics for each session';

COMMENT ON COLUMN public.behavior_events.session_id IS 'Unique identifier for user session';
COMMENT ON COLUMN public.behavior_events.form_id IS 'Identifier for the form being tracked';
COMMENT ON COLUMN public.behavior_events.event_type IS 'Type of user interaction event';
COMMENT ON COLUMN public.behavior_events.data IS 'Additional event data in JSON format';
COMMENT ON COLUMN public.behavior_events.timestamp IS 'Unix timestamp in milliseconds when event occurred';

COMMENT ON COLUMN public.adaptations.adaptation_type IS 'Type of adaptation applied to the form';
COMMENT ON COLUMN public.adaptations.config IS 'Configuration parameters for the adaptation';
COMMENT ON COLUMN public.adaptations.applied_at IS 'Unix timestamp in milliseconds when adaptation was applied';

COMMENT ON COLUMN public.user_profiles.behavior_type IS 'Classified user behavior pattern';
COMMENT ON COLUMN public.user_profiles.confidence_score IS 'Confidence level in the behavioral classification (0-1)';
COMMENT ON COLUMN public.user_profiles.characteristics IS 'Detailed behavioral characteristics in JSON format';