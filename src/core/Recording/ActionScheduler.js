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

    _bearer() {
        return (
            this.token ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('sheetnext_token') : null)
        );
    }

    _parseJsonField(val) {
        if (val == null) return val;
        if (typeof val === 'object') return val;
        try {
            return JSON.parse(val);
        } catch {
            return val;
        }
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
            this.activeAutomations.add(task.id);
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
        const auth = this._bearer();
        if (!auth) return;

        const trigger = {
            type: task.type || 'interval',
            schedule: task.schedule ?? null,
            interval: task.interval ?? null,
            config: task.metadata?.triggerConfig || {}
        };
        const payload = {
            name: task.name || 'Scheduled task',
            description: '',
            trigger,
            actions: task.actions || [],
            status: task.enabled !== false ? 'active' : 'inactive',
            metadata: {
                ...(task.metadata || {}),
                source: 'action-scheduler',
                clientTaskId: task.clientTaskId || task.id
            }
        };

        const uuidRe =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const serverId = task.serverId || (uuidRe.test(String(task.id)) ? task.id : null);

        try {
            if (serverId) {
                await fetch(`${this.backendUrl}/api/automation/tasks/${serverId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${auth}`
                    },
                    body: JSON.stringify({
                        name: payload.name,
                        description: payload.description,
                        trigger: payload.trigger,
                        actions: payload.actions,
                        status: payload.status,
                        metadata: payload.metadata
                    })
                });
                return;
            }

            const res = await fetch(`${this.backendUrl}/api/automation/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const row = await res.json();
                const oldId = task.id;
                if (row?.id) {
                    task.serverId = row.id;
                    task.id = row.id;
                    if (oldId !== row.id && this.scheduledTasks.has(oldId)) {
                        this.scheduledTasks.delete(oldId);
                    }
                    this.scheduledTasks.set(row.id, task);
                }
            }
        } catch (err) {
            console.warn('Failed to save task:', err);
        }
    }

    /**
     * Save automation to backend
     */
    async _saveAutomation(automation) {
        const auth = this._bearer();
        if (!auth) return;

        const payload = {
            name: automation.name || 'Automation',
            description: '',
            trigger: automation.trigger || { type: 'event', config: {} },
            actions: automation.actions || [],
            status: automation.enabled !== false ? 'active' : 'inactive',
            metadata: {
                conditions: automation.conditions || [],
                source: 'action-scheduler-automation',
                clientId: automation.id
            }
        };

        try {
            await fetch(`${this.backendUrl}/api/automation/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth}`
                },
                body: JSON.stringify(payload)
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
            const auth = this._bearer();
            if (!auth) return;

            const response = await fetch(`${this.backendUrl}/api/automation/tasks`, {
                headers: {
                    Authorization: `Bearer ${auth}`
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const rows = Array.isArray(data) ? data : data.tasks || [];

            for (const row of rows) {
                const trigger = this._parseJsonField(row.trigger) || {};
                const actions = this._parseJsonField(row.actions) || [];
                const meta = this._parseJsonField(row.metadata) || {};
                const scheduled = {
                    id: row.id,
                    serverId: row.id,
                    name: row.name,
                    type: trigger.type || 'interval',
                    schedule: trigger.schedule ?? null,
                    interval: trigger.interval ?? null,
                    actions,
                    enabled: row.status !== 'inactive' && row.status !== 'archived',
                    lastRun: null,
                    nextRun: null,
                    runCount: 0,
                    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
                    metadata: meta
                };
                this.scheduledTasks.set(scheduled.id, scheduled);
                if (scheduled.enabled) {
                    this._startTask(scheduled);
                }
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
            
            const auth = this._bearer();
            if (auth) {
                fetch(`${this.backendUrl}/api/automation/tasks/${id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${auth}`
                    }
                });
            }
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
