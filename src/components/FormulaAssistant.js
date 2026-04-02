/**
 * FormulaAssistant - Natural language to formula conversion
 * Uses AI to convert English descriptions to Excel formulas
 */

export default class FormulaAssistant {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.token = options.AI_TOKEN || null;
    }

    /**
     * Create formula assistant UI
     */
    show() {
        const dialog = document.createElement('div');
        dialog.className = 'formula-assistant-modal';
        dialog.innerHTML = `
            <div class="formula-assistant-dialog">
                <div class="dialog-header">
                    <h3>📝 Formula Assistant</h3>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="dialog-body">
                    <p>Describe what you want to calculate, and I'll convert it to a formula.</p>
                    
                    <textarea id="formulaDescription" class="formula-input" 
                              placeholder="e.g., Calculate the average of column A, multiply by 1.1, and round to 2 decimals"
                              rows="4"></textarea>
                    
                    <div class="formula-preview">
                        <label>Generated Formula:</label>
                        <code id="generatedFormula" class="formula-code">= </code>
                        <button class="btn btn-small" onclick="navigator.clipboard.writeText(document.querySelector('#generatedFormula').textContent)">Copy</button>
                    </div>
                    
                    <div class="formula-examples">
                        <p><strong>Examples:</strong></p>
                        <ul>
                            <li>"Sum all values in B column"</li>
                            <li>"If A1 is greater than 100, show 'High', otherwise show 'Low'"</li>
                            <li>"Count cells that contain 'Product'"</li>
                            <li>"Calculate 10% discount on C1"</li>
                            <li>"Find the maximum date in column D"</li>
                        </ul>
                    </div>
                </div>
                
                <div class="dialog-footer">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-primary" id="generateBtn">🤖 Generate Formula</button>
                    <button class="btn btn-success" id="insertBtn">Insert to Cell</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this._attachListeners(dialog);
    }

    /**
     * Attach event listeners
     */
    _attachListeners(dialog) {
        dialog.querySelector('.close-btn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#cancelBtn')?.addEventListener('click', () => dialog.remove());
        dialog.querySelector('#generateBtn')?.addEventListener('click', () => this._generateFormula(dialog));
        dialog.querySelector('#insertBtn')?.addEventListener('click', () => this._insertFormula(dialog));

        // Generate on Enter
        dialog.querySelector('#formulaDescription')?.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') this._generateFormula(dialog);
        });
    }

    /**
     * Generate formula using AI
     */
    async _generateFormula(dialog) {
        const description = dialog.querySelector('#formulaDescription')?.value;
        const formulaCode = dialog.querySelector('#generatedFormula');
        const insertBtn = dialog.querySelector('#insertBtn');

        if (!description) {
            alert('Please describe what you want to calculate');
            return;
        }

        if (!this._SN.AI) {
            formulaCode.textContent = '[AI not available]';
            insertBtn.disabled = true;
            return;
        }

        formulaCode.textContent = '⏳ Generating...';

        try {
            const prompt = `Convert this description to an Excel formula:
"${description}"

Rules:
- Return ONLY the formula starting with =
- Use standard Excel functions (SUM, IF, AVERAGE, COUNT, MAX, MIN, etc.)
- Reference cells as A1, B2, etc. (assume columns A, B, C, etc.)
- Use colon for ranges (A1:A10)
- Example: =SUM(A1:A10)*1.1

Return ONLY the formula, nothing else.`;

            const response = await this._SN.AI.conversation(prompt, { joinChat: false });
            const formula = response.content?.trim().match(/=.+/)?.[0] || '';

            if (formula) {
                formulaCode.textContent = formula;
                insertBtn.disabled = false;
            } else {
                formulaCode.textContent = '[Invalid formula generated]';
                insertBtn.disabled = true;
            }
        } catch (error) {
            formulaCode.textContent = `[Error: ${error.message}]`;
            insertBtn.disabled = true;
        }
    }

    /**
     * Insert formula to selected cell
     */
    _insertFormula(dialog) {
        const formula = dialog.querySelector('#generatedFormula')?.textContent?.trim();
        if (!formula || formula === '[AI not available]' || formula.startsWith('[')) {
            alert('No valid formula to insert');
            return;
        }

        const sheet = this._SN.activeSheet;
        const cell = sheet?.selections?.[0];

        if (sheet && cell) {
            sheet.setCellFormula(cell.r, cell.c, formula);
            console.log('✓ Formula inserted:', formula);
            dialog.remove();
        } else {
            alert('Please select a cell');
        }
    }
}
