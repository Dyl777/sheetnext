/**
 * RecordingUIToolbar - UI controls for action recording and playback
 * Displays in toolbar for users to control recording sessions
 */

export default class RecordingUIToolbar {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.isRecording = false;
        this.recorder = null;
        this.toolbarElement = null;
        this.recordingTime = 0;
        this.recordingInterval = null;
        
        // Configuration
        this.autoGenerateName = options.autoGenerateName !== false;
        this.showRecordingStats = options.showRecordingStats !== false;
        
        this._initializeRecorder();
    }

    /**
     * Initialize ActionRecorder
     */
    _initializeRecorder() {
        if (this._SN.ActionRecorder) {
            this.recorder = new this._SN.ActionRecorder(this._SN, {
                BACKEND_URL: this.backendUrl,
                AI_TOKEN: this.token,
                autoNaming: this.autoGenerateName
            });
        }
    }

    /**
     * Create toolbar UI
     */
    createToolbar(containerId = null) {
        const container = containerId 
            ? document.getElementById(containerId)
            : this._SN.containerDom?.querySelector('[data-toolbar-container]');

        if (!container) {
            console.warn('Toolbar container not found, creating floating toolbar');
            return this._createFloatingToolbar();
        }

        this.toolbarElement = document.createElement('div');
        this.toolbarElement.className = 'recording-toolbar';
        this.toolbarElement.innerHTML = `
            <div class="toolbar-group recording-controls">
                <button class="toolbar-btn recording-btn" id="recordingBtn" 
                        title="Start/Stop Recording">
                    <svg class="record-icon" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" fill="currentColor"/>
                    </svg>
                    <span class="btn-label">Record</span>
                </button>
                
                <div class="recording-status" id="recordingStatus" style="display:none;">
                    <span class="status-indicator"></span>
                    <span class="status-text">Recording...</span>
                    <span class="recording-time" id="recordingTime">00:00</span>
                </div>
                
                <button class="toolbar-btn pause-btn" id="pauseBtn" 
                        title="Pause/Resume Recording" style="display:none;">
                    <svg viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    <span class="btn-label">Pause</span>
                </button>
                
                <button class="toolbar-btn stop-btn" id="stopBtn" 
                        title="Stop Recording" style="display:none;">
                    <svg viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                    </svg>
                    <span class="btn-label">Stop</span>
                </button>
                
                <button class="toolbar-btn settings-btn" id="settingsBtn" 
                        title="Recording Settings">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="19" cy="12" r="1"/>
                        <circle cx="5" cy="12" r="1"/>
                    </svg>
                </button>
            </div>
            
            <div class="toolbar-group session-controls">
                <button class="toolbar-btn sessions-btn" id="sessionsBtn" 
                        title="View Recording Sessions">
                    <svg viewBox="0 0 24 24">
                        <path d="M9 13h6v6H9z"/>
                        <path d="M9 5h6v6H9z"/>
                    </svg>
                    <span class="btn-label">Sessions</span>
                </button>
                
                <button class="toolbar-btn replay-btn" id="replayBtn" 
                        title="Replay Actions" style="display:none;">
                    <svg viewBox="0 0 24 24">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                    <span class="btn-label">Replay</span>
                </button>
            </div>
        `;

        container.appendChild(this.toolbarElement);
        this._attachEventListeners();
        return this.toolbarElement;
    }

    /**
     * Create floating toolbar
     */
    _createFloatingToolbar() {
        this.toolbarElement = document.createElement('div');
        this.toolbarElement.className = 'recording-toolbar floating-toolbar';
        this.toolbarElement.innerHTML = `
            <div class="floating-toolbar-header">
                <span>SheetNext Recording</span>
                <button class="close-toolbar-btn">×</button>
            </div>
            <div class="toolbar-group recording-controls">
                <button class="toolbar-btn recording-btn" id="recordingBtn" 
                        title="Start/Stop Recording">
                    <svg class="record-icon" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" fill="currentColor"/>
                    </svg>
                    <span class="btn-label">Record</span>
                </button>
                
                <div class="recording-status" id="recordingStatus" style="display:none;">
                    <span class="status-indicator"></span>
                    <span class="status-text">Recording...</span>
                    <span class="recording-time" id="recordingTime">00:00</span>
                </div>
                
                <button class="toolbar-btn stop-btn" id="stopBtn" 
                        title="Stop Recording" style="display:none;">
                    <svg viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                    </svg>
                    <span class="btn-label">Stop</span>
                </button>
            </div>
            <div class="toolbar-group session-controls">
                <button class="toolbar-btn sessions-btn" id="sessionsBtn" 
                        title="View Sessions">
                    <svg viewBox="0 0 24 24">
                        <path d="M9 13h6v6H9z"/>
                        <path d="M9 5h6v6H9z"/>
                    </svg>
                    <span class="btn-label">Sessions</span>
                </button>
            </div>
        `;

        document.body.appendChild(this.toolbarElement);
        
        // Close button
        const closeBtn = this.toolbarElement.querySelector('.close-toolbar-btn');
        closeBtn?.addEventListener('click', () => this.toolbarElement.remove());
        
        this._attachEventListeners();
        return this.toolbarElement;
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        const recordingBtn = this.toolbarElement.querySelector('#recordingBtn');
        const stopBtn = this.toolbarElement.querySelector('#stopBtn');
        const pauseBtn = this.toolbarElement.querySelector('#pauseBtn');
        const settingsBtn = this.toolbarElement.querySelector('#settingsBtn');
        const sessionsBtn = this.toolbarElement.querySelector('#sessionsBtn');
        const replayBtn = this.toolbarElement.querySelector('#replayBtn');

        recordingBtn?.addEventListener('click', () => this._toggleRecording());
        stopBtn?.addEventListener('click', () => this._stopRecording());
        pauseBtn?.addEventListener('click', () => this._togglePause());
        settingsBtn?.addEventListener('click', () => this._showSettings());
        sessionsBtn?.addEventListener('click', () => this._showSessions());
        replayBtn?.addEventListener('click', () => this._replay());
    }

    /**
     * Toggle recording
     */
    async _toggleRecording() {
        if (!this.recorder) {
            alert('Recording not available. ActionRecorder not initialized.');
            return;
        }

        if (this.isRecording) {
            // Already recording - shouldn't happen
            return;
        }

        // Start recording
        this.isRecording = true;
        const sessionName = `Session - ${new Date().toLocaleString()}`;
        
        await this.recorder.startRecording(sessionName);
        this._updateRecordingUI();
        this._startRecordingTimer();
        
        console.log('✓ Recording started');
    }

    /**
     * Stop recording
     */
    async _stopRecording() {
        if (!this.isRecording || !this.recorder) {
            return;
        }

        this.isRecording = false;
        this._stopRecordingTimer();
        
        const session = await this.recorder.stopRecording();
        
        console.log('✓ Recording stopped:', session);
        this._updateRecordingUI();
        
        if (session) {
            this._showNotification(`Recording saved: ${session.actions.length} actions`, 'success');
        }
    }

    /**
     * Toggle pause
     */
    _togglePause() {
        // Implement pause logic if needed
        console.log('Pause recording');
    }

    /**
     * Show recording settings
     */
    async _showSettings() {
        const settings = `
            <div class="recording-settings-modal">
                <div class="modal-content">
                    <h3>Recording Settings</h3>
                    
                    <label class="setting-item">
                        <input type="checkbox" id="captureScreenshots" checked>
                        <span>Capture Screenshots</span>
                    </label>
                    
                    <label class="setting-item">
                        <input type="checkbox" id="captureAudio" checked>
                        <span>Capture Audio</span>
                    </label>
                    
                    <label class="setting-item">
                        <input type="checkbox" id="captureMouse" checked>
                        <span>Record Mouse Movements</span>
                    </label>
                    
                    <label class="setting-item">
                        <input type="checkbox" id="captureKeyboard" checked>
                        <span>Record Keyboard Input</span>
                    </label>
                    
                    <label class="setting-item">
                        <input type="checkbox" id="autoNaming" checked>
                        <span>Auto-Generate Session Names (using AI)</span>
                    </label>
                    
                    <div class="setting-item">
                        <label>Screenshot Interval (ms)</label>
                        <input type="number" id="screenshotInterval" value="2000" min="1000" max="10000" step="500">
                    </div>
                    
                    <div class="modal-buttons">
                        <button class="btn btn-secondary" onclick="this.closest('.recording-settings-modal').remove()">Cancel</button>
                        <button class="btn btn-primary" id="saveSettingsBtn">Save Settings</button>
                    </div>
                </div>
            </div>
        `;

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = settings;
        modalDiv.className = 'recording-modal-overlay';
        document.body.appendChild(modalDiv);

        // Load current settings
        if (this.recorder) {
            const options = this.recorder.options;
            modalDiv.querySelector('#captureScreenshots').checked = options.captureScreenshots;
            modalDiv.querySelector('#captureAudio').checked = options.captureAudio;
            modalDiv.querySelector('#captureMouse').checked = options.captureMouse;
            modalDiv.querySelector('#captureKeyboard').checked = options.captureKeyboard;
            modalDiv.querySelector('#autoNaming').checked = options.autoNaming;
            modalDiv.querySelector('#screenshotInterval').value = options.screenshotInterval;
        }

        // Save button
        const saveBtn = modalDiv.querySelector('#saveSettingsBtn');
        saveBtn?.addEventListener('click', () => {
            if (this.recorder) {
                this.recorder.options.captureScreenshots = modalDiv.querySelector('#captureScreenshots').checked;
                this.recorder.options.captureAudio = modalDiv.querySelector('#captureAudio').checked;
                this.recorder.options.captureMouse = modalDiv.querySelector('#captureMouse').checked;
                this.recorder.options.captureKeyboard = modalDiv.querySelector('#captureKeyboard').checked;
                this.recorder.options.autoNaming = modalDiv.querySelector('#autoNaming').checked;
                this.recorder.options.screenshotInterval = parseInt(modalDiv.querySelector('#screenshotInterval').value);
            }
            modalDiv.remove();
            this._showNotification('Settings saved', 'success');
        });

        // Click outside to close
        modalDiv.addEventListener('click', (e) => {
            if (e.target === modalDiv) modalDiv.remove();
        });
    }

    /**
     * Show past sessions
     */
    async _showSessions() {
        if (!this.recorder) return;

        try {
            const sessions = await this.recorder.loadSessions();
            
            const sessionsHTML = `
                <div class="sessions-panel">
                    <h3>Recording Sessions</h3>
                    <div class="sessions-list">
                        ${sessions.map(session => `
                            <div class="session-item">
                                <div class="session-info">
                                    <h4>${session.sessionName || 'Unnamed'}</h4>
                                    <p>${session.action_count || 0} actions • ${new Date(session.start_time).toLocaleString()}</p>
                                </div>
                                <button class="btn btn-small" onclick="window.currentSessionId = '${session.session_id}'">View</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            const panel = document.createElement('div');
            panel.className = 'recording-modal-overlay';
            panel.innerHTML = sessionsHTML;
            document.body.appendChild(panel);

            panel.addEventListener('click', (e) => {
                if (e.target === panel) panel.remove();
            });
        } catch (error) {
            this._showNotification('Error loading sessions', 'error');
        }
    }

    /**
     * Replay actions
     */
    async _replay() {
        if (!this._SN.ActionScheduler) {
            alert('ActionScheduler not available');
            return;
        }

        // Get session to replay
        const sessionId = window.currentSessionId;
        if (!sessionId) {
            alert('No session selected for playback');
            return;
        }

        try {
            const scheduler = new this._SN.ActionScheduler(this._SN, {
                BACKEND_URL: this.backendUrl,
                AI_TOKEN: this.token
            });

            // Load and execute session actions
            const response = await fetch(`${this.backendUrl}/api/actions/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const session = await response.json();
                this._showNotification('Replaying actions...', 'info');
                
                for (const action of session.actions) {
                    await scheduler._executeAction(action);
                    await new Promise(r => setTimeout(r, 100)); // Small delay between actions
                }
                
                this._showNotification('Playback complete', 'success');
            }
        } catch (error) {
            this._showNotification('Playback error: ' + error.message, 'error');
        }
    }

    /**
     * Update recording UI
     */
    _updateRecordingUI() {
        const recordingBtn = this.toolbarElement?.querySelector('#recordingBtn');
        const stopBtn = this.toolbarElement?.querySelector('#stopBtn');
        const pauseBtn = this.toolbarElement?.querySelector('#pauseBtn');
        const status = this.toolbarElement?.querySelector('#recordingStatus');

        if (this.isRecording) {
            recordingBtn?.style.setProperty('display', 'none');
            stopBtn?.style.setProperty('display', 'inline-block');
            pauseBtn?.style.setProperty('display', 'inline-block');
            status?.style.setProperty('display', 'inline-flex');
        } else {
            recordingBtn?.style.setProperty('display', 'inline-block');
            stopBtn?.style.setProperty('display', 'none');
            pauseBtn?.style.setProperty('display', 'none');
            status?.style.setProperty('display', 'none');
        }
    }

    /**
     * Start recording timer
     */
    _startRecordingTimer() {
        this.recordingTime = 0;
        this.recordingInterval = setInterval(() => {
            this.recordingTime++;
            const mins = Math.floor(this.recordingTime / 60);
            const secs = this.recordingTime % 60;
            const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            
            const timeDisplay = this.toolbarElement?.querySelector('#recordingTime');
            if (timeDisplay) {
                timeDisplay.textContent = timeStr;
            }
        }, 1000);
    }

    /**
     * Stop recording timer
     */
    _stopRecordingTimer() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
    }

    /**
     * Show notification
     */
    _showNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `toolbar-notification notification-${type}`;
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }
}
