import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// In-memory cache store (in production, use Redis)
const cacheStore = new Map();

// Get cache stats
router.get('/stats', (req, res) => {
  const stats = {
    size: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
    timestamp: new Date().toISOString()
  };
  res.json(stats);
});

// Set cache value
router.post('/set', (req, res) => {
  try {
    const { key, value, ttl } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }
    
    const entry = {
      value,
      createdAt: Date.now(),
      ttl: ttl || 3600000,
      userId: req.userId
    };
    
    cacheStore.set(key, entry);
    
    res.json({ success: true, key });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set cache' });
  }
});

// Get cache value
router.get('/get/:key', (req, res) => {
  try {
    const { key } = req.params;
    const entry = cacheStore.get(key);
    
    if (!entry) {
      return res.status(404).json({ error: 'Cache miss' });
    }
    
    // Check if expired
    if (Date.now() > entry.createdAt + entry.ttl) {
      cacheStore.delete(key);
      return res.status(404).json({ error: 'Cache expired' });
    }
    
    res.json({ value: entry.value, key });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache' });
  }
});

// Delete cache value
router.delete('/delete/:key', (req, res) => {
  try {
    const { key } = req.params;
    const deleted = cacheStore.delete(key);
    res.json({ success: deleted, key });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete cache' });
  }
});

// Clear all cache
router.post('/clear', (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (pattern) {
      // Clear by pattern
      const regex = new RegExp(pattern);
      for (const key of cacheStore.keys()) {
        if (regex.test(key)) {
          cacheStore.delete(key);
        }
      }
    } else {
      // Clear all
      cacheStore.clear();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Cache middleware for API routes
export function cacheMiddleware(ttl = 3600000) {
  return (req, res, next) => {
    const key = `api:${req.originalUrl}`;
    const entry = cacheStore.get(key);
    
    if (entry && Date.now() < entry.createdAt + entry.ttl) {
      return res.json(entry.value);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = (data) => {
      cacheStore.set(key, {
        value: data,
        createdAt: Date.now(),
        ttl,
        userId: req.userId
      });
      return originalJson.call(res, data);
    };
    
    next();
  };
}

export default router;
