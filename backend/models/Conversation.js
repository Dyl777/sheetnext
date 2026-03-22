import pool from '../database/db.js';

export const conversationModel = {
  async create(userId, name, systemPrompt = null, settings = {}) {
    const result = await pool.query(
      `INSERT INTO conversations (user_id, name, system_prompt, settings) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, name, systemPrompt, JSON.stringify(settings)]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByUserId(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM conversations 
       WHERE user_id = $1 AND is_archived = false 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  async update(id, updates) {
    const allowedFields = ['name', 'system_prompt', 'settings', 'metadata', 'is_archived'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(key === 'settings' || key === 'metadata' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE conversations SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async archive(id) {
    return this.update(id, { is_archived: true });
  }
};

export const messageModel = {
  async create(conversationId, role, content, metadata = {}, toolCalls = null) {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, role, content, metadata, tool_calls) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversationId, role, content, JSON.stringify(metadata), toolCalls ? JSON.stringify(toolCalls) : null]
    );
    
    // Update conversation updated_at
    await pool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );
    
    return result.rows[0];
  },

  async findByConversationId(conversationId, limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);
    return result.rows[0];
  },

  async update(id, content, metadata = {}) {
    const result = await pool.query(
      `UPDATE messages SET content = $1, metadata = $2 
       WHERE id = $3 RETURNING *`,
      [content, JSON.stringify(metadata), id]
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM messages WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  async deleteByConversationId(conversationId) {
    const result = await pool.query(
      'DELETE FROM messages WHERE conversation_id = $1',
      [conversationId]
    );
    return result.rowCount;
  }
};
