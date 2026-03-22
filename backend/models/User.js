import pool from '../database/db.js';

export const userModel = {
  async create(email, passwordHash, name = null) {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
      [email, passwordHash, name]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async updateGroqApiKey(userId, groqApiKey) {
    const result = await pool.query(
      'UPDATE users SET groq_api_key = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [groqApiKey, userId]
    );
    return result.rows[0];
  },

  async updateLlamaServerUrl(userId, url) {
    const result = await pool.query(
      'UPDATE users SET llama_server_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [url, userId]
    );
    return result.rows[0];
  },

  async updateLastLogin(userId) {
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }
};
