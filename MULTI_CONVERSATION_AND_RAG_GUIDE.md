# SheetNext Multi-Conversation & RAG Guide

## 🔄 Multi-Conversation Support

SheetNext now supports **multiple parallel conversations** with the AI, allowing you to maintain separate contexts for different tasks.

### Features

- ✅ **Multiple Conversations**: Create and switch between different conversation threads
- ✅ **Context Isolation**: Each conversation maintains its own context and history
- ✅ **Conversation Management**: Rename, delete, export conversations
- ✅ **Custom System Prompts**: Set different system prompts per conversation
- ✅ **Conversation History**: Track and resume conversations across sessions

### Usage

#### Create a New Conversation

```javascript
// Create with default settings
const conv = SN.AI.createConversation('Formula Help');

// Create with custom system prompt
const analysisConv = SN.AI.createConversation('Data Analysis', {
    systemPrompt: `You are a data analysis expert specializing in statistical analysis and visualization recommendations.`,
    settings: {
        temperature: 0.5,
        maxTokens: 2048,
        toolsEnabled: true
    }
});

// Create with context
const templateConv = SN.AI.createConversation('Template Generation', {
    context: {
        type: 'template',
        industry: 'finance',
        complexity: 'advanced'
    }
});
```

#### Switch Between Conversations

```javascript
// Get all conversations
const conversations = SN.AI.getAllConversations();
console.log(conversations);

// Switch to a specific conversation
const targetConv = conversations.find(c => c.name === 'Formula Help');
if (targetConv) {
    SN.AI.switchConversation(targetConv.id);
}

// Get current conversation
const current = SN.AI.getCurrentConversation();
console.log('Active conversation:', current.name);
```

#### Manage Conversations

```javascript
// Delete a conversation
SN.AI.deleteConversation(conversationId);

// Clear messages in current conversation (keep system prompt)
SN.AI.clearChat(true);

// Clear everything including system prompt
SN.AI.clearChat(false);

// Export conversation as JSON
const jsonExport = SN.AI.exportConversation('json');
console.log(jsonExport);

// Export conversation as Markdown
const mdExport = SN.AI.exportConversation('markdown');
console.log(mdExport);
```

#### Conversation Methods

| Method | Description | Example |
|--------|-------------|---------|
| `createConversation(name, options)` | Create new conversation | `SN.AI.createConversation('Help')` |
| `switchConversation(id)` | Switch to conversation | `SN.AI.switchConversation(convId)` |
| `getCurrentConversation()` | Get active conversation | `const conv = SN.AI.getCurrentConversation()` |
| `getAllConversations()` | List all conversations | `const all = SN.AI.getAllConversations()` |
| `deleteConversation(id)` | Delete conversation | `SN.AI.deleteConversation(convId)` |
| `clearChat(keepSystem)` | Clear messages | `SN.AI.clearChat(true)` |
| `exportConversation(format)` | Export conversation | `SN.AI.exportConversation('markdown')` |

### Example: Multi-Task Workflow

```javascript
// Task 1: Formula generation
const formulaConv = SN.AI.createConversation('Formula Help', {
    systemPrompt: 'You are an Excel formula expert. Provide only formulas with brief explanations.'
});
await SN.AI.conversation('Create a VLOOKUP formula to find employee ID by name');

// Task 2: Data analysis
const analysisConv = SN.AI.createConversation('Data Analysis', {
    systemPrompt: 'You are a data analyst. Provide insights and recommendations.'
});
await SN.AI.conversation('Analyze sales trends in range A1:D100');

// Task 3: Template creation
const templateConv = SN.AI.createConversation('Templates', {
    systemPrompt: 'You are a template designer. Create structured, professional templates.'
});
await SN.AI.conversation('Create a monthly budget template');

// Switch back to formula conversation
SN.AI.switchConversation(formulaConv.id);
await SN.AI.conversation('Now create a SUMIFS formula');
```

---

## 📚 PageIndex RAG (Retrieval-Augmented Generation)

SheetNext includes a **PageIndex-based RAG system** for document Q&A. Upload documents, and the AI will retrieve relevant context when answering questions.

### Features

- ✅ **Document Indexing**: Add documents to a searchable index
- ✅ **Semantic Search**: Find relevant content using embeddings (optional)
- ✅ **Keyword Search**: Fallback keyword-based search
- ✅ **Chunking**: Automatic document chunking for better retrieval
- ✅ **Similarity Scoring**: Rank results by relevance
- ✅ **Multi-Page Support**: Index and retrieve from multiple pages

### Setup RAG

#### Basic Setup

```javascript
const SN = new SheetNext(dom, {
    AI_URL: 'http://localhost:8080/v1/chat/completions',
    AI_RAG_ENABLED: true,
    RAG_CHUNK_SIZE: 512,
    RAG_CHUNK_OVERLAP: 50,
    RAG_TOP_K: 3,
    RAG_SIMILARITY_THRESHOLD: 0.7
});
```

#### With Custom Embeddings (Advanced)

```javascript
// Optional: Provide custom embedding function
const customEmbeddings = {
    async embedQuery(text) {
        // Return vector embedding for query
        // You can use a local embedding model or API
        return await generateEmbedding(text);
    },
    async embedDocument(text) {
        // Return vector embedding for document
        return await generateEmbedding(text);
    }
};

const SN = new SheetNext(dom, {
    AI_RAG_ENABLED: true,
    embeddings: customEmbeddings
});
```

### Usage

#### Add Documents to Index

```javascript
// Add a document page
SN.AI.addDocumentPage(
    0, // pageIndex
    'This is the content of the document...', // content
    { 
        title: 'Employee Handbook', 
        type: 'pdf',
        department: 'HR'
    } // metadata (optional)
);

// Add multiple pages
const chapters = [
    { index: 0, title: 'Introduction', content: '...' },
    { index: 1, title: 'Getting Started', content: '...' },
    { index: 2, title: 'Advanced Usage', content: '...' }
];

chapters.forEach(chapter => {
    SN.AI.addDocumentPage(chapter.index, chapter.content, {
        title: chapter.title,
        source: 'User Manual'
    });
});
```

#### Search Documents

```javascript
// Basic search
const results = await SN.AI.searchDocuments('How do I create a pivot table?');
console.log(results);

// Search with options
const detailedResults = await SN.AI.searchDocuments('budget formulas', {
    topK: 5,              // Number of results
    threshold: 0.8,       // Similarity threshold
    useSemantic: true     // Use semantic search (if embeddings available)
});

// Results format
results.forEach(result => {
    console.log('Page:', result.pageIndex);
    console.log('Content:', result.chunk || result.content);
    console.log('Similarity:', result.similarity);
    console.log('Metadata:', result.metadata);
});
```

#### RAG-Powered Conversations

When RAG is enabled, the AI automatically retrieves relevant document context:

```javascript
// Ask a question about indexed documents
await SN.AI.conversation('What are the expense approval limits?');

// The AI will:
// 1. Search the RAG index for relevant content
// 2. Inject retrieved context into the conversation
// 3. Generate a response based on the documents
```

#### Manual RAG Search

```javascript
// Search and display results
async function searchAndDisplay(query) {
    const results = await SN.AI.searchDocuments(query, { topK: 3 });
    
    if (results.length === 0) {
        console.log('No relevant documents found.');
        return;
    }
    
    results.forEach((result, i) => {
        console.log(`\n--- Result ${i + 1} ---`);
        console.log(`Page: ${result.pageIndex}`);
        console.log(`Title: ${result.metadata?.title || 'Untitled'}`);
        console.log(`Similarity: ${(result.similarity * 100).toFixed(2)}%`);
        console.log(`Content: ${result.chunk?.slice(0, 200) || result.content.slice(0, 200)}...`);
    });
}

searchAndDisplay('employee benefits');
```

### RAG Methods

| Method | Description | Example |
|--------|-------------|---------|
| `addDocumentPage(index, content, metadata)` | Add page to index | `SN.AI.addDocumentPage(0, 'content')` |
| `removeDocumentPage(index)` | Remove page from index | `SN.AI.removeDocumentPage(0)` |
| `searchDocuments(query, options)` | Search documents | `await SN.AI.searchDocuments('query')` |
| `getRAGStats()` | Get index statistics | `const stats = SN.AI.getRAGStats()` |
| `clearRAGIndex()` | Clear entire index | `SN.AI.clearRAGIndex()` |
| `setRAGEnabled(enabled)` | Enable/disable RAG | `SN.AI.setRAGEnabled(true)` |
| `isRAGEnabled()` | Check RAG status | `const enabled = SN.AI.isRAGEnabled()` |

### RAG Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `AI_RAG_ENABLED` | boolean | `true` | Enable RAG by default |
| `RAG_CHUNK_SIZE` | number | `512` | Size of document chunks |
| `RAG_CHUNK_OVERLAP` | number | `50` | Overlap between chunks |
| `RAG_TOP_K` | number | `3` | Default number of results |
| `RAG_SIMILARITY_THRESHOLD` | number | `0.7` | Minimum similarity score |

### Example: Document Q&A System

```javascript
// Initialize with RAG
const SN = new SheetNext(dom, {
    AI_URL: 'http://localhost:8080/v1/chat/completions',
    AI_RAG_ENABLED: true,
    RAG_CHUNK_SIZE: 512,
    RAG_TOP_K: 3
});

// Load documentation
const docs = [
    {
        index: 0,
        title: 'Getting Started',
        content: `SheetNext is a spreadsheet component. 
        To get started, import the library and create an instance.
        Use new SheetNext(container, options) to initialize.`
    },
    {
        index: 1,
        title: 'Formulas',
        content: `SheetNext supports all standard Excel formulas.
        Use =SUM(A1:A10) to sum values.
        Use =VLOOKUP() for vertical lookups.
        Use =INDEX/MATCH for advanced lookups.`
    },
    {
        index: 2,
        title: 'AI Integration',
        content: `SheetNext includes built-in AI capabilities.
        Configure AI_URL to connect to llama-server.
        Enable AI_TOOLS for automatic spreadsheet manipulation.
        Use RAG for document Q&A.`
    }
];

// Index all documents
docs.forEach(doc => {
    SN.AI.addDocumentPage(doc.index, doc.content, {
        title: doc.title,
        category: 'Documentation'
    });
});

// Now ask questions
await SN.AI.conversation('How do I create a VLOOKUP formula?');
// AI will retrieve relevant context from the 'Formulas' document

await SN.AI.conversation('What is SheetNext?');
// AI will retrieve from 'Getting Started'

await SN.AI.conversation('How do I enable AI features?');
// AI will retrieve from 'AI Integration'
```

### Example: Employee Handbook Q&A

```javascript
// Load employee handbook
const handbook = `
EMPLOYEE HANDBOOK

Section 1: Work Hours
Standard work hours are 9 AM to 5 PM, Monday through Friday.
Flexible working arrangements are available upon manager approval.

Section 2: Leave Policy
- Annual Leave: 20 days per year
- Sick Leave: 10 days per year
- Personal Leave: 3 days per year
All leave requests must be submitted at least 2 weeks in advance.

Section 3: Expense Reimbursement
Meals: Up to $50 per day
Travel: Economy class for flights under 6 hours
Accommodation: Up to $200 per night
All expenses must be submitted within 30 days.

Section 4: Performance Reviews
Performance reviews are conducted quarterly.
Employees should prepare self-assessments.
Bonus decisions are made based on review outcomes.
`;

// Split into sections and index
const sections = handbook.split('Section').filter(s => s.trim());
sections.forEach((section, index) => {
    SN.AI.addDocumentPage(index, section, {
        title: `Section ${index}`,
        type: 'policy',
        source: 'Employee Handbook'
    });
});

// Ask policy questions
await SN.AI.conversation('How many vacation days do I get?');
// Retrieves from Section 2

await SN.AI.conversation('What is the meal reimbursement limit?');
// Retrieves from Section 3

await SN.AI.conversation('When are performance reviews conducted?');
// Retrieves from Section 4
```

---

## 🔧 Advanced: Custom Embeddings

For better semantic search, you can integrate custom embeddings:

### Using Transformers.js (Browser-based)

```javascript
import { pipeline } from '@xenova/transformers';

// Load embedding model
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const embeddings = {
    async embedQuery(text) {
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    },
    async embedDocument(text) {
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
};

const SN = new SheetNext(dom, {
    AI_RAG_ENABLED: true,
    embeddings: embeddings
});
```

### Using OpenAI Embeddings

```javascript
const embeddings = {
    async embedQuery(text) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer YOUR_API_KEY`
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: text
            })
        });
        const data = await response.json();
        return data.data[0].embedding;
    },
    async embedDocument(text) {
        return await this.embedQuery(text);
    }
};
```

---

## 📊 RAG Statistics & Monitoring

```javascript
// Get RAG statistics
const stats = SN.AI.getRAGStats();
console.log('RAG Statistics:', stats);
// Output:
// {
//     pageCount: 5,
//     vectorStoreSize: 15,
//     chunkSize: 512,
//     topK: 3
// }

// Get conversation stats
const convStats = SN.AI.conversationManager.getStats();
console.log('Conversation Stats:', convStats);
// Output:
// {
//     totalConversations: 3,
//     activeConversationId: 'conv_xxx',
//     maxConversations: 10
// }

// Get full AI config with RAG and conversation info
const config = SN.AI.getConfig();
console.log(config);
```

---

## 🎯 Best Practices

### Multi-Conversation

1. **Use Descriptive Names**: Name conversations by task (e.g., 'Formula Help', 'Data Analysis')
2. **Set Custom System Prompts**: Tailor the AI's behavior per conversation
3. **Export Important Conversations**: Save conversations for future reference
4. **Clean Up Old Conversations**: Delete unused conversations to save memory

### RAG

1. **Chunk Appropriately**: Use 256-1024 tokens per chunk depending on content
2. **Add Metadata**: Include titles, categories, and sources for better organization
3. **Use Semantic Search**: Integrate embeddings for better retrieval quality
4. **Monitor Similarity Scores**: Adjust threshold based on result quality
5. **Combine with Context**: RAG works best when combined with sheet context

---

## 🐛 Troubleshooting

### RAG Not Retrieving Relevant Content

**Solutions:**
- Lower `RAG_SIMILARITY_THRESHOLD` (e.g., 0.5)
- Increase `RAG_TOP_K` to get more results
- Check if documents are properly indexed: `SN.AI.getRAGStats()`
- Try keyword search: `searchDocuments(query, { useSemantic: false })`

### Conversations Not Switching

**Solutions:**
- Verify conversation ID exists: `SN.AI.getAllConversations()`
- Check if conversation was deleted
- Ensure you're using the correct instance

### Memory Issues with Many Conversations

**Solutions:**
- Reduce `AI_MAX_CONVERSATIONS` in options
- Delete old conversations regularly
- Export and clear conversation history

---

**Enjoy enhanced AI capabilities with multi-conversation and RAG! 🚀**
