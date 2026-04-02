/**
 * ExportManager - Export spreadsheet data in multiple formats
 * Formats: CSV, XLSX, JSON, PDF, HTML
 */

export default class ExportManager {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
    }

    /**
     * Export to CSV
     */
    exportCSV(filename = 'export.csv', range = null) {
        const sheet = this._SN.activeSheet;
        if (!sheet) return;

        const data = this._getSheetData(sheet, range);
        const csv = this._dataToCSV(data);
        
        this._downloadFile(csv, filename, 'text/csv');
        console.log('✓ Exported to CSV');
    }

    /**
     * Export to XLSX
     */
    async exportXLSX(filename = 'export.xlsx', range = null) {
        // Check if XLSX library is available
        if (!window.XLSX) {
            await this._loadXLSXLibrary();
        }

        const sheet = this._SN.activeSheet;
        if (!sheet) return;

        const data = this._getSheetData(sheet, range);
        const workbook = window.XLSX.utils.book_new();
        const worksheet = window.XLSX.utils.aoa_to_sheet(data);
        window.XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        
        window.XLSX.writeFile(workbook, filename);
        console.log('✓ Exported to XLSX');
    }

    /**
     * Export to JSON
     */
    exportJSON(filename = 'export.json', includeMetadata = true, range = null) {
        const sheet = this._SN.activeSheet;
        if (!sheet) return;

        const data = this._getSheetData(sheet, range);
        
        const json = {
            sheetName: sheet.name,
            exportDate: new Date().toISOString(),
            rowCount: data.length,
            colCount: data[0]?.length || 0,
            data
        };

        if (includeMetadata) {
            json.metadata = {
                frozen: sheet.frozen,
                zoom: sheet.zoom,
                gridlines: sheet.showGridlines
            };
        }

        const jsonStr = JSON.stringify(json, null, 2);
        this._downloadFile(jsonStr, filename, 'application/json');
        console.log('✓ Exported to JSON');
    }

    /**
     * Export to HTML
     */
    exportHTML(filename = 'export.html', includeStyles = true, range = null) {
        const sheet = this._SN.activeSheet;
        if (!sheet) return;

        const data = this._getSheetData(sheet, range);
        
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${sheet.name}</title>
    <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; }
        td, th { border: 1px solid #ddd; padding: 8px; }
        th { background: #4caf50; color: white; }
        tr:nth-child(even) { background: #f2f2f2; }
    </style>
</head>
<body>
    <h1>${sheet.name}</h1>
    <table>`;

        data.forEach((row, rowIdx) => {
            html += rowIdx === 0 ? '<thead><tr>' : '<tr>';
            row.forEach((cell, colIdx) => {
                const tag = rowIdx === 0 ? 'th' : 'td';
                html += `<${tag}>${this._escapeHTML(cell)}</${tag}>`;
            });
            html += '</tr>';
            if (rowIdx === 0) html += '</thead><tbody>';
        });

        html += `</tbody>
    </table>
</body>
</html>`;

        this._downloadFile(html, filename, 'text/html');
        console.log('✓ Exported to HTML');
    }

    /**
     * Export to PDF
     */
    async exportPDF(filename = 'export.pdf', range = null) {
        const sheet = this._SN.activeSheet;
        if (!sheet) return;

        // Check for PDFKit or jsPDF library
        if (window.jsPDF) {
            return this._exportPDFWithJsPDF(sheet, filename, range);
        }

        // Fallback: Export as HTML, suggest print to PDF
        this._notify('Please use Print > Save as PDF or install jsPDF library', 'info');
        this.exportHTML(filename.replace('.pdf', '.html'), true, range);
    }

    /**
     * Export to PDF with jsPDF
     */
    async _exportPDFWithJsPDF(sheet, filename, range) {
        const data = this._getSheetData(sheet, range);
        const { jsPDF } = window.jsPDF;
        
        const doc = new jsPDF();
        doc.autoTable({
            head: [data[0]],
            body: data.slice(1),
            startY: 10,
            didDrawPage: (data) => {
                doc.setFontSize(12);
                doc.text(sheet.name, 14, 10);
            }
        });
        
        doc.save(filename);
        console.log('✓ Exported to PDF');
    }

    /**
     * Get sheet data
     */
    _getSheetData(sheet, range = null) {
        const data = [];
        
        // Get range or full sheet
        let startRow = 0, endRow = sheet.maxRow - 1;
        let startCol = 0, endCol = sheet.maxCol - 1;

        if (range) {
            const rangeParts = range.split(':');
            const start = this._parseCell(rangeParts[0]);
            const end = this._parseCell(rangeParts[1] || rangeParts[0]);
            
            startRow = start.row;
            endRow = end.row;
            startCol = start.col;
            endCol = end.col;
        }

        for (let r = startRow; r <= endRow; r++) {
            const row = [];
            for (let c = startCol; c <= endCol; c++) {
                const cell = sheet.getCell(r, c);
                row.push(cell?.value || cell?.formula || '');
            }
            data.push(row);
        }

        return data;
    }

    /**
     * Parse cell reference (e.g., "A1" → {row: 0, col: 0})
     */
    _parseCell(cell) {
        const match = cell.match(/([a-z]+)(\d+)/i);
        if (!match) return { row: 0, col: 0 };
        
        const col = match[1].toUpperCase().charCodeAt(0) - 65;
        const row = parseInt(match[2]) - 1;
        return { row, col };
    }

    /**
     * Convert data to CSV
     */
    _dataToCSV(data) {
        return data.map(row =>
            row.map(cell => {
                const str = String(cell || '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        ).join('\n');
    }

    /**
     * Escape HTML
     */
    _escapeHTML(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text || '').replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Download file
     */
    _downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Load XLSX library
     */
    async _loadXLSXLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Create export menu UI
     */
    createExportMenu(containerId = null) {
        const container = containerId 
            ? document.getElementById(containerId)
            : this._SN.containerDom?.querySelector('[data-toolbar-container]');

        if (!container) return;

        const menu = document.createElement('div');
        menu.className = 'export-menu';
        menu.innerHTML = `
            <button class="export-btn" id="exportCSV">📄 CSV</button>
            <button class="export-btn" id="exportXLSX">📊 XLSX</button>
            <button class="export-btn" id="exportJSON">🔗 JSON</button>
            <button class="export-btn" id="exportHTML">🌐 HTML</button>
            <button class="export-btn" id="exportPDF">📑 PDF</button>
        `;

        container.appendChild(menu);

        menu.querySelector('#exportCSV')?.addEventListener('click', () => this.exportCSV());
        menu.querySelector('#exportXLSX')?.addEventListener('click', () => this.exportXLSX());
        menu.querySelector('#exportJSON')?.addEventListener('click', () => this.exportJSON());
        menu.querySelector('#exportHTML')?.addEventListener('click', () => this.exportHTML());
        menu.querySelector('#exportPDF')?.addEventListener('click', () => this.exportPDF());
    }

    /**
     * Notify user
     */
    _notify(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `export-notification notification-${type}`;
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
}
