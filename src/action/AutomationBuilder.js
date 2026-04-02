/**
 * AutomationBuilder - UI for creating and managing automation rules
 * Allows users to define triggers, conditions, and actions visually
 */

export default class AutomationBuilder {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.rules = [];
        this.currentRule = null;
        this.builderElement = null;
    }

    /**
     * Show automation builder dialog
     */
    show() {
        this._createBuilderUI();
        this._showDialog();
    }

    /**
     * Hide automation builder dialog
     */
    hide() {
        if (this.builderElement) {
            this.builderElement.remove();
            this.builderElement = null;
        }
    }

    /**
     * Create builder UI
     */
    _createBuilderUI() {
        const container = document.createElement('div');
        container.className = 'automation-builder-modal';
        container.innerHTML = `
            <div class="automation-builder-dialog">
                <div class="builder-header">
                    <h2>Create Automation Rule</h2>
                    <button class="close-btn" aria-label="Close">×</button>
                </div>
                
                <div class="builder-content">
                    <!-- Rule Name -->
                    <div class="form-section">
                        <label>Rule Name</label>
                        <input type="text" id="ruleName" placeholder="e.g., Daily Report Generation" 
                               class="form-input">
                    </div>

                    <!-- Trigger Section -->
                    <div class="form-section">
                        <label>Trigger <span class="required">*</span></label>
                        <select id="triggerType" class="form-select">
                            <option value="">Select trigger type...</option>
                            <option value="manual">Manual (Run on demand)</option>
                            <option value="schedule">On Schedule</option>
                            <option value="event">On Event</option>
                            <option value="condition">When Condition Met</option>
                        </select>
                        
                        <div id="triggerConfig" class="trigger-config"></div>
                    </div>

                    <!-- Conditions Section -->
                    <div class="form-section">
                        <label>Conditions (Optional)</label>
                        <div id="conditionsList" class="conditions-list"></div>
                        <button class="add-btn" id="addCondition">+ Add Condition</button>
                    </div>

                    <!-- Actions Section -->
                    <div class="form-section">
                        <label>Actions <span class="required">*</span></label>
                        <div id="actionsList" class="actions-list"></div>
                        <button class="add-btn" id="addAction">+ Add Action</button>
                    </div>

                    <!-- Preview -->
                    <div class="form-section">
                        <label>Rule Preview</label>
                        <div id="rulePreview" class="rule-preview">
                            <p class="preview-empty">Your rule will appear here</p>
                        </div>
                    </div>
                </div>

                <div class="builder-footer">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-success" id="saveBtn">Save Rule</button>
                    <button class="btn btn-primary" id="testBtn">Test Rule</button>
                </div>
            </div>
        `;

        this.builderElement = container;
        this._attachEventListeners();
        this._updateTriggerConfig();
    }

    /**
     * Show dialog
     */
    _showDialog() {
        document.body.appendChild(this.builderElement);
        this.builderElement.style.display = 'block';
        
        // Focus on first input
        const firstInput = this.builderElement.querySelector('.form-input');
        if (firstInput) firstInput.focus();
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        const closeBtn = this.builderElement.querySelector('.close-btn');
        const cancelBtn = this.builderElement.querySelector('#cancelBtn');
        const saveBtn = this.builderElement.querySelector('#saveBtn');
        const testBtn = this.builderElement.querySelector('#testBtn');
        const triggerSelect = this.builderElement.querySelector('#triggerType');
        const addConditionBtn = this.builderElement.querySelector('#addCondition');
        const addActionBtn = this.builderElement.querySelector('#addAction');

        closeBtn?.addEventListener('click', () => this.hide());
        cancelBtn?.addEventListener('click', () => this.hide());
        saveBtn?.addEventListener('click', () => this._saveRule());
        testBtn?.addEventListener('click', () => this._testRule());
        triggerSelect?.addEventListener('change', () => this._updateTriggerConfig());
        addConditionBtn?.addEventListener('click', () => this._addConditionUI());
        addActionBtn?.addEventListener('click', () => this._addActionUI());

        // Close on background click
        this.builderElement.addEventListener('click', (e) => {
            if (e.target === this.builderElement) this.hide();
        });
    }

    /**
     * Update trigger configuration UI
     */
    _updateTriggerConfig() {
        const triggerType = this.builderElement.querySelector('#triggerType').value;
        const configDiv = this.builderElement.querySelector('#triggerConfig');
        
        configDiv.innerHTML = '';
        
        if (triggerType === 'schedule') {
            configDiv.innerHTML = `
                <div class="trigger-config-item">
                    <label>Schedule Type</label>
                    <select class="form-select" id="scheduleType">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom (Cron)</option>
                    </select>
                </div>
                <div class="trigger-config-item">
                    <label>Time</label>
                    <input type="time" class="form-input" id="scheduleTime" value="09:00">
                </div>
                <div class="trigger-config-item" id="daySelector"></div>
            `;
            
            const scheduleType = configDiv.querySelector('#scheduleType');
            scheduleType?.addEventListener('change', () => this._updateDaySelector());
            this._updateDaySelector();
        } 
        else if (triggerType === 'event') {
            configDiv.innerHTML = `
                <div class="trigger-config-item">
                    <label>Event Type</label>
                    <select class="form-select" id="eventType">
                        <option value="cellChange">Cell Value Changes</option>
                        <option value="selectionChange">Selection Changes</option>
                        <option value="sheetChange">Active Sheet Changes</option>
                        <option value="dataInput">Data Entered</option>
                        <option value="formulaError">Formula Error</option>
                    </select>
                </div>
                <div class="trigger-config-item">
                    <label>Specific Cell/Range (Optional)</label>
                    <input type="text" class="form-input" placeholder="e.g., A1:C10 or A1">
                </div>
            `;
        }
        else if (triggerType === 'condition') {
            configDiv.innerHTML = `
                <div class="trigger-config-item">
                    <label>Check Interval</label>
                    <select class="form-select" id="conditionInterval">
                        <option value="1000">Every 1 second</option>
                        <option value="5000">Every 5 seconds</option>
                        <option value="10000">Every 10 seconds</option>
                        <option value="60000">Every minute</option>
                    </select>
                </div>
            `;
        }
    }

    /**
     * Update day selector UI
     */
    _updateDaySelector() {
        const scheduleType = this.builderElement.querySelector('#scheduleType')?.value;
        const daySelectorDiv = this.builderElement.querySelector('#daySelector');
        
        if (scheduleType === 'weekly') {
            daySelectorDiv.innerHTML = `
                <label>Days</label>
                <div class="day-selector">
                    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => `
                        <label class="day-checkbox">
                            <input type="checkbox" value="${i}">
                            ${day}
                        </label>
                    `).join('')}
                </div>
            `;
        } 
        else if (scheduleType === 'monthly') {
            daySelectorDiv.innerHTML = `
                <label>Day of Month</label>
                <input type="number" class="form-input" min="1" max="31" placeholder="1-31" id="monthDay">
            `;
        }
    }

    /**
     * Add condition UI
     */
    _addConditionUI() {
        const conditionsList = this.builderElement.querySelector('#conditionsList');
        const conditionId = `condition_${Date.now()}`;
        
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'condition-item';
        conditionDiv.id = conditionId;
        conditionDiv.innerHTML = `
            <div class="condition-row">
                <select class="condition-type">
                    <option value="">Select field...</option>
                    <option value="cellValue">Cell Value</option>
                    <option value="rowCount">Row Count</option>
                    <option value="columnCount">Column Count</option>
                    <option value="dataType">Data Type</option>
                    <option value="formula">Formula Contains</option>
                </select>
                
                <select class="condition-operator">
                    <option value="==">Equals</option>
                    <option value=">">Greater Than</option>
                    <option value="<">Less Than</option>
                    <option value=">=">Greater or Equal</option>
                    <option value="<=">Less or Equal</option>
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts With</option>
                    <option value="endsWith">Ends With</option>
                    <option value="matches">Matches (Regex)</option>
                </select>
                
                <input type="text" class="condition-value form-input" placeholder="Value to compare">
                
                <button class="remove-btn" onclick="event.target.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="condition-logic" style="display:none;">
                <select class="logic-operator">
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                </select>
            </div>
        `;
        
        conditionsList.appendChild(conditionDiv);
        
        // Show logic operator if not first condition
        if (conditionsList.querySelectorAll('.condition-item').length > 1) {
            conditionDiv.querySelector('.condition-logic').style.display = 'block';
        }
    }

    /**
     * Add action UI
     */
    _addActionUI() {
        const actionsList = this.builderElement.querySelector('#actionsList');
        const actionId = `action_${Date.now()}`;
        
        const actionDiv = document.createElement('div');
        actionDiv.className = 'action-item';
        actionDiv.id = actionId;
        actionDiv.innerHTML = `
            <div class="action-row">
                <select class="action-type">
                    <option value="">Select action...</option>
                    <option value="setCellValue">Set Cell Value</option>
                    <option value="applyFormula">Apply Formula</option>
                    <option value="format">Apply Format</option>
                    <option value="copyRange">Copy Range</option>
                    <option value="pasteRange">Paste Range</option>
                    <option value="applyFilter">Apply Filter</option>
                    <option value="createChart">Create Chart</option>
                    <option value="insertRows">Insert Rows</option>
                    <option value="deleteRows">Delete Rows</option>
                    <option value="aiGenerate">Generate with AI</option>
                    <option value="exportData">Export Data</option>
                    <option value="notification">Show Notification</option>
                    <option value="playSound">Play Sound</option>
                </select>
                
                <input type="text" class="action-params form-input" 
                       placeholder="Parameters (e.g., A1, 100)" data-action="">
                
                <button class="remove-btn" onclick="event.target.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        const actionTypeSelect = actionDiv.querySelector('.action-type');
        const paramsInput = actionDiv.querySelector('.action-params');
        
        actionTypeSelect?.addEventListener('change', (e) => {
            paramsInput.setAttribute('data-action', e.target.value);
            paramsInput.placeholder = this._getActionPlaceholder(e.target.value);
        });
        
        actionsList.appendChild(actionDiv);
    }

    /**
     * Get placeholder for action type
     */
    _getActionPlaceholder(actionType) {
        const placeholders = {
            'setCellValue': 'Cell address (e.g., A1)',
            'applyFormula': 'Cell address and formula (e.g., A1, =SUM(A2:A10))',
            'format': 'Format type (bold, italic, color, etc)',
            'copyRange': 'Range (e.g., A1:C10)',
            'pasteRange': 'Paste location (e.g., D1)',
            'applyFilter': 'Column index or header name',
            'createChart': 'Chart type and data range',
            'insertRows': 'Row number and count',
            'deleteRows': 'Row number and count',
            'aiGenerate': 'Column name and context',
            'exportData': 'Format (csv, xlsx, json)',
            'notification': 'Message text',
            'playSound': 'Sound type'
        };
        return placeholders[actionType] || 'Enter parameters';
    }

    /**
     * Save rule to backend
     */
    async _saveRule() {
        const ruleName = this.builderElement.querySelector('#ruleName').value;
        const triggerType = this.builderElement.querySelector('#triggerType').value;
        
        if (!ruleName || !triggerType) {
            alert('Please fill in rule name and trigger type');
            return;
        }

        const triggerConfig = this._collectTriggerConfig();
        const conditions = this._collectConditions();
        const actions = this._collectActions();

        if (actions.length === 0) {
            alert('Please add at least one action');
            return;
        }

        const rule = {
            name: ruleName,
            trigger: {
                type: triggerType,
                config: triggerConfig
            },
            conditions,
            actions,
            enabled: true
        };

        try {
            const response = await fetch(`${this.backendUrl}/api/automation/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(rule)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✓ Automation rule saved:', result);
                this._showNotification('Rule saved successfully!', 'success');
                setTimeout(() => this.hide(), 1000);
            } else {
                const error = await response.json();
                this._showNotification('Failed to save rule: ' + error.error, 'error');
            }
        } catch (error) {
            console.error('Error saving rule:', error);
            this._showNotification('Error: ' + error.message, 'error');
        }
    }

    /**
     * Collect trigger configuration
     */
    _collectTriggerConfig() {
        const triggerType = this.builderElement.querySelector('#triggerType').value;
        const config = {};

        if (triggerType === 'schedule') {
            config.scheduleType = this.builderElement.querySelector('#scheduleType')?.value;
            config.time = this.builderElement.querySelector('#scheduleTime')?.value;
            config.days = Array.from(this.builderElement.querySelectorAll('.day-checkbox input:checked'))
                .map(cb => cb.value);
        } 
        else if (triggerType === 'event') {
            config.eventType = this.builderElement.querySelector('#eventType')?.value;
            config.targetRange = this.builderElement.querySelector('input[placeholder*="Cell"]')?.value;
        }
        else if (triggerType === 'condition') {
            config.checkInterval = this.builderElement.querySelector('#conditionInterval')?.value;
        }

        return config;
    }

    /**
     * Collect conditions
     */
    _collectConditions() {
        const conditions = [];
        
        this.builderElement.querySelectorAll('.condition-item').forEach((item, index) => {
            const condition = {
                field: item.querySelector('.condition-type').value,
                operator: item.querySelector('.condition-operator').value,
                value: item.querySelector('.condition-value').value,
                logic: index > 0 ? item.querySelector('.logic-operator').value : null
            };
            if (condition.field) conditions.push(condition);
        });

        return conditions;
    }

    /**
     * Collect actions
     */
    _collectActions() {
        const actions = [];
        
        this.builderElement.querySelectorAll('.action-item').forEach((item) => {
            const action = {
                type: item.querySelector('.action-type').value,
                params: item.querySelector('.action-params').value
            };
            if (action.type) actions.push(action);
        });

        return actions;
    }

    /**
     * Test rule
     */
    async _testRule() {
        const actions = this._collectActions();
        if (actions.length === 0) {
            alert('Please add at least one action to test');
            return;
        }

        this._showNotification('Testing rule... (First action only)', 'info');
        // In production, would execute first action against current sheet state
    }

    /**
     * Show notification
     */
    _showNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 20px;
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
     * Load existing rules from backend
     */
    async loadRules() {
        try {
            const response = await fetch(`${this.backendUrl}/api/automation/tasks`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.rules = data.tasks || [];
                return this.rules;
            }
        } catch (error) {
            console.error('Error loading rules:', error);
        }
        return [];
    }
}
