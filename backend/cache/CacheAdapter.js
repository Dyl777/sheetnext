/**
 * Cache Adapter System
 * Unified interface for multiple cache backends
 */

import SQLiteCacheBackend from './SQLiteCacheBackend.js';
import MiniNoSQLStore from './MiniNoSQLStore.js';

export const CacheBackendType = {
  MEMORY: 'memory',
  SQLITE: 'sqlite',
  NOSQL: 'nosql',
  REDIS: 'redis' // Future
};

export default class CacheAdapter {
  constructor(options = {}) {
    this.options = {
      defaultBackend: options.defaultBackend || CacheBackendType.SQLITE,
      fallbackToMemory: options.fallbackToMemory !== false,
      ...options
    };
    
    this.backends = new Map();
    this.primary = null;
    
    this._initializeBackends();
  }

  /**
   * Initialize cache backends
   */
  _initializeBackends() {
    // Initialize SQLite
    if (this.options.sqlite?.enabled !== false) {
      const sqlite = new SQLiteCacheBackend(this.options.sqlite);
      if (sqlite.connect()) {
        this.backends.set(CacheBackendType.SQLITE, sqlite);
        if (this.options.defaultBackend === CacheBackendType.SQLITE) {
          this.primary = sqlite;
        }
      }
    }

    // Initialize NoSQL
    if (this.options.nosql?.enabled !== false) {
      const nosql = new MiniNoSQLStore(this.options.nosql);
      this.backends.set(CacheBackendType.NOSQL, nosql);
      if (this.options.defaultBackend === CacheBackendType.NOSQL) {
        this.primary = nosql;
      }
    }

    // Fallback to memory if no backend initialized
    if (!this.primary && this.options.fallbackToMemory) {
      console.warn('Cache Adapter: No backend available, using memory-only cache');
    }
  }

  /**
   * Get backend by type
   */
  getBackend(type) {
    return this.backends.get(type) || this.primary;
  }

  /**
   * Set cache with backend selection
   */
  set(type, key, value, options = {}) {
    const backend = options.backend ? this.getBackend(options.backend) : this.primary;
    if (backend) {
      return backend.set(type, key, value, options);
    }
    return false;
  }

  /**
   * Get cache with backend selection
   */
  get(type, key, options = {}) {
    const backend = options.backend ? this.getBackend(options.backend) : this.primary;
    if (backend) {
      return backend.get(type, key);
    }
    return null;
  }

  /**
   * Delete from cache
   */
  delete(type, key, options = {}) {
    const backend = options.backend ? this.getBackend(options.backend) : this.primary;
    if (backend) {
      return backend.delete(type, key);
    }
    return false;
  }

  /**
   * Clear cache
   */
  clear(type = null, options = {}) {
    const results = [];
    for (const [name, backend] of this.backends) {
      results.push(backend.clear(type));
    }
    return results.every(r => r);
  }

  /**
   * Get stats from all backends
   */
  getStats() {
    const stats = {
      backends: {},
      primary: this.options.defaultBackend
    };

    for (const [name, backend] of this.backends) {
      if (backend.getStats) {
        stats.backends[name] = backend.getStats();
      }
    }

    return stats;
  }

  /**
   * Export from specific backend
   */
  export(backendType = null) {
    const backend = backendType ? this.getBackend(backendType) : this.primary;
    if (backend?.export) {
      return backend.export();
    }
    return null;
  }

  /**
   * Import to specific backend
   */
  import(json, backendType = null) {
    const backend = backendType ? this.getBackend(backendType) : this.primary;
    if (backend?.import) {
      return backend.import(json);
    }
    return 0;
  }

  /**
   * Migrate data between backends
   */
  async migrate(fromType, toType) {
    const fromBackend = this.getBackend(fromType);
    const toBackend = this.getBackend(toType);

    if (!fromBackend || !toBackend) {
      console.error('Cache Adapter: Migration failed - backend not available');
      return { success: false, migrated: 0 };
    }

    const json = fromBackend.export();
    if (!json) {
      return { success: false, migrated: 0 };
    }

    const count = toBackend.import(json);
    console.log('Cache Adapter: Migrated', count, 'entries from', fromType, 'to', toType);

    return { success: true, migrated: count };
  }

  /**
   * Cleanup all backends
   */
  cleanup() {
    let total = 0;
    for (const [name, backend] of this.backends) {
      if (backend.cleanup) {
        total += backend.cleanup();
      }
    }
    return total;
  }

  /**
   * Close all backends
   */
  async close() {
    for (const [name, backend] of this.backends) {
      if (backend.close) {
        await backend.close();
      }
    }
    console.log('Cache Adapter: All backends closed');
  }
}
