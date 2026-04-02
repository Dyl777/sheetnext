/**
 * CacheSettingsPanel - Configure caching strategies
 * Supports: SQLite, NoSQL, IndexedDB, automatic cache management
 */

export default class CacheSettingsPanel {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
    }

    /**
     * Create and show cache settings UI
     */
    show() {
        const dialog = document.createElement('div');
        dialog.className = 'cache-settings-modal';
        dialog.innerHTML = `
            <div class="cache-settings-dialog">
                <div class="dialog-header">
                    <h3>⚙️ Cache Settings</h3>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="dialog-body">
                    <!-- Cache Strategy -->
                    <div class="setting-section">
                        <h4>Cache Strategy</h4>
                        <label class="radio-option">
                            <input type="radio" name="strategy" value="memory-first" checked>
                            <span>Memory (Fast, Limited)</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="strategy" value="disk-first">
                            <span>SQLite (Persistent, Slower)</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="strategy" value="hybrid">
                            <span>Hybrid (Memory + SQLite)</span>
                        </label>
                    </div>

                    <!-- Cache Size -->
                    <div class="setting-section">
                        <label>Max Cache Size (MB)</label>
                        <input type="number" id="cacheSize" min="10" max="500" value="100" class="form-input">
                        <small>Older entries deleted when limit reached</small>
                    </div>

                    <!-- TTL (Time to Live) -->
                    <div class="setting-section">
                        <label>Cache Expiration (hours)</label>
                        <input type="number" id="cacheTTL" min="1" max="720" value="24" class="form-input">
                        <small>Entries older than this are automatically removed</small>
                    </div>

                    <!-- AI Response Caching -->
                    <div class="setting-section">
                        <label class="checkbox-option">
                            <input type="checkbox" id="cacheAIResponses" checked>
                            <span>Cache AI Responses</span>
                        </label>
                        <small>Reuse similar AI responses (saves API calls)</small>
                    </div>

                    <!-- Document Caching -->
                    <div class="setting-section">
                        <label class="checkbox-option">
                            <input type="checkbox" id="cacheDocuments" checked>
                            <span>Cache Document Chunks</span>
                        </label>
                        <small>Cache RAG document embeddings for faster retrieval</small>
                    </div>

                    <!-- Formula Result Caching -->
                    <div class="setting-section">
                        <label class="checkbox-option">
                            <input type="checkbox" id="cacheFormulas" checked>
                            <span>Cache Formula Results</span>
                        </label>
                        <small>Recalculate only when inputs change</small>
                    </div>

                    <!-- Cache Statistics -->
                    <div class="setting-section">
                        <h4>Cache Statistics</h4>
                        <div class="cache-stats">
                            <div class="stat-item">
                                <span>Total Entries:</span>
                                <strong id="totalEntries">0</strong>
                            </div>
                            <div class="stat-item">
                                <span>Used Space:</span>
                                <strong id="usedSpace">0 MB</strong>
                            </div>
                            <div class="stat-item">
                                <span>Hit Rate:</span>
                                <strong id="hitRate">0%</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Cache Actions -->
                    <div class="setting-section">
                        <button class="btn btn-secondary" id="clearCacheBtn">Clear Cache</button>
                        <button class="btn btn-secondary" id="exportCacheBtn">Export Cache</button>
                    </div>
                </div>

                <div class="dialog-footer">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-success" id="saveBtn">Save Settings</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this._loadSettings();
        this._loadStats();
        this._attachListeners(dialog);
    }

    /**
     * Load current settings
     */
    async _loadSettings() {
        try {
            const response = await fetch(`${this.backendUrl}/api/cache/settings`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const settings = await response.json();
                document.querySelector('input[name="strategy"]').value = settings.strategy;
                document.querySelector('#cacheSize').value = settings.maxCacheSize;
                document.querySelector('#cacheTTL').value = settings.ttlHours;
                document.querySelector('#cacheAIResponses').checked = settings.cacheAI;
                document.querySelector('#cacheDocuments').checked = settings.cacheDocuments;
                document.querySelector('#cacheFormulas').checked = settings.cacheFormulas;
            }
        } catch (error) {
            console.warn('Could not load cache settings:', error);
        }
    }

    /**
     * Load cache statistics
     */
    async _loadStats() {
        try {
            const response = await fetch(`${this.backendUrl}/api/cache/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const stats = await response.json();
                document.querySelector('#totalEntries').textContent = stats.totalEntries;
                document.querySelector('#usedSpace').textContent = (stats.usedSpace / 1024 / 1024).toFixed(2) + ' MB';
                document.querySelector('#hitRate').textContent = (stats.hitRate * 100).toFixed(1) + '%';
            }
        } catch (error) {
            console.warn('Could not load cache stats:', error);
        }
    }

    /**
     * Attach event listeners
     */
    _attachListeners(dialog) {
        dialog.querySelector('.close-btn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#cancelBtn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#saveBtn')?.addEventListener('click', () => this._saveSettings(dialog));
        dialog.querySelector('#clearCacheBtn')?.addEventListener('click', () => this._clearCache());
        dialog.querySelector('#exportCacheBtn')?.addEventListener('click', () => this._exportCache());
    }

    /**
     * Save settings
     */
    async _saveSettings(dialog) {
        const settings = {
            strategy: document.querySelector('input[name="strategy"]:checked')?.value,
            maxCacheSize: parseInt(document.querySelector('#cacheSize')?.value),
            ttlHours: parseInt(document.querySelector('#cacheTTL')?.value),
            cacheAI: document.querySelector('#cacheAIResponses')?.checked,
            cacheDocuments: document.querySelector('#cacheDocuments')?.checked,
            cacheFormulas: document.querySelector('#cacheFormulas')?.checked
        };

        try {
            await fetch(`${this.backendUrl}/api/cache/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(settings)
            });

            console.log('✓ Cache settings saved');
            dialog.remove();
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Clear cache
     */
    async _clearCache() {
        if (!confirm('Clear all cache? This action cannot be undone.')) return;

        try {
            await fetch(`${this.backendUrl}/api/cache/clear`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            console.log('✓ Cache cleared');
            this._loadStats();
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    /**
     * Export cache
     */
    async _exportCache() {
        try {
            const response = await fetch(`${this.backendUrl}/api/cache/export`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `cache-export-${Date.now()}.json`;
                link.click();
            }
        } catch (error) {
            console.error('Failed to export cache:', error);
        }
    }
}
