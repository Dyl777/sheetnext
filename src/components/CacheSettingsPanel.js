/**
 * CacheSettingsPanel - Configure caching (server-side settings API)
 * Routes live under /api/cache/api/* (see backend/routes/cache-api.js).
 */

export default class CacheSettingsPanel {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        this._apiBase = `${this.backendUrl.replace(/\/$/, '')}/api/cache/api`;
    }

    _bearer() {
        return this.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('sheetnext_token') : null);
    }

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
                    <div class="setting-section">
                        <h4>Cache Strategy</h4>
                        <label class="radio-option">
                            <input type="radio" name="strategy" value="memory-first">
                            <span>Memory (Fast, Limited)</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="strategy" value="disk-first">
                            <span>SQLite (Persistent, Slower)</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="strategy" value="hybrid" checked>
                            <span>Hybrid (Memory + SQLite)</span>
                        </label>
                    </div>

                    <div class="setting-section">
                        <label>Max Cache Size (MB)</label>
                        <input type="number" id="cacheSize" min="10" max="500" value="100" class="form-input">
                        <small>Older entries deleted when limit reached</small>
                    </div>

                    <div class="setting-section">
                        <label>Cache Expiration (hours)</label>
                        <input type="number" id="cacheTTL" min="1" max="720" value="24" class="form-input">
                        <small>Entries older than this are automatically removed</small>
                    </div>

                    <div class="setting-section">
                        <label class="checkbox-option">
                            <input type="checkbox" id="cacheAIResponses" checked>
                            <span>Cache AI Responses</span>
                        </label>
                        <small>Reuse similar AI responses (saves API calls)</small>
                    </div>

                    <div class="setting-section">
                        <label class="checkbox-option">
                            <input type="checkbox" id="cacheDocuments" checked>
                            <span>Cache Document Chunks</span>
                        </label>
                        <small>Cache RAG document embeddings for faster retrieval</small>
                    </div>

                    <div class="setting-section">
                        <label class="checkbox-option">
                            <input type="checkbox" id="cacheFormulas" checked>
                            <span>Cache Formula Results</span>
                        </label>
                        <small>Recalculate only when inputs change</small>
                    </div>

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

                    <div class="setting-section">
                        <button type="button" class="btn btn-secondary" id="clearCacheBtn">Clear Cache</button>
                        <button type="button" class="btn btn-secondary" id="exportCacheBtn">Export Cache</button>
                    </div>
                </div>

                <div class="dialog-footer">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button type="button" class="btn btn-success" id="saveBtn">Save Settings</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this._loadSettings(dialog);
        this._loadStats(dialog);
        this._attachListeners(dialog);
    }

    _strategyToRadio(serverStrategy) {
        const m = { memory: 'memory-first', sqlite: 'disk-first', hybrid: 'hybrid' };
        return m[serverStrategy] || 'hybrid';
    }

    _radioToStrategy(radioValue) {
        const m = { 'memory-first': 'memory', 'disk-first': 'sqlite', hybrid: 'hybrid' };
        return m[radioValue] || 'hybrid';
    }

    async _loadSettings(dialog) {
        const auth = this._bearer();
        if (!auth) return;

        try {
            const response = await fetch(`${this._apiBase}/settings`, {
                headers: { Authorization: `Bearer ${auth}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            const s = data.settings || {};

            const radioVal = this._strategyToRadio(s.strategy);
            dialog.querySelectorAll('input[name="strategy"]').forEach((el) => {
                el.checked = el.value === radioVal;
            });

            const sizeEl = dialog.querySelector('#cacheSize');
            if (sizeEl) sizeEl.value = s.maxSizeMB ?? 100;

            const ttlEl = dialog.querySelector('#cacheTTL');
            if (ttlEl) {
                const sec = s.ttlSeconds ?? 3600;
                ttlEl.value = Math.max(1, Math.round(sec / 3600));
            }

            const aiEl = dialog.querySelector('#cacheAIResponses');
            if (aiEl) aiEl.checked = s.enableAICache !== false;

            const docEl = dialog.querySelector('#cacheDocuments');
            if (docEl) docEl.checked = s.enableDocumentCache !== false;

            const formEl = dialog.querySelector('#cacheFormulas');
            if (formEl) formEl.checked = s.enableFormulaCache !== false;
        } catch (error) {
            console.warn('Could not load cache settings:', error);
        }
    }

    async _loadStats(dialog) {
        const auth = this._bearer();
        if (!auth) return;

        try {
            const response = await fetch(`${this._apiBase}/stats`, {
                headers: { Authorization: `Bearer ${auth}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            const st = data.stats || {};
            const total = st.totalEntries ?? st.totalItems ?? 0;
            const usedBytes = st.usedSpace ?? 0;
            let hitPct;
            if (typeof st.hitRate === 'number') {
                hitPct = st.hitRate <= 1 ? st.hitRate * 100 : st.hitRate;
            } else if (typeof st.hitRatePercent === 'string') {
                hitPct = parseFloat(st.hitRatePercent) || 0;
            } else {
                hitPct = 0;
            }

            const te = dialog.querySelector('#totalEntries');
            if (te) te.textContent = String(total);

            const us = dialog.querySelector('#usedSpace');
            if (us) us.textContent = (usedBytes / (1024 * 1024)).toFixed(2) + ' MB';

            const hr = dialog.querySelector('#hitRate');
            if (hr) hr.textContent = hitPct.toFixed(1) + '%';
        } catch (error) {
            console.warn('Could not load cache stats:', error);
        }
    }

    _attachListeners(dialog) {
        dialog.querySelector('.close-btn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#cancelBtn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#saveBtn')?.addEventListener('click', () => this._saveSettings(dialog));
        dialog.querySelector('#clearCacheBtn')?.addEventListener('click', () => this._clearCache(dialog));
        dialog.querySelector('#exportCacheBtn')?.addEventListener('click', () => this._exportCache());
    }

    async _saveSettings(dialog) {
        const auth = this._bearer();
        if (!auth) {
            console.error('Not signed in');
            return;
        }

        const strategyRadio = dialog.querySelector('input[name="strategy"]:checked')?.value || 'hybrid';
        const payload = {
            strategy: this._radioToStrategy(strategyRadio),
            maxSizeMB: parseInt(dialog.querySelector('#cacheSize')?.value, 10) || 100,
            ttlHours: parseInt(dialog.querySelector('#cacheTTL')?.value, 10) || 24,
            cacheAI: dialog.querySelector('#cacheAIResponses')?.checked,
            cacheDocuments: dialog.querySelector('#cacheDocuments')?.checked,
            cacheFormulas: dialog.querySelector('#cacheFormulas')?.checked
        };

        try {
            const response = await fetch(`${this._apiBase}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('Save failed:', err.error || response.statusText);
                return;
            }

            console.log('✓ Cache settings saved');
            dialog.remove();
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    async _clearCache(dialog) {
        if (!confirm('Clear all cache? This action cannot be undone.')) return;

        const auth = this._bearer();
        if (!auth) return;

        try {
            const response = await fetch(`${this._apiBase}/clear`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${auth}` }
            });

            if (response.ok) {
                console.log('✓ Cache cleared');
                if (dialog) this._loadStats(dialog);
            }
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    async _exportCache() {
        const auth = this._bearer();
        if (!auth) return;

        try {
            const response = await fetch(`${this._apiBase}/export`, {
                headers: { Authorization: `Bearer ${auth}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `cache-export-${Date.now()}.json`;
                link.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export cache:', error);
        }
    }
}
