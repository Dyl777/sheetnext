import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../database/db.js';

const router = express.Router();
router.use(authMiddleware);

// Get all characteristics for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_characteristics WHERE user_id = $1 ORDER BY created_at',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get characteristics error:', error);
    res.status(500).json({ error: 'Failed to get characteristics' });
  }
});

// Create characteristic
router.post('/', async (req, res) => {
  try {
    const { id, name, description, systemPrompt, settings, icon, color, isDefault } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_characteristics 
       (user_id, id, name, description, system_prompt, settings, icon, color, is_default, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [req.userId, id, name, description || '', systemPrompt, JSON.stringify(settings || {}), icon || 'assistant', color || '#1890ff', isDefault || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create characteristic error:', error);
    res.status(500).json({ error: 'Failed to create characteristic' });
  }
});

// Update characteristic
router.put('/:id', async (req, res) => {
  try {
    const { name, description, systemPrompt, settings, icon, color } = req.body;
    const result = await pool.query(
      `UPDATE ai_characteristics 
       SET name = $1, description = $2, system_prompt = $3, settings = $4, icon = $5, color = $6
       WHERE id = $7 AND user_id = $8 AND is_custom = true
       RETURNING *`,
      [name, description, systemPrompt, JSON.stringify(settings), icon, color, req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Characteristic not found or is default' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update characteristic error:', error);
    res.status(500).json({ error: 'Failed to update characteristic' });
  }
});

// Delete characteristic
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ai_characteristics WHERE id = $1 AND user_id = $2 AND is_custom = true RETURNING *',
      [req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Characteristic not found or is default' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete characteristic error:', error);
    res.status(500).json({ error: 'Failed to delete characteristic' });
  }
});

// Delete all custom characteristics
router.delete('/custom/all', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ai_characteristics WHERE user_id = $1 AND is_custom = true',
      [req.userId]
    );
    res.json({ success: true, deleted: result.rowCount });
  } catch (error) {
    console.error('Clear characteristics error:', error);
    res.status(500).json({ error: 'Failed to clear characteristics' });
  }
});

export default router;
