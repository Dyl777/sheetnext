# Advanced Caching Solutions - SQLite & Mini NoSQL

## Overview

SheetNext now includes **enterprise-grade caching** with multiple backend options:

1. **SQLite Cache** - Robust file-based relational cache
2. **Mini NoSQL Store** - Lightweight MongoDB-like document store
3. **Cache Adapter** - Unified interface with backend switching
4. **Memory Cache** - Fast in-memory LRU cache (fallback)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   SheetNext Application                  │
├─────────────────────────────────────────────────────────┤
│                    Cache Adapter                         │
│  (Unified interface for all backends)                   │
├─────────────┬─────────────┬─────────────┬──────────────┤
│   Memory    │   SQLite    │  Mini NoSQL │   Redis      │
│   (LRU)     │ (File DB)   │ (Document)  │  (Future)    │
└─────────────┴─────────────┴─────────────┴──────────────┘
```

## 1. SQLite Cache Backend

### Features
- **Persistent** - Survives restarts
- **ACID Compliant** - Transaction safety
- **Indexed** - Fast lookups
- **TTL Support** - Auto-expiration
- **Tagging** - Search by tags
- **Statistics** - Hit/miss tracking
- **Size Limits** - Auto-eviction

### Setup

```bash
npm install better-sqlite3
```

### Configuration

```javascript
// backend/server.js or config
const sqliteCache = new SQLiteCacheBackend({
  dbPath: './data/sheetnext_cache.db'
});

sqliteCache.connect();
```

### Usage

```javascript
// Set cache
cache.set('ai', 'formula_sum', '=SUM(A1:A10)', {
  ttl: 86400,      // 24 hours
  tags: ['formula', 'math'],
  metadata: { user: 'john' }
});

// Get cache
const value = cache.get('ai', 'formula_sum');

// Search by tags
const formulas = cache.searchByTags('ai', ['formula', 'math']);

// Get stats
const stats = cache.getStats();
// { hits: 100, misses: 20, hitRate: '83.33%', totalEntries: 500 }
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cache/advanced/sqlite/stats` | Get statistics |
| POST | `/api/cache/advanced/sqlite/set` | Set cache entry |
| GET | `/api/cache/advanced/sqlite/get/:type/:key` | Get cache entry |
| DELETE | `/api/cache/advanced/sqlite/delete/:type/:key` | Delete entry |
| POST | `/api/cache/advanced/sqlite/clear` | Clear cache |
| GET | `/api/cache/advanced/sqlite/entries/:type` | List entries |
| POST | `/api/cache/advanced/sqlite/search` | Search by tags |
| GET | `/api/cache/advanced/sqlite/export` | Export cache |
| POST | `/api/cache/advanced/sqlite/import` | Import cache |

### Example Requests

```bash
# Set cache
curl -X POST http://localhost:3000/api/cache/advanced/sqlite/set \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "type": "ai",
    "key": "myKey",
    "value": {"data": "value"},
    "ttl": 3600,
    "tags": ["important"],
    "metadata": {"user": "admin"}
  }'

# Get cache
curl http://localhost:3000/api/cache/advanced/sqlite/get/ai/myKey \
  -H "Authorization: Bearer TOKEN"

# Search by tags
curl -X POST http://localhost:3000/api/cache/advanced/sqlite/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"type": "ai", "tags": ["formula"]}'
```

## 2. Mini NoSQL Document Store

### Features
- **MongoDB-like API** - Familiar interface
- **Query Operators** - $eq, $gt, $lt, $in, $regex, etc.
- **Aggregation Pipeline** - $match, $sort, $group, $project
- **Indexing** - Create indexes on fields
- **Projections** - Select specific fields
- **Atomic Writes** - Queue-based persistence

### Setup

No additional dependencies required! Uses native Node.js fs module.

### Configuration

```javascript
const nosql = new MiniNoSQLStore({
  dataPath: './data/nosql'
});
```

### Usage

```javascript
// Get collection
const users = nosql.collection('users');

// Insert
const user = users.insert({
  name: 'John',
  email: 'john@example.com',
  age: 30,
  tags: ['admin', 'active']
});

// Find with query
const adults = users.find({ age: { $gt: 18 } });

// Find with operators
const admins = users.find({
  tags: { $contains: 'admin' },
  age: { $gte: 21 }
});

// Update
users.update(
  { _id: user._id },
  { $set: { age: 31 }, $inc: { loginCount: 1 } }
);

// Aggregate
const stats = users.aggregate([
  { $match: { active: true } },
  { $group: { _id: '$role', count: { $count: true } } }
]);

// Create index
users.createIndex('email', { unique: true });
```

### Query Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equal | `{ age: { $eq: 30 } }` |
| `$ne` | Not equal | `{ age: { $ne: 30 } }` |
| `$gt` | Greater than | `{ age: { $gt: 18 } }` |
| `$gte` | Greater or equal | `{ age: { $gte: 18 } }` |
| `$lt` | Less than | `{ age: { $lt: 18 } }` |
| `$lte` | Less or equal | `{ age: { $lte: 18 } }` |
| `$in` | In array | `{ age: { $in: [18, 21, 30] } }` |
| `$nin` | Not in array | `{ age: { $nin: [18, 21] } }` |
| `$exists` | Field exists | `{ age: { $exists: true } }` |
| `$regex` | Regex match | `{ name: { $regex: 'john' } }` |
| `$contains` | Array contains | `{ tags: { $contains: 'admin' } }` |

### Aggregation Pipeline

```javascript
// Complex aggregation
const results = collection.aggregate([
  { $match: { status: 'active' } },
  { $sort: { createdAt: -1 } },
  { $limit: 100 },
  { $project: { name: 1, email: 1, _id: 0 } },
  { $group: { _id: '$category', total: { $sum: '$amount' } } }
]);
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cache/advanced/nosql/stats` | Get statistics |
| GET | `/api/cache/advanced/nosql/collections` | List collections |
| POST | `/api/cache/advanced/nosql/find/:collection` | Find documents |
| POST | `/api/cache/advanced/nosql/insert/:collection` | Insert document |
| PUT | `/api/cache/advanced/nosql/update/:collection` | Update documents |
| DELETE | `/api/cache/advanced/nosql/delete/:collection` | Delete documents |
| POST | `/api/cache/advanced/nosql/aggregate/:collection` | Aggregation pipeline |
| GET | `/api/cache/advanced/nosql/export` | Export all data |

### Example Requests

```bash
# Insert document
curl -X POST http://localhost:3000/api/cache/advanced/nosql/insert/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "document": {
      "name": "Jane",
      "email": "jane@example.com",
      "age": 25
    }
  }'

# Find documents
curl -X POST http://localhost:3000/api/cache/advanced/nosql/find/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "query": { "age": { $gte: 21 } },
    "options": {
      "sort": { "age": -1 },
      "limit": 10,
      "projection": { "name": 1, "email": 1 }
    }
  }'

# Aggregate
curl -X POST http://localhost:3000/api/cache/advanced/nosql/aggregate/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "pipeline": [
      { "$match": { "active": true } },
      { "$group": { "_id": "$role", "count": { "$count": true } } }
    ]
  }'
```

## 3. Cache Adapter

### Features
- **Unified Interface** - Same API for all backends
- **Backend Switching** - Switch between SQLite, NoSQL, Memory
- **Migration Tools** - Move data between backends
- **Fallback** - Automatic fallback to memory

### Setup

```javascript
import CacheAdapter, { CacheBackendType } from './cache/CacheAdapter.js';

const cacheAdapter = new CacheAdapter({
  defaultBackend: CacheBackendType.SQLITE,
  fallbackToMemory: true,
  sqlite: {
    dbPath: './data/sheetnext_cache.db'
  },
  nosql: {
    dataPath: './data/nosql'
  }
});
```

### Usage

```javascript
// Set with default backend
cacheAdapter.set('ai', 'key', value);

// Set with specific backend
cacheAdapter.set('ai', 'key', value, {
  backend: CacheBackendType.NOSQL
});

// Get stats from all backends
const stats = cacheAdapter.getStats();
// {
//   backends: {
//     sqlite: {...},
//     nosql: {...}
//   },
//   primary: 'sqlite'
// }

// Migrate between backends
await cacheAdapter.migrate(CacheBackendType.SQLITE, CacheBackendType.NOSQL);
```

### Migration

```bash
# Migrate from SQLite to NoSQL
curl -X POST http://localhost:3000/api/cache/advanced/migrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"from": "sqlite", "to": "nosql"}'
```

## Configuration Options

### Environment Variables

```env
# SQLite Cache
SQLITE_CACHE_PATH=./data/sheetnext_cache.db

# NoSQL Store
NOSQL_DATA_PATH=./data/nosql

# Cache Settings
CACHE_DEFAULT_BACKEND=sqlite
CACHE_FALLBACK_TO_MEMORY=true
```

### Constructor Options

```javascript
// SQLite
{
  dbPath: string,           // Database file path
  pragmas: {                // SQLite pragmas
    journal_mode: 'WAL',
    cache_size: -64000
  }
}

// NoSQL
{
  dataPath: string,         // Data directory
  autoSave: true,           // Auto-save interval
  saveInterval: 1000        // Save every 1 second
}

// Adapter
{
  defaultBackend: 'sqlite', // Default backend
  fallbackToMemory: true,   // Fallback if backend fails
  sqlite: {...},            // SQLite options
  nosql: {...}              // NoSQL options
}
```

## Performance Comparison

| Backend | Read Speed | Write Speed | Memory | Persistence | Best For |
|---------|-----------|-------------|--------|-------------|----------|
| Memory | ⚡⚡⚡ | ⚡⚡⚡ | High | ❌ | Temporary cache |
| SQLite | ⚡⚡ | ⚡⚡ | Low | ✅ | Structured cache |
| NoSQL | ⚡⚡ | ⚡ | Low | ✅ | Document storage |

## Best Practices

### 1. Choose Right Backend

- **Memory**: Session cache, temporary data
- **SQLite**: AI responses, API cache, structured data
- **NoSQL**: User data, documents, complex queries

### 2. Set Appropriate TTL

```javascript
// Short-lived cache
cache.set('api', 'users', data, { ttl: 300 }); // 5 minutes

// Long-lived cache
cache.set('ai', 'formula', formula, { ttl: 86400 }); // 24 hours
```

### 3. Use Tags for Organization

```javascript
cache.set('ai', 'key', value, {
  tags: ['formula', 'math', 'important']
});

// Search later
const formulas = cache.searchByTags('ai', ['formula']);
```

### 4. Monitor Cache Stats

```javascript
const stats = cache.getStats();
if (parseFloat(stats.hitRate) < 50) {
  // Consider increasing TTL or cache size
}
```

### 5. Cleanup Regularly

```javascript
// Automatic cleanup every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 300000);
```

## Files Created

**Backend:**
- `backend/cache/SQLiteCacheBackend.js` - SQLite implementation
- `backend/cache/MiniNoSQLStore.js` - NoSQL implementation
- `backend/cache/CacheAdapter.js` - Adapter system
- `backend/routes/cache-advanced.js` - Advanced routes
- `backend/package.json` - Updated with better-sqlite3

**Frontend:** (from previous caching implementation)
- `src/core/Cache/CacheManager.js`
- `src/core/Cache/AICacheHelper.js`

## Summary

SheetNext now provides:

✅ **SQLite Cache** - Production-ready file-based cache
✅ **Mini NoSQL** - MongoDB-like document store
✅ **Cache Adapter** - Unified multi-backend interface
✅ **Migration Tools** - Move data between backends
✅ **REST API** - Full HTTP API for cache operations
✅ **Query Operators** - Rich query capabilities
✅ **Aggregation** - Pipeline-based analytics
✅ **Tagging System** - Organize and search cache
✅ **Statistics** - Comprehensive monitoring
✅ **Auto-cleanup** - TTL-based expiration

All features are production-ready and fully integrated!
