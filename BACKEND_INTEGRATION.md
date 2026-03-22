# SheetNext Backend Integration Guide

## Overview

This guide explains how to integrate the SheetNext frontend with the new PostgreSQL backend for persistent conversations, document storage, and Groq API proxy.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   PostgreSQL    │
│  (SheetNext)    │◀────│   (Express.js)   │◀────│   Database      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │   Groq API       │
                        │   llama-server   │
                        └──────────────────┘
```

## Setup Steps

### 1. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

### 2. Configure Frontend

Update your SheetNext initialization:

```javascript
import SheetNext from 'sheetnext';

const SN = new SheetNext(document.querySelector('#SNContainer'), {
  // Backend connection
  BACKEND_URL: 'http://localhost:3000',
  
  // Authentication (after login)
  AI_TOKEN: localStorage.getItem('sheetnext_token'),
  
  // AI Configuration
  AI_URL: 'http://localhost:3000/api/groq/chat/completions',
  AI_MODEL: 'llama-3.2-90b-vision-preview',
  
  // Enable features
  AI_STREAM: true,
  AI_TOOLS: true,
  AI_RAG_ENABLED: true,
  
  // File upload handling
  onFileUpload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
      },
      body: formData
    });
    
    return await response.json();
  }
});
```

### 3. Authentication Flow

```javascript
// Login
async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('sheetnext_token', data.token);
    SN.AI.setConfig({ AI_TOKEN: data.token });
  }
  return data;
}

// Register
async function register(email, password, name) {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('sheetnext_token', data.token);
  }
  return data;
}

// Set Groq API Key
async function setGroqApiKey(apiKey) {
  const response = await fetch('http://localhost:3000/api/auth/groq-api-key', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
    },
    body: JSON.stringify({ groqApiKey: apiKey })
  });
  return await response.json();
}
```

### 4. Load Saved Conversations

```javascript
// Load conversations from backend
async function loadConversations() {
  const response = await fetch('http://localhost:3000/api/conversations', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
    }
  });
  
  const conversations = await response.json();
  
  // Populate UI with saved conversations
  conversations.forEach(conv => {
    // Add to conversation manager
    SN.AI.createConversation(conv.name, {
      systemPrompt: conv.system_prompt,
      settings: conv.settings
    });
  });
  
  return conversations;
}

// Load specific conversation with messages
async function loadConversation(conversationId) {
  const response = await fetch(
    `http://localhost:3000/api/conversations/${conversationId}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
      }
    }
  );
  
  const data = await response.json();
  
  // Load messages into AI
  data.messages.forEach(msg => {
    SN.AI.conversationManager.addMessage(
      SN.AI.getCurrentConversation().id,
      msg.role,
      msg.content,
      msg.metadata
    );
  });
  
  return data;
}
```

### 5. Save Conversations to Backend

```javascript
// Auto-save messages to backend
SN.Event.on('afterAIRequest', async (e) => {
  const conversation = SN.AI.getCurrentConversation();
  const messages = conversation.messages;
  const lastMessage = messages[messages.length - 1];
  
  // Save to backend
  await fetch(`http://localhost:3000/api/conversations/${conversation.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
    },
    body: JSON.stringify({
      role: lastMessage.role,
      content: lastMessage.content,
      metadata: lastMessage.metadata
    })
  });
});
```

### 6. Document Upload with RAG

```javascript
// Handle file upload
async function handleFileUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', file.name);
  
  const response = await fetch('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
    },
    body: formData
  });
  
  const result = await response.json();
  
  // Add to RAG index
  if (result.document) {
    SN.AI.addDocumentPage(
      result.document.id,
      result.document.markdownPreview,
      {
        title: result.document.title,
        source: 'backend'
      }
    );
  }
  
  return result;
}
```

### 7. RAG Search

```javascript
// Search documents
async function searchDocuments(query, topK = 5) {
  const response = await fetch('http://localhost:3000/api/rag/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
    },
    body: JSON.stringify({ query, topK })
  });
  
  const results = await response.json();
  return results.results;
}

// Use in conversation
SN.AI.conversation('What is the expense policy?', {
  useRAG: true,
  onChunk: (chunk) => console.log('Streaming:', chunk)
});
```

## UI Components

### Auth Modal

```html
<div id="authModal" class="modal">
  <div class="modal-content">
    <h2>Login to SheetNext</h2>
    <form id="loginForm">
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
    <p>Don't have an account? <a href="#" id="showRegister">Register</a></p>
  </div>
</div>

<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    await login(email, password);
    document.getElementById('authModal').style.display = 'none';
    // Refresh UI with user data
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
});
</script>
```

### Conversation Manager UI

```html
<div class="conversation-sidebar">
  <button onclick="createNewConversation()">+ New Conversation</button>
  <div id="conversationList"></div>
</div>

<script>
async function createNewConversation() {
  const response = await fetch('http://localhost:3000/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
    },
    body: JSON.stringify({ name: 'New Conversation' })
  });
  
  const conv = await response.json();
  SN.AI.createConversation(conv.name);
  loadConversationList();
}

async function loadConversationList() {
  const response = await fetch('http://localhost:3000/api/conversations', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sheetnext_token')}`
    }
  });
  
  const conversations = await response.json();
  const listEl = document.getElementById('conversationList');
  
  listEl.innerHTML = conversations.map(conv => `
    <div class="conversation-item" onclick="switchToConversation('${conv.id}')">
      ${conv.name}
    </div>
  `).join('');
}

async function switchToConversation(conversationId) {
  await loadConversation(conversationId);
}
</script>
```

## Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>SheetNext with Backend</title>
  <link rel="stylesheet" href="dist/sheetnext.css">
</head>
<body>
  <div id="SNContainer" style="width:100vw;height:100vh;"></div>
  
  <script type="module">
    import SheetNext from './src/index.js';
    
    // Check for saved token
    const token = localStorage.getItem('sheetnext_token');
    
    const SN = new SheetNext(document.querySelector('#SNContainer'), {
      locale: 'en-US',
      BACKEND_URL: 'http://localhost:3000',
      AI_TOKEN: token,
      AI_URL: token 
        ? 'http://localhost:3000/api/groq/chat/completions'
        : 'http://localhost:8080/v1/chat/completions',
      AI_RAG_ENABLED: true
    });
    
    // Auto-save conversations
    SN.Event.on('afterAIRequest', async (e) => {
      if (!token) return;
      
      const conv = SN.AI.getCurrentConversation();
      const lastMsg = conv.messages[conv.messages.length - 1];
      
      fetch(`http://localhost:3000/api/conversations/${conv.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: lastMsg.role,
          content: lastMsg.content
        })
      });
    });
    
    // Load saved conversations if logged in
    if (token) {
      loadConversations();
    }
  </script>
</body>
</html>
```

## Troubleshooting

### CORS Errors

Ensure backend CORS_ORIGIN matches your frontend URL:

```env
# backend/.env
CORS_ORIGIN=http://localhost:5173
```

### Authentication Errors

Verify token is valid and not expired:

```javascript
// Check token validity
const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (response.status === 401) {
  // Token expired, require re-login
  localStorage.removeItem('sheetnext_token');
}
```

### RAG Not Working

Ensure documents are uploaded and chunked:

```javascript
const stats = await fetch('http://localhost:3000/api/rag/stats/summary', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await stats.json();
console.log('Documents:', data.totalDocuments);
```

## Next Steps

1. Set up PostgreSQL database
2. Start backend server
3. Configure frontend with backend URL
4. Implement authentication UI
5. Add conversation persistence
6. Enable file upload with RAG

For more details, see `backend/README.md`.
