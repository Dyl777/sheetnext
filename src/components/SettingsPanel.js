/**
 * SettingsPanel - Application preferences and configuration
 * Centralized settings UI for all SheetNext features
 */

export default class SettingsPanel {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.settings = {
            theme: 'light',
            language: 'en-US',
            autoSave: true,
            autoSaveInterval: 5,
            showGridlines: true,
            showHeaders: true,
            fontSize: 14,
            defaultChartType: 'column',
            aiProvider: 'groq',
            recordingEnabled: true,
            automationEnabled: true,
            ragEnabled: true
        };
    }

    /**
     * Create settings panel UI
     */
    show() {
        const dialog = document.createElement('div');
        dialog.className = 'settings-panel-modal';
        dialog.innerHTML = `
            <div class="settings-panel-dialog">
                <div class="dialog-header">
                    <h3>⚙️ Settings</h3>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="settings-tabs">
                    <button class="tab-btn active" data-tab="general">General</button>
                    <button class="tab-btn" data-tab="editing">Editing</button>
                    <button class="tab-btn" data-tab="ai">AI & Features</button>
                    <button class="tab-btn" data-tab="advanced">Advanced</button>
                </div>
                
                <div class="dialog-body">
                    <!-- General Tab -->
                    <div class="settings-tab active" id="general-tab">
                        <div class="setting-item">
                            <label>Theme</label>
                            <select id="theme">
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="auto">Auto (System)</option>
                            </select>
                        </div>
                        
                        <div class="setting-item">
                            <label>Language</label>
                            <select id="language">
                                <option value="en-US">English</option>
                                <option value="es-ES">Spanish</option>
                                <option value="fr-FR">French</option>
                                <option value="de-DE">German</option>
                                <option value="zh-CN">Chinese (Simplified)</option>
                                <option value="ja-JP">Japanese</option>
                            </select>
                        </div>
                        
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="autoSave" checked>
                            <label for="autoSave">Auto-save spreadsheet</label>
                        </div>
                        
                        <div class="setting-item">
                            <label for="autoSaveInterval">Auto-save every (minutes)</label>
                            <input type="number" id="autoSaveInterval" min="1" max="60" value="5">
                        </div>
                    </div>
                    
                    <!-- Editing Tab -->
                    <div class="settings-tab" id="editing-tab">
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="showGridlines" checked>
                            <label for="showGridlines">Show gridlines</label>
                        </div>
                        
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="showHeaders" checked>
                            <label for="showHeaders">Show column/row headers</label>
                        </div>
                        
                        <div class="setting-item">
                            <label for="fontSize">Font size (px)</label>
                            <input type="number" id="fontSize" min="8" max="24" value="14">
                        </div>
                        
                        <div class="setting-item">
                            <label for="defaultChartType">Default chart type</label>
                            <select id="defaultChartType">
                                <option value="column">Column</option>
                                <option value="bar">Bar</option>
                                <option value="line">Line</option>
                                <option value="pie">Pie</option>
                                <option value="scatter">Scatter</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- AI Tab -->
                    <div class="settings-tab" id="ai-tab">
                        <div class="setting-item">
                            <label for="aiProvider">AI Provider</label>
                            <select id="aiProvider">
                                <option value="groq">Groq (Recommended)</option>
                                <option value="openai">OpenAI</option>
                                <option value="ollama">Ollama</option>
                            </select>
                        </div>
                        
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="recordingEnabled" checked>
                            <label for="recordingEnabled">Enable action recording</label>
                        </div>
                        
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="automationEnabled" checked>
                            <label for="automationEnabled">Enable automation rules</label>
                        </div>
                        
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="ragEnabled" checked>
                            <label for="ragEnabled">Enable RAG document search</label>
                        </div>
                    </div>
                    
                    <!-- Advanced Tab -->
                    <div class="settings-tab" id="advanced-tab">
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="debugMode">
                            <label for="debugMode">Enable debug mode (console logs)</label>
                        </div>
                        
                        <div class="setting-item checkbox">
                            <input type="checkbox" id="offlineMode">
                            <label for="offlineMode">Offline editing (no backend sync)</label>
                        </div>
                        
                        <button class="btn btn-secondary" id="resetSettingsBtn">Reset to Defaults</button>
                        <button class="btn btn-secondary" id="exportSettingsBtn">Export Settings</button>
                        <button class="btn btn-secondary" id="importSettingsBtn">Import Settings</button>
                    </div>
                </div>
                
                <div class="dialog-footer">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-success" id="saveBtn">Save Settings</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this._attachTabListeners(dialog);
        this._attachButtonListeners(dialog);
        this._loadSettings(dialog);
    }

    /**
     * Attach tab listeners
     */
    _attachTabListeners(dialog) {
        dialog.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                dialog.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                dialog.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                
                e.target.classList.add('active');
                const tabId = e.target.dataset.tab + '-tab';
                document.getElementById(tabId)?.classList.add('active');
            });
        });
    }

    /**
     * Attach button listeners
     */
    _attachButtonListeners(dialog) {
        dialog.querySelector('.close-btn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#cancelBtn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#saveBtn')?.addEventListener('click', () => this._saveSettings(dialog));
        dialog.querySelector('#resetSettingsBtn')?.addEventListener('click', () => this._resetSettings(dialog));
        dialog.querySelector('#exportSettingsBtn')?.addEventListener('click', () => this._exportSettings());
        dialog.querySelector('#importSettingsBtn')?.addEventListener('click', () => this._importSettings());
    }

    /**
     * Load settings
     */
    _loadSettings(dialog) {
        dialog.querySelector('#theme')?.value = this.settings.theme;
        dialog.querySelector('#language')?.value = this.settings.language;
        dialog.querySelector('#autoSave')?.checked = this.settings.autoSave;
        dialog.querySelector('#autoSaveInterval')?.value = this.settings.autoSaveInterval;
        dialog.querySelector('#showGridlines')?.checked = this.settings.showGridlines;
        dialog.querySelector('#showHeaders')?.checked = this.settings.showHeaders;
        dialog.querySelector('#fontSize')?.value = this.settings.fontSize;
        dialog.querySelector('#defaultChartType')?.value = this.settings.defaultChartType;
        dialog.querySelector('#aiProvider')?.value = this.settings.aiProvider;
        dialog.querySelector('#recordingEnabled')?.checked = this.settings.recordingEnabled;
        dialog.querySelector('#automationEnabled')?.checked = this.settings.automationEnabled;
        dialog.querySelector('#ragEnabled')?.checked = this.settings.ragEnabled;
    }

    /**
     * Save settings
     */
    async _saveSettings(dialog) {
        this.settings.theme = dialog.querySelector('#theme')?.value;
        this.settings.language = dialog.querySelector('#language')?.value;
        this.settings.autoSave = dialog.querySelector('#autoSave')?.checked;
        this.settings.autoSaveInterval = parseInt(dialog.querySelector('#autoSaveInterval')?.value);
        this.settings.showGridlines = dialog.querySelector('#showGridlines')?.checked;
        this.settings.showHeaders = dialog.querySelector('#showHeaders')?.checked;
        this.settings.fontSize = parseInt(dialog.querySelector('#fontSize')?.value);
        this.settings.defaultChartType = dialog.querySelector('#defaultChartType')?.value;
        this.settings.aiProvider = dialog.querySelector('#aiProvider')?.value;
        this.settings.recordingEnabled = dialog.querySelector('#recordingEnabled')?.checked;
        this.settings.automationEnabled = dialog.querySelector('#automationEnabled')?.checked;
        this.settings.ragEnabled = dialog.querySelector('#ragEnabled')?.checked;

        // Save to localStorage
        localStorage.setItem('SN_Settings', JSON.stringify(this.settings));
        
        // Apply theme
        this._applyTheme(this.settings.theme);

        console.log('✓ Settings saved');
        dialog.remove();
    }

    /**
     * Apply theme
     */
    _applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Reset settings
     */
    async _resetSettings(dialog) {
        if (!confirm('Reset all settings to defaults?')) return;

        this.settings = {
            theme: 'light',
            language: 'en-US',
            autoSave: true,
            autoSaveInterval: 5,
            showGridlines: true,
            showHeaders: true,
            fontSize: 14,
            defaultChartType: 'column',
            aiProvider: 'groq',
            recordingEnabled: true,
            automationEnabled: true,
            ragEnabled: true
        };

        localStorage.removeItem('SN_Settings');
        this._loadSettings(dialog);
    }

    /**
     * Export settings
     */
    _exportSettings() {
        const json = JSON.stringify(this.settings, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `settings-${Date.now()}.json`;
        link.click();
    }

    /**
     * Import settings
     */
    _importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    this.settings = JSON.parse(event.target.result);
                    localStorage.setItem('SN_Settings', JSON.stringify(this.settings));
                    console.log('✓ Settings imported');
                } catch (error) {
                    alert('Invalid settings file');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}
