import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../database/db.js';

const router = express.Router();
router.use(authMiddleware);

// ============ Automation Tasks ============

// Get all automation tasks for user
router.get('/tasks', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `SELECT * FROM automation_tasks WHERE user_id = $1`;
    let params = [req.userId];
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    res.json({
      tasks: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get automation tasks' });
  }
});

// Get single task
router.get('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM automation_tasks WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create automation task
router.post('/tasks', async (req, res) => {
  try {
    const { name, description, trigger, actions, status = 'active', metadata } = req.body;
    
    const result = await pool.query(
      `INSERT INTO automation_tasks 
       (user_id, name, description, trigger, actions, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [req.userId, name, description, JSON.stringify(trigger), JSON.stringify(actions), status, JSON.stringify(metadata || {})]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create automation task' });
  }
});

// Update automation task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { name, description, trigger, actions, status, metadata } = req.body;
    
    const result = await pool.query(
      `UPDATE automation_tasks 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           trigger = COALESCE($3, trigger),
           actions = COALESCE($4, actions),
           status = COALESCE($5, status),
           metadata = COALESCE($6, metadata),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, description, trigger ? JSON.stringify(trigger) : null, actions ? JSON.stringify(actions) : null, status, metadata ? JSON.stringify(metadata) : null, req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update automation task' });
  }
});

// Delete automation task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM automation_tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted', id: result.rows[0].id });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete automation task' });
  }
});

// Run/Execute task
router.post('/tasks/:id/execute', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Get task details
    const taskResult = await pool.query(
      `SELECT * FROM automation_tasks WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    
    // Log execution
    await pool.query(
      `INSERT INTO automation_executions (task_id, user_id, status, executed_at)
       VALUES ($1, $2, 'completed', NOW())`,
      [req.params.id, req.userId]
    );
    
    res.json({ 
      message: 'Task executed',
      task,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Execute task error:', error);
    res.status(500).json({ error: 'Failed to execute task' });
  }
});

// Get task execution history
router.get('/tasks/:id/executions', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM automation_executions 
       WHERE task_id = $1 AND user_id = $2
       ORDER BY executed_at DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.userId, parseInt(limit), parseInt(offset)]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({ error: 'Failed to get execution history' });
  }
});

export default router;
