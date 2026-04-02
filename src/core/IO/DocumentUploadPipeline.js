/**
 * DocumentUploadPipeline - Complete file ingestion, parsing, and RAG integration
 * Supports: PDF, DOCX, XLSX, CSV, TXT, JSON
 */

export default class DocumentUploadPipeline {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        // Configuration
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.chunkSize = options.chunkSize || 512; // tokens
        this.chunkOverlap = options.chunkOverlap || 50; // tokens overlap
        this.supportedFormats = ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'json', 'md'];
        
        // Processing
        this.isProcessing = false;
        this.uploadProgress = 0;
        this.currentFile = null;
        
        // Callbacks
        this.onProgress = options.onProgress || null;
        this.onComplete = options.onComplete || null;
        this.onError = options.onError || null;
    }

    /**
     * Validate file
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (file.size > this.maxFileSize) {
            throw new Error(`File too large. Max size: ${this.maxFileSize / 1024 / 1024}MB`);
        }

        const ext = file.name.split('.').pop().toLowerCase();
        if (!this.supportedFormats.includes(ext)) {
            throw new Error(`Unsupported format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`);
        }

        return true;
    }

    /**
     * Upload file to backend — server converts to markdown and chunks for RAG.
     * (Older client-only extract/embed + JSON upload did not match /api/documents/upload.)
     */
    async uploadAndProcess(file, documentName = null) {
        try {
            this.validateFile(file);

            this.currentFile = {
                name: documentName || file.name,
                originalName: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date()
            };

            this.isProcessing = true;
            this._notifyProgress('Uploading file...', 20);

            const token = this._resolveAuthToken();
            if (!token) {
                throw new Error('Sign in to upload documents (missing auth token).');
            }

            const formData = new FormData();
            formData.append('file', file, file.name);
            formData.append('title', this.currentFile.name);

            const response = await fetch(`${this.backendUrl}/api/documents/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                let detail = response.statusText;
                try {
                    const err = await response.json();
                    if (err.error) detail = err.error;
                } catch (_) { /* ignore */ }
                throw new Error(detail || 'Document upload failed');
            }

            const data = await response.json();
            const documentId = data.document?.id;
            const chunkCount = data.document?.chunkCount ?? 0;
            const preview = data.document?.markdownPreview || '';

            this._notifyProgress('Document stored in RAG system', 100);
            this.isProcessing = false;
            this._notifyComplete({
                documentId,
                fileName: this.currentFile.name,
                chunkCount,
                textLength: preview.length,
                status: 'success'
            });

            return documentId;
        } catch (error) {
            this.isProcessing = false;
            this._notifyError(error.message);
            throw error;
        }
    }

    _resolveAuthToken() {
        if (this.token) return this.token;
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('sheetnext_token');
        }
        return null;
    }

    /**
     * Extract text from file based on format
     */
    async _extractText(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        switch (ext) {
            case 'pdf':
                return await this._extractFromPDF(file);
            case 'docx':
                return await this._extractFromDOCX(file);
            case 'xlsx':
                return await this._extractFromXLSX(file);
            case 'csv':
                return await this._extractFromCSV(file);
            case 'txt':
                return await this._extractFromTXT(file);
            case 'md':
                return await this._extractFromTXT(file); // Markdown is just text
            case 'json':
                return await this._extractFromJSON(file);
            default:
                throw new Error(`Unsupported format: ${ext}`);
        }
    }

    /**
     * Extract from PDF
     */
    async _extractFromPDF(file) {
        try {
            // Try to use PDF.js if available
            if (window.pdfjsLib) {
                return await this._extractPDFWithPDFJS(file);
            }
            // Fallback: simple text extraction
            return await this._extractPDFWithFallback(file);
        } catch (error) {
            console.warn('PDF extraction failed, using fallback:', error);
            return await this._extractPDFWithFallback(file);
        }
    }

    /**
     * Extract PDF with PDF.js library
     */
    async _extractPDFWithPDFJS(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n${pageText}`;
        }

        return fullText;
    }

    /**
     * Extract PDF with fallback (read as ArrayBuffer and extract visible text)
     */
    async _extractPDFWithFallback(file) {
        const text = await file.text();
        // Basic PDF text extraction: remove binary and keep readable text
        return text
            .replace(/[^\x20-\x7E\n]/g, '')
            .split('\n')
            .filter(line => line.trim().length > 0)
            .join('\n');
    }

    /**
     * Extract from DOCX
     */
    async _extractFromDOCX(file) {
        try {
            // Try to use Mammoth.js if available
            if (window.mammoth) {
                return await this._extractDOCXWithMammoth(file);
            }
            return await this._extractDOCXWithFallback(file);
        } catch (error) {
            console.warn('DOCX extraction failed, using fallback:', error);
            return await this._extractDOCXWithFallback(file);
        }
    }

    /**
     * Extract DOCX with Mammoth.js
     */
    async _extractDOCXWithMammoth(file) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }

    /**
     * Extract DOCX fallback (ZIP extraction)
     */
    async _extractDOCXWithFallback(file) {
        try {
            // Try JSZip if available
            if (window.JSZip) {
                const zip = new window.JSZip();
                const zipData = await zip.loadAsync(file);
                const documentXml = await zipData.file('word/document.xml')?.async('string');
                if (documentXml) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(documentXml, 'application/xml');
                    const text = Array.from(doc.querySelectorAll('w\\:t')).map(t => t.textContent).join(' ');
                    return text;
                }
            }
        } catch (e) {
            console.warn('JSZip extraction failed');
        }
        // Last resort: file name only
        return file.name;
    }

    /**
     * Extract from XLSX
     */
    async _extractFromXLSX(file) {
        try {
            if (window.XLSX) {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
                let allText = '';

                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = window.XLSX.utils.sheet_to_csv(worksheet);
                    allText += `\n--- Sheet: ${sheetName} ---\n${csv}`;
                }

                return allText;
            }
        } catch (error) {
            console.warn('XLSX extraction failed:', error);
        }

        // Fallback: binary data extraction
        const text = await file.text();
        return this._extractReadableText(text);
    }

    /**
     * Extract from CSV
     */
    async _extractFromCSV(file) {
        const text = await file.text();
        // Parse CSV and reconstruct as readable text
        const lines = text.split('\n');
        const headers = lines[0]?.split(',') || [];
        
        let result = 'CSV Data:\n';
        result += 'Columns: ' + headers.join(', ') + '\n\n';
        
        for (let i = 1; i < Math.min(lines.length, 100); i++) { // First 100 rows
            const values = lines[i].split(',');
            result += 'Row ' + i + ': ' + values.join(' | ') + '\n';
        }
        
        if (lines.length > 100) {
            result += `\n... and ${lines.length - 100} more rows`;
        }
        
        return result;
    }

    /**
     * Extract from TXT
     */
    async _extractFromTXT(file) {
        return await file.text();
    }

    /**
     * Extract from JSON
     */
    async _extractFromJSON(file) {
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            
            // Convert JSON to readable text
            return this._jsonToText(json);
        } catch (error) {
            // If not valid JSON, return as plain text
            return await file.text();
        }
    }

    /**
     * Convert JSON to text representation
     */
    _jsonToText(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let result = '';

        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                result += spaces + `[${index}]: `;
                if (typeof item === 'object') {
                    result += '\n' + this._jsonToText(item, indent + 1);
                } else {
                    result += item + '\n';
                }
            });
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                result += spaces + key + ': ';
                if (typeof value === 'object') {
                    result += '\n' + this._jsonToText(value, indent + 1);
                } else {
                    result += value + '\n';
                }
            }
        } else {
            result = spaces + obj + '\n';
        }

        return result;
    }

    /**
     * Extract readable text from binary data
     */
    _extractReadableText(text) {
        return text
            .replace(/[^\x20-\x7E\n]/g, '')
            .split('\n')
            .filter(line => line.trim().length > 0)
            .join('\n');
    }

    /**
     * Chunk text for RAG
     */
    async _chunkText(text) {
        // Simple chunking by sentences with overlap
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks = [];
        let currentChunk = '';
        let wordCount = 0;

        for (const sentence of sentences) {
            const words = sentence.trim().split(/\s+/).length;
            
            if (wordCount + words > this.chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                
                // Add overlap - keep last overlap words
                const overlap = currentChunk.split(/\s+/).slice(-this.chunkOverlap).join(' ');
                currentChunk = overlap + ' ' + sentence;
                wordCount = this.chunkOverlap + words;
            } else {
                currentChunk += sentence;
                wordCount += words;
            }
        }

        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Generate embeddings via backend
     */
    async _generateEmbeddings(chunks) {
        try {
            const token = this._resolveAuthToken();
            const response = await fetch(`${this.backendUrl}/api/rag/embed-chunks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ chunks })
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Embedding generation failed');
            }
        } catch (error) {
            console.error('Embedding error:', error);
            // Return chunks with empty embeddings if service fails
            return chunks.map((chunk, index) => ({
                id: `chunk_${index}`,
                text: chunk,
                embedding: null,
                metadata: { index }
            }));
        }
    }

    /**
     * Store document and chunks in backend
     */
    async _storeDocument(fileInfo, fullText, chunks) {
        console.warn(
            'DocumentUploadPipeline._storeDocument (JSON) is deprecated; use uploadAndProcess(file) with multipart upload.'
        );
        throw new Error('Use uploadAndProcess(file) — server expects multipart /api/documents/upload');
    }

    /**
     * Notify progress
     */
    _notifyProgress(message, percent) {
        this.uploadProgress = percent;
        if (this.onProgress) {
            this.onProgress({ message, percent, file: this.currentFile });
        }
        console.log(`Upload Progress: ${percent}% - ${message}`);
    }

    /**
     * Notify completion
     */
    _notifyComplete(result) {
        if (this.onComplete) {
            this.onComplete(result);
        }
        console.log('✓ Document processing complete:', result);
    }

    /**
     * Notify error
     */
    _notifyError(error) {
        if (this.onError) {
            this.onError({ error, file: this.currentFile });
        }
        console.error('✗ Document processing error:', error);
    }

    /**
     * Create upload UI
     */
    createUploadUI(containerId = 'document-upload-area') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        container.innerHTML = `
            <div class="document-upload-panel">
                <div class="upload-area" id="dropZone">
                    <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <h3>Upload Documents</h3>
                    <p>Drag files here or click to select</p>
                    <p class="supported-formats">Supported: PDF, DOCX, XLSX, CSV, TXT</p>
                    <input type="file" id="fileInput" multiple accept=".pdf,.docx,.xlsx,.csv,.txt,.json,.md" style="display:none;">
                    <button class="btn btn-primary" id="selectFilesBtn">Select Files</button>
                </div>
                
                <div id="progressArea" style="display:none;">
                    <div class="progress-item">
                        <p id="progressText">Processing...</p>
                        <div class="progress-bar">
                            <div id="progressFill" class="progress-fill" style="width:0%"></div>
                        </div>
                        <p id="progressPercent">0%</p>
                    </div>
                </div>
                
                <div id="completeArea" style="display:none;">
                    <div class="success-message">
                        <p>✓ Document successfully processed and added to knowledge base</p>
                        <button class="btn btn-secondary" id="uploadAnotherBtn">Upload Another</button>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');
        const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');

        selectFilesBtn?.addEventListener('click', () => fileInput?.click());

        fileInput?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => this.uploadAndProcess(file));
        });

        // Drag and drop
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone?.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => this.uploadAndProcess(file));
        });

        uploadAnotherBtn?.addEventListener('click', () => {
            document.getElementById('dropZone').style.display = 'block';
            document.getElementById('progressArea').style.display = 'none';
            document.getElementById('completeArea').style.display = 'none';
        });

        // Set up callbacks
        this.onProgress = (data) => {
            document.getElementById('progressArea').style.display = 'block';
            document.getElementById('dropZone').style.display = 'none';
            document.getElementById('progressText').textContent = data.message;
            document.getElementById('progressFill').style.width = data.percent + '%';
            document.getElementById('progressPercent').textContent = data.percent + '%';
        };

        this.onComplete = (result) => {
            document.getElementById('progressArea').style.display = 'none';
            document.getElementById('completeArea').style.display = 'block';
        };

        this.onError = (data) => {
            document.getElementById('progressArea').style.display = 'none';
            document.getElementById('dropZone').style.display = 'block';
            alert('Error: ' + data.error);
        };
    }
}
