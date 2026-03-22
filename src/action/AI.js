/**
 * AI Action Module
 * Provides AI-powered spreadsheet operations
 */

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
