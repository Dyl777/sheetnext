/**
 * AutomationTemplates - Pre-built automation rule templates
 * Quick-start templates for common spreadsheet workflows
 */

export default class AutomationTemplates {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.templates = this._getTemplates();
    }

    /**
     * Get all available templates
     */
    _getTemplates() {
        return [
            {
                id: 'daily-report',
                name: 'Daily Report Generator',
                description: 'Automatically generate daily summary reports',
                category: 'Reporting',
                trigger: { type: 'schedule', config: { scheduleType: 'daily', time: '09:00' } },
                actions: [
                    { type: 'copyRange', params: 'A1:Z100' },
                    { type: 'aiGenerate', params: 'Generate summary statistics' },
                    { type: 'exportData', params: 'csv' }
                ]
            },
            {
                id: 'data-validation',
                name: 'Data Validation Alert',
                description: 'Flag cells that fail validation rules',
                category: 'Data Quality',
                trigger: { type: 'event', config: { eventType: 'dataInput' } },
                conditions: [{ field: 'value', operator: 'contains', value: 'invalid' }],
                actions: [
                    { type: 'format', params: 'red background' },
                    { type: 'notification', params: 'Invalid data entered' }
                ]
            },
            {
                id: 'price-update',
                name: 'Auto Price Update',
                description: 'Update prices based on calculation formula',
                category: 'Sales',
                trigger: { type: 'schedule', config: { scheduleType: 'weekly', days: [1] } },
                actions: [
                    { type: 'applyFormula', params: 'C:C,=B:B*1.15' },
                    { type: 'notification', params: 'Prices updated' }
                ]
            },
            {
                id: 'inventory-alert',
                name: 'Low Inventory Alert',
                description: 'Alert when stock falls below threshold',
                category: 'Inventory',
                trigger: { type: 'condition', config: { checkInterval: '3600000' } },
                conditions: [{ field: 'inventory', operator: '<', value: '10' }],
                actions: [
                    { type: 'notification', params: 'Low inventory detected' },
                    { type: 'aiGenerate', params: 'Generate purchase order' }
                ]
            },
            {
                id: 'sales-summary',
                name: 'Weekly Sales Summary',
                description: 'Create weekly sales summary and charts',
                category: 'Sales',
                trigger: { type: 'schedule', config: { scheduleType: 'weekly', days: [5] } },
                actions: [
                    { type: 'createChart', params: 'line,A1:F50' },
                    { type: 'applyFormula', params: 'G1,=SUM(B:B)' },
                    { type: 'exportData', params: 'xlsx' }
                ]
            },
            {
                id: 'email-list',
                name: 'Email Cleanup',
                description: 'Remove duplicates and clean email format',
                category: 'Data Cleaning',
                trigger: { type: 'manual' },
                actions: [
                    { type: 'applyFilter', params: 'Remove duplicates' },
                    { type: 'format', params: 'lowercase' },
                    { type: 'notification', params: 'Email list cleaned' }
                ]
            },
            {
                id: 'expense-report',
                name: 'Monthly Expense Report',
                description: 'Generate monthly expense summary',
                category: 'Finance',
                trigger: { type: 'schedule', config: { scheduleType: 'monthly', days: [1] } },
                conditions: [{ field: 'date', operator: 'contains', value: new Date().getMonth() }],
                actions: [
                    { type: 'applyFormula', params: 'Total,=SUM(Amount)' },
                    { type: 'createChart', params: 'pie,Category:Amount' },
                    { type: 'exportData', params: 'pdf' }
                ]
            },
            {
                id: 'grade-calc',
                name: 'Grade Calculator',
                description: 'Calculate student grades automatically',
                category: 'Education',
                trigger: { type: 'event', config: { eventType: 'cellChange' } },
                actions: [
                    { type: 'applyFormula', params: 'Grade,=IF(Score>=90,"A",IF(Score>=80,"B",IF(Score>=70,"C","F")))' },
                    { type: 'format', params: 'highlight grades' }
                ]
            }
        ];
    }

    /**
     * Show templates gallery
     */
    show() {
        const dialog = document.createElement('div');
        dialog.className = 'templates-gallery-modal';
        dialog.innerHTML = `
            <div class="templates-gallery-dialog">
                <div class="dialog-header">
                    <h3>🎨 Automation Templates</h3>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="templates-list" id="templatesList"></div>
            </div>
        `;

        document.body.appendChild(dialog);
        this._renderTemplates(dialog);
        dialog.querySelector('.close-btn')?.addEventListener('click', () => dialog.remove());
    }

    /**
     * Render templates list
     */
    _renderTemplates(dialog) {
        const list = dialog.querySelector('#templatesList');
        
        const categories = [...new Set(this.templates.map(t => t.category))];

        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'templates-category';
            categoryDiv.innerHTML = `<h4>${category}</h4>`;

            const categoryTemplates = this.templates.filter(t => t.category === category);
            
            const gridDiv = document.createElement('div');
            gridDiv.className = 'templates-grid';

            categoryTemplates.forEach(template => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'template-card';
                cardDiv.innerHTML = `
                    <h5>${template.name}</h5>
                    <p>${template.description}</p>
                    <div class="template-actions">
                        <button class="btn btn-small btn-primary" onclick="window.selectedTemplate = '${template.id}'">View</button>
                        <button class="btn btn-small btn-success" onclick="window.deployTemplate = '${template.id}'">Deploy</button>
                    </div>
                `;

                cardDiv.querySelector('.btn-primary')?.addEventListener('click', () => this._previewTemplate(template, dialog));
                cardDiv.querySelector('.btn-success')?.addEventListener('click', () => this._deployTemplate(template, dialog));

                gridDiv.appendChild(cardDiv);
            });

            categoryDiv.appendChild(gridDiv);
            list.appendChild(categoryDiv);
        });
    }

    /**
     * Preview template
     */
    _previewTemplate(template, dialog) {
        const preview = document.createElement('div');
        preview.className = 'template-preview';
        preview.innerHTML = `
            <div class="preview-content">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
                
                <h4>Trigger:</h4>
                <pre>${JSON.stringify(template.trigger, null, 2)}</pre>
                
                <h4>Actions (${template.actions.length}):</h4>
                <ul>
                    ${template.actions.map(a => `<li><strong>${a.type}:</strong> ${a.params}</li>`).join('')}
                </ul>
                
                <button class="btn btn-success" onclick="this.parentElement.parentElement.remove()">Deploy This Template</button>
            </div>
        `;

        document.body.appendChild(preview);
    }

    /**
     * Deploy template as automation rule
     */
    async _deployTemplate(template, dialog) {
        if (!confirm(`Deploy "${template.name}" automation?`)) return;

        try {
            const response = await fetch(`${this.backendUrl}/api/automation/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    name: template.name,
                    trigger: template.trigger,
                    conditions: template.conditions || [],
                    actions: template.actions,
                    enabled: true,
                    fromTemplate: template.id
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✓ Template deployed:', template.name);
                alert(`✓ "${template.name}" automation created successfully!`);
                dialog.remove();
            }
        } catch (error) {
            console.error('Deployment failed:', error);
            alert('Failed to deploy template');
        }
    }

    /**
     * Create custom template from current automation
     */
    async createCustomTemplate(automation, templateName) {
        const template = {
            id: `custom_${Date.now()}`,
            name: templateName,
            description: 'Custom automation template',
            category: 'Custom',
            trigger: automation.trigger,
            conditions: automation.conditions || [],
            actions: automation.actions
        };

        this.templates.push(template);
        localStorage.setItem('CustomTemplates', JSON.stringify(this.templates.filter(t => t.id.includes('custom'))));
        
        console.log('✓ Template saved:', templateName);
        return template;
    }

    /**
     * Load custom templates from storage
     */
    loadCustomTemplates() {
        const customStr = localStorage.getItem('CustomTemplates');
        if (customStr) {
            const custom = JSON.parse(customStr);
            this.templates.push(...custom);
        }
    }
}
