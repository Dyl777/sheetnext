/**
 * AI Action Module
 * Provides AI-powered spreadsheet operations
 */

/**
 * Select AI characteristic/persona
 */
export async function selectCharacteristic(id) {
    const success = this.SN.AICharacteristics.setActiveCharacteristic(id);
    if (success) {
        this.SN.Layout.updateActiveCharacteristicDisplay();
        this.SN.Layout.renderCharacteristicsList();
        const char = this.SN.AICharacteristics.getActiveCharacteristic();
        this.SN.Utils.toast(`Switched to ${char.name}`);
    }
}

/**
 * Open create characteristic modal
 */
export async function openCreateCharacteristic() {
    const t = this.SN.t.bind(this.SN);
    const ns = this.SN.namespace;
    
    const html = `
        <div class="sn-characteristic-form">
            <div class="sn-form-group">
                <label>${t('ai.characteristics.name', 'Name')}</label>
                <input type="text" id="charName" placeholder="My Custom Assistant">
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.description', 'Description')}</label>
                <input type="text" id="charDesc" placeholder="Brief description">
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.systemPrompt', 'System Prompt')}</label>
                <textarea id="charPrompt" rows="6" placeholder="You are a helpful assistant..."></textarea>
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.temperature', 'Temperature')}: <span id="tempValue">0.7</span></label>
                <input type="range" id="charTemp" min="0" max="1" step="0.1" value="0.7">
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.color', 'Color')}</label>
                <input type="color" id="charColor" value="#1890ff" style="width:100%;height:40px;">
            </div>
            <div class="sn-form-actions">
                <button onclick="${ns}.Action.cancelCharacteristic()" class="sn-btn">${t('ai.characteristics.cancel', 'Cancel')}</button>
                <button onclick="${ns}.Action.saveCharacteristic()" class="sn-btn sn-btn-primary">${t('ai.characteristics.save', 'Save')}</button>
            </div>
        </div>
    `;
    
    this.SN.Utils.showModal(html, t('ai.characteristics.create', 'Create New Characteristic'));
    
    // Add event listeners
    setTimeout(() => {
        const tempSlider = document.getElementById('charTemp');
        if (tempSlider) {
            tempSlider.oninput = (e) => {
                document.getElementById('tempValue').textContent = e.target.value;
            };
        }
    }, 100);
}

/**
 * Save characteristic
 */
export async function saveCharacteristic() {
    const container = this.SN.containerDom.querySelector('.sn-modal-content');
    const t = this.SN.t.bind(this.SN);
    
    const data = {
        name: container?.querySelector('#charName')?.value,
        description: container?.querySelector('#charDesc')?.value,
        systemPrompt: container?.querySelector('#charPrompt')?.value,
        temperature: parseFloat(container?.querySelector('#charTemp')?.value) || 0.7,
        color: container?.querySelector('#charColor')?.value || '#1890ff'
    };
    
    if (!data.name || !data.systemPrompt) {
        this.SN.Utils.toast('Name and System Prompt are required');
        return;
    }
    
    await this.SN.AICharacteristics.createCharacteristic(data);
    this.SN.Utils.closeModal();
    this.SN.Layout.renderCharacteristicsList();
    this.SN.Utils.toast(t('ai.characteristics.created', 'Characteristic created successfully'));
}

/**
 * Cancel characteristic creation
 */
export async function cancelCharacteristic() {
    this.SN.Utils.closeModal();
}

/**
 * Edit characteristic
 */
export async function editCharacteristic(id) {
    const characteristic = this.SN.AICharacteristics.getCharacteristic(id);
    if (!characteristic) return;
    
    const t = this.SN.t.bind(this.SN);
    const ns = this.SN.namespace;
    
    const html = `
        <div class="sn-characteristic-form">
            <div class="sn-form-group">
                <label>${t('ai.characteristics.name', 'Name')}</label>
                <input type="text" id="charName" value="${characteristic.name}">
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.description', 'Description')}</label>
                <input type="text" id="charDesc" value="${characteristic.description || ''}">
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.systemPrompt', 'System Prompt')}</label>
                <textarea id="charPrompt" rows="6">${characteristic.systemPrompt}</textarea>
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.temperature', 'Temperature')}: <span id="tempValue">${characteristic.settings?.temperature || 0.7}</span></label>
                <input type="range" id="charTemp" min="0" max="1" step="0.1" value="${characteristic.settings?.temperature || 0.7}">
            </div>
            <div class="sn-form-group">
                <label>${t('ai.characteristics.color', 'Color')}</label>
                <input type="color" id="charColor" value="${characteristic.color || '#1890ff'}" style="width:100%;height:40px;">
            </div>
            <div class="sn-form-actions">
                <button onclick="${ns}.Action.cancelCharacteristic()" class="sn-btn">${t('ai.characteristics.cancel', 'Cancel')}</button>
                <button onclick="${ns}.Action.updateCharacteristic('${id}')" class="sn-btn sn-btn-primary">${t('ai.characteristics.save', 'Save')}</button>
            </div>
        </div>
    `;
    
    this.SN.Utils.showModal(html, t('ai.characteristics.edit', 'Edit Characteristic'));
    
    // Add event listeners
    setTimeout(() => {
        const tempSlider = document.getElementById('charTemp');
        if (tempSlider) {
            tempSlider.oninput = (e) => {
                document.getElementById('tempValue').textContent = e.target.value;
            };
        }
    }, 100);
}

/**
 * Update characteristic
 */
export async function updateCharacteristic(id) {
    const container = this.SN.containerDom.querySelector('.sn-modal-content');
    const t = this.SN.t.bind(this.SN);
    
    const data = {
        name: container?.querySelector('#charName')?.value,
        description: container?.querySelector('#charDesc')?.value,
        systemPrompt: container?.querySelector('#charPrompt')?.value,
        settings: {
            temperature: parseFloat(container?.querySelector('#charTemp')?.value) || 0.7
        },
        color: container?.querySelector('#charColor')?.value || '#1890ff'
    };
    
    if (!data.name || !data.systemPrompt) {
        this.SN.Utils.toast('Name and System Prompt are required');
        return;
    }
    
    await this.SN.AICharacteristics.updateCharacteristic(id, data);
    this.SN.Utils.closeModal();
    this.SN.Layout.renderCharacteristicsList();
    this.SN.Layout.updateActiveCharacteristicDisplay();
    this.SN.Utils.toast(t('ai.characteristics.updated', 'Characteristic updated successfully'));
}

/**
 * Delete characteristic
 */
export async function deleteCharacteristic(id) {
    const t = this.SN.t.bind(this.SN);
    
    if (confirm(t('ai.characteristics.confirmDelete', 'Are you sure you want to delete this characteristic?'))) {
        const success = await this.SN.AICharacteristics.deleteCharacteristic(id);
        if (success) {
            this.SN.Layout.renderCharacteristicsList();
            this.SN.Layout.updateActiveCharacteristicDisplay();
            this.SN.Utils.toast(t('ai.characteristics.deleted', 'Characteristic deleted'));
        } else {
            this.SN.Utils.toast(t('ai.characteristics.cannotDeleteDefault', 'Cannot delete default characteristics'));
        }
    }
}

/**
 * Reset to default characteristics
 */
export async function resetCharacteristics() {
    const t = this.SN.t.bind(this.SN);
    
    if (confirm('Reset all characteristics to defaults? This will delete all custom characteristics.')) {
        await this.SN.AICharacteristics.resetToDefaults();
        this.SN.Layout.renderCharacteristicsList();
        this.SN.Layout.updateActiveCharacteristicDisplay();
        this.SN.Utils.toast('Characteristics reset to defaults');
    }
}

/**
 * Export characteristics
 */
export async function exportCharacteristics() {
    const json = this.SN.AICharacteristics.exportCharacteristics();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheetnext-characteristics.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Import characteristics
 */
export async function importCharacteristics() {
    const t = this.SN.t.bind(this.SN);
    const ns = this.SN.namespace;
    
    const html = `
        <div class="sn-characteristic-form">
            <div class="sn-form-group">
                <label>Select JSON file</label>
                <input type="file" id="charImportFile" accept=".json">
            </div>
            <div class="sn-form-actions">
                <button onclick="${ns}.Action.cancelCharacteristic()" class="sn-btn">${t('ai.characteristics.cancel', 'Cancel')}</button>
                <button onclick="${ns}.Action.confirmImportCharacteristic()" class="sn-btn sn-btn-primary">${t('ai.characteristics.save', 'Import')}</button>
            </div>
        </div>
    `;
    
    this.SN.Utils.showModal(html, 'Import Characteristics');
}

/**
 * Confirm import characteristic
 */
export async function confirmImportCharacteristic() {
    const fileInput = document.getElementById('charImportFile');
    const file = fileInput?.files?.[0];
    
    if (!file) {
        this.SN.Utils.toast('Please select a file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = e.target?.result;
            const success = await this.SN.AICharacteristics.importCharacteristics(json);
            this.SN.Utils.closeModal();
            if (success) {
                this.SN.Layout.renderCharacteristicsList();
                this.SN.Utils.toast('Characteristics imported successfully');
            } else {
                this.SN.Utils.toast('Failed to import characteristics');
            }
        } catch (err) {
            this.SN.Utils.toast('Invalid JSON file');
        }
    };
    reader.readAsText(file);
}

/**
 * Refresh cache statistics
 */
export async function refreshCacheStats() {
    this.SN.Layout.refreshCacheStats();
}

/**
 * Clear cache
 */
export async function clearCache(type) {
    await this.SN.Cache.clear(type || null);
    this.SN.Layout.refreshCacheStats();
    this.SN.Utils.toast(type ? `${type} cache cleared` : 'All cache cleared');
}

/**
 * Export cache
 */
export async function exportCache(type) {
    const json = await this.SN.Cache.export(type || 'general');
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sheetnext-cache-${type || 'all'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Import cache
 */
export async function importCache(file, type) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const count = await this.SN.Cache.import(e.target.result, type || 'general');
        this.SN.Layout.refreshCacheStats();
        this.SN.Utils.toast(`Imported ${count} cache entries`);
    };
    reader.readAsText(file);
}

/**
 * Open AI formula generation dialog
 */
export async function openAIGenerateFormula() {
    const SN = this.SN;
    const selection = SN.activeSheet?.selections?.[0];
    
    if (!selection) {
        SN.Utils.toast(SN.t('ai.messages.noSelection', 'Please select a range first.'));
        return;
    }

    const formula = await SN.AI.chatInput('Generate a formula for the selected range. Describe what calculation you need:');

    // Focus on formula bar with AI suggestion
    const formulaBar = SN.containerDom.querySelector('.sn-formula-bar');
    if (formulaBar) {
        formulaBar.focus();
    }
}

/**
 * Open AI data analysis dialog
 */
export async function openAIAnalyzeData() {
    const SN = this.SN;
    const selection = SN.activeSheet?.selections?.[0];
    
    if (!selection) {
        SN.Utils.toast(SN.t('ai.messages.noSelection', 'Please select a range first.'));
        return;
    }

    try {
        SN.Utils.toast(SN.t('ai.messages.analyzing', 'AI is analyzing...'));
        await SN.AI.analyzeData(selection);
    } catch (err) {
        SN.Utils.toast(SN.t('ai.messages.error', 'AI request failed. Please check your llama-server connection.'));
        console.error(err);
    }
}

/**
 * Open AI template generation dialog
 */
export async function openAIGenerateTemplate() {
    const SN = this.SN;
    
    const templates = Object.entries(SN.t('ai.templates', {})).map(([key, value]) => ({
        key,
        name: value
    }));

    const templateNames = templates.map(t => t.name).join(', ');
    const prompt = `Generate a template for: ${templateNames}. Which type would you like?`;
    
    SN.AI.chatInput(prompt);
    SN.Layout.showAIChat = true;
}

/**
 * Open AI auto-format dialog
 */
export async function openAIAutoFormat() {
    const SN = this.SN;
    const selection = SN.activeSheet?.selections?.[0];
    
    if (!selection) {
        SN.Utils.toast(SN.t('ai.messages.noSelection', 'Please select a range first.'));
        return;
    }

    try {
        SN.Utils.toast(SN.t('ai.messages.formatting', 'AI is formatting...'));
        await SN.AI.conversation(`Apply professional formatting to the selected range ${selection}. Use appropriate colors, borders, and alignment for a business spreadsheet.`);
    } catch (err) {
        SN.Utils.toast(SN.t('ai.messages.error', 'AI request failed. Please check your llama-server connection.'));
        console.error(err);
    }
}

/**
 * Open AI data insights
 */
export async function openAIInsights() {
    const SN = this.SN;
    const selection = SN.activeSheet?.selections?.[0];
    
    if (!selection) {
        SN.Utils.toast(SN.t('ai.messages.noSelection', 'Please select a range first.'));
        return;
    }

    try {
        await SN.AI.conversation(`Analyze the data in range ${selection} and provide key insights, trends, patterns, and anomalies. Format the response clearly with bullet points.`);
    } catch (err) {
        SN.Utils.toast(SN.t('ai.messages.error', 'AI request failed. Please check your llama-server connection.'));
        console.error(err);
    }
}

/**
 * Open AI configuration dialog
 */
export function openAIConfig() {
    const SN = this.SN;
    const config = SN.AI.getConfig();
    
    const html = `
        <div style="padding: 20px;">
            <h3>${SN.t('ai.config.title', 'AI Configuration')}</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">${SN.t('ai.config.url', 'API URL')}</label>
                <input type="text" id="aiConfigUrl" value="${config.apiUrl}" 
                    placeholder="${SN.t('ai.config.urlPlaceholder', 'http://localhost:8080/v1/chat/completions')}"
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">${SN.t('ai.config.model', 'Model Name')}</label>
                <input type="text" id="aiConfigModel" value="${config.modelName}" 
                    placeholder="${SN.t('ai.config.modelPlaceholder', 'llama')}"
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">${SN.t('ai.config.maxTokens', 'Max Tokens')}</label>
                <input type="number" id="aiConfigMaxTokens" value="${config.maxTokens}" 
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">${SN.t('ai.config.temperature', 'Temperature')}</label>
                <input type="number" id="aiConfigTemperature" value="${config.temperature}" step="0.1" min="0" max="1"
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center;">
                    <input type="checkbox" id="aiConfigStreaming" ${config.streamEnabled ? 'checked' : ''}>
                    <span style="margin-left: 8px;">${SN.t('ai.config.streaming', 'Enable Streaming')}</span>
                </label>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center;">
                    <input type="checkbox" id="aiConfigTools" ${config.toolsEnabled ? 'checked' : ''}>
                    <span style="margin-left: 8px;">${SN.t('ai.config.tools', 'Enable Tool Calling')}</span>
                </label>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="${SN.namespace}.Action.resetAIConfig()" style="padding: 8px 16px;">${SN.t('ai.config.reset', 'Reset to Defaults')}</button>
                <button onclick="${SN.namespace}.Action.cancelAIConfig()" style="padding: 8px 16px;">${SN.t('ai.config.cancel', 'Cancel')}</button>
                <button onclick="${SN.namespace}.Action.saveAIConfig()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px;">${SN.t('ai.config.save', 'Save Configuration')}</button>
            </div>
        </div>
    `;
    
    SN.Utils.showModal(html, SN.t('ai.config.title', 'AI Configuration'));
}

/**
 * Save AI configuration
 */
export function saveAIConfig() {
    const SN = this.SN;
    const container = SN.containerDom.querySelector('.sn-modal-content');
    
    const config = {
        apiUrl: container?.querySelector('#aiConfigUrl')?.value,
        modelName: container?.querySelector('#aiConfigModel')?.value,
        maxTokens: parseInt(container?.querySelector('#aiConfigMaxTokens')?.value) || 4096,
        temperature: parseFloat(container?.querySelector('#aiConfigTemperature')?.value) || 0.7,
        streamEnabled: container?.querySelector('#aiConfigStreaming')?.checked,
        toolsEnabled: container?.querySelector('#aiConfigTools')?.checked
    };
    
    SN.AI.setConfig(config);
    SN.Utils.closeModal();
    SN.Utils.toast('AI configuration saved successfully.');
}

/**
 * Cancel AI configuration
 */
export function cancelAIConfig() {
    const SN = this.SN;
    SN.Utils.closeModal();
}

/**
 * Reset AI configuration to defaults
 */
export function resetAIConfig() {
    const SN = this.SN;
    SN.AI.setConfig({
        apiUrl: 'http://localhost:8080/v1/chat/completions',
        modelName: 'llama',
        maxTokens: 4096,
        temperature: 0.7,
        streamEnabled: true,
        toolsEnabled: true
    });
    SN.Utils.closeModal();
    SN.Action.openAIConfig();
}

/**
 * Quick AI command handler
 */
export async function quickAICommand(command) {
    const SN = this.SN;
    
    const commands = {
        'sum': 'Sum the selected range',
        'average': 'Calculate average of the selected range',
        'count': 'Count values in the selected range',
        'max': 'Find maximum value in the selected range',
        'min': 'Find minimum value in the selected range',
        'format': 'Format the selected range professionally',
        'chart': 'Create a chart from the selected data',
        'analyze': 'Analyze the selected data'
    };
    
    const prompt = commands[command];
    if (!prompt) {
        SN.Utils.toast('Unknown AI command.');
        return;
    }
    
    try {
        await SN.AI.conversation(prompt);
    } catch (err) {
        SN.Utils.toast(SN.t('ai.messages.error', 'AI request failed. Please check your llama-server connection.'));
        console.error(err);
    }
}

/**
 * Generate formula with AI
 */
export async function generateFormulaWithAI(description) {
    const SN = this.SN;
    
    try {
        const formula = await SN.AI.generateFormula(description);
        return formula;
    } catch (err) {
        console.error('Formula generation failed:', err);
        throw err;
    }
}
