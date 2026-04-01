/**
 * Action Scheduler & Automation
 * Schedules and automates recorded actions
 */

export default class ActionScheduler {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.scheduledTasks = new Map();
        this.automationRules = [];
        this.activeAutomations = new Set();
        
        this._loadSavedTasks();
    }

    /**
     * Schedule a task
     */
    schedule(task) {
        const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const scheduledTask = {
            id: taskId,
            name: task.name || 'Scheduled Task',
            type: task.type || 'interval', // interval, cron, one-time
            actions: task.actions || [],
            schedule: task.schedule || null,
            interval: task.interval || null,
            enabled: task.enabled !== false,
            lastRun: null,
            nextRun: this._calculateNextRun(task),
            runCount: 0,
            createdAt: Date.now(),
            metadata: task.metadata || {}
        };

        this.scheduledTasks.set(taskId, scheduledTask);
        
        // Start the task if enabled
        if (scheduledTask.enabled) {
            this._startTask(scheduledTask);
        }

        // Save to backend
        this._saveTask(scheduledTask);

        return scheduledTask;
    }

    /**
     * Create automation rule
     */
    createAutomation(rule) {
        const automation = {
            id: rule.id || `auto_${Date.now()}`,
            name: rule.name || 'Automation Rule',
            trigger: rule.trigger, // event, condition, time
            conditions: rule.conditions || [],
            actions: rule.actions || [],
            enabled: rule.enabled !== false,
            createdAt: Date.now()
        };

        this.automationRules.push(automation);
        
        if (automation.enabled) {
            this._activateAutomation(automation);
        }

        this._saveAutomation(automation);

        return automation;
    }

    /**
     * Start a scheduled task
     */
    _startTask(task) {
        if (task.type === 'interval' && task.interval) {
            // Interval-based task
            const intervalId = setInterval(() => {
                if (task.enabled) {
                    this._executeTask(task);
                }
            }, task.interval);
            
            task.intervalId = intervalId;
            this.activeAutomations.add(taskId);
        } else if (task.type === 'cron' && task.schedule) {
            // Cron-based task (simplified)
            this._scheduleCronTask(task);
        } else if (task.type === 'one-time') {
            // One-time task
            const timeout = task.schedule - Date.now();
            if (timeout > 0) {
                setTimeout(() => {
                    if (task.enabled) {
                        this._executeTask(task);
                    }
                    this.scheduledTasks.delete(task.id);
                }, timeout);
            }
        }
    }

    /**
     * Execute a task
     */
    async _executeTask(task) {
        console.log('Executing scheduled task:', task.name);
        
        task.lastRun = Date.now();
        task.nextRun = this._calculateNextRun(task);
        task.runCount++;

        for (const action of task.actions) {
            try {
                await this._executeAction(action);
                
                // Delay between actions
                if (action.delay) {
                    await new Promise(resolve => setTimeout(resolve, action.delay));
                }
            } catch (err) {
                console.error('Task action failed:', err);
                
                // Emit error event
                this._SN.Event.emit('automationError', {
                    taskId: task.id,
                    action,
                    error: err
                });
                
                if (task.stopOnError) {
                    break;
                }
            }
        }

        // Emit completion event
        this._SN.Event.emit('automationExecuted', {
            taskId: task.id,
            taskName: task.name,
            runCount: task.runCount
        });

        // Save updated task
        this._saveTask(task);
    }

    /**
     * Execute a single action
     */
    async _executeAction(action) {
        switch (action.type) {
            case 'click':
                return this._simulateClick(action);
            case 'input':
                return this._simulateInput(action);
            case 'navigate':
                return this._simulateNavigate(action);
            case 'formula':
                return this._executeFormula(action);
            case 'ai':
                return this._executeAI(action);
            case 'script':
                return this._executeScript(action);
            default:
                console.warn('Unknown action type:', action.type);
        }
    }

    /**
     * Simulate click
     */
    _simulateClick(action) {
        const element = this._findElement(action.selector);
        if (element) {
            element.click();
            return true;
        }
        throw new Error('Element not found: ' + action.selector);
    }

    /**
     * Simulate input
     */
    _simulateInput(action) {
        const element = this._findElement(action.selector);
        if (element) {
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        throw new Error('Element not found: ' + action.selector);
    }

    /**
     * Simulate navigation
     */
    _simulateNavigate(action) {
        if (action.sheet) {
            const sheet = this._SN.sheets.find(s => s.name === action.sheet);
            if (sheet) {
                this._SN.activeSheet = sheet;
                return true;
            }
        }
        throw new Error('Sheet not found: ' + action.sheet);
    }

    /**
     * Execute formula
     */
    _executeFormula(action) {
        const sheet = this._SN.activeSheet;
        if (sheet && action.range && action.formula) {
            sheet.setCellFormula(action.range.r, action.range.c, action.formula);
            this._SN.Formula.calculate();
            return true;
        }
        throw new Error('Invalid formula action');
    }

    /**
     * Execute AI action
     */
    async _executeAI(action) {
        if (action.prompt && this._SN.AI) {
            const response = await this._SN.AI.conversation(action.prompt, {
                joinChat: false
            });
            return response;
        }
        throw new Error('Invalid AI action');
    }

    /**
     * Execute script
     */
    _executeScript(action) {
        if (action.code) {
            return new Function('SN', action.code)(this._SN);
        }
        throw new Error('Invalid script action');
    }

    /**
     * Find element by selector
     */
    _findElement(selector) {
        if (!selector) return null;
        
        // Try different selector types
        if (selector.startsWith('#')) {
            return this._SN.containerDom.querySelector(selector);
        }
        
        if (selector.startsWith('.')) {
            return this._SN.containerDom.querySelector(selector);
        }
        
        // Try data attribute
        const dataAttr = selector.replace('[', '').replace(']', '').split('=');
        if (dataAttr.length === 2) {
            return this._SN.containerDom.querySelector(`[${dataAttr[0]}="${dataAttr[1]}"]`);
        }
        
        return null;
    }

    /**
     * Calculate next run time
     */
    _calculateNextRun(task) {
        if (task.type === 'interval') {
            return Date.now() + task.interval;
        } else if (task.type === 'one-time') {
            return task.schedule;
        }
        return null;
    }

    /**
     * Schedule cron task (simplified)
     */
    _scheduleCronTask(task) {
        // Simplified cron: support minute, hour, day
        const checkCron = () => {
            const now = new Date();
            const [minute, hour, day] = task.schedule.split(' ');
            
            if (minute && parseInt(minute) !== now.getMinutes()) return;
            if (hour && parseInt(hour) !== now.getHours()) return;
            if (day && parseInt(day) !== now.getDate()) return;
            
            if (task.enabled) {
                this._executeTask(task);
            }
        };
        
        const intervalId = setInterval(checkCron, 60000); // Check every minute
        task.intervalId = intervalId;
    }

    /**
     * Activate automation rule
     */
    _activateAutomation(automation) {
        if (automation.trigger.type === 'event') {
            this._SN.Event.on(automation.trigger.event, (e) => {
                if (!automation.enabled) return;
                
                // Check conditions
                if (this._checkConditions(automation.conditions, e)) {
                    this._executeAutomationActions(automation.actions);
                }
            });
        }
    }

    /**
     * Check conditions
     */
    _checkConditions(conditions, event) {
        if (!conditions || conditions.length === 0) return true;
        
        return conditions.every(condition => {
            switch (condition.operator) {
                case 'equals':
                    return event.detail?.[condition.field] === condition.value;
                case 'contains':
                    return event.detail?.[condition.field]?.includes(condition.value);
                case 'greater_than':
                    return event.detail?.[condition.field] > condition.value;
                case 'less_than':
                    return event.detail?.[condition.field] < condition.value;
                default:
                    return true;
            }
        });
    }

    /**
     * Execute automation actions
     */
    async _executeAutomationActions(actions) {
        for (const action of actions) {
            try {
                await this._executeAction(action);
            } catch (err) {
                console.error('Automation action failed:', err);
            }
        }
    }

    /**
     * Save task to backend
     */
    async _saveTask(task) {
        try {
            await fetch(`${this.backendUrl}/api/automation/tasks/${task.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(task)
            });
        } catch (err) {
            console.warn('Failed to save task:', err);
        }
    }

    /**
     * Save automation to backend
     */
    async _saveAutomation(automation) {
        try {
            await fetch(`${this.backendUrl}/api/automation/rules/${automation.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(automation)
            });
        } catch (err) {
            console.warn('Failed to save automation:', err);
        }
    }

    /**
     * Load saved tasks
     */
    async _loadSavedTasks() {
        try {
            const response = await fetch(`${this.backendUrl}/api/automation/tasks`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const tasks = await response.json();
                tasks.forEach(task => {
                    this.scheduledTasks.set(task.id, task);
                    if (task.enabled) {
                        this._startTask(task);
                    }
                });
            }
        } catch (err) {
            console.warn('Failed to load tasks:', err);
        }
    }

    /**
     * Get all tasks
     */
    getTasks() {
        return Array.from(this.scheduledTasks.values());
    }

    /**
     * Get task by ID
     */
    getTask(id) {
        return this.scheduledTasks.get(id);
    }

    /**
     * Enable/disable task
     */
    toggleTask(id, enabled) {
        const task = this.scheduledTasks.get(id);
        if (task) {
            task.enabled = enabled;
            
            if (enabled) {
                this._startTask(task);
            } else if (task.intervalId) {
                clearInterval(task.intervalId);
                this.activeAutomations.delete(id);
            }
            
            this._saveTask(task);
        }
    }

    /**
     * Delete task
     */
    deleteTask(id) {
        const task = this.scheduledTasks.get(id);
        if (task) {
            if (task.intervalId) {
                clearInterval(task.intervalId);
            }
            this.scheduledTasks.delete(id);
            this.activeAutomations.delete(id);
            
            // Delete from backend
            fetch(`${this.backendUrl}/api/automation/tasks/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        const tasks = this.getTasks();
        return {
            totalTasks: tasks.length,
            enabledTasks: tasks.filter(t => t.enabled).length,
            activeAutomations: this.activeAutomations.size,
            totalRuns: tasks.reduce((sum, t) => sum + (t.runCount || 0), 0),
            automationRules: this.automationRules.length
        };
    }
}
