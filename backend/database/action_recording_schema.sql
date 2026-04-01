-- Action Recording & Automation Database Schema

-- Action sessions table
CREATE TABLE IF NOT EXISTS action_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    session_name VARCHAR(500),
    auto_generated_name VARCHAR(500),
    auto_generated_by VARCHAR(100),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    action_count INTEGER DEFAULT 0,
    screenshot_count INTEGER DEFAULT 0,
    actions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_action_sessions_user_id ON action_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_action_sessions_session_id ON action_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_action_sessions_session_name ON action_sessions(session_name);
CREATE INDEX IF NOT EXISTS idx_action_sessions_start_time ON action_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_action_sessions_auto_name ON action_sessions(auto_generated_name);

-- Automation tasks table
CREATE TABLE IF NOT EXISTS automation_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'interval',
    actions JSONB DEFAULT '[]',
    schedule VARCHAR(100),
    interval INTEGER,
    enabled BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_tasks_user_id ON automation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_enabled ON automation_tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_next_run ON automation_tasks(next_run);

-- Automation rules table
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    trigger JSONB DEFAULT '{}',
    conditions JSONB DEFAULT '[]',
    actions JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);

-- LLM processed actions table (for RAG and training)
CREATE TABLE IF NOT EXISTS llm_processed_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    action_data JSONB DEFAULT '{}',
    llm_response JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    embedding VECTOR(384), -- For semantic search (requires pgvector)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_actions_user_id ON llm_processed_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_actions_session_id ON llm_processed_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_actions_tags ON llm_processed_actions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_llm_actions_embedding ON llm_processed_actions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger to update timestamps
CREATE TRIGGER update_automation_tasks_timestamp 
    BEFORE UPDATE ON automation_tasks
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View for task statistics
CREATE OR REPLACE VIEW automation_task_stats AS
SELECT 
    user_id,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN enabled THEN 1 END) as enabled_tasks,
    SUM(run_count) as total_runs,
    MAX(last_run) as last_run_time
FROM automation_tasks
GROUP BY user_id;

-- View for session statistics
CREATE OR REPLACE VIEW action_session_stats AS
SELECT 
    user_id,
    COUNT(*) as total_sessions,
    SUM(action_count) as total_actions,
    SUM(screenshot_count) as total_screenshots,
    AVG(duration) as avg_duration,
    MAX(start_time) as last_session
FROM action_sessions
GROUP BY user_id;

-- Function to cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_old_action_sessions(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM action_sessions 
    WHERE start_time < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get actions by tag
CREATE OR REPLACE FUNCTION get_llm_actions_by_tag(search_tags TEXT[])
RETURNS TABLE (
    id UUID,
    session_id VARCHAR,
    action_data JSONB,
    llm_response JSONB,
    tags TEXT[],
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT la.id, la.session_id, la.action_data, la.llm_response, la.tags, la.created_at
    FROM llm_processed_actions la
    WHERE la.tags && search_tags
    ORDER BY la.created_at DESC;
END;
$$ LANGUAGE plpgsql;
