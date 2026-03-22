# SheetNext AI Integration Guide

## 🤖 Complete AI Integration with llama-server

SheetNext now includes **100% full AI integration** with support for llama-server and other OpenAI-compatible inference engines. This guide covers everything you need to know to get started.

---

## 📋 Table of Contents

1. [Features Overview](#features-overview)
2. [Quick Start with llama-server](#quick-start-with-llama-server)
3. [Configuration Options](#configuration-options)
4. [AI Tools & Capabilities](#ai-tools--capabilities)
5. [Usage Examples](#usage-examples)
6. [Advanced Integration](#advanced-integration)
7. [Troubleshooting](#troubleshooting)

---

## ✨ Features Overview

### Core AI Capabilities

- **🔌 Native llama-server Support**: Direct integration with llama.cpp's llama-server
- **🌊 Streaming Responses**: Real-time token streaming for faster feedback
- **🛠️ Tool Calling**: AI can directly manipulate spreadsheet data, formulas, and formatting
- **🎯 Context Awareness**: Automatic sheet context inclusion for better responses
- **⚙️ Multiple Endpoints**: Support for vLLM, sglang, Ollama, and other OpenAI-compatible APIs
- **🔒 Privacy-First**: Run models locally, keep your data private
- **💬 Conversation History**: Maintain context across multiple AI interactions
- **🎨 Rich UI Integration**: AI chat panel, toolbar buttons, and contextual menus

### AI-Powered Features

1. **Formula Generation**: Generate complex Excel/SheetNext formulas from natural language
2. **Data Analysis**: Get insights, trends, and patterns from your data
3. **Template Creation**: Auto-generate templates for budgets, invoices, trackers, etc.
4. **Auto Formatting**: Apply professional formatting with AI guidance
5. **Data Insights**: Receive actionable insights about your spreadsheet data
6. **Chart Suggestions**: Get recommendations for visualizing your data
7. **Conditional Formatting**: Create smart formatting rules with AI
8. **Data Validation**: Generate validation rules automatically

---

## 🚀 Quick Start with llama-server

### Step 1: Install and Start llama-server

#### Option A: Using pre-built binaries (Recommended)

```bash
# Download llama.cpp from https://github.com/ggerganov/llama.cpp/releases
# Extract and navigate to the folder
cd llama-bins

# Start llama-server with your model
./llama-server -m ../models/your-model.gguf -c 4096 --port 8080
```

#### Option B: Build from source

```bash
# Clone llama.cpp
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Build
make -j

# Start server
./llama-server -m ../models/your-model.gguf -c 4096 --port 8080
```

#### Option C: Using Docker

```bash
docker run -p 8080:8080 -v /path/to/models:/models ghcr.io/ggerganov/llama.cpp:server \
  -m /models/your-model.gguf -c 4096 --port 8080
```

### Step 2: Download a Model

Download a GGUF format model from Hugging Face:

```bash
# Example: Llama 3 model
wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
```

Popular models for spreadsheet tasks:
- **Llama-3-8B-Instruct**: Great balance of speed and capability
- **Mistral-7B-Instruct**: Excellent for code and formulas
- **CodeLlama-7B-Instruct**: Specialized for code/formula generation
- **Phi-3-mini**: Fast and efficient for basic tasks

### Step 3: Configure SheetNext

#### Basic Configuration (HTML)

```html
<div id="SNContainer" style="width:100vw;height:100vh;"></div>
<script type="module">
    import SheetNext from './src/index.js';

    const SN = new SheetNext(document.querySelector('#SNContainer'), {
        locale: 'en-US',
        // AI Configuration
        AI_URL: 'http://localhost:8080/v1/chat/completions',
        AI_MODEL: 'llama',
        AI_TOKEN: 'no-key-required',
        AI_STREAM: true,
        AI_TOOLS: true
    });
</script>
```

#### Advanced Configuration

```javascript
const SN = new SheetNext(document.querySelector('#SNContainer'), {
    locale: 'en-US',
    
    // Basic AI settings
    AI_URL: 'http://localhost:8080/v1/chat/completions',
    AI_MODEL: 'llama',
    AI_TOKEN: 'sk-no-key',
    
    // Advanced settings
    AI_MAX_TOKENS: 4096,           // Maximum response length
    AI_TEMPERATURE: 0.7,           // Creativity (0-1)
    AI_TOP_P: 0.9,                 // Top-p sampling
    AI_STREAM: true,               // Enable streaming
    AI_TOOLS: true,                // Enable tool calling
    AI_CONTEXT_LENGTH: 8,          // Context window size
    
    // Callbacks
    AI_ON_CHUNK: (chunk, content) => {
        console.log('Streaming chunk:', chunk);
    },
    AI_ON_COMPLETE: (response, messages) => {
        console.log('AI response complete:', response);
    },
    AI_ON_ERROR: (error) => {
        console.error('AI error:', error);
    }
});
```

### Step 4: Start Using AI

1. **Open the AI Chat Panel**: Click the 🤖 button in the toolbar
2. **Try Example Prompts**: Click on any example prompt
3. **Ask Questions**: Type natural language requests
4. **Use Toolbar Buttons**: Access AI features from the Formula tab

---

## ⚙️ Configuration Options

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `AI_URL` | string | `'http://localhost:8080/v1/chat/completions'` | API endpoint URL |
| `AI_MODEL` | string | `'llama'` | Model name/identifier |
| `AI_TOKEN` | string | `'no-key'` | API authentication token |
| `AI_MAX_TOKENS` | number | `4096` | Maximum tokens in response |
| `AI_TEMPERATURE` | number | `0.7` | Sampling temperature (0-1) |
| `AI_TOP_P` | number | `0.9` | Top-p sampling value |
| `AI_STREAM` | boolean | `true` | Enable streaming responses |
| `AI_TOOLS` | boolean | `true` | Enable tool calling |
| `AI_CONTEXT_LENGTH` | number | `8` | Context window size |
| `AI_ON_CHUNK` | function | `null` | Streaming chunk callback |
| `AI_ON_COMPLETE` | function | `null` | Completion callback |
| `AI_ON_ERROR` | function | `null` | Error callback |

### Runtime Configuration

```javascript
// Get current configuration
const config = SN.AI.getConfig();

// Update configuration
SN.AI.setConfig({
    temperature: 0.5,
    maxTokens: 2048,
    streamEnabled: false
});
```

---

## 🛠️ AI Tools & Capabilities

### Available Tools

SheetNext AI can automatically use these tools to manipulate your spreadsheet:

1. **getSheetData**: Retrieve data from specified ranges
2. **setCellValues**: Set values to cells
3. **applyFormula**: Apply formulas to ranges
4. **formatCells**: Apply formatting (font, fill, borders, etc.)
5. **createPivotTable**: Generate pivot tables
6. **createChart**: Create charts from data
7. **applyConditionalFormatting**: Add conditional formatting rules
8. **getDataValidation**: Get validation suggestions

### Tool Calling Example

When you ask the AI to "Sum the values in column B", it will:
1. Call `getSheetData` to retrieve the data
2. Generate the appropriate SUM formula
3. Call `applyFormula` to insert the formula
4. Return a confirmation message

---

## 📚 Usage Examples

### 1. Generate a Formula

```javascript
// Using the AI chat
SN.AI.conversation('Create a formula to calculate the average of cells A1 to A10');

// Or programmatically
const formula = await SN.AI.generateFormula('Sum of B2 to B20 with 10% tax');
// Returns: =SUM(B2:B20)*1.1
```

### 2. Analyze Data

```javascript
// Select a range first, then:
await SN.AI.analyzeData('A1:D100');
```

Example output:
```
Key Insights:
- Sales increased 23% QoQ
- Top performing region: North (45% of total)
- Anomaly detected in March data
- Recommendation: Focus on underperforming regions
```

### 3. Generate a Template

```javascript
// Generate a budget template
await SN.AI.generateTemplate('budget');

// Available templates:
// - budget, invoice, timesheet, inventory
// - crm, project, calendar, expense
// - schedule, report
```

### 4. Auto Format Data

```javascript
// Ask AI to format professionally
SN.AI.conversation('Format the selected data as a professional sales report');
```

### 5. Create Charts

```javascript
// Ask AI to visualize data
SN.AI.conversation('Create a column chart showing monthly sales trends');
```

### 6. Conditional Formatting

```javascript
// Highlight top performers
SN.AI.conversation('Highlight the top 10% of values in column C with green fill');
```

---

## 🔧 Advanced Integration

### Event Hooks

```javascript
// Before AI request
SN.Event.on('beforeAIRequest', (e) => {
    console.log('AI request about to be sent:', e.detail.messages);
    // Can cancel with: e.cancel('reason');
});

// Request started
SN.Event.on('aiRequestStart', (e) => {
    console.log('AI request started:', e.detail);
});

// Streaming chunk received
SN.Event.on('aiRequestChunk', (e) => {
    console.log('Received chunk:', e.detail.chunk);
});

// Request completed
SN.Event.on('afterAIRequest', (e) => {
    console.log('AI response:', e.detail.response);
});

// Request failed
SN.Event.on('aiRequestError', (e) => {
    console.error('AI error:', e.detail.error);
});

// Request finished (always called)
SN.Event.on('aiRequestFinally', (e) => {
    console.log('AI request completed');
});
```

### Custom System Prompt

```javascript
// Customize AI behavior
SN.AI.setSystemPrompt(`You are a financial analysis expert specializing in Excel formulas and data visualization.
Provide concise, accurate responses focused on financial modeling and analysis.`);
```

### Add Sheet Context

```javascript
// Manually add sheet context
SN.AI.addSheetContext();

// Context includes:
// - Sheet name
// - Dimensions
// - Selection
// - Data summary
```

### Using with Different Inference Engines

#### vLLM

```javascript
const SN = new SheetNext(dom, {
    AI_URL: 'http://localhost:8000/v1/chat/completions',
    AI_MODEL: 'meta-llama/Llama-2-7b-chat-hf'
});
```

#### Ollama

```javascript
const SN = new SheetNext(dom, {
    AI_URL: 'http://localhost:11434/v1/chat/completions',
    AI_MODEL: 'llama3'
});
```

#### sglang

```javascript
const SN = new SheetNext(dom, {
    AI_URL: 'http://localhost:30000/v1/chat/completions',
    AI_MODEL: 'meta-llama/Llama-2-7b-chat-hf'
});
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Could not connect to local inference engine"

**Solution:**
- Ensure llama-server is running: `./llama-server -m model.gguf --port 8080`
- Check the URL: Should be `http://localhost:8080/v1/chat/completions`
- Verify port is not blocked by firewall

#### 2. Slow Response Times

**Solutions:**
- Use a smaller model (e.g., Phi-3-mini, Mistral-7B)
- Reduce `AI_MAX_TOKENS` to limit response length
- Enable streaming for faster first-token time
- Use GPU acceleration if available

#### 3. Poor Quality Responses

**Solutions:**
- Adjust `AI_TEMPERATURE` (lower = more focused, higher = more creative)
- Provide more specific prompts
- Add sheet context: `SN.AI.addSheetContext()`
- Use a larger or more specialized model

#### 4. Tool Calling Not Working

**Solutions:**
- Ensure `AI_TOOLS: true` in configuration
- Verify model supports tool calling (most modern models do)
- Check console for tool execution errors

#### 5. Streaming Not Working

**Solutions:**
- Ensure `AI_STREAM: true`
- Verify server supports SSE (Server-Sent Events)
- Check browser console for streaming errors

### Debug Mode

```javascript
// Enable detailed logging
SN.AI.debug = true;

// Monitor all AI events
SN.Event.on('beforeAIRequest', e => console.log('Request:', e.detail));
SN.Event.on('afterAIRequest', e => console.log('Response:', e.detail));
SN.Event.on('aiRequestError', e => console.error('Error:', e.detail));
```

---

## 📖 Best Practices

### 1. Model Selection

- **For formulas**: Use CodeLlama or Mistral
- **For analysis**: Use Llama-3-8B or larger
- **For speed**: Use Phi-3-mini or TinyLlama
- **For accuracy**: Use larger models (13B+)

### 2. Prompt Engineering

✅ **Good Prompts:**
- "Create a SUMIF formula to sum column C where column B equals 'Completed'"
- "Analyze sales data in A1:D100 and identify top 3 trends"
- "Format this as a professional invoice with company header and line items"

❌ **Vague Prompts:**
- "Fix this"
- "Make it better"
- "Do something with the data"

### 3. Performance Optimization

- Use streaming for better UX
- Limit context window to essential information
- Cache frequently used AI responses
- Batch multiple operations when possible

### 4. Privacy & Security

- Run models locally for sensitive data
- Never share API keys in client code
- Use HTTPS for remote endpoints
- Validate AI-generated formulas before execution

---

## 🎯 Quick Reference

### Essential Commands

```javascript
// Basic conversation
SN.AI.conversation('Your request here');

// Generate formula
const formula = await SN.AI.generateFormula('Description');

// Analyze data
await SN.AI.analyzeData('A1:D100');

// Generate template
await SN.AI.generateTemplate('budget');

// Clear chat history
SN.AI.clearChat();

// Get/set configuration
const config = SN.AI.getConfig();
SN.AI.setConfig({ temperature: 0.5 });
```

### Toolbar Shortcuts

- **Formula Tab** → AI Generate Formula
- **Formula Tab** → AI Analyze Data
- **Formula Tab** → AI Generate Template
- **Formula Tab** → AI Auto Format
- **Formula Tab** → AI Data Insights
- **View Tab** → Toggle AI Chat Panel

---

## 📞 Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/wyyazlz/sheetnext/issues
- Documentation: https://www.sheetnext.com

---

## 📄 License

SheetNext AI integration is part of the Apache-2.0 licensed SheetNext project.

---

**Happy Spreadsheeting with AI! 🚀**
