import pool from '../database/db.js';

export const trackingModel = {
  // Create new tracking session
  async createSession(userId, sessionData) {
    const result = await pool.query(
      `INSERT INTO tracking_sessions 
       (user_id, start_time, user_agent, screen_width, screen_height, window_width, window_height) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        userId,
        sessionData.startTime,
        sessionData.userAgent,
        sessionData.screenWidth,
        sessionData.screenHeight,
        sessionData.windowWidth,
        sessionData.windowHeight
      ]
    );
    return result.rows[0];
  },

  // Get session by ID
  async getSessionById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM tracking_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0];
  },

  // End session
  async endSession(id, endTime, stats) {
    const result = await pool.query(
      `UPDATE tracking_sessions 
       SET end_time = $1, 
           total_movements = $2, 
           total_clicks = $3, 
           total_scrolls = $4, 
           is_active = false 
       WHERE id = $5 
       RETURNING *`,
      [endTime, stats.totalMovements, stats.totalClicks, stats.totalScrolls, id]
    );
    return result.rows[0];
  },

  // Add events to session
  async addEvents(sessionId, events) {
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    events.forEach(event => {
      values.push(
        sessionId,
        event.type,
        event.x || null,
        event.y || null,
        event.elementTag || null,
        event.elementClass || null,
        event.elementId || null,
        event.scrollX || null,
        event.scrollY || null,
        event.timestamp
      );
      
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`
      );
      paramIndex += 11;
    });

    if (placeholders.length === 0) return [];

    const result = await pool.query(
      `INSERT INTO tracking_events 
       (session_id, event_type, x_coordinate, y_coordinate, element_tag, element_class, element_id, scroll_x, scroll_y, event_timestamp) 
       VALUES ${placeholders.join(', ')} 
       RETURNING *`,
      values
    );
    return result.rows;
  },

  // Get session events
  async getSessionEvents(sessionId, limit = 1000, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM tracking_events 
       WHERE session_id = $1 
       ORDER BY event_timestamp ASC 
       LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    );
    return result.rows;
  },

  // Get user sessions
  async getUserSessions(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM tracking_sessions 
       WHERE user_id = $1 
       ORDER BY start_time DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  // Get active session for user
  async getActiveSession(userId) {
    const result = await pool.query(
      'SELECT * FROM tracking_sessions WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId]
    );
    return result.rows[0];
  },

  // Delete session
  async deleteSession(id) {
    const result = await pool.query(
      'DELETE FROM tracking_sessions WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
};
