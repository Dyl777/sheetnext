/**
 * SQLite Cache Backend
 * Robust file-based caching using SQLite
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export default class SQLiteCacheBackend {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(process.cwd(), 'data', 'sheetnext_cache.db');
    this.db = null;
    this.connected = false;
    
    // Ensure data directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  /**
   * Initialize database connection
   */
  connect() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Better concurrency
      this.db.pragma('cache_size = -64000'); // 64MB cache
      this.db.pragma('temp_store = memory');
      
      this._createTables();
      this.connected = true;
      console.log('SQLite Cache: Connected to', this.dbPath);
      return true;
    } catch (error) {
      console.error('SQLite Cache: Connection failed:', error.message);
      return false;
    }
  }

  /**
   * Create cache tables
   */
  _createTables() {
    this.db.exec(`
      -- Main cache table
      CREATE TABLE IF NOT EXISTS cache_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_type TEXT NOT NULL,
        cache_key TEXT NOT NULL,
        value TEXT NOT NULL,
        data_type TEXT DEFAULT 'json',
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        access_count INTEGER DEFAULT 0,
        last_accessed_at INTEGER,
        size_bytes INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        UNIQUE(cache_type, cache_key)
      );
      
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_cache_type ON cache_entries(cache_type);
      CREATE INDEX IF NOT EXISTS idx_cache_key ON cache_entries(cache_key);
      CREATE INDEX IF NOT EXISTS idx_expires_at ON cache_entries(expires_at);
      CREATE INDEX IF NOT EXISTS idx_created_at ON cache_entries(created_at);
      CREATE INDEX IF NOT EXISTS idx_tags ON cache_entries(tags);
      
      -- Cache statistics table
      CREATE TABLE IF NOT EXISTS cache_stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_hits INTEGER DEFAULT 0,
        total_misses INTEGER DEFAULT 0,
        total_sets INTEGER DEFAULT 0,
        total_deletes INTEGER DEFAULT 0,
        total_evictions INTEGER DEFAULT 0,
        last_reset INTEGER
      );
      
      -- Initialize stats
      INSERT OR IGNORE INTO cache_stats (id, last_reset) VALUES (1, strftime('%s', 'now'));
      
      -- Cache types configuration
      CREATE TABLE IF NOT EXISTS cache_types (
        name TEXT PRIMARY KEY,
        max_size INTEGER DEFAULT 1000,
        default_ttl INTEGER DEFAULT 3600,
        enabled INTEGER DEFAULT 1
      );
      
      -- Initialize default cache types
      INSERT OR IGNORE INTO cache_types (name, max_size, default_ttl) VALUES 
        ('ai', 5000, 86400),
        ('documents', 1000, 7200),
        ('api', 2000, 3600),
        ('general', 10000, 7200);
      
      -- Query cache for prepared statements
      CREATE TABLE IF NOT EXISTS query_cache (
        query_hash TEXT PRIMARY KEY,
        query_text TEXT NOT NULL,
        result TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_query_expires ON query_cache(expires_at);
    `);
  }

  /**
   * Set cache entry
   */
  set(type, key, value, options = {}) {
    if (!this.connected) return false;

    const now = Math.floor(Date.now() / 1000);
    const ttl = options.ttl || 3600;
    const expiresAt = options.ttl ? now + ttl : null;
    const dataType = typeof value === 'string' ? 'string' : 'json';
    const stringValue = dataType === 'json' ? JSON.stringify(value) : value;
    const sizeBytes = Buffer.byteLength(stringValue, 'utf8');
    const tags = Array.isArray(options.tags) ? JSON.stringify(options.tags) : '[]';
    const metadata = JSON.stringify(options.metadata || {});

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO cache_entries 
        (cache_type, cache_key, value, data_type, created_at, expires_at, access_count, last_accessed_at, size_bytes, tags, metadata)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `);

      stmt.run(type, key, stringValue, dataType, now, expiresAt, now, sizeBytes, tags, metadata);

      // Update stats
      this.db.prepare('UPDATE cache_stats SET total_sets = total_sets + 1 WHERE id = 1').run();

      // Check size limit and evict if needed
      this._enforceSizeLimit(type);

      return true;
    } catch (error) {
      console.error('SQLite Cache: Set failed:', error.message);
      return false;
    }
  }

  /**
   * Get cache entry
   */
  get(type, key) {
    if (!this.connected) return null;

    try {
      const now = Math.floor(Date.now() / 1000);
      
      const stmt = this.db.prepare(`
        SELECT value, data_type, expires_at, access_count 
        FROM cache_entries 
        WHERE cache_type = ? AND cache_key = ?
        AND (expires_at IS NULL OR expires_at > ?)
      `);

      const row = stmt.get(type, key, now);

      if (!row) {
        this.db.prepare('UPDATE cache_stats SET total_misses = total_misses + 1 WHERE id = 1').run();
        return null;
      }

      // Update access stats
      this.db.prepare(`
        UPDATE cache_entries 
        SET access_count = access_count + 1, last_accessed_at = ?
        WHERE cache_type = ? AND cache_key = ?
      `).run(now, type, key);

      this.db.prepare('UPDATE cache_stats SET total_hits = total_hits + 1 WHERE id = 1').run();

      // Parse value
      return row.data_type === 'json' ? JSON.parse(row.value) : row.value;
    } catch (error) {
      console.error('SQLite Cache: Get failed:', error.message);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  delete(type, key) {
    if (!this.connected) return false;

    try {
      const stmt = this.db.prepare('DELETE FROM cache_entries WHERE cache_type = ? AND cache_key = ?');
      const result = stmt.run(type, key);

      this.db.prepare('UPDATE cache_stats SET total_deletes = total_deletes + 1 WHERE id = 1').run();

      return result.changes > 0;
    } catch (error) {
      console.error('SQLite Cache: Delete failed:', error.message);
      return false;
    }
  }

  /**
   * Clear cache by type or all
   */
  clear(type = null) {
    if (!this.connected) return false;

    try {
      if (type) {
        this.db.prepare('DELETE FROM cache_entries WHERE cache_type = ?').run(type);
      } else {
        this.db.prepare('DELETE FROM cache_entries').run();
      }

      return true;
    } catch (error) {
      console.error('SQLite Cache: Clear failed:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  has(type, key) {
    if (!this.connected) return false;

    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = this.db.prepare(`
        SELECT 1 FROM cache_entries 
        WHERE cache_type = ? AND cache_key = ?
        AND (expires_at IS NULL OR expires_at > ?)
        LIMIT 1
      `);

      return !!stmt.get(type, key, now);
    } catch (error) {
      console.error('SQLite Cache: Has failed:', error.message);
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    if (!this.connected) return null;

    try {
      const stats = this.db.prepare('SELECT * FROM cache_stats WHERE id = 1').get();
      
      const sizeByType = this.db.prepare(`
        SELECT cache_type, COUNT(*) as count, SUM(size_bytes) as total_size
        FROM cache_entries
        GROUP BY cache_type
      `).all();

      const totalHits = stats.total_hits || 0;
      const totalMisses = stats.total_misses || 0;
      const total = totalHits + totalMisses;

      return {
        hits: totalHits,
        misses: totalMisses,
        sets: stats.total_sets || 0,
        deletes: stats.total_deletes || 0,
        evictions: stats.total_evictions || 0,
        hitRate: total > 0 ? ((totalHits / total) * 100).toFixed(2) + '%' : '0%',
        totalEntries: sizeByType.reduce((sum, t) => sum + t.count, 0),
        totalSize: sizeByType.reduce((sum, t) => sum + (t.total_size || 0), 0),
        byType: sizeByType.reduce((acc, t) => {
          acc[t.cache_type] = { count: t.count, size: t.total_size || 0 };
          return acc;
        }, {}),
        backend: 'sqlite',
        dbPath: this.dbPath
      };
    } catch (error) {
      console.error('SQLite Cache: GetStats failed:', error.message);
      return null;
    }
  }

  /**
   * Get entries by type
   */
  getEntries(type, limit = 100, offset = 0) {
    if (!this.connected) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT cache_key, value, data_type, created_at, expires_at, access_count, size_bytes, tags
        FROM cache_entries
        WHERE cache_type = ?
        ORDER BY last_accessed_at DESC
        LIMIT ? OFFSET ?
      `);

      return stmt.all(type, limit, offset).map(row => ({
        key: row.cache_key,
        value: row.data_type === 'json' ? JSON.parse(row.value) : row.value,
        createdAt: row.created_at * 1000,
        expiresAt: row.expires_at ? row.expires_at * 1000 : null,
        accessCount: row.access_count,
        sizeBytes: row.size_bytes,
        tags: JSON.parse(row.tags),
        isExpired: row.expires_at && row.expires_at < Math.floor(Date.now() / 1000)
      }));
    } catch (error) {
      console.error('SQLite Cache: GetEntries failed:', error.message);
      return [];
    }
  }

  /**
   * Search by tags
   */
  searchByTags(type, tags) {
    if (!this.connected) return [];

    try {
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' AND ');
      const tagValues = tags.map(tag => `%${tag}%`);
      
      const stmt = this.db.prepare(`
        SELECT cache_key, value, data_type
        FROM cache_entries
        WHERE cache_type = ? AND (${tagConditions})
        AND (expires_at IS NULL OR expires_at > ?)
      `);

      return stmt.all(type, ...tagValues, Math.floor(Date.now() / 1000))
        .map(row => row.data_type === 'json' ? JSON.parse(row.value) : row.value);
    } catch (error) {
      console.error('SQLite Cache: SearchByTags failed:', error.message);
      return [];
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    if (!this.connected) return 0;

    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = this.db.prepare('DELETE FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at < ?');
      const result = stmt.run(now);

      return result.changes;
    } catch (error) {
      console.error('SQLite Cache: Cleanup failed:', error.message);
      return 0;
    }
  }

  /**
   * Enforce size limit for cache type
   */
  _enforceSizeLimit(type) {
    try {
      const typeConfig = this.db.prepare('SELECT max_size FROM cache_types WHERE name = ?').get(type);
      if (!typeConfig) return;

      const count = this.db.prepare('SELECT COUNT(*) as count FROM cache_entries WHERE cache_type = ?').get(type).count;
      
      if (count > typeConfig.max_size) {
        const toEvict = count - typeConfig.max_size;
        this.db.prepare(`
          DELETE FROM cache_entries 
          WHERE cache_type = ? 
          AND id IN (
            SELECT id FROM cache_entries 
            WHERE cache_type = ? 
            ORDER BY last_accessed_at ASC 
            LIMIT ?
          )
        `).run(type, type, toEvict);

        this.db.prepare('UPDATE cache_stats SET total_evictions = total_evictions + ? WHERE id = 1').run(toEvict);
      }
    } catch (error) {
      console.error('SQLite Cache: EnforceSizeLimit failed:', error.message);
    }
  }

  /**
   * Export cache to JSON
   */
  export(type = null) {
    if (!this.connected) return null;

    try {
      let entries;
      if (type) {
        entries = this.getEntries(type, 100000, 0);
      } else {
        const types = this.db.prepare('SELECT DISTINCT cache_type FROM cache_entries').all();
        entries = {};
        types.forEach(t => {
          entries[t.cache_type] = this.getEntries(t.cache_type, 100000, 0);
        });
      }

      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        backend: 'sqlite',
        entries
      }, null, 2);
    } catch (error) {
      console.error('SQLite Cache: Export failed:', error.message);
      return null;
    }
  }

  /**
   * Import cache from JSON
   */
  import(json, type = null) {
    if (!this.connected) return 0;

    try {
      const data = JSON.parse(json);
      const entries = data.entries || data;
      let count = 0;

      if (type && entries[type]) {
        entries[type].forEach(entry => {
          this.set(type, entry.key, entry.value, {
            ttl: entry.expiresAt ? (entry.expiresAt - Date.now()) / 1000 : null,
            tags: entry.tags,
            metadata: entry.metadata
          });
          count++;
        });
      } else if (!type) {
        Object.entries(entries).forEach(([cacheType, cacheEntries]) => {
          cacheEntries.forEach(entry => {
            this.set(cacheType, entry.key, entry.value, {
              ttl: entry.expiresAt ? (entry.expiresAt - Date.now()) / 1000 : null,
              tags: entry.tags,
              metadata: entry.metadata
            });
            count++;
          });
        });
      }

      return count;
    } catch (error) {
      console.error('SQLite Cache: Import failed:', error.message);
      return 0;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.connected = false;
      console.log('SQLite Cache: Connection closed');
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    if (!this.connected) return false;

    try {
      this.db.prepare(`
        UPDATE cache_stats 
        SET total_hits = 0, total_misses = 0, total_sets = 0, 
            total_deletes = 0, total_evictions = 0, last_reset = ?
        WHERE id = 1
      `).run(Math.floor(Date.now() / 1000));

      return true;
    } catch (error) {
      console.error('SQLite Cache: ResetStats failed:', error.message);
      return false;
    }
  }

  /**
   * Get database size
   */
  getDatabaseSize() {
    if (!this.connected) return 0;

    try {
      const stmt = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
      return stmt.get().size || 0;
    } catch (error) {
      return 0;
    }
  }
}
