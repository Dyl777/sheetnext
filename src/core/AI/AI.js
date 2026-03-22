/**
 * SheetNext AI Module - Full Integration
 * Features: llama-server, Groq, Multi-Conversation, PageIndex RAG, File-to-Markdown
 */

/**
 * File to Markdown Converter - Using llama-server or Groq
 */
class FileToMarkdownConverter {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'http://localhost:8080/v1/chat/completions';
        this.groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.groqApiKey = options.groqApiKey || '';
        this.modelName = options.modelName || 'llama';
        this.useGroq = options.useGroqForConversion || false;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    }

    /**
     * Convert file to markdown
     */
    async convertFileToMarkdown(file) {
        if (file.size > this.maxFileSize) {
            throw new Error(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
        }

        const fileType = file.type;

        if (fileType.startsWith('image/')) {
            return await this._convertImageToMarkdown(file);
        } else if (fileType === 'application/pdf') {
            return await this._convertPdfToMarkdown(file);
        } else if (fileType === 'text/plain' || fileType === 'text/markdown' || fileType === 'text/html') {
            return await this._convertTextToMarkdown(file);
        } else if (fileType.includes('wordprocessingml') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return await this._convertDocxToMarkdown(file);
        } else {
            return await this._convertGenericToMarkdown(file);
        }
    }

    /**
     * Convert image to markdown using vision model
     */
    async _convertImageToMarkdown(file) {
        const base64Image = await this._fileToBase64(file);

        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Analyze this image and convert its content to markdown format. If it contains text, extract it. If it contains a table, convert to markdown table. If it contains a chart/graph, describe it in markdown. Be comprehensive and structured.'
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${file.type};base64,${base64Image}`
                        }
                    }
                ]
            }
        ];

        return await this._callVisionModel(messages);
    }

    /**
     * Convert PDF to markdown
     */
    async _convertPdfToMarkdown(file) {
        const text = await this._extractPdfText(file);
        return await this._convertTextToMarkdown({ text, type: 'text/plain' });
    }

    /**
     * Convert text file to markdown
     */
    async _convertTextToMarkdown(file) {
        const text = file.text ? await file.text() : file.text;

        const messages = [
            {
                role: 'system',
                content: 'Convert the following text to well-structured markdown format. Use appropriate headers, lists, code blocks, and formatting. Preserve all information.'
            },
            {
                role: 'user',
                content: text
            }
        ];

        return await this._callModel(messages);
    }

    /**
     * Convert DOCX to markdown
     */
    async _convertDocxToMarkdown(file) {
        const arrayBuffer = await file.arrayBuffer();
        // Simple DOCX text extraction (for full DOCX support, use mammoth.js)
        const text = await this._extractDocxText(arrayBuffer);
        return await this._convertTextToMarkdown({ text, type: 'text/plain' });
    }

    /**
     * Convert generic file to markdown
     */
    async _convertGenericToMarkdown(file) {
        const text = await file.text();

        const messages = [
            {
                role: 'system',
                content: 'Analyze this file content and convert it to markdown format. Identify the content type and use appropriate markdown formatting.'
            },
            {
                role: 'user',
                content: text
            }
        ];

        return await this._callModel(messages);
    }

    /**
     * Call vision model for image analysis
     */
    async _callVisionModel(messages) {
        if (this.useGroq && this.groqApiKey) {
            return await this._callGroq(messages, 'llama-3.2-90b-vision-preview');
        }
        return await this._callLlamaServer(messages, true);
    }

    /**
     * Call language model
     */
    async _callModel(messages) {
        if (this.useGroq && this.groqApiKey) {
            return await this._callGroq(messages);
        }
        return await this._callLlamaServer(messages);
    }

    /**
     * Call Groq API
     */
    async _callGroq(messages, model = 'llama-3.2-90b-vision-preview') {
        const response = await fetch(this.groqUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.groqApiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Groq API error: ${error.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Call llama-server
     */
    async _callLlamaServer(messages, isVision = false) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.modelName,
                messages: messages,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            throw new Error(`llama-server error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Convert file to base64
     */
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Extract text from PDF
     */
    async _extractPdfText(file) {
        // Simple PDF text extraction
        // For production, use pdf.js library
        const text = await file.text();
        return text;
    }

    /**
     * Extract text from DOCX
     */
    async _extractDocxText(arrayBuffer) {
        // Simple DOCX extraction
        // For production, use mammoth.js library
        const text = new TextDecoder().decode(arrayBuffer);
        return text.replace(/<[^>]*>/g, '');
    }

    /**
     * Set Groq API key
     */
    setGroqApiKey(apiKey) {
        this.groqApiKey = apiKey;
        this.useGroq = !!apiKey;
    }

    /**
     * Check if Groq is configured
     */
    isGroqConfigured() {
        return !!this.groqApiKey;
    }
}

/**
 * PageIndex RAG System - For document retrieval and Q&A
 */
class PageIndexRAG {
    constructor(options = {}) {
        this.index = new Map(); // pageIndex -> page data
        this.embeddings = options.embeddings || null;
        this.vectorStore = options.vectorStore || [];
        this.chunkSize = options.chunkSize || 512;
        this.chunkOverlap = options.chunkOverlap || 50;
        this.topK = options.topK || 3;
        this.similarityThreshold = options.similarityThreshold || 0.7;
        this.backendUrl = options.backendUrl || null;
    }

    /**
     * Add a page to the index
     */
    addPage(pageIndex, content, metadata = {}) {
        const pageData = {
            pageIndex,
            content,
            metadata: {
                title: metadata.title || `Page ${pageIndex}`,
                timestamp: new Date().toISOString(),
                ...metadata
            },
            chunks: this._chunkContent(content)
        };

        this.index.set(pageIndex, pageData);
        
        if (this.embeddings) {
            this._addToVectorStore(pageData);
        }

        return pageData;
    }

    /**
     * Remove a page from the index
     */
    removePage(pageIndex) {
        const removed = this.index.delete(pageIndex);
        if (this.embeddings) {
            this.vectorStore = this.vectorStore.filter(item => item.pageIndex !== pageIndex);
        }
        return removed;
    }

    /**
     * Get a page by index
     */
    getPage(pageIndex) {
        return this.index.get(pageIndex);
    }

    /**
     * Search for relevant pages
     */
    async search(query, options = {}) {
        const { topK = this.topK, threshold = this.similarityThreshold, useSemantic = true } = options;
        
        // Try backend search first if available
        if (this.backendUrl) {
            try {
                return await this._searchBackend(query, topK);
            } catch (err) {
                console.warn('Backend search failed, using local search:', err);
            }
        }
        
        if (this.embeddings && useSemantic) {
            return await this._semanticSearch(query, topK, threshold);
        }
        
        return this._keywordSearch(query, topK);
    }

    /**
     * Search via backend
     */
    async _searchBackend(query, topK) {
        const response = await fetch(`${this.backendUrl}/api/rag/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, topK })
        });

        if (!response.ok) {
            throw new Error('Backend search failed');
        }

        const data = await response.json();
        return data.results;
    }

    /**
     * Semantic search using embeddings
     */
    async _semanticSearch(query, topK, threshold) {
        try {
            const queryEmbedding = await this.embeddings.embedQuery(query);
            
            const results = this.vectorStore
                .map(item => ({
                    ...item,
                    similarity: this._cosineSimilarity(queryEmbedding, item.embedding)
                }))
                .filter(item => item.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK);

            return results.map(item => ({
                pageIndex: item.pageIndex,
                chunk: item.chunk,
                content: item.content,
                similarity: item.similarity,
                metadata: item.metadata
            }));
        } catch (err) {
            console.warn('Semantic search failed, falling back to keyword search:', err);
            return this._keywordSearch(query, topK);
        }
    }

    /**
     * Keyword-based search
     */
    _keywordSearch(query, topK) {
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const results = [];

        for (const [pageIndex, pageData] of this.index) {
            const content = pageData.content.toLowerCase();
            let score = 0;

            for (const term of queryTerms) {
                if (content.includes(term)) {
                    score++;
                }
            }

            if (score > 0) {
                results.push({
                    pageIndex,
                    content: pageData.content,
                    metadata: pageData.metadata,
                    score,
                    chunks: pageData.chunks.filter(chunk => 
                        queryTerms.some(term => chunk.toLowerCase().includes(term))
                    )
                });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * Chunk content for better retrieval
     */
    _chunkContent(content) {
        const chunks = [];
        let start = 0;

        while (start < content.length) {
            let end = start + this.chunkSize;
            
            if (end < content.length) {
                const lastPeriod = content.lastIndexOf('.', end);
                const lastSpace = content.lastIndexOf(' ', end);
                end = Math.max(lastPeriod, lastSpace, start + this.chunkSize / 2);
            }

            chunks.push(content.slice(start, Math.min(end, content.length)).trim());
            start = end - this.chunkOverlap;
            
            if (start <= 0) break;
        }

        return chunks;
    }

    /**
     * Add page to vector store
     */
    async _addToVectorStore(pageData) {
        for (const chunk of pageData.chunks) {
            try {
                const embedding = await this.embeddings.embedDocument(chunk);
                this.vectorStore.push({
                    pageIndex: pageData.pageIndex,
                    chunk,
                    content: pageData.content,
                    embedding,
                    metadata: pageData.metadata
                });
            } catch (err) {
                console.warn('Failed to embed chunk:', err);
            }
        }
    }

    /**
     * Calculate cosine similarity
     */
    _cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Get all indexed pages
     */
    getAllPages() {
        return Array.from(this.index.values());
    }

    /**
     * Clear the index
     */
    clear() {
        this.index.clear();
        this.vectorStore = [];
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            pageCount: this.index.size,
            vectorStoreSize: this.vectorStore.length,
            chunkSize: this.chunkSize,
            topK: this.topK
        };
    }
}

/**
 * Conversation Manager - Handle multiple conversations
 */
class ConversationManager {
    constructor(maxConversations = 10, backendUrl = null) {
        this.conversations = new Map();
        this.activeConversationId = null;
        this.maxConversations = maxConversations;
        this.conversationHistory = [];
        this.backendUrl = backendUrl;
    }

    /**
     * Create a new conversation
     */
    createConversation(name, options = {}) {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const conversation = {
            id,
            name: name || `Conversation ${this.conversations.size + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [
                { 
                    role: "system", 
                    content: options.systemPrompt || this._getDefaultSystemPrompt()
                }
            ],
            context: options.context || [],
            metadata: options.metadata || {},
            settings: {
                temperature: options.temperature || 0.7,
                maxTokens: options.maxTokens || 4096,
                topP: options.topP || 0.9,
                toolsEnabled: options.toolsEnabled !== false,
                ...options.settings
            }
        };

        this.conversations.set(id, conversation);
        this.conversationHistory.push(id);
        
        if (this.conversations.size > this.maxConversations) {
            const oldestId = this.conversationHistory.shift();
            this.conversations.delete(oldestId);
        }

        this.activeConversationId = id;
        return conversation;
    }

    /**
     * Get a conversation by ID
     */
    getConversation(id = this.activeConversationId) {
        return this.conversations.get(id);
    }

    /**
     * Set active conversation
     */
    setActiveConversation(id) {
        if (this.conversations.has(id)) {
            this.activeConversationId = id;
            return true;
        }
        return false;
    }

    /**
     * Add message to conversation
     */
    addMessage(id, role, content, metadata = {}) {
        const conversation = this.conversations.get(id);
        if (!conversation) return null;

        const message = {
            role,
            content,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        conversation.messages.push(message);
        conversation.updatedAt = new Date().toISOString();
        
        this._updateContextWindow(conversation);

        return message;
    }

    /**
     * Add context to conversation
     */
    addContext(id, contextData) {
        const conversation = this.conversations.get(id);
        if (!conversation) return;

        conversation.context.push({
            type: contextData.type || 'general',
            data: contextData,
            timestamp: new Date().toISOString()
        });

        if (conversation.context.length > 10) {
            conversation.context.shift();
        }
    }

    /**
     * Clear conversation messages
     */
    clearMessages(id, keepSystem = true) {
        const conversation = this.conversations.get(id);
        if (!conversation) return;

        if (keepSystem) {
            conversation.messages = [conversation.messages[0]];
        } else {
            conversation.messages = [];
        }
        
        conversation.context = [];
        conversation.updatedAt = new Date().toISOString();
    }

    /**
     * Delete a conversation
     */
    deleteConversation(id) {
        const deleted = this.conversations.delete(id);
        this.conversationHistory = this.conversationHistory.filter(cid => cid !== id);
        
        if (this.activeConversationId === id) {
            this.activeConversationId = this.conversationHistory[this.conversationHistory.length - 1] || null;
        }
        
        return deleted;
    }

    /**
     * Get all conversations
     */
    getAllConversations() {
        return Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    /**
     * Export conversation
     */
    exportConversation(id, format = 'json') {
        const conversation = this.conversations.get(id);
        if (!conversation) return null;

        if (format === 'json') {
            return JSON.stringify(conversation, null, 2);
        }
        
        if (format === 'markdown') {
            return this._exportAsMarkdown(conversation);
        }
        
        return conversation;
    }

    /**
     * Export as markdown
     */
    _exportAsMarkdown(conversation) {
        let md = `# ${conversation.name}\n\n`;
        md += `Created: ${conversation.createdAt}\n`;
        md += `Updated: ${conversation.updatedAt}\n\n---\n\n`;

        for (const msg of conversation.messages) {
            if (msg.role === 'system') continue;
            
            const icon = msg.role === 'user' ? '[U]' : '[A]';
            md += `### ${icon} ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n`;
            md += `${msg.content}\n\n`;
        }

        return md;
    }

    /**
     * Update context window
     */
    _updateContextWindow(conversation) {
        const maxContextLength = conversation.settings.maxContextLength || 20;
        
        if (conversation.messages.length > maxContextLength) {
            const systemMsg = conversation.messages[0];
            conversation.messages = [
                systemMsg,
                ...conversation.messages.slice(-maxContextLength + 1)
            ];
        }
    }

    /**
     * Get default system prompt
     */
    _getDefaultSystemPrompt() {
        return `You are an expert spreadsheet assistant integrated with SheetNext.
You can help with formulas, data analysis, templates, formatting, and more.
Provide clear, accurate, and helpful responses.`;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalConversations: this.conversations.size,
            activeConversationId: this.activeConversationId,
            maxConversations: this.maxConversations
        };
    }
}

/**
 * Main AI Class
 */
export default class AI {
    constructor(SN, options = {}, license) {
        this._SN = SN;
        this._license = license;
        
        // API Configuration
        this.apiUrl = options.AI_URL || "http://localhost:8080/v1/chat/completions";
        this.modelName = options.AI_MODEL || "llama";
        this.apiKey = options.AI_TOKEN || "no-key";
        
        // Groq Configuration
        this.groqApiKey = options.GROQ_API_KEY || "";
        this.useGroq = options.USE_GROQ || false;
        this.groqModel = options.GROQ_MODEL || "llama-3.2-90b-vision-preview";
        
        // Advanced configuration
        this.maxTokens = options.AI_MAX_TOKENS || 4096;
        this.temperature = options.AI_TEMPERATURE || 0.7;
        this.topP = options.AI_TOP_P || 0.9;
        this.streamEnabled = options.AI_STREAM !== false;
        this.toolsEnabled = options.AI_TOOLS !== false;
        
        // Caching
        this.cacheEnabled = options.AI_CACHE_ENABLED !== false;
        this.cacheTTL = options.AI_CACHE_TTL || 86400000; // 24 hours default
        
        // Backend Configuration
        this.backendUrl = options.BACKEND_URL || null;
        
        // File to Markdown Converter
        this.fileConverter = new FileToMarkdownConverter({
            apiUrl: this.apiUrl,
            groqApiKey: this.groqApiKey,
            modelName: this.modelName,
            useGroqForConversion: this.useGroq
        });
        
        // Multi-conversation support
        this.conversationManager = new ConversationManager(
            options.AI_MAX_CONVERSATIONS || 10,
            this.backendUrl
        );
        
        // PageIndex RAG system
        this.rag = new PageIndexRAG({
            chunkSize: options.RAG_CHUNK_SIZE || 512,
            chunkOverlap: options.RAG_CHUNK_OVERLAP || 50,
            topK: options.RAG_TOP_K || 3,
            similarityThreshold: options.RAG_SIMILARITY_THRESHOLD || 0.7,
            backendUrl: this.backendUrl
        });
        
        // RAG enabled flag
        this.ragEnabled = options.AI_RAG_ENABLED !== false;
        
        // Tool calling configuration
        this.tools = this._initializeTools();
        
        // Callbacks
        this.onChunk = options.AI_ON_CHUNK || null;
        this.onComplete = options.AI_ON_COMPLETE || null;
        this.onError = options.AI_ON_ERROR || null;
        
        // Create default conversation
        this.conversationManager.createConversation('Default', {
            systemPrompt: this._buildSystemPrompt(),
            settings: {
                temperature: this.temperature,
                maxTokens: this.maxTokens,
                topP: this.topP,
                toolsEnabled: this.toolsEnabled
            }
        });
    }

    /**
     * Build comprehensive system prompt
     */
    _buildSystemPrompt() {
        return `You are an expert spreadsheet assistant integrated with SheetNext, a powerful Excel-like web application.
Your capabilities include:
1. **Formula Generation**: Create complex Excel/SheetNext formulas
2. **Data Analysis**: Analyze data patterns, trends, and insights
3. **Template Creation**: Generate structured templates for various use cases
4. **Data Transformation**: Help restructure and transform data
5. **Document Analysis**: Analyze uploaded documents and images (converted to markdown)
6. **Data Validation**: Suggest validation rules
7. **Conditional Formatting**: Create formatting rules
8. **Pivot Tables**: Design pivot table configurations
9. **Charts**: Recommend chart types and configurations
10. **Document Q&A**: Answer questions about indexed documents (RAG)

When providing formulas, use SheetNext/Excel syntax.
When analyzing data, be specific and actionable.
When creating templates, provide clear structure and instructions.

Always be concise, accurate, and helpful.`;
    }

    /**
     * Initialize available AI tools
     */
    _initializeTools() {
        return [
            {
                type: "function",
                function: {
                    name: "getSheetData",
                    description: "Get data from specified range in the active sheet",
                    parameters: {
                        type: "object",
                        properties: {
                            range: { type: "string", description: "Cell range (e.g., 'A1:C10') or 'all'" }
                        },
                        required: ["range"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "setCellValues",
                    description: "Set values to specified cells",
                    parameters: {
                        type: "object",
                        properties: {
                            range: { type: "string", description: "Target cell range" },
                            values: { type: "array", description: "2D array of values" }
                        },
                        required: ["range", "values"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "applyFormula",
                    description: "Apply a formula to specified cells",
                    parameters: {
                        type: "object",
                        properties: {
                            range: { type: "string", description: "Target cell range" },
                            formula: { type: "string", description: "Formula to apply" }
                        },
                        required: ["range", "formula"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "formatCells",
                    description: "Apply formatting to specified cells",
                    parameters: {
                        type: "object",
                        properties: {
                            range: { type: "string", description: "Target cell range" },
                            format: { type: "object", description: "Formatting options" }
                        },
                        required: ["range", "format"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "searchDocuments",
                    description: "Search indexed documents using RAG",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query" },
                            topK: { type: "number", description: "Number of results" }
                        },
                        required: ["query"]
                    }
                }
            }
        ];
    }

    // ==================== Groq Configuration ====================

    /**
     * Set Groq API key
     */
    setGroqApiKey(apiKey) {
        this.groqApiKey = apiKey;
        this.useGroq = !!apiKey;
        this.fileConverter.setGroqApiKey(apiKey);
    }

    /**
     * Check if Groq is configured
     */
    isGroqConfigured() {
        return !!this.groqApiKey;
    }

    /**
     * Get Groq configuration
     */
    getGroqConfig() {
        return {
            configured: this.isGroqConfigured(),
            model: this.groqModel,
            useGroq: this.useGroq
        };
    }

    // ==================== File Upload & Conversion ====================

    /**
     * Convert uploaded file to markdown
     */
    async convertFileToMarkdown(file) {
        return await this.fileConverter.convertFileToMarkdown(file);
    }

    /**
     * Handle file upload with conversion
     */
    async handleFileUpload(file) {
        try {
            // Convert file to markdown
            const markdown = await this.convertFileToMarkdown(file);
            
            // Add to RAG index
            const pageIndex = this.rag.getStats().pageCount;
            this.addDocumentPage(pageIndex, markdown, {
                title: file.name,
                type: file.type,
                originalFile: file.name,
                convertedAt: new Date().toISOString()
            });
            
            // Add message to conversation
            const conv = this.getCurrentConversation();
            this.conversationManager.addMessage(conv.id, 'user', 
                `File uploaded: ${file.name}\n\nConverted to markdown and indexed for Q&A.\n\nPreview:\n${markdown.slice(0, 500)}...`
            );
            
            return {
                success: true,
                fileName: file.name,
                markdown,
                pageIndex
            };
        } catch (err) {
            console.error('File conversion failed:', err);
            throw err;
        }
    }

    // ==================== Multi-Conversation Methods ====================

    createConversation(name, options = {}) {
        return this.conversationManager.createConversation(name, {
            ...options,
            systemPrompt: options.systemPrompt || this._buildSystemPrompt()
        });
    }

    switchConversation(conversationId) {
        return this.conversationManager.setActiveConversation(conversationId);
    }

    getCurrentConversation() {
        return this.conversationManager.getConversation();
    }

    getAllConversations() {
        return this.conversationManager.getAllConversations();
    }

    deleteConversation(conversationId) {
        return this.conversationManager.deleteConversation(conversationId);
    }

    clearChat(keepSystem = true) {
        const conv = this.getCurrentConversation();
        if (conv) {
            this.conversationManager.clearMessages(conv.id, keepSystem);
        }
        
        const infoContainer = this._SN.containerDom.querySelector('.sn-chat-info');
        if (infoContainer) {
            infoContainer.innerHTML = keepSystem 
                ? `<div style="padding: 10px; color: #666; font-size: 14px;">Context cleared.</div>`
                : `<div style="padding: 10px; color: #666; font-size: 14px;">Conversation reset.</div>`;
        }
    }

    exportConversation(format = 'json') {
        const conv = this.getCurrentConversation();
        return conv ? this.conversationManager.exportConversation(conv.id, format) : null;
    }

    // ==================== PageIndex RAG Methods ====================

    addDocumentPage(pageIndex, content, metadata = {}) {
        const pageData = this.rag.addPage(pageIndex, content, metadata);
        
        const conv = this.getCurrentConversation();
        if (conv) {
            this.conversationManager.addContext(conv.id, {
                type: 'document_page',
                pageIndex,
                title: metadata.title || `Page ${pageIndex}`
            });
        }
        
        return pageData;
    }

    removeDocumentPage(pageIndex) {
        return this.rag.removePage(pageIndex);
    }

    async searchDocuments(query, options = {}) {
        return await this.rag.search(query, options);
    }

    getRAGStats() {
        return this.rag.getStats();
    }

    clearRAGIndex() {
        this.rag.clear();
    }

    setRAGEnabled(enabled) {
        this.ragEnabled = enabled;
    }

    isRAGEnabled() {
        return this.ragEnabled;
    }

    // ==================== Main Conversation Method ====================

    async conversation(text, options = {}) {
        const {
            joinChat = true,
            useTools = this.toolsEnabled,
            stream = this.streamEnabled,
            useRAG = this.ragEnabled,
            onChunk = this.onChunk,
            onComplete = this.onComplete,
            onError = this.onError
        } = options;

        if (!text || text.trim() === "") return;

        const infoContainer = this._SN.containerDom.querySelector('.sn-chat-info');
        if (!infoContainer) return;

        if (this.getCurrentConversation().messages.length === 1) {
            infoContainer.innerHTML = '';
        }

        this.addSheetContext();

        // RAG enhancement
        let ragContext = '';
        if (useRAG && this.rag.getStats().pageCount > 0) {
            try {
                const ragResults = await this.searchDocuments(text, { topK: 3 });
                if (ragResults.length > 0) {
                    ragContext = '\n\nRelevant document context:\n' + 
                        ragResults.map((r, i) => `[${i + 1}] Page ${r.pageIndex}: ${r.chunk || r.content.slice(0, 200)}...`).join('\n');
                }
            } catch (err) {
                console.warn('RAG search failed:', err);
            }
        }

        if (joinChat) {
            this._appendMessageToUI(text, 'user');
        }
        
        const conv = this.getCurrentConversation();
        const enrichedText = text + ragContext;
        
        this.conversationManager.addMessage(conv.id, 'user', enrichedText);

        const inputEl = this._SN.containerDom.querySelector('.sn-prompt-input');
        if (inputEl) inputEl.value = '';

        const beforeEvent = this._SN.Event.emit('beforeAIRequest', {
            messages: conv.messages,
            options
        });
        
        if (beforeEvent.canceled) return;

        const loadingId = this._appendMessageToUI("Thinking...", 'ai', true);

        try {
            const requestBody = {
                model: this.useGroq ? this.groqModel : this.modelName,
                messages: this._prepareMessages(conv),
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                top_p: this.topP,
                stream: stream
            };

            if (useTools && this.tools.length > 0) {
                requestBody.tools = this.tools;
                requestBody.tool_choice = "auto";
            }

            this._SN.Event.emit('aiRequestStart', {
                url: this.useGroq ? 'https://api.groq.com' : this.apiUrl,
                model: this.useGroq ? this.groqModel : this.modelName,
                stream
            });

            let aiResponse = '';

            if (stream) {
                aiResponse = await this._handleStreaming(requestBody, loadingId, onChunk);
            } else {
                aiResponse = await this._handleNonStreaming(requestBody, loadingId);
            }

            this._removeMessageFromUI(loadingId);
            const msgId = this._appendMessageToUI(aiResponse.content || aiResponse, 'ai');
            
            this.conversationManager.addMessage(conv.id, 'assistant', aiResponse.content || aiResponse);

            this._SN.Event.emit('afterAIRequest', {
                response: aiResponse,
                messages: conv.messages
            });

            if (onComplete) {
                onComplete(aiResponse, conv.messages);
            }

            return aiResponse;

        } catch (err) {
            console.error('AI Error:', err);
            this._removeMessageFromUI(loadingId);
            
            const errorMsg = `Error: ${err.message}. ${this.useGroq ? 'Check Groq API key.' : 'Ensure llama-server is running.'}`;
            this._appendMessageToUI(errorMsg, 'error');

            this._SN.Event.emit('aiRequestError', {
                error: err,
                url: this.useGroq ? 'https://api.groq.com' : this.apiUrl
            });

            if (onError) {
                onError(err);
            }

            throw err;
        } finally {
            this._SN.Event.emit('aiRequestFinally', { success: true });
        }
    }

    _prepareMessages(conversation) {
        const messages = [...conversation.messages];
        
        if (conversation.context.length > 0) {
            const contextMsg = {
                role: "user",
                content: `Current context:\n${JSON.stringify(conversation.context.slice(-5), null, 2)}`
            };
            messages.splice(1, 0, contextMsg);
        }
        
        return messages;
    }

    addSheetContext() {
        const sheet = this._SN.activeSheet;
        if (!sheet) return;

        const context = {
            sheetName: sheet.name,
            dimensions: sheet.getDimensions?.() || { rows: sheet.rowCount, cols: sheet.colCount },
            hasData: !!sheet.data,
            timestamp: new Date().toISOString()
        };

        const conv = this.getCurrentConversation();
        if (conv) {
            this.conversationManager.addContext(conv.id, {
                type: "sheet_context",
                data: context
            });
        }
    }

    setSystemPrompt(prompt) {
        const conv = this.getCurrentConversation();
        if (conv && conv.messages[0]?.role === "system") {
            conv.messages[0].content = prompt;
        }
    }

    chatInput(text) {
        const inputEl = this._SN.containerDom.querySelector('.sn-prompt-input');
        if (inputEl) {
            inputEl.value = text;
            inputEl.focus();
        }
    }

    handleFileChange(event) {
        const file = event.target?.files?.[0];
        if (!file) return;

        this.handleFileUpload(file).catch(err => {
            console.error('File upload failed:', err);
            this._appendMessageToUI(`File upload failed: ${err.message}`, 'error');
        });
    }

    async generateFormula(description, range = 'A1') {
        const prompt = `Generate an Excel/SheetNext formula for: ${description}. Return ONLY the formula, no explanation.`;
        
        try {
            const response = await this.conversation(prompt, { joinChat: false });
            const formula = response.content?.trim() || response.trim();
            
            const match = formula.match(/=?[A-Z0-9\(\),\.\s\+\-\*\/]+/i);
            const cleanFormula = match ? match[0] : formula;
            
            return cleanFormula.startsWith('=') ? cleanFormula : '=' + cleanFormula;
        } catch (err) {
            console.error('Formula generation failed:', err);
            throw err;
        }
    }

    async analyzeData(range) {
        const prompt = `Analyze the data in range ${range} and provide insights about patterns, trends, anomalies, and recommendations.`;
        return await this.conversation(prompt);
    }

    async generateTemplate(type, options = {}) {
        const templates = {
            budget: 'Create a monthly budget template with income, expenses, and summary sections',
            invoice: 'Create an invoice template with company info, line items, taxes, and totals',
            timesheet: 'Create a weekly timesheet with employee info, daily hours, and summary',
            inventory: 'Create an inventory tracking template with items, quantities, prices, and values',
            crm: 'Create a CRM contact management template with contact info, interactions, and status',
            project: 'Create a project tracker with tasks, assignees, deadlines, and progress'
        };

        const prompt = templates[type] || `Create a ${type} template for spreadsheet.`;
        return await this.conversation(prompt + '. Provide the structure as a table with column headers in row 1.');
    }

    getConfig() {
        return {
            apiUrl: this.apiUrl,
            modelName: this.modelName,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            topP: this.topP,
            streamEnabled: this.streamEnabled,
            toolsEnabled: this.toolsEnabled,
            ragEnabled: this.ragEnabled,
            groq: this.getGroqConfig(),
            conversations: this.conversationManager.getStats(),
            rag: this.rag.getStats()
        };
    }

    setConfig(config) {
        if (config.apiUrl) this.apiUrl = config.apiUrl;
        if (config.modelName) this.modelName = config.modelName;
        if (config.maxTokens) this.maxTokens = config.maxTokens;
        if (config.temperature) this.temperature = config.temperature;
        if (config.topP) this.topP = config.topP;
        if (config.streamEnabled !== undefined) this.streamEnabled = config.streamEnabled;
        if (config.toolsEnabled !== undefined) this.toolsEnabled = config.toolsEnabled;
        if (config.ragEnabled !== undefined) this.setRAGEnabled(config.ragEnabled);
        if (config.groqApiKey !== undefined) this.setGroqApiKey(config.groqApiKey);
    }

    // ==================== Internal Methods ====================

    async _handleStreaming(requestBody, loadingId, onChunk) {
        const url = this.useGroq ? this.groqUrl : this.apiUrl;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.useGroq) {
            headers['Authorization'] = `Bearer ${this.groqApiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const chunk = parsed.choices?.[0]?.delta?.content || '';
                        
                        if (chunk) {
                            fullContent += chunk;
                            this._updateMessageContent(loadingId, fullContent);
                            
                            if (onChunk) onChunk(chunk, fullContent);
                            
                            this._SN.Event.emit('aiRequestChunk', { chunk, content: fullContent });
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE chunk:', e);
                    }
                }
            }
        }

        return { content: fullContent };
    }

    async _handleNonStreaming(requestBody, loadingId) {
        const url = this.useGroq ? this.groqUrl : this.apiUrl;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.useGroq) {
            headers['Authorization'] = `Bearer ${this.groqApiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API request failed: ${error.message || response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message;
        
        this._updateMessageContent(loadingId, aiResponse.content || '');
        
        return aiResponse;
    }

    _updateMessageContent(id, content) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<strong>Assistant:</strong><br>${this._formatMarkdown(content)}`;
        }
    }

    _appendMessageToUI(text, sender, isLoading = false) {
        const infoContainer = this._SN.containerDom.querySelector('.sn-chat-info');
        if (!infoContainer) return null;

        const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const div = document.createElement('div');
        div.id = id;
        div.style.cssText = 'padding:10px;margin:10px;border-radius:var(--radius,4px);font-size:14px;line-height:1.5;';

        if (sender === 'user') {
            div.style.cssText += 'background-color:#e6f7ff;border:1px solid #91d5ff;color:#0050b3;';
            div.innerHTML = `<strong>You:</strong><br>${this._escapeHTML(text)}`;
        } else if (sender === 'ai') {
            div.style.cssText += 'background-color:#f6ffed;border:1px solid #b7eb8f;color:#237804;';
            div.innerHTML = `<strong>Assistant:</strong><br>${isLoading ? '<i>' + text + '</i>' : this._formatMarkdown(text)}`;
        } else {
            div.style.cssText += 'background-color:#fff2f0;border:1px solid #ffccc7;color:#cf1322;';
            div.innerHTML = `<strong>System:</strong><br>${this._escapeHTML(text)}`;
        }

        infoContainer.appendChild(div);
        infoContainer.scrollTop = infoContainer.scrollHeight;
        return id;
    }

    _removeMessageFromUI(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    _escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag));
    }

    _formatMarkdown(str) {
        let html = this._escapeHTML(str);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;margin-top:5px;"><code>$1</code></pre>');
        html = html.replace(/`([^`]*)`/g, '<code style="background:#f5f5f5;padding:2px 4px;border-radius:2px;">$1</code>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    _handlePastedImage() { return false; }
    _previewImage() { return false; }
}
