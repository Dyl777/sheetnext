/**
 * SheetNext Caching System
 * Comprehensive caching with LRU eviction, TTL, and persistence
 */

/**
 * LRU Cache Implementation
 */
class LRUCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }
        
        // Move to end (most recently used)
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        
        return value;
    }

    set(key, value) {
        // Delete if exists to update position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, value);
    }

    delete(key) {
        return this.cache.delete(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }

    keys() {
        return Array.from(this.cache.keys());
    }

    values() {
        return Array.from(this.cache.values());
    }

    entries() {
        return Array.from(this.cache.entries());
    }
}

/**
 * Cache Entry with TTL support
 */
class CacheEntry {
    constructor(value, ttl = null) {
        this.value = value;
        this.createdAt = Date.now();
        this.ttl = ttl; // Time to live in milliseconds
        this.expiresAt = ttl ? this.createdAt + ttl : null;
        this.accessCount = 0;
        this.lastAccessedAt = this.createdAt;
    }

    isExpired() {
        if (!this.expiresAt) return false;
        return Date.now() > this.expiresAt;
    }

    access() {
        this.accessCount++;
        this.lastAccessedAt = Date.now();
    }

    toJSON() {
        return {
            value: this.value,
            createdAt: this.createdAt,
            ttl: this.ttl,
            expiresAt: this.expiresAt,
            accessCount: this.accessCount,
            lastAccessedAt: this.lastAccessedAt
        };
    }

    static fromJSON(json) {
        const entry = new CacheEntry(json.value, json.ttl);
        entry.createdAt = json.createdAt;
        entry.expiresAt = json.expiresAt;
        entry.accessCount = json.accessCount;
        entry.lastAccessedAt = json.lastAccessedAt;
        return entry;
    }
}

/**
 * Main Cache Manager
 */
export default class CacheManager {
    constructor(options = {}) {
        this.options = {
            maxSize: options.maxSize || 1000,
            defaultTTL: options.defaultTTL || 3600000, // 1 hour
            enablePersistence: options.enablePersistence !== false,
            dbName: options.dbName || 'SheetNextCache',
            dbVersion: options.dbVersion || 1,
            ...options
        };

        // In-memory caches for different types
        this.caches = {
            ai: new LRUCache(this.options.maxSize),
            documents: new LRUCache(500),
            api: new LRUCache(200),
            general: new LRUCache(this.options.maxSize)
        };

        // IndexedDB for persistence
        this.db = null;
        this.dbReady = false;

        // Stats
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };

        // Initialize
        if (this.options.enablePersistence) {
            this._initIndexedDB();
        }

        // Start cleanup interval
        this._startCleanupInterval();
    }

    /**
     * Initialize IndexedDB
     */
    _initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.options.dbName, this.options.dbVersion);

            request.onerror = () => {
                console.warn('IndexedDB not available, using memory-only cache');
                resolve();
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.dbReady = true;
                console.log('Cache: IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for different cache types
                const stores = ['ai', 'documents', 'api', 'general'];
                stores.forEach(type => {
                    if (!db.objectStoreNames.contains(type)) {
                        const store = db.createObjectStore(type, { keyPath: 'key' });
                        store.createIndex('expiresAt', 'expiresAt', { unique: false });
                        store.createIndex('createdAt', 'createdAt', { unique: false });
                    }
                });
            };
        });
    }

    /**
     * Get value from cache
     */
    async get(type, key) {
        const cache = this.caches[type] || this.caches.general;
        let entry = cache.get(key);

        // Check in-memory cache
        if (entry) {
            if (entry.isExpired()) {
                cache.delete(key);
                this.stats.misses++;
                return null;
            }
            
            entry.access();
            this.stats.hits++;
            return entry.value;
        }

        // Check IndexedDB
        if (this.dbReady) {
            try {
                entry = await this._getFromDB(type, key);
                if (entry) {
                    if (entry.isExpired()) {
                        await this._deleteFromDB(type, key);
                        this.stats.misses++;
                        return null;
                    }
                    
                    // Load into memory
                    cache.set(key, entry);
                    entry.access();
                    this.stats.hits++;
                    return entry.value;
                }
            } catch (err) {
                console.warn('Cache DB read error:', err);
            }
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Set value in cache
     */
    async set(type, key, value, options = {}) {
        const ttl = options.ttl || this.options.defaultTTL;
        const entry = new CacheEntry(value, ttl);
        
        const cache = this.caches[type] || this.caches.general;
        
        // Check if we're evicting
        const existed = cache.has(key);
        if (!existed && cache.size() >= cache.maxSize) {
            this.stats.evictions++;
        }
        
        cache.set(key, entry);
        this.stats.sets++;

        // Persist to IndexedDB
        if (this.options.enablePersistence && this.dbReady) {
            try {
                await this._setInDB(type, key, entry);
            } catch (err) {
                console.warn('Cache DB write error:', err);
            }
        }
    }

    /**
     * Delete from cache
     */
    async delete(type, key) {
        const cache = this.caches[type] || this.caches.general;
        const deleted = cache.delete(key);
        
        if (deleted) {
            this.stats.deletes++;
            
            // Delete from IndexedDB
            if (this.dbReady) {
                try {
                    await this._deleteFromDB(type, key);
                } catch (err) {
                    console.warn('Cache DB delete error:', err);
                }
            }
        }
        
        return deleted;
    }

    /**
     * Clear cache
     */
    async clear(type) {
        if (type) {
            this.caches[type]?.clear();
            
            if (this.dbReady) {
                await this._clearDB(type);
            }
        } else {
            // Clear all
            Object.values(this.caches).forEach(cache => cache.clear());
            
            if (this.dbReady) {
                await this._clearAllDB();
            }
        }
        
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0 };
    }

    /**
     * Check if key exists
     */
    async has(type, key) {
        const value = await this.get(type, key);
        return value !== null;
    }

    /**
     * Get cache stats
     */
    getStats() {
        const totalSize = Object.values(this.caches).reduce((sum, cache) => sum + cache.size(), 0);
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            totalSize,
            hitRate: `${hitRate}%`,
            caches: {
                ai: this.caches.ai.size(),
                documents: this.caches.documents.size(),
                api: this.caches.api.size(),
                general: this.caches.general.size()
            },
            dbReady: this.dbReady
        };
    }

    /**
     * Get entries by type
     */
    getEntries(type) {
        const cache = this.caches[type] || this.caches.general;
        return cache.entries().map(([key, entry]) => ({
            key,
            value: entry.value,
            createdAt: entry.createdAt,
            expiresAt: entry.expiresAt,
            accessCount: entry.accessCount,
            isExpired: entry.isExpired()
        }));
    }

    /**
     * Remove expired entries
     */
    async cleanup() {
        let removed = 0;

        for (const [type, cache] of Object.entries(this.caches)) {
            const keys = cache.keys();
            for (const key of keys) {
                const entry = cache.get(key);
                if (entry && entry.isExpired()) {
                    cache.delete(key);
                    removed++;
                    
                    if (this.dbReady) {
                        await this._deleteFromDB(type, key);
                    }
                }
            }
        }

        return removed;
    }

    /**
     * Start periodic cleanup
     */
    _startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, 300000); // Every 5 minutes
    }

    // IndexedDB Operations

    _getFromDB(type, key) {
        return new Promise((resolve, reject) => {
            if (!this.dbReady || !this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction([type], 'readonly');
            const store = transaction.objectStore(type);
            const request = store.get(key);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(CacheEntry.fromJSON(request.result.entry));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    _setInDB(type, key, entry) {
        return new Promise((resolve, reject) => {
            if (!this.dbReady || !this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.put({
                key,
                entry: entry.toJSON()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    _deleteFromDB(type, key) {
        return new Promise((resolve, reject) => {
            if (!this.dbReady || !this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    _clearDB(type) {
        return new Promise((resolve, reject) => {
            if (!this.dbReady || !this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    _clearAllDB() {
        const stores = ['ai', 'documents', 'api', 'general'];
        return Promise.all(stores.map(type => this._clearDB(type)));
    }

    /**
     * Export cache data
     */
    async export(type) {
        const data = {
            type,
            exportedAt: new Date().toISOString(),
            entries: this.getEntries(type)
        };
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import cache data
     */
    async import(json, type) {
        try {
            const data = JSON.parse(json);
            const entries = data.entries || [];
            
            for (const entry of entries) {
                const cacheEntry = CacheEntry.fromJSON(entry);
                if (!cacheEntry.isExpired()) {
                    await this.set(type, entry.key, cacheEntry.value, { ttl: cacheEntry.ttl });
                }
            }
            
            return entries.length;
        } catch (err) {
            console.error('Cache import error:', err);
            return 0;
        }
    }
}
