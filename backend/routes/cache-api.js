/**
 * Cache API Routes
 * Endpoints for cache configuration, statistics, and management
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Cache configuration storage (in-memory, could persist to DB)
let cacheConfig = {
    strategy: 'hybrid',
    maxSizeMB: 100,
    ttlSeconds: 3600,
    enableAICache: true,
    enableDocumentCache: true,
    enableFormulaCache: true
};

let cacheStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalItems: 0,
    totalSizeMB: 0,
    memoryUsage: 0,
    diskUsage: 0
};

/**
 * GET /api/cache/api/settings
 * Retrieve current cache settings
 */
router.get('/settings', authMiddleware, (req, res) => {
    try {
        res.json({
            success: true,
            settings: cacheConfig,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/cache/api/settings
 * Update cache settings
 */
router.post('/settings', authMiddleware, express.json(), (req, res) => {
    try {
        const { strategy, maxSizeMB, ttlSeconds, enableAICache, enableDocumentCache, enableFormulaCache } = req.body;

        if (strategy) cacheConfig.strategy = strategy;
        if (maxSizeMB !== undefined) cacheConfig.maxSizeMB = maxSizeMB;
        if (ttlSeconds !== undefined) cacheConfig.ttlSeconds = ttlSeconds;
        if (enableAICache !== undefined) cacheConfig.enableAICache = enableAICache;
        if (enableDocumentCache !== undefined) cacheConfig.enableDocumentCache = enableDocumentCache;
        if (enableFormulaCache !== undefined) cacheConfig.enableFormulaCache = enableFormulaCache;

        console.log('✓ Cache settings updated:', cacheConfig);

        res.json({
            success: true,
            message: 'Cache settings updated',
            settings: cacheConfig
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/cache/api/stats
 * Get cache statistics
 */
router.get('/stats', authMiddleware, (req, res) => {
    try {
        const hitRate = cacheStats.totalRequests > 0 
            ? ((cacheStats.cacheHits / cacheStats.totalRequests) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            stats: {
                ...cacheStats,
                hitRate: `${hitRate}%`,
                strategy: cacheConfig.strategy,
                maxSizeMB: cacheConfig.maxSizeMB
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/cache/api/clear
 * Clear all cache data
 */
router.post('/clear', authMiddleware, (req, res) => {
    try {
        // Reset stats
        cacheStats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalItems: 0,
            totalSizeMB: 0,
            memoryUsage: 0,
            diskUsage: 0
        };

        console.log('✓ Cache cleared');

        res.json({
            success: true,
            message: 'All cache cleared',
            stats: cacheStats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/cache/api/export
 * Export cache data as JSON
 */
router.get('/export', authMiddleware, (req, res) => {
    try {
        const exportData = {
            config: cacheConfig,
            stats: cacheStats,
            timestamp: new Date().toISOString(),
            format: 'json',
            version: '1.0'
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="cache-export.json"');
        res.json(exportData);

        console.log('✓ Cache exported');
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/cache/api/import
 * Import cache data from JSON
 */
router.post('/import', authMiddleware, express.json(), (req, res) => {
    try {
        const { config, stats } = req.body;

        if (config) {
            Object.assign(cacheConfig, config);
        }

        if (stats) {
            Object.assign(cacheStats, stats);
        }

        console.log('✓ Cache imported');

        res.json({
            success: true,
            message: 'Cache imported successfully',
            config: cacheConfig
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/cache/api/record-hit
 * Record cache hit (internal use)
 */
router.post('/record-hit', (req, res) => {
    cacheStats.totalRequests++;
    cacheStats.cacheHits++;
    res.json({ success: true });
});

/**
 * POST /api/cache/api/record-miss
 * Record cache miss (internal use)
 */
router.post('/record-miss', (req, res) => {
    cacheStats.totalRequests++;
    cacheStats.cacheMisses++;
    res.json({ success: true });
});

/**
 * GET /api/cache/api/health
 * Check cache system health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        config: cacheConfig,
        performance: {
            hitRate: cacheStats.totalRequests > 0 
                ? ((cacheStats.cacheHits / cacheStats.totalRequests) * 100).toFixed(2)
                : 0,
            totalRequests: cacheStats.totalRequests
        }
    });
});

export default router;
