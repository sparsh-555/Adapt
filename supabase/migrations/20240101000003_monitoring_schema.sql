-- Create error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  error_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}',
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  user_agent TEXT,
  url TEXT,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_unit TEXT CHECK (metric_unit IN ('ms', 'bytes', 'count', 'percent')) NOT NULL,
  tags JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_name ON error_logs(error_name);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tags ON performance_metrics USING GIN(tags);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_session_timestamp ON error_logs(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_timestamp ON performance_metrics(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_timestamp ON performance_metrics(metric_name, timestamp);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for error logs
CREATE POLICY "Allow insert for error logs" ON error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for error logs" ON error_logs FOR SELECT USING (true);

-- Create policies for performance metrics
CREATE POLICY "Allow insert for performance metrics" ON performance_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for performance metrics" ON performance_metrics FOR SELECT USING (true);

-- Create a view for error statistics
CREATE OR REPLACE VIEW error_statistics AS
SELECT 
  session_id,
  COUNT(*) as total_errors,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_errors,
  COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_errors,
  COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_errors,
  COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_errors,
  MIN(timestamp) as first_error,
  MAX(timestamp) as last_error,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as error_timespan_seconds
FROM error_logs
GROUP BY session_id;

-- Create a view for performance statistics
CREATE OR REPLACE VIEW performance_statistics AS
SELECT 
  session_id,
  metric_name,
  metric_unit,
  COUNT(*) as measurement_count,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) as p99_value,
  MIN(timestamp) as first_measurement,
  MAX(timestamp) as last_measurement
FROM performance_metrics
GROUP BY session_id, metric_name, metric_unit;

-- Create function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_errors INTEGER;
  deleted_metrics INTEGER;
BEGIN
  -- Delete old error logs
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
  GET DIAGNOSTICS deleted_errors = ROW_COUNT;
  
  -- Delete old performance metrics
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
  GET DIAGNOSTICS deleted_metrics = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO error_logs (
    session_id, 
    error_name, 
    error_message, 
    severity, 
    timestamp, 
    context
  ) VALUES (
    'system',
    'monitoring_cleanup',
    FORMAT('Cleaned up %s error logs and %s metrics older than %s days', 
           deleted_errors, deleted_metrics, retention_days),
    'low',
    NOW(),
    jsonb_build_object(
      'deleted_errors', deleted_errors,
      'deleted_metrics', deleted_metrics,
      'retention_days', retention_days
    )
  );
  
  RETURN deleted_errors + deleted_metrics;
END;
$$ LANGUAGE plpgsql;

-- Create function to get session health score
CREATE OR REPLACE FUNCTION get_session_health_score(target_session_id TEXT)
RETURNS JSONB AS $$
DECLARE
  error_count INTEGER;
  critical_errors INTEGER;
  avg_response_time DOUBLE PRECISION;
  error_rate DOUBLE PRECISION;
  health_score DOUBLE PRECISION;
  grade TEXT;
BEGIN
  -- Get error counts
  SELECT 
    COALESCE(total_errors, 0),
    COALESCE(critical_errors, 0)
  INTO error_count, critical_errors
  FROM error_statistics 
  WHERE session_id = target_session_id;
  
  -- Get average response time
  SELECT COALESCE(AVG(metric_value), 0)
  INTO avg_response_time
  FROM performance_metrics
  WHERE session_id = target_session_id 
    AND metric_name = 'api_response_time';
  
  -- Calculate error rate (errors per minute)
  SELECT COALESCE(COUNT(*) / GREATEST(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60, 1), 0)
  INTO error_rate
  FROM error_logs
  WHERE session_id = target_session_id;
  
  -- Calculate health score (0-100)
  health_score := 100;
  
  -- Deduct points for errors
  health_score := health_score - (critical_errors * 20);
  health_score := health_score - (error_count * 2);
  
  -- Deduct points for slow response times
  IF avg_response_time > 1000 THEN
    health_score := health_score - 10;
  ELSIF avg_response_time > 500 THEN
    health_score := health_score - 5;
  END IF;
  
  -- Deduct points for high error rate
  IF error_rate > 10 THEN
    health_score := health_score - 15;
  ELSIF error_rate > 5 THEN
    health_score := health_score - 10;
  ELSIF error_rate > 1 THEN
    health_score := health_score - 5;
  END IF;
  
  -- Ensure score is between 0 and 100
  health_score := GREATEST(0, LEAST(100, health_score));
  
  -- Assign grade
  IF health_score >= 90 THEN
    grade := 'A';
  ELSIF health_score >= 80 THEN
    grade := 'B';
  ELSIF health_score >= 70 THEN
    grade := 'C';
  ELSIF health_score >= 60 THEN
    grade := 'D';
  ELSE
    grade := 'F';
  END IF;
  
  RETURN jsonb_build_object(
    'session_id', target_session_id,
    'health_score', health_score,
    'grade', grade,
    'error_count', error_count,
    'critical_errors', critical_errors,
    'avg_response_time', avg_response_time,
    'error_rate', error_rate,
    'calculated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update performance statistics
CREATE OR REPLACE FUNCTION update_performance_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh materialized views if they exist
  -- (These would be created separately for better performance)
  
  -- Log significant performance issues
  IF NEW.metric_name = 'api_response_time' AND NEW.metric_value > 5000 THEN
    INSERT INTO error_logs (
      session_id, 
      error_name, 
      error_message, 
      severity, 
      timestamp,
      context
    ) VALUES (
      NEW.session_id,
      'performance_issue',
      FORMAT('Slow API response: %s ms for %s', 
             NEW.metric_value, 
             COALESCE(NEW.tags->>'endpoint', 'unknown')),
      'medium',
      NEW.timestamp,
      jsonb_build_object(
        'metric_name', NEW.metric_name,
        'metric_value', NEW.metric_value,
        'tags', NEW.tags
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER performance_metrics_trigger
  AFTER INSERT ON performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_stats();

-- Grant permissions
GRANT ALL ON error_logs TO authenticated;
GRANT ALL ON performance_metrics TO authenticated;
GRANT SELECT ON error_statistics TO authenticated;
GRANT SELECT ON performance_statistics TO authenticated;

-- Add helpful comments
COMMENT ON TABLE error_logs IS 'Stores application errors and exceptions for monitoring and debugging';
COMMENT ON TABLE performance_metrics IS 'Stores performance metrics for monitoring application health';
COMMENT ON VIEW error_statistics IS 'Aggregated error statistics by session';
COMMENT ON VIEW performance_statistics IS 'Aggregated performance statistics by session and metric';
COMMENT ON FUNCTION cleanup_monitoring_data IS 'Cleans up old monitoring data based on retention period';
COMMENT ON FUNCTION get_session_health_score IS 'Calculates a health score for a session based on errors and performance';