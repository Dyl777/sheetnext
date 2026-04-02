/**
 * VoiceInputManager - Speech-to-text input for spreadsheet operations
 * Supports: Data entry, formula dictation, command execution
 */

export default class VoiceInputManager {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.token = options.AI_TOKEN || null;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        
        // Speech recognition setup
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        
        // Configuration
        this.language = options.language || 'en-US';
        this.continuous = options.continuous !== false;
        this.interimResults = options.interimResults !== false;
        this.autoExecute = options.autoExecute !== false;
        
        // UI
        this.voiceButton = null;
        this.transcriptDisplay = null;
        
        this._initSpeechRecognition();
    }

    /**
     * Initialize Web Speech API
     */
    _initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition API not available');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.language = this.language;
        this.recognition.continuous = this.continuous;
        this.recognition.interimResults = this.interimResults;

        this.recognition.onstart = () => {
            this.isListening = true;
            this._updateUI('Listening...');
            console.log('🎤 Voice input started');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    this.transcript = transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this._updateUI(interimTranscript || this.transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this._updateUI(`Error: ${event.error}`);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this._processTranscript();
            this._updateUI('');
        };
    }

    /**
     * Start listening
     */
    startListening() {
        if (!this.recognition) {
            alert('Speech Recognition not supported');
            return;
        }

        this.transcript = '';
        this.recognition.start();
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    /**
     * Process voice command
     */
    async _processTranscript() {
        if (!this.transcript) return;

        const text = this.transcript.toLowerCase().trim();
        console.log('📝 Transcript:', text);

        // Parse voice commands
        if (text.includes('set cell') || text.includes('put')) {
            await this._handleCellInput(text);
        } 
        else if (text.includes('formula') || text.includes('calculate')) {
            await this._handleFormulaInput(text);
        }
        else if (text.includes('search') || text.includes('find')) {
            await this._handleSearch(text);
        }
        else if (text.includes('create chart')) {
            await this._handleChartCreation(text);
        }
        else {
            // Default: Use AI to interpret command
            await this._executeAICommand(text);
        }
    }

    /**
     * Handle cell data input
     */
    async _handleCellInput(text) {
        // Extract cell reference and value
        // e.g., "set cell A1 to hello" → A1 = "hello"
        const cellMatch = text.match(/cell\s+([a-z]\d+)/i);
        const valueMatch = text.match(/to\s+(.+)$/);

        if (cellMatch && valueMatch) {
            const cell = cellMatch[1];
            const value = valueMatch[1];
            
            const sheet = this._SN.activeSheet;
            if (sheet) {
                sheet.setCellValue(cell, value);
                this._notify(`Set ${cell} to ${value}`, 'success');
            }
        }
    }

    /**
     * Handle formula input
     */
    async _handleFormulaInput(text) {
        // Use AI to convert voice to formula
        if (!this._SN.AI) return;

        const prompt = `Convert this voice command to an Excel formula: "${text}"
Return ONLY the formula, e.g., =SUM(A1:A10)`;

        try {
            const response = await this._SN.AI.conversation(prompt);
            const formula = response.content?.match(/=.+/)?.[0] || '';
            
            if (formula) {
                const sheet = this._SN.activeSheet;
                const cell = sheet?.selections?.[0];
                if (cell) {
                    sheet.setCellFormula(cell.r, cell.c, formula);
                    this._notify(`Applied formula: ${formula}`, 'success');
                }
            }
        } catch (error) {
            this._notify('Formula creation failed', 'error');
        }
    }

    /**
     * Handle search command
     */
    async _handleSearch(text) {
        const searchTerms = text.replace(/search|find/gi, '').trim();
        
        if (this._SN.Find) {
            this._SN.Find.find(searchTerms);
            this._notify(`Searching for: ${searchTerms}`, 'info');
        }
    }

    /**
     * Handle chart creation
     */
    async _handleChartCreation(text) {
        try {
            if (this._SN?.Action?.openChartModal) {
                this._SN.Action.openChartModal();
                this._notify('Opening chart dialog — choose a chart type for your selection.', 'success');
                return;
            }
        } catch (_) { /* ignore */ }
        this._notify('Chart: use the Insert toolbar chart button if the dialog did not open.', 'info');
    }

    /**
     * Execute AI-interpreted command
     */
    async _executeAICommand(text) {
        if (!this._SN.AI) return;

        const prompt = `The user gave this voice command in a spreadsheet. What should happen?
Command: "${text}"
Options: Add data, Create formula, Search, Format, Apply style, Create chart, Copy/Paste, Export
Respond with JSON: {action: "...", target: "...", value: "..."}`;

        try {
            const response = await this._SN.AI.conversation(prompt);
            if (!response) return;
            const raw =
                typeof response === 'string'
                    ? response
                    : (response.content ?? response.message ?? '');
            const jsonSlice = raw.match(/\{[\s\S]*\}/);
            const command = JSON.parse(jsonSlice ? jsonSlice[0] : raw);

            if (command.action === 'add data') {
                const sheet = this._SN.activeSheet;
                const cell = sheet?.selections?.[0];
                if (cell) {
                    sheet.setCellValue(cell.r, cell.c, command.value);
                    this._notify(`Added: ${command.value}`, 'success');
                }
            }
        } catch (error) {
            console.warn('AI command parsing failed:', error);
        }
    }

    /**
     * Create voice input UI button
     */
    createVoiceButton(containerId = null) {
        const container = containerId 
            ? document.getElementById(containerId)
            : this._SN.containerDom?.querySelector('[data-toolbar-container]');

        if (!container) {
            console.warn('Voice button container not found');
            return;
        }

        this.voiceButton = document.createElement('button');
        this.voiceButton.className = 'voice-input-btn';
        this.voiceButton.innerHTML = `
            <svg viewBox="0 0 24 24" class="microphone-icon">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 16.91c-1.48 1.46-3.51 2.37-5.73 2.37-2.22 0-4.25-.91-5.73-2.37M19 12h2c0 .82-.15 1.61-.41 2.34"/>
            </svg>
            <span class="btn-label">Voice</span>
        `;

        this.voiceButton.addEventListener('click', () => this._toggleVoiceInput());
        container.appendChild(this.voiceButton);

        // Create transcript display
        this.transcriptDisplay = document.createElement('div');
        this.transcriptDisplay.className = 'voice-transcript';
        this.transcriptDisplay.style.display = 'none';
        document.body.appendChild(this.transcriptDisplay);

        return this.voiceButton;
    }

    /**
     * Toggle voice input
     */
    _toggleVoiceInput() {
        if (this.isListening) {
            this.stopListening();
            this.voiceButton?.classList.remove('listening');
        } else {
            this.startListening();
            this.voiceButton?.classList.add('listening');
        }
    }

    /**
     * Update UI display
     */
    _updateUI(text) {
        if (!this.transcriptDisplay) return;

        if (text) {
            this.transcriptDisplay.textContent = text;
            this.transcriptDisplay.style.display = 'block';
        } else {
            this.transcriptDisplay.style.display = 'none';
        }
    }

    /**
     * Show notification
     */
    _notify(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `voice-notification notification-${type}`;
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
        `;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

    /**
     * Set language
     */
    setLanguage(lang) {
        this.language = lang;
        if (this.recognition) {
            this.recognition.language = lang;
        }
    }

    /**
     * Get supported languages
     */
    static getSupportedLanguages() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish' },
            { code: 'fr-FR', name: 'French' },
            { code: 'de-DE', name: 'German' },
            { code: 'it-IT', name: 'Italian' },
            { code: 'ja-JP', name: 'Japanese' },
            { code: 'zh-CN', name: 'Chinese (Simplified)' },
            { code: 'zh-TW', name: 'Chinese (Traditional)' },
            { code: 'ko-KR', name: 'Korean' }
        ];
    }
}
