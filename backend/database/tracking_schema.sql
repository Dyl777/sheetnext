-- User Tracking and Audio Recording Tables

-- Tracking sessions table
CREATE TABLE IF NOT EXISTS tracking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    window_width INTEGER,
    window_height INTEGER,
    total_movements INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_scrolls INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_user_id ON tracking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_start_time ON tracking_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_active ON tracking_sessions(is_active);

-- Tracking events table (movements, clicks, scrolls)
CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('movement', 'click', 'scroll')),
    x_coordinate INTEGER,
    y_coordinate INTEGER,
    element_tag VARCHAR(100),
    element_class TEXT,
    element_id VARCHAR(255),
    scroll_x INTEGER,
    scroll_y INTEGER,
    event_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(event_timestamp);

-- Audio recordings table
CREATE TABLE IF NOT EXISTS audio_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) DEFAULT 'audio/webm',
    file_size INTEGER,
    duration INTEGER, -- in milliseconds
    transcript TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audio_recordings_user_id ON audio_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_created_at ON audio_recordings(created_at DESC);

-- Function to update updated_at for audio recordings
CREATE TRIGGER update_audio_recordings_updated_at 
    BEFORE UPDATE ON audio_recordings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View for session statistics
CREATE OR REPLACE VIEW tracking_session_stats AS
SELECT 
    ts.id AS session_id,
    ts.user_id,
    ts.start_time,
    ts.end_time,
    EXTRACT(EPOCH FROM (COALESCE(ts.end_time, NOW()) - ts.start_time)) / 60 AS duration_minutes,
    ts.total_movements,
    ts.total_clicks,
    ts.total_scrolls,
    ts.is_active,
    COUNT(te.id) AS total_events
FROM tracking_sessions ts
LEFT JOIN tracking_events te ON ts.id = te.session_id
GROUP BY ts.id, ts.user_id, ts.start_time, ts.end_time, ts.total_movements, ts.total_clicks, ts.total_scrolls, ts.is_active;

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    COUNT(DISTINCT ts.id) AS total_sessions,
    SUM(ts.total_movements) AS total_movements,
    SUM(ts.total_clicks) AS total_clicks,
    SUM(ts.total_scrolls) AS total_scrolls,
    COUNT(DISTINCT ar.id) AS total_recordings,
    SUM(ar.duration) / 1000 AS total_recording_seconds
FROM users u
LEFT JOIN tracking_sessions ts ON u.id = ts.user_id
LEFT JOIN audio_recordings ar ON u.id = ar.user_id
GROUP BY u.id, u.email;
