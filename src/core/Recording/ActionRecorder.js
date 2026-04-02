/**
 * Action Recording System
 * Records user actions with full screen context for LLM training and automation
 */

export default class ActionRecorder {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.isRecording = false;
        this.sessionId = null;
        this.actions = [];
        this.screenCaptures = [];
        this.audioChunks = [];
        
        // Recording options
        this.options = {
            captureScreenshots: options.captureScreenshots !== false,
            screenshotInterval: options.screenshotInterval || 2000, // 2 seconds
            captureAudio: options.captureAudio !== false,
            captureMouse: options.captureMouse !== false,
            captureKeyboard: options.captureKeyboard !== false,
            captureScroll: options.captureScroll !== false,
            maxActionsPerSession: options.maxActionsPerSession || 1000,
            ...options
        };
        
        // Media streams
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.screenshotInterval = null;
        
        // Action queue for LLM processing
        this.pendingLLMActions = [];
        
        // Auto-naming configuration
        this.autoNaming = {
            enabled: options.autoNaming !== false,
            model: options.autoNamingModel || 'llama',
            minActionsForNaming: options.minActionsForNaming || 3,
            namingPrompt: options.namingPrompt || `Analyze these user actions and generate a concise, descriptive name for the task being performed. 
The name should be 3-8 words and clearly describe what the user is doing.
Examples:
- "Creating SUM formula for monthly totals"
- "Formatting sales data as currency"
- "Building pivot table from raw data"
- "Setting up data validation dropdown"
Return ONLY the task name, no additional text.`
        };
        
        // Generated session names
        this.generatedNames = new Map();
        
        this._bindEvents();
    }

    /**
     * Start recording session
     */
    async startRecording(sessionName = 'Session ' + new Date().toLocaleString()) {
        if (this.isRecording) return;

        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.isRecording = true;
        this.actions = [];
        this.screenCaptures = [];
        this.audioChunks = [];
        this.startTime = Date.now();

        // Request screen/media permissions
        if (this.options.captureScreenshots || this.options.captureAudio) {
            await this._requestMediaPermissions();
        }

        // Start screenshot capture
        if (this.options.captureScreenshots) {
            this._startScreenshotCapture();
        }

        // Start audio recording
        if (this.options.captureAudio) {
            this._startAudioRecording();
        }

        console.log('Action Recording started:', this.sessionId);
        
        // Emit event
        this._SN.Event.emit('actionRecordingStarted', {
            sessionId: this.sessionId,
            sessionName
        });
    }

    /**
     * Stop recording session
     */
    async stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        // Stop screenshot capture
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = null;
        }

        // Stop audio recording
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        // Stop media streams
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }

        // Generate session name using LLM
        let sessionName = this.sessionName || 'Session ' + new Date().toLocaleString();
        if (this.autoNaming.enabled && this.actions.length >= this.autoNaming.minActionsForNaming) {
            sessionName = await this._generateSessionName();
        }

        // Save session
        await this._saveSession(sessionName);

        console.log('Action Recording stopped:', this.sessionId, '- Name:', sessionName);
        
        // Emit event
        this._SN.Event.emit('actionRecordingStopped', {
            sessionId: this.sessionId,
            sessionName,
            actionCount: this.actions.length,
            screenshotCount: this.screenCaptures.length
        });
    }

    /**
     * Generate session name using LLM
     */
    async _generateSessionName() {
        if (!this._SN.AI || this.actions.length === 0) {
            return 'Session ' + new Date().toLocaleString();
        }

        try {
            // Prepare actions context for LLM
            const actionsContext = this.actions.slice(0, 50).map(action => {
                const element = action.screenContext?.activeElement;
                const sheet = action.screenContext?.sheet;
                
                let description = `${action.type}`;
                
                if (action.type === 'click' && element) {
                    description += ` on ${element.tag}${element.text ? ' "' + element.text + '"' : ''}`;
                } else if (action.type === 'keyboard') {
                    description += ` ${action.data?.key}`;
                } else if (action.type === 'cell_edit_end') {
                    description += ` cell ${action.data?.address}`;
                }
                
                if (sheet) {
                    description += ` in ${sheet.name}`;
                }
                
                return description;
            }).join('\n');

            // Call LLM for naming
            const prompt = `${this.autoNaming.namingPrompt}

User Actions:
${actionsContext}

Task Name:`;

            const response = await this._SN.AI.conversation(prompt, {
                joinChat: false,
                useCache: false  // Don't cache naming requests
            });

            const generatedName = response.content?.trim() || this._extractNameFromResponse(response);
            
            // Store generated name
            this.generatedNames.set(this.sessionId, {
                name: generatedName,
                timestamp: Date.now(),
                actionCount: this.actions.length,
                model: this.autoNaming.model
            });

            console.log('LLM Generated Session Name:', generatedName);
            return generatedName;
        } catch (err) {
            console.warn('Failed to generate session name:', err);
            return 'Session ' + new Date().toLocaleString();
        }
    }

    /**
     * Extract name from LLM response
     */
    _extractNameFromResponse(response) {
        // Try to extract quoted text
        const quotedMatch = response.content?.match(/["']([^"']+)["']/);
        if (quotedMatch) {
            return quotedMatch[1];
        }
        
        // Try to extract first line
        const firstLine = response.content?.split('\n')[0]?.trim();
        if (firstLine && firstLine.length < 100) {
            return firstLine;
        }
        
        // Fallback
        return 'Session ' + new Date().toLocaleString();
    }

    /**
     * Record an action
     */
    recordAction(action) {
        if (!this.isRecording) return;

        const enrichedAction = {
            ...action,
            sessionId: this.sessionId,
            timestamp: Date.now() - this.startTime,
            absoluteTimestamp: Date.now(),
            screenContext: this._captureScreenContext()
        };

        this.actions.push(enrichedAction);

        // Add to LLM queue
        if (action.type !== 'screenshot') {
            this.pendingLLMActions.push(enrichedAction);
        }

        // Auto-save if limit reached
        if (this.actions.length >= this.options.maxActionsPerSession) {
            this._saveSession();
        }
    }

    /**
     * Capture current screen context
     */
    _captureScreenContext() {
        const container = this._SN.containerDom;
        const rect = container.getBoundingClientRect();
        
        // Get active element info
        const activeElement = document.activeElement;
        const activeElementInfo = activeElement ? this._getElementInfo(activeElement) : null;

        // Get sheet state
        const sheet = this._SN.activeSheet;
        const sheetState = sheet ? {
            name: sheet.name,
            selection: sheet.selections?.[0] || null,
            scrollLeft: sheet.scrollLeft || 0,
            scrollTop: sheet.scrollTop || 0,
            zoom: sheet.zoom || 1
        } : null;

        // Get toolbar state
        const toolbarState = {
            activePanel: this._SN.Layout?.activePanel || null,
            visiblePanels: this._SN.Layout?.visiblePanels || []
        };

        // Get viewport info
        const viewport = {
            width: rect.width,
            height: rect.height,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
        };

        return {
            activeElement: activeElementInfo,
            sheet: sheetState,
            toolbar: toolbarState,
            viewport,
            timestamp: Date.now()
        };
    }

    /**
     * Get element information
     */
    _getElementInfo(element) {
        const rect = element.getBoundingClientRect();
        
        return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            text: element.textContent?.slice(0, 100) || null,
            type: element.type || null,
            value: element.value || null,
            href: element.href || null,
            role: element.getAttribute('role') || null,
            ariaLabel: element.getAttribute('aria-label') || null,
            dataName: element.getAttribute('data-name') || null,
            position: {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                centerX: Math.round(rect.left + rect.width / 2),
                centerY: Math.round(rect.top + rect.height / 2)
            },
            hierarchy: this._getElementHierarchy(element)
        };
    }

    /**
     * Get element hierarchy (CSS-like path)
     */
    _getElementHierarchy(element) {
        const path = [];
        let current = element;
        
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            
            if (current.id) {
                selector += `#${current.id}`;
            } else if (current.className) {
                selector += `.${current.className.split(' ').join('.')}`;
            }
            
            path.unshift(selector);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }

    /**
     * Start screenshot capture
     */
    _startScreenshotCapture() {
        this.screenshotInterval = setInterval(async () => {
            if (!this.isRecording) return;

            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Capture visible area
                const container = this._SN.containerDom;
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
                
                // Draw container content
                ctx.drawImage(container, 0, 0, canvas.width, canvas.height);
                
                // Store screenshot
                const screenshot = {
                    type: 'screenshot',
                    sessionId: this.sessionId,
                    timestamp: Date.now() - this.startTime,
                    absoluteTimestamp: Date.now(),
                    data: canvas.toDataURL('image/jpeg', 0.8),
                    width: canvas.width,
                    height: canvas.height,
                    context: this._captureScreenContext()
                };

                this.screenCaptures.push(screenshot);
                
                // Also record as action
                this.recordAction({
                    type: 'screenshot',
                    screenshotId: screenshot.type + '_' + screenshot.timestamp
                });
            } catch (err) {
                console.warn('Screenshot capture failed:', err);
            }
        }, this.options.screenshotInterval);
    }

    /**
     * Start audio recording
     */
    _startAudioRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.mediaStream = stream;
                this.mediaRecorder = new MediaRecorder(stream);
                
                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        this.audioChunks.push({
                            type: 'audio',
                            sessionId: this.sessionId,
                            timestamp: Date.now() - this.startTime,
                            absoluteTimestamp: Date.now(),
                            data: e.data
                        });
                    }
                };
                
                this.mediaRecorder.start(1000); // Chunk every second
            })
            .catch(err => {
                console.warn('Audio recording failed:', err);
            });
    }

    /**
     * Request media permissions
     */
    async _requestMediaPermissions() {
        try {
            if (this.options.captureScreenshots) {
                // Screenshots don't need special permissions
            }
            
            if (this.options.captureAudio) {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            }
        } catch (err) {
            console.warn('Media permissions denied:', err);
        }
    }

    /**
     * Save session to backend
     */
    async _saveSession(sessionName = null) {
        if (this.actions.length === 0) return;

        try {
            // Prepare session data in LLM-training format
            const sessionData = this._prepareForLLM(sessionName);

            const auth =
                this.token ||
                (typeof localStorage !== 'undefined' ? localStorage.getItem('sheetnext_token') : null);
            if (!auth) {
                console.warn('ActionRecorder: not authenticated, session not saved');
                return;
            }

            const response = await fetch(`${this.backendUrl}/api/actions/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth}`
                },
                body: JSON.stringify(sessionData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Session saved:', result.id, '- Name:', sessionName);
                
                // Clear actions after save
                this.actions = [];
                this.screenCaptures = [];
            }
        } catch (err) {
            console.error('Failed to save session:', err);
        }
    }

    /**
     * Prepare session data for LLM training
     */
    _prepareForLLM(sessionName = null) {
        const generatedName = this.generatedNames.get(this.sessionId);
        
        return {
            sessionId: this.sessionId,
            sessionName: sessionName || generatedName?.name || 'Session ' + new Date().toLocaleString(),
            startTime: this.startTime,
            endTime: Date.now(),
            duration: Date.now() - this.startTime,
            actionCount: this.actions.length,
            screenshotCount: this.screenCaptures.length,
            autoGeneratedName: generatedName?.name || null,
            autoGeneratedBy: generatedName?.model || null,
            actions: this.actions.map(action => ({
                type: action.type,
                timestamp: action.timestamp,
                screenContext: {
                    activeElement: action.screenContext?.activeElement,
                    sheet: action.screenContext?.sheet,
                    toolbar: action.screenContext?.toolbar,
                    viewport: action.screenContext?.viewport
                },
                // Action-specific data
                data: action.data || null,
                // LLM training format
                trainingFormat: this._formatForLLMTraining(action)
            })),
            metadata: {
                userAgent: navigator.userAgent,
                screenResolution: {
                    width: screen.width,
                    height: screen.height
                },
                viewportSize: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                autoNaming: {
                    enabled: this.autoNaming.enabled,
                    generatedName: generatedName?.name,
                    model: generatedName?.model,
                    actionCount: generatedName?.actionCount
                }
            }
        };
    }

    /**
     * Format action for LLM training
     */
    _formatForLLMTraining(action) {
        const context = action.screenContext || {};
        
        return {
            prompt: this._generateLLMPrompt(action, context),
            context: {
                screen_state: {
                    active_element: context.activeElement,
                    current_sheet: context.sheet,
                    toolbar_state: context.toolbar,
                    viewport: context.viewport
                },
                action_type: action.type,
                timestamp: action.timestamp,
                coordinates: action.data?.coordinates || null,
                element: context.activeElement
            },
            expected_outcome: this._generateExpectedOutcome(action),
            tags: this._generateActionTags(action)
        };
    }

    /**
     * Generate LLM prompt from action
     */
    _generateLLMPrompt(action, context) {
        const prompts = {
            click: `User clicked on ${context.activeElement?.tag || 'element'} at position (${action.data?.x}, ${action.data?.y}). ${context.activeElement?.text ? 'Element text: "' + context.activeElement.text + '"' : ''}`,
            input: `User typed "${action.data?.value}" into ${context.activeElement?.tag || 'field'}. ${context.activeElement?.ariaLabel || context.activeElement?.dataName || ''}`,
            scroll: `User scrolled ${action.data?.direction} by ${action.data?.delta} pixels. Viewport: ${context.viewport?.scrollX}, ${context.viewport?.scrollY}`,
            keyboard: `User pressed key: ${action.data?.key}. ${action.data?.ctrlKey ? 'Ctrl+' : ''}${action.data?.shiftKey ? 'Shift+' : ''}${action.data?.altKey ? 'Alt+' : ''}${action.data?.key}`,
            screenshot: `Screenshot captured at ${action.timestamp}ms. Sheet: ${context.sheet?.name || 'unknown'}`
        };
        
        return prompts[action.type] || `User performed ${action.type} action`;
    }

    /**
     * Generate expected outcome
     */
    _generateExpectedOutcome(action) {
        const outcomes = {
            click: 'Element should be activated/selected',
            input: 'Text should be entered into field',
            scroll: 'View should scroll to new position',
            keyboard: 'Keyboard shortcut should execute',
            screenshot: 'Visual state captured'
        };
        
        return outcomes[action.type] || 'Action completed';
    }

    /**
     * Generate action tags
     */
    _generateActionTags(action) {
        const tags = [action.type];
        
        if (action.screenContext?.sheet) {
            tags.push('sheet:' + action.screenContext.sheet.name);
        }
        
        if (action.screenContext?.activeElement) {
            tags.push('element:' + action.screenContext.activeElement.tag);
        }
        
        if (action.data?.buttonName) {
            tags.push('button:' + action.data.buttonName);
        }
        
        return tags;
    }

    /**
     * Bind DOM events
     */
    _bindEvents() {
        // Mouse clicks
        if (this.options.captureMouse) {
            document.addEventListener('click', (e) => {
                if (!this.isRecording) return;
                
                this.recordAction({
                    type: 'click',
                    data: {
                        x: e.clientX,
                        y: e.clientY,
                        button: e.button,
                        buttons: e.buttons
                    }
                });
            });

            document.addEventListener('mousemove', (e) => {
                if (!this.isRecording) return;
                
                // Throttle mousemove
                if (this._lastMouseMove && Date.now() - this._lastMouseMove < 500) return;
                this._lastMouseMove = Date.now();
                
                this.recordAction({
                    type: 'mousemove',
                    data: {
                        x: e.clientX,
                        y: e.clientY,
                        movementX: e.movementX,
                        movementY: e.movementY
                    }
                });
            });
        }

        // Keyboard
        if (this.options.captureKeyboard) {
            document.addEventListener('keydown', (e) => {
                if (!this.isRecording) return;
                
                this.recordAction({
                    type: 'keyboard',
                    data: {
                        key: e.key,
                        code: e.code,
                        ctrlKey: e.ctrlKey,
                        shiftKey: e.shiftKey,
                        altKey: e.altKey,
                        metaKey: e.metaKey
                    }
                });
            });
        }

        // Scroll
        if (this.options.captureScroll) {
            document.addEventListener('scroll', (e) => {
                if (!this.isRecording) return;
                
                this.recordAction({
                    type: 'scroll',
                    data: {
                        scrollX: window.scrollX,
                        scrollY: window.scrollY,
                        direction: e.target === document ? 'page' : 'element'
                    }
                });
            });
        }

        // Sheet-specific actions
        this._SN.Event.on('beforeCellEdit', (e) => {
            if (!this.isRecording) return;
            
            this.recordAction({
                type: 'cell_edit_start',
                data: {
                    address: e.detail?.address || null
                }
            });
        });

        this._SN.Event.on('afterCellEdit', (e) => {
            if (!this.isRecording) return;
            
            this.recordAction({
                type: 'cell_edit_end',
                data: {
                    address: e.detail?.address || null,
                    oldValue: e.detail?.oldValue,
                    newValue: e.detail?.newValue
                }
            });
        });

        this._SN.Event.on('beforeActiveSheetChange', (e) => {
            if (!this.isRecording) return;
            
            this.recordAction({
                type: 'sheet_change',
                data: {
                    fromSheet: e.detail?.oldSheet?.name,
                    toSheet: e.detail?.newSheet?.name
                }
            });
        });
    }

    /**
     * Get pending actions for LLM processing
     */
    getPendingLLMActions() {
        const actions = [...this.pendingLLMActions];
        this.pendingLLMActions = [];
        return actions;
    }

    /**
     * Get session statistics
     */
    getSessionStats() {
        const generatedName = this.generatedNames.get(this.sessionId);
        
        return {
            sessionId: this.sessionId,
            sessionName: generatedName?.name || null,
            isRecording: this.isRecording,
            duration: this.isRecording ? Date.now() - this.startTime : 0,
            actionCount: this.actions.length,
            screenshotCount: this.screenCaptures.length,
            audioChunkCount: this.audioChunks.length,
            pendingLLMActions: this.pendingLLMActions.length,
            autoNaming: {
                enabled: this.autoNaming.enabled,
                generated: !!generatedName,
                model: generatedName?.model,
                actionCount: generatedName?.actionCount
            }
        };
    }

    /**
     * Manually regenerate session name
     */
    async regenerateSessionName(sessionId = null) {
        const targetSessionId = sessionId || this.sessionId;
        const actions = sessionId ? [] : this.actions;
        
        // If different session, would need to fetch from backend
        if (sessionId && sessionId !== this.sessionId) {
            console.warn('Regenerating names for other sessions not yet implemented');
            return null;
        }
        
        if (actions.length === 0) {
            return null;
        }
        
        const name = await this._generateSessionName();
        
        // Update backend
        if (name) {
            await this._saveSession(name);
        }
        
        return name;
    }

    /**
     * Get generated names
     */
    getGeneratedNames() {
        return Array.from(this.generatedNames.entries()).map(([sessionId, data]) => ({
            sessionId,
            ...data
        }));
    }

    /**
     * Configure auto-naming
     */
    configureAutoNaming(config) {
        if (config.enabled !== undefined) {
            this.autoNaming.enabled = config.enabled;
        }
        if (config.model !== undefined) {
            this.autoNaming.model = config.model;
        }
        if (config.minActionsForNaming !== undefined) {
            this.autoNaming.minActionsForNaming = config.minActionsForNaming;
        }
        if (config.namingPrompt !== undefined) {
            this.autoNaming.namingPrompt = config.namingPrompt;
        }
        
        return this.autoNaming;
    }

    /**
     * Export session for LLM training
     */
    exportForLLM(format = 'json') {
        const data = this._prepareForLLM();
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
        
        if (format === 'llamafile') {
            // Format for Llama.cpp training
            return data.actions.map(action => ({
                text: action.trainingFormat.prompt,
                metadata: action.trainingFormat.context
            })).join('\n');
        }
        
        return data;
    }
}
