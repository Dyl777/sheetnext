# SheetNext Caching System - Complete Guide

## Overview

SheetNext now includes a comprehensive caching system with:
- **LRU (Least Recently Used) eviction**
- **TTL (Time To Live) support**
- **IndexedDB persistence**
- **AI response caching**
- **Multiple cache types** (AI, documents, API, general)
- **Cache management UI**
- **Backend cache API**

## Features

### 1. Core CacheManager (`src/core/Cache/CacheManager.js`)

**Features:**
- LRU cache with configurable max size
- TTL-based expiration
- IndexedDB persistence
- Automatic cleanup of expired entries
- Multiple cache types
- Import/export functionality
- Statistics tracking

**Configuration:**
```javascript
const SN = new SheetNext(dom, {
  CACHE_MAX_SIZE: 1000,           // Max items in memory
  CACHE_DEFAULT_TTL: 3600000,     // Default TTL (1 hour)
  CACHE_ENABLE_PERSISTENCE: true  // Enable IndexedDB
});
```

### 2. AI Response Caching (`src/core/Cache/AICacheHelper.js`)

**Features:**
- Automatic caching of AI responses
- Smart cache key generation
- Configurable TTL per request
- Cache hit/miss statistics

**Configuration:**
```javascript
const SN = new SheetNext(dom, {
  AI_CACHE_ENABLED: true,    // Enable AI caching
  AI_CACHE_TTL: 86400000     // 24 hours
});
```

### 3. Backend Cache API (`backend/routes/cache.js`)

**Endpoints:**
- `GET /api/cache/stats` - Get cache statistics
- `POST /api/cache/set` - Set cache value
- `GET /api/cache/get/:key` - Get cache value
- `DELETE /api/cache/delete/:key` - Delete cache value
- `POST /api/cache/clear` - Clear cache (with optional pattern)

**Cache Middleware:**
```javascript
import { cacheMiddleware } from './routes/cache.js';

// Use in routes
app.get('/api/data', cacheMiddleware(3600000), async (req, res) => {
  // Response will be cached for 1 hour
});
```

## Usage

### Basic Cache Operations

```javascript
// Set value
await SN.Cache.set('general', 'myKey', { data: 'value' }, { ttl: 3600000 });

// Get value
const value = await SN.Cache.get('general', 'myKey');

// Check if exists
const exists = await SN.Cache.has('general', 'myKey');

// Delete
await SN.Cache.delete('general', 'myKey');

// Clear type
await SN.Cache.clear('ai');

// Clear all
await SN.Cache.clear();
```

### Cache Types

- **ai** - AI responses
- **documents** - Document data
- **api** - API responses
- **general** - General purpose

### AI Caching

```javascript
// Automatic caching (enabled by default)
await SN.AI.conversation('What is SUM formula?');
// First call: API request
// Second call: Cached response

// Disable for specific request
await SN.AI.conversation('What is SUM formula?', {
  useCache: false  // Skip cache
});

// Check cache stats
const stats = SN.AI.cacheHelper.getStats();
console.log(stats);
// { hits: 10, misses: 5, saves: 15, hitRate: '66.67%' }
```

### Cache Management UI

**Open Panel:**
- Click cache icon in toolbar (if added)
- Or call: `SN.Layout.toggleCachePanel()`

**Features:**
- View cache statistics
- See size by type
- Clear specific cache types
- Refresh statistics

## Cache Key Generation

AI cache keys are generated from:
- Message content (normalized)
- Model name
- Temperature setting
- Active AI characteristic
- Sheet context presence

Example key: `ai_xk7d9f2h`

## Cache Invalidation

### Automatic
- TTL-based expiration
- LRU eviction when max size reached
- Periodic cleanup (every 5 minutes)

### Manual
```javascript
// Delete specific key
await SN.Cache.delete('ai', 'ai_xk7d9f2h');

// Clear all AI cache
await SN.Cache.clear('ai');

// Clear all caches
await SN.Cache.clear();
```

## Statistics

```javascript
const stats = SN.Cache.getStats();
console.log(stats);
// {
//   hits: 100,
//   misses: 25,
//   sets: 150,
//   deletes: 10,
//   evictions: 5,
//   totalSize: 125,
//   hitRate: '80.00%',
//   caches: {
//     ai: 50,
//     documents: 30,
//     api: 20,
//     general: 25
//   },
//   dbReady: true
// }
```

## Import/Export

```javascript
// Export cache
const json = await SN.Cache.export('ai');
// Download as file
const blob = new Blob([json], { type: 'application/json' });

// Import cache
const count = await SN.Cache.import(jsonString, 'ai');
console.log(`Imported ${count} entries`);
```

## Backend Integration

### Setup

```javascript
// server.js already includes:
app.use('/api/cache', cacheRoutes);
```

### Using Cache Middleware

```javascript
import { cacheMiddleware } from './routes/cache.js';

// Cache API response for 1 hour
app.get('/api/expensive-operation', cacheMiddleware(3600000), async (req, res) => {
  const result = await expensiveOperation();
  res.json(result);
});

// Cache with custom key
app.get('/api/users/:id', (req, res, next) => {
  const key = `user:${req.params.id}`;
  cacheMiddleware(1800000)(req, res, next);
});
```

### Direct Cache Access

```javascript
// Set cache
POST /api/cache/set
{
  "key": "myKey",
  "value": { "data": "value" },
  "ttl": 3600000
}

// Get cache
GET /api/cache/get/myKey

// Delete cache
DELETE /api/cache/delete/myKey

// Clear cache
POST /api/cache/clear
{
  "pattern": "user:*"  // Optional regex pattern
}
```

## Performance Tips

1. **Enable Persistence**: Keeps cache across page reloads
   ```javascript
   CACHE_ENABLE_PERSISTENCE: true
   ```

2. **Adjust TTL**: Shorter TTL for frequently changing data
   ```javascript
   AI_CACHE_TTL: 3600000  // 1 hour for AI responses
   ```

3. **Monitor Hit Rate**: Aim for >50% hit rate
   ```javascript
   const stats = SN.Cache.getStats();
   console.log('Hit rate:', stats.hitRate);
   ```

4. **Clear Strategically**: Clear only affected cache types
   ```javascript
   await SN.Cache.clear('ai');  // Instead of clearing all
   ```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `CACHE_MAX_SIZE` | number | 1000 | Max items in memory cache |
| `CACHE_DEFAULT_TTL` | number | 3600000 | Default TTL (ms) |
| `CACHE_ENABLE_PERSISTENCE` | boolean | true | Enable IndexedDB |
| `AI_CACHE_ENABLED` | boolean | true | Enable AI caching |
| `AI_CACHE_TTL` | number | 86400000 | AI cache TTL (24h) |

## Files Created

**Frontend:**
- `src/core/Cache/CacheManager.js` - Core cache system
- `src/core/Cache/AICacheHelper.js` - AI caching helper
- `src/core/Workbook/Workbook.js` - Cache integration
- `src/core/Layout/Layout.js` - Cache panel methods
- `src/core/Layout/DOMBuilder.js` - Cache panel UI
- `src/action/AI.js` - Cache actions
- `src/assets/mainSvgs.js` - Refresh icon
- `src/style/editor.css` - Cache panel styles

**Backend:**
- `backend/routes/cache.js` - Cache API routes
- `backend/server.js` - Route registration

## Browser Support

- **IndexedDB**: All modern browsers
- **Fallback**: Memory-only cache if IndexedDB unavailable

## Troubleshooting

### Cache Not Working

1. Check if enabled: `SN.Cache.getStats().dbReady`
2. Check console for IndexedDB errors
3. Verify cache key generation

### High Memory Usage

1. Reduce `CACHE_MAX_SIZE`
2. Shorten `CACHE_DEFAULT_TTL`
3. Clear cache periodically

### Cache Not Persisting

1. Check browser IndexedDB support
2. Check storage quota
3. Clear browser data if corrupted

## Example: Complete Setup

```javascript
const SN = new SheetNext(document.querySelector('#container'), {
  // Cache configuration
  CACHE_MAX_SIZE: 500,
  CACHE_DEFAULT_TTL: 7200000,      // 2 hours
  CACHE_ENABLE_PERSISTENCE: true,
  
  // AI caching
  AI_CACHE_ENABLED: true,
  AI_CACHE_TTL: 43200000,          // 12 hours
  
  // Backend
  BACKEND_URL: 'http://localhost:3000',
  AI_TOKEN: 'your-token'
});

// Use AI with automatic caching
const response = await SN.AI.conversation('Create SUM formula');
console.log('Cached:', response.cached);

// View stats
console.log(SN.Cache.getStats());
```

## Summary

SheetNext caching provides:
- ✅ Fast response times with LRU caching
- ✅ Reduced API calls with AI response caching
- ✅ Persistent storage with IndexedDB
- ✅ Automatic cleanup and expiration
- ✅ Management UI for monitoring
- ✅ Backend integration ready
- ✅ Import/export capabilities

All features are production-ready and fully integrated!
