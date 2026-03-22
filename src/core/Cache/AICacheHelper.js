/**
 * AI Response Caching Helper
 * Caches AI responses to improve performance and reduce API calls
 */
export default class AICacheHelper {
    constructor(cacheManager, options = {}) {
        this.cache = cacheManager;
        this.enabled = options.enabled !== false;
        this.ttl = options.ttl || 86400000; // 24 hours
        this.stats = {
            hits: 0,
            misses: 0,
            saves: 0
        };
    }

    /**
     * Generate cache key from message and context
     */
    generateKey(message, options = {}) {
        const parts = [
            message.trim().toLowerCase(),
            options.model || 'default',
            options.temperature || '0.7',
            options.characteristic || 'default',
            options.sheetContext ? 'with-context' : 'no-context'
        ];
        return 'ai_' + this.hashCode(parts.join('|'));
    }

    /**
     * Simple hash function for strings
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get cached response
     */
    async get(message, options = {}) {
        if (!this.enabled) return null;

        const key = this.generateKey(message, options);
        const cached = await this.cache.get('ai', key);

        if (cached) {
            this.stats.hits++;
            console.log('AI Cache: HIT', key);
            return { content: cached, cached: true, key };
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Cache response
     */
    async set(message, response, options = {}) {
        if (!this.enabled || !response) return false;

        const key = this.generateKey(message, options);
        await this.cache.set('ai', key, response, { ttl: this.ttl });
        this.stats.saves++;
        console.log('AI Cache: SAVED', key);
        return true;
    }

    /**
     * Check if response is cached
     */
    async has(message, options = {}) {
        if (!this.enabled) return false;

        const key = this.generateKey(message, options);
        return await this.cache.has('ai', key);
    }

    /**
     * Delete cached response
     */
    async delete(message, options = {}) {
        const key = this.generateKey(message, options);
        return await this.cache.delete('ai', key);
    }

    /**
     * Clear all AI cache
     */
    async clear() {
        await this.cache.clear('ai');
        this.stats = { hits: 0, misses: 0, saves: 0 };
    }

    /**
     * Get cache stats
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            enabled: this.enabled,
            ttl: this.ttl
        };
    }

    /**
     * Enable/disable caching
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Set cache TTL
     */
    setTTL(ttl) {
        this.ttl = ttl;
    }

    /**
     * Export cached responses
     */
    async export() {
        return await this.cache.export('ai');
    }

    /**
     * Import cached responses
     */
    async import(json) {
        return await this.cache.import(json, 'ai');
    }
}
