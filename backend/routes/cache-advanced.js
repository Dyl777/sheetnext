import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import SQLiteCacheBackend from '../cache/SQLiteCacheBackend.js';
import MiniNoSQLStore from '../cache/MiniNoSQLStore.js';
import CacheAdapter, { CacheBackendType } from '../cache/CacheAdapter.js';

const router = express.Router();
router.use(authMiddleware);

// Initialize cache adapter
const cacheAdapter = new CacheAdapter({
  defaultBackend: CacheBackendType.SQLITE,
  sqlite: {
    dbPath: process.env.SQLITE_CACHE_PATH || './data/sheetnext_cache.db'
  },
  nosql: {
    dataPath: process.env.NOSQL_DATA_PATH || './data/nosql'
  }
});

// ============ SQLite Routes ============

// SQLite stats
router.get('/sqlite/stats', (req, res) => {
  const stats = cacheAdapter.getBackend(CacheBackendType.SQLITE)?.getStats();
  res.json(stats || { error: 'SQLite not available' });
});

// SQLite set
router.post('/sqlite/set', (req, res) => {
  const { type, key, value, ttl, tags, metadata } = req.body;
  
  if (!type || !key) {
    return res.status(400).json({ error: 'Type and key are required' });
  }
  
  const success = cacheAdapter.set(type, key, value, { 
    ttl, 
    tags, 
    metadata,
    backend: CacheBackendType.SQLITE 
  });
  
  res.json({ success, type, key });
});

// SQLite get
router.get('/sqlite/get/:type/:key', (req, res) => {
  const { type, key } = req.params;
  const value = cacheAdapter.get(type, key, { backend: CacheBackendType.SQLITE });
  
  if (value === null) {
    return res.status(404).json({ error: 'Cache miss' });
  }
  
  res.json({ type, key, value });
});

// SQLite delete
router.delete('/sqlite/delete/:type/:key', (req, res) => {
  const { type, key } = req.params;
  const success = cacheAdapter.delete(type, key, { backend: CacheBackendType.SQLITE });
  res.json({ success, type, key });
});

// SQLite clear
router.post('/sqlite/clear', (req, res) => {
  const { type } = req.body;
  const success = cacheAdapter.clear(type, { backend: CacheBackendType.SQLITE });
  res.json({ success, type });
});

// SQLite entries
router.get('/sqlite/entries/:type', (req, res) => {
  const { type } = req.params;
  const { limit = 100, offset = 0 } = req.query;
  const entries = cacheAdapter.getBackend(CacheBackendType.SQLITE)?.getEntries(type, parseInt(limit), parseInt(offset));
  res.json(entries || []);
});

// SQLite search by tags
router.post('/sqlite/search', (req, res) => {
  const { type, tags } = req.body;
  
  if (!type || !Array.isArray(tags)) {
    return res.status(400).json({ error: 'Type and tags array are required' });
  }
  
  const results = cacheAdapter.getBackend(CacheBackendType.SQLITE)?.searchByTags(type, tags);
  res.json(results || []);
});

// SQLite export
router.get('/sqlite/export', (req, res) => {
  const { type } = req.query;
  const json = cacheAdapter.export(CacheBackendType.SQLITE);
  
  if (!json) {
    return res.status(500).json({ error: 'Export failed' });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="sqlite-cache-${type || 'all'}-${Date.now()}.json"`);
  res.send(json);
});

// SQLite import
router.post('/sqlite/import', (req, res) => {
  const { json } = req.body;
  
  if (!json) {
    return res.status(400).json({ error: 'JSON data required' });
  }
  
  const count = cacheAdapter.import(json, CacheBackendType.SQLITE);
  res.json({ success: true, imported: count });
});

// ============ NoSQL Routes ============

// NoSQL stats
router.get('/nosql/stats', (req, res) => {
  const stats = cacheAdapter.getBackend(CacheBackendType.NOSQL)?.getStats();
  res.json(stats || { error: 'NoSQL not available' });
});

// NoSQL list collections
router.get('/nosql/collections', (req, res) => {
  const collections = cacheAdapter.getBackend(CacheBackendType.NOSQL)?.listCollections();
  res.json(collections || []);
});

// NoSQL find
router.post('/nosql/find/:collection', (req, res) => {
  const { collection } = req.params;
  const { query, options } = req.body;
  
  const store = cacheAdapter.getBackend(CacheBackendType.NOSQL);
  if (!store) {
    return res.status(500).json({ error: 'NoSQL not available' });
  }
  
  const results = store.collection(collection).find(query || {}, options || {});
  res.json(results);
});

// NoSQL insert
router.post('/nosql/insert/:collection', (req, res) => {
  const { collection } = req.params;
  const { document } = req.body;
  
  if (!document) {
    return res.status(400).json({ error: 'Document required' });
  }
  
  const store = cacheAdapter.getBackend(CacheBackendType.NOSQL);
  if (!store) {
    return res.status(500).json({ error: 'NoSQL not available' });
  }
  
  const result = store.collection(collection).insert(document);
  res.json({ success: true, document: result });
});

// NoSQL update
router.put('/nosql/update/:collection', (req, res) => {
  const { collection } = req.params;
  const { query, update, options } = req.body;
  
  if (!query || !update) {
    return res.status(400).json({ error: 'Query and update required' });
  }
  
  const store = cacheAdapter.getBackend(CacheBackendType.NOSQL);
  if (!store) {
    return res.status(500).json({ error: 'NoSQL not available' });
  }
  
  const result = store.collection(collection).update(query, update, options);
  res.json({ success: true, ...result });
});

// NoSQL delete
router.delete('/nosql/delete/:collection', (req, res) => {
  const { collection } = req.params;
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }
  
  const store = cacheAdapter.getBackend(CacheBackendType.NOSQL);
  if (!store) {
    return res.status(500).json({ error: 'NoSQL not available' });
  }
  
  const deleted = store.collection(collection).delete(query);
  res.json({ success: true, deleted });
});

// NoSQL aggregate
router.post('/nosql/aggregate/:collection', (req, res) => {
  const { collection } = req.params;
  const { pipeline } = req.body;
  
  if (!Array.isArray(pipeline)) {
    return res.status(400).json({ error: 'Pipeline array required' });
  }
  
  const store = cacheAdapter.getBackend(CacheBackendType.NOSQL);
  if (!store) {
    return res.status(500).json({ error: 'NoSQL not available' });
  }
  
  const results = store.collection(collection).aggregate(pipeline);
  res.json(results);
});

// NoSQL export
router.get('/nosql/export', (req, res) => {
  const json = cacheAdapter.export(CacheBackendType.NOSQL);
  
  if (!json) {
    return res.status(500).json({ error: 'Export failed' });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="nosql-export-${Date.now()}.json"`);
  res.send(json);
});

// ============ Migration Routes ============

// Migrate between backends
router.post('/migrate', async (req, res) => {
  const { from, to } = req.body;
  
  if (!from || !to) {
    return res.status(400).json({ error: 'From and to backends required' });
  }
  
  const result = await cacheAdapter.migrate(from, to);
  res.json(result);
});

// Cleanup expired entries
router.post('/cleanup', (req, res) => {
  const cleaned = cacheAdapter.cleanup();
  res.json({ cleaned });
});

export default router;
