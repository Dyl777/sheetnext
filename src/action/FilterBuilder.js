/**
 * FilterBuilder - Advanced spreadsheet filtering UI
 * Visual builder for complex filter rules
 */

export default class FilterBuilder {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.filters = [];
        this.active Sheet = null;
    }

    /**
     * Create filter builder dialog
     */
    show(sheet = null) {
        this.activeSheet = sheet || this._SN.activeSheet;
        if (!this.activeSheet) return;

        const dialog = document.createElement('div');
        dialog.className = 'filter-builder-modal';
        dialog.innerHTML = `
            <div class="filter-builder-dialog">
                <div class="dialog-header">
                    <h3>Advanced Filter</h3>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="dialog-body">
                    <div class="filter-rules" id="filterRules"></div>
                    <button class="btn btn-small" id="addRuleBtn">+ Add Rule</button>
                </div>
                
                <div class="filter-options">
                    <label>
                        <input type="radio" name="filterMode" value="AND" checked>
                        Match ALL conditions
                    </label>
                    <label>
                        <input type="radio" name="filterMode" value="OR">
                        Match ANY condition
                    </label>
                </div>
                
                <div class="dialog-footer">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-success" id="applyBtn">Apply Filter</button>
                    <button class="btn btn-secondary" id="clearBtn">Clear</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this._attachListeners(dialog);
        this._renderRules(dialog);
    }

    /**
     * Render filter rules
     */
    _renderRules(dialog) {
        const rulesContainer = dialog.querySelector('#filterRules');
        rulesContainer.innerHTML = '';

        if (this.filters.length === 0) {
            this._addRule(dialog);
        } else {
            this.filters.forEach((filter, index) => {
                this._renderRule(dialog, filter, index);
            });
        }
    }

    /**
     * Render single rule
     */
    _renderRule(dialog, filter, index) {
        const rulesContainer = dialog.querySelector('#filterRules');
        const columns = this._getColumns();

        const ruleDiv = document.createElement('div');
        ruleDiv.className = 'filter-rule';
        ruleDiv.innerHTML = `
            <select class="filter-column" data-index="${index}">
                ${columns.map(col => `
                    <option value="${col}" ${filter.column === col ? 'selected' : ''}>
                        ${col}
                    </option>
                `).join('')}
            </select>
            
            <select class="filter-operator" data-index="${index}">
                <option value="==">Equals</option>
                <option value="!=">Not equals</option>
                <option value=">">Greater than</option>
                <option value="<">Less than</option>
                <option value=">=">Greater or equal</option>
                <option value="<=">Less or equal</option>
                <option value="contains">Contains</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
                <option value="isEmpty">Is empty</option>
                <option value="isNotEmpty">Is not empty</option>
            </select>
            
            <input type="text" class="filter-value" data-index="${index}" placeholder="Value" 
                   value="${filter.value || ''" ${filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty' ? 'disabled' : ''}>
            
            <button class="remove-btn" onclick="this.parentElement.remove()">✕</button>
        `;

        rulesContainer.appendChild(ruleDiv);
    }

    /**
     * Add new rule
     */
    _addRule(dialog) {
        this.filters.push({ column: '', operator: '==', value: '' });
        const rulesContainer = dialog.querySelector('#filterRules');
        this._renderRule(dialog, this.filters[this.filters.length - 1], this.filters.length - 1);
    }

    /**
     * Attach event listeners
     */
    _attachListeners(dialog) {
        const closeBtn = dialog.querySelector('.close-btn');
        const addBtn = dialog.querySelector('#addRuleBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        const applyBtn = dialog.querySelector('#applyBtn');
        const clearBtn = dialog.querySelector('#clearBtn');

        closeBtn?.addEventListener('click', () => dialog.remove());
        cancelBtn?.addEventListener('click', () => dialog.remove());
        addBtn?.addEventListener('click', () => this._addRule(dialog));
        applyBtn?.addEventListener('click', () => this._applyFilter(dialog));
        clearBtn?.addEventListener('click', () => this._clearFilter());
    }

    /**
     * Apply filter
     */
    _applyFilter(dialog) {
        const filterMode = dialog.querySelector('input[name="filterMode"]:checked')?.value || 'AND';
        const rules = [];

        dialog.querySelectorAll('.filter-rule').forEach(rule => {
            const column = rule.querySelector('.filter-column')?.value;
            const operator = rule.querySelector('.filter-operator')?.value;
            const value = rule.querySelector('.filter-value')?.value;

            if (column) {
                rules.push({ column, operator, value });
            }
        });

        if (this._SN.AutoFilter) {
            this._SN.AutoFilter.apply(this.activeSheet, rules, filterMode);
        }

        console.log('✓ Filter applied:', rules);
        dialog.remove();
    }

    /**
     * Clear filter
     */
    _clearFilter() {
        this.filters = [];
        if (this._SN.AutoFilter) {
            this._SN.AutoFilter.clear(this.activeSheet);
        }
        console.log('✓ Filter cleared');
    }

    /**
     * Get available columns
     */
    _getColumns() {
        const columns = [];
        for (let c = 0; c < this.activeSheet.maxCol; c++) {
            const header = this.activeSheet.getCell(0, c)?.value || `Column ${c + 1}`;
            columns.push(String(header));
        }
        return columns;
    }
}
