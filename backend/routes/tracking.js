import express from 'express';
import { trackingModel } from '../models/Tracking.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create new tracking session
router.post('/sessions', async (req, res) => {
  try {
    const { startTime, userAgent, screenWidth, screenHeight, windowWidth, windowHeight } = req.body;
    
    const session = await trackingModel.createSession(req.userId, {
      startTime: new Date(startTime),
      userAgent,
      screenWidth,
      screenHeight,
      windowWidth,
      windowHeight
    });
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create tracking session' });
  }
});

// Get user sessions
router.get('/sessions', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const sessions = await trackingModel.getUserSessions(
      req.userId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get active session
router.get('/sessions/active', async (req, res) => {
  try {
    const session = await trackingModel.getActiveSession(req.userId);
    res.json(session || null);
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Failed to get active session' });
  }
});

// Get session by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await trackingModel.getSessionById(req.params.id, req.userId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// End session
router.post('/sessions/:id/end', async (req, res) => {
  try {
    const { endTime, totalMovements, totalClicks, totalScrolls } = req.body;
    
    const session = await trackingModel.endSession(
      req.params.id,
      new Date(endTime),
      { totalMovements, totalClicks, totalScrolls }
    );
    
    res.json(session);
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Add events to session
router.post('/sessions/:id/events', async (req, res) => {
  try {
    const { movements = [], clicks = [], scrolls = [] } = req.body;
    
    // Format events
    const events = [
      ...movements.map(m => ({
        type: 'movement',
        x: m.x,
        y: m.y,
        timestamp: m.timestamp
      })),
      ...clicks.map(c => ({
        type: 'click',
        x: c.x,
        y: c.y,
        elementTag: c.element,
        elementClass: c.elementClass,
        elementId: c.elementId,
        timestamp: c.timestamp
      })),
      ...scrolls.map(s => ({
        type: 'scroll',
        scrollX: s.scrollX,
        scrollY: s.scrollY,
        timestamp: s.timestamp
      }))
    ];
    
    if (events.length > 0) {
      await trackingModel.addEvents(req.params.id, events);
    }
    
    res.json({ success: true, count: events.length });
  } catch (error) {
    console.error('Add events error:', error);
    res.status(500).json({ error: 'Failed to add events' });
  }
});

// Get session events
router.get('/sessions/:id/events', async (req, res) => {
  try {
    const { limit = 1000, offset = 0 } = req.query;
    const events = await trackingModel.getSessionEvents(
      req.params.id,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Delete session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await trackingModel.getSessionById(req.params.id, req.userId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    await trackingModel.deleteSession(req.params.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
