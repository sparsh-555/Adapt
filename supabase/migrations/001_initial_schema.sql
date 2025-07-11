-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Behavior Events Table
CREATE TABLE behavior_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  form_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adaptations Table
CREATE TABLE adaptations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  form_id VARCHAR(255) NOT NULL,
  adaptation_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  performance_impact JSONB
);

-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID UNIQUE NOT NULL,
  behavior_type VARCHAR(50),
  confidence_score DECIMAL(3,2),
  characteristics JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form Metrics Table
CREATE TABLE form_metrics (
  id SERIAL PRIMARY KEY,
  form_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_sessions INTEGER,
  completed_sessions INTEGER,
  avg_completion_time INTERVAL,
  adaptations_applied INTEGER,
  conversion_improvement DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Results Table
CREATE TABLE ab_test_results (
  id SERIAL PRIMARY KEY,
  form_id VARCHAR(255) NOT NULL,
  variant VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  sample_size INTEGER NOT NULL,
  confidence_interval JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_behavior_events_session_id ON behavior_events(session_id);
CREATE INDEX idx_behavior_events_form_id ON behavior_events(form_id);
CREATE INDEX idx_behavior_events_timestamp ON behavior_events(timestamp);
CREATE INDEX idx_adaptations_session_id ON adaptations(session_id);
CREATE INDEX idx_adaptations_form_id ON adaptations(form_id);
CREATE INDEX idx_user_profiles_session_id ON user_profiles(session_id);
CREATE INDEX idx_form_metrics_form_id ON form_metrics(form_id);
CREATE INDEX idx_form_metrics_date ON form_metrics(date);

-- Enable Row Level Security
ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - will be refined later)
CREATE POLICY "Allow all operations on behavior_events" ON behavior_events FOR ALL USING (true);
CREATE POLICY "Allow all operations on adaptations" ON adaptations FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on form_metrics" ON form_metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations on ab_test_results" ON ab_test_results FOR ALL USING (true);