-- AI Characteristics Database Schema

-- AI Characteristics table
CREATE TABLE IF NOT EXISTS ai_characteristics (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    icon VARCHAR(100) DEFAULT 'assistant',
    color VARCHAR(50) DEFAULT '#1890ff',
    is_default BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_characteristics_user_id ON ai_characteristics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_characteristics_custom ON ai_characteristics(is_custom);
CREATE INDEX IF NOT EXISTS idx_ai_characteristics_default ON ai_characteristics(is_default);

-- Trigger to update updated_at
CREATE TRIGGER update_ai_characteristics_updated_at 
    BEFORE UPDATE ON ai_characteristics
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View for user characteristics summary
CREATE OR REPLACE VIEW user_characteristics_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    COUNT(ac.id) AS total_characteristics,
    COUNT(CASE WHEN ac.is_default THEN 1 END) AS default_characteristics,
    COUNT(CASE WHEN ac.is_custom THEN 1 END) AS custom_characteristics
FROM users u
LEFT JOIN ai_characteristics ac ON u.id = ac.user_id
GROUP BY u.id, u.email;
