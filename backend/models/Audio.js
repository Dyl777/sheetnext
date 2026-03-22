import pool from '../database/db.js';

export const audioModel = {
  // Create audio recording record
  async create(userId, recordingData) {
    const result = await pool.query(
      `INSERT INTO audio_recordings 
       (user_id, title, file_path, file_name, file_type, file_size, duration, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        userId,
        recordingData.title || 'Recording',
        recordingData.filePath,
        recordingData.fileName,
        recordingData.fileType || 'audio/webm',
        recordingData.fileSize,
        recordingData.duration,
        JSON.stringify(recordingData.metadata || {})
      ]
    );
    return result.rows[0];
  },

  // Get recording by ID
  async getById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM audio_recordings WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0];
  },

  // Get all recordings for user
  async getByUser(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM audio_recordings 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  // Update transcript
  async updateTranscript(id, transcript) {
    const result = await pool.query(
      'UPDATE audio_recordings SET transcript = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [transcript, id]
    );
    return result.rows[0];
  },

  // Update metadata
  async updateMetadata(id, metadata) {
    const result = await pool.query(
      'UPDATE audio_recordings SET metadata = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(metadata), id]
    );
    return result.rows[0];
  },

  // Delete recording
  async delete(id) {
    const result = await pool.query(
      'DELETE FROM audio_recordings WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
};
