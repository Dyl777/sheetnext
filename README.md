<p align="center">
  <img src="docs/logo.png" alt="SheetNext Logo" width="80" />
</p>

<p align="center">
  A pure front-end spreadsheet component with Excel-like capabilities, built-in native AI workflows, and flexible LLM integration for data operations.
</p>

<p align="center">
  English | <a href="./README_CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/sheetnext"><img src="https://img.shields.io/npm/v/sheetnext.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/sheetnext"><img src="https://img.shields.io/npm/dm/sheetnext.svg" alt="npm downloads" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="license" /></a>
  <img src="https://img.shields.io/badge/rendering-Canvas-ff8c00.svg" alt="Canvas rendering" />
  <img src="https://img.shields.io/badge/workflow-AI%20Ready-00A67E.svg" alt="AI ready" />
  <img src="https://img.shields.io/badge/file%20support-XLSX%20%7C%20CSV%20%7C%20JSON-1f6feb.svg" alt="file support" />
  <img src="https://img.shields.io/badge/ai%20integration-llama--server-FF6B35.svg" alt="AI integration" />
</p>

<p align="center">
  <img src="docs/image_en.png" alt="SheetNext Screenshot" width="100%" />
</p>

- SheetNext is a pure front-end, high-performance spreadsheet engine that provides enterprises with a ready-to-use intelligent spreadsheet foundation.
- With the AI-driven development approach, a single developer + AI can integrate and deliver complex enterprise spreadsheet solutions.
- Common scenarios like ledgers, budgets, analytics, data entry, and approvals can produce a first version in minutes.
- **🔥 NEW: 100% Full AI Integration** - Complete llama-server integration with streaming, tool calling, and local model support!
- **🆕 NEW: Multi-Conversation Support** - Manage multiple parallel AI conversations with isolated contexts!
- **📚 NEW: PageIndex RAG System** - Document Q&A with semantic search and retrieval-augmented generation!

## ✨ Key Features

- 📊 Full Spreadsheet Capabilities — Formula engine, charts, pivot tables, super tables, slicers, conditional formatting, data validation, sparklines, freeze panes, sorting & filtering, and more
- 🤖 **AI-Powered Workflow** — Built-in AI automation for template generation, data analysis, formula writing, and cross-sheet logic
- 🔌 **llama-server Integration** — Direct connection to llama.cpp, vLLM, Ollama, sglang, and other OpenAI-compatible endpoints
- 🌊 **Streaming Responses** — Real-time token streaming for faster, more interactive AI conversations
- 🛠️ **AI Tool Calling** — AI can directly manipulate cells, formulas, formatting, charts, and pivot tables
- 💬 **Multi-Conversation Support** — Manage multiple parallel conversations with isolated contexts and custom system prompts
- 📚 **PageIndex RAG System** — Document Q&A with semantic search, chunking, and retrieval-augmented generation
- 📁 Native File Support — Import/export Excel (.xlsx), CSV, and JSON out of the box, no extra plugins needed
- 🚀 Zero-Config Setup — All features built in, no additional dependencies required
- ⚡ High-Performance Rendering — Canvas-based virtual scrolling handles large datasets with ease
- 🔒 Privacy-First AI — Run models locally, keep your data completely private

## 🚀 Quick Start

SheetNext can be integrated with just a few lines of code and works with any front-end framework (Vue, React, Angular, etc.).

### Option 1: Traditional Integration

#### Install via npm

```bash
npm install sheetnext
```

```html
<!-- Container for the editor -->
<div id="SNContainer" style="width:100vw;height:100vh;padding:0 7px 7px"></div>
```

```javascript
import SheetNext from 'sheetnext';
import 'sheetnext/dist/sheetnext.css';

const SN = new SheetNext(document.querySelector('#SNContainer'));
```

#### Browser Direct Import (UMD)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SheetNext Demo</title>
  <link rel="stylesheet" href="dist/sheetnext.css">
</head>
<body>
  <div id="SNContainer" style="width:100vw;height:100vh;padding:0 7px 7px"></div>
  <script src="dist/sheetnext.umd.js"></script>
  <script>
    const SN = new SheetNext(document.querySelector('#SNContainer'));
  </script>
</body>
</html>
```

#### Internationalization (i18n)

The default language is English (en-US). A built-in Chinese (zh-CN) locale is available.

Import locale via npm:

```javascript
import SheetNext from 'sheetnext';
import zhCN from 'sheetnext/locales/zh-CN.js';

SheetNext.registerLocale('zh-CN', zhCN);

const SN = new SheetNext(document.querySelector('#SNContainer'), {
  locale: 'zh-CN'
});
```

Import locale via UMD:

```html
<script src="dist/sheetnext.umd.js"></script>
<script src="dist/locales/zh-CN.js"></script>
<script>
  const SN = new SheetNext(document.querySelector('#SNContainer'), {
    locale: 'zh-CN'
  });
</script>
```

### Option 2: AI-Driven Development (Recommended)

#### Step 1: Download the AI Development Reference

- Download `docs-detail.md` from the repository root: [docs-detail.md](https://github.com/wyyazlz/sheetnext/blob/master/docs/docs-detail.md)

#### Step 2: Feed `docs-detail` to Your AI Tool

Use Cursor / Claude / ChatGPT / Copilot or any AI coding assistant. Provide `docs-detail` first, then describe your requirements.

Recommended prompt template:

```text
You are a senior SheetNext AI development expert. Please read and understand the documentation I provide, then give a directly implementable solution.
Execution order:
1) Read: docs-detail
2) Identify user goals (business goals + technical goals)
3) Output a minimum viable implementation (get it running first, then optimize)
4) All APIs and code must strictly follow the documentation
5) Provide verification steps and risk points
Constraints:
- Do not fabricate APIs
- Do not skip edge cases
- Prioritize reusing existing capabilities, avoid over-engineering
```

#### Step 3: Describe Your Business Goal

For example:

- "Build a sales pivot analysis template with charts and slicers"
- "Build a multi-sheet budget entry system with permissions and printing"
- "Migrate an existing Excel template to an online editable version"

### 🤖 AI Integration (100% Full Integration)

SheetNext now includes **complete AI integration** with llama-server and other OpenAI-compatible inference engines. This enables:

- ✅ **Streaming responses** for real-time feedback
- ✅ **Tool calling** for direct spreadsheet manipulation
- ✅ **Context awareness** for smarter responses
- ✅ **Local model support** for complete privacy
- ✅ **Multiple endpoints** (llama-server, vLLM, Ollama, sglang)

#### Quick Start with llama-server

**1. Start llama-server:**

```bash
# Download llama.cpp and start the server
./llama-server -m your-model.gguf -c 4096 --port 8080
```

**2. Configure SheetNext:**

```javascript
import SheetNext from 'sheetnext';

const SN = new SheetNext(document.querySelector('#SNContainer'), {
  locale: 'en-US',
  
  // AI Configuration
  AI_URL: 'http://localhost:8080/v1/chat/completions',
  AI_MODEL: 'llama',
  AI_TOKEN: 'sk-no-key',
  AI_STREAM: true,        // Enable streaming
  AI_TOOLS: true          // Enable tool calling
});
```

**3. Use AI Features:**

- Click the 🤖 button to open the AI chat panel
- Use AI toolbar buttons in the Formula tab
- Try example prompts or ask your own questions

#### Supported Inference Engines

| Engine | Default URL | Example Configuration |
|--------|-------------|----------------------|
| **llama-server** | `http://localhost:8080` | `AI_URL: 'http://localhost:8080/v1/chat/completions'` |
| **vLLM** | `http://localhost:8000` | `AI_URL: 'http://localhost:8000/v1/chat/completions'` |
| **Ollama** | `http://localhost:11434` | `AI_URL: 'http://localhost:11434/v1/chat/completions'` |
| **sglang** | `http://localhost:30000` | `AI_URL: 'http://localhost:30000/v1/chat/completions'` |

#### AI Configuration Options

```javascript
const SN = new SheetNext(dom, {
  // Basic settings
  AI_URL: 'http://localhost:8080/v1/chat/completions',
  AI_MODEL: 'llama',
  AI_TOKEN: 'sk-no-key',
  
  // Advanced settings
  AI_MAX_TOKENS: 4096,      // Maximum response length
  AI_TEMPERATURE: 0.7,      // Creativity (0-1)
  AI_TOP_P: 0.9,            // Top-p sampling
  AI_STREAM: true,          // Enable streaming
  AI_TOOLS: true,           // Enable tool calling
  AI_CONTEXT_LENGTH: 8,     // Context window size
  
  // Multi-conversation
  AI_MAX_CONVERSATIONS: 10, // Maximum conversations to keep
  
  // RAG (Document Q&A)
  AI_RAG_ENABLED: true,     // Enable RAG by default
  RAG_CHUNK_SIZE: 512,      // Document chunk size
  RAG_CHUNK_OVERLAP: 50,    // Chunk overlap
  RAG_TOP_K: 3,             // Default search results
  RAG_SIMILARITY_THRESHOLD: 0.7, // Similarity threshold
  
  // Callbacks
  AI_ON_CHUNK: (chunk, content) => console.log('Chunk:', chunk),
  AI_ON_COMPLETE: (response, messages) => console.log('Complete:', response),
  AI_ON_ERROR: (error) => console.error('Error:', error)
});
```

#### Multi-Conversation Support

```javascript
// Create a new conversation
const conv = SN.AI.createConversation('Formula Help', {
  systemPrompt: 'You are an Excel formula expert.'
});

// Switch conversations
SN.AI.switchConversation(conv.id);

// Get all conversations
const all = SN.AI.getAllConversations();

// Delete a conversation
SN.AI.deleteConversation(conv.id);

// Export conversation
const exported = SN.AI.exportConversation('markdown');
```

#### PageIndex RAG System

```javascript
// Add document to index
SN.AI.addDocumentPage(0, 'Document content here...', {
  title: 'User Manual',
  category: 'documentation'
});

// Search documents
const results = await SN.AI.searchDocuments('How to create formulas?');

// RAG is automatically used in conversations when enabled
await SN.AI.conversation('What does the documentation say about formulas?');
// AI will retrieve relevant document context automatically
```

#### AI-Powered Features

1. **Formula Generation**: `await SN.AI.generateFormula('Sum of B2:B20 with 10% tax')`
2. **Data Analysis**: `await SN.AI.analyzeData('A1:D100')`
3. **Template Creation**: `await SN.AI.generateTemplate('budget')`
4. **Auto Formatting**: Ask AI to format data professionally
5. **Data Insights**: Get actionable insights from your data
6. **Chart Creation**: Generate charts from selected data
7. **Conditional Formatting**: Create smart formatting rules
8. **Multi-Conversation**: Manage parallel AI conversations
9. **Document Q&A (RAG)**: Ask questions about indexed documents

For complete documentation, see:
- [AI_INTEGRATION_GUIDE.md](./AI_INTEGRATION_GUIDE.md) - Full AI integration guide
- [MULTI_CONVERSATION_AND_RAG_GUIDE.md](./MULTI_CONVERSATION_AND_RAG_GUIDE.md) - Multi-conversation & RAG guide

## 🎯 Use Cases

- Online reporting systems, BI analytics front-ends, business dashboards
- Spreadsheet engine modules in ERP / CRM / Finance / Supply Chain systems
- Complex business forms for budgets, settlements, reconciliation, planning, and scheduling
- AI-powered scenarios: auto-generate tables, analysis, templates, and logic

## Browser Support

| Chrome | Firefox | Safari | Edge |
|--------|---------|--------|------|
| 80+ | 75+ | 13+ | 80+ |

## License

Apache-2.0. See [LICENSE](./LICENSE).
