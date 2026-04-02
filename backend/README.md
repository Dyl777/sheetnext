# SheetNext Backend

PostgreSQL-backed backend server for SheetNext with Groq API integration, file upload & markdown conversion, and RAG support.

## Features

- 🔐 **Authentication** - JWT-based user authentication
- 💾 **PostgreSQL Database** - Persistent storage for conversations, messages, and documents
- 🤖 **Groq API Integration** - Fast LLM inference with Groq
- 📁 **File Upload** - Upload and convert images, PDFs, DOCX to markdown
- 🔍 **RAG Search** - Retrieval-augmented generation for document Q&A
- 💬 **Conversation Management** - Store and retrieve AI conversations
- 📊 **API Usage Tracking** - Monitor API calls and token usage

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up PostgreSQL

```bash
# Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql

# Create database and user
psql -U postgres
CREATE DATABASE sheetnext;
CREATE USER sheetnext WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sheetnext TO sheetnext;
\q

# Run schema
psql -U sheetnext -d sheetnext -f database/schema.sql
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
# - Set DB_PASSWORD to your PostgreSQL password
# - Set GROQ_API_KEY to your Groq API key (get from https://console.groq.com)
# - Set JWT_SECRET to a random secure string
```

### 4. Start Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/groq-api-key` | Update Groq API key |
| PUT | `/api/auth/llama-server-url` | Update llama-server URL |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations/:id` | Get conversation with messages |
| PUT | `/api/conversations/:id` | Update conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |
| POST | `/api/conversations/:id/messages` | Add message to conversation |
| GET | `/api/conversations/:id/messages` | Get messages |
| DELETE | `/api/conversations/:id/messages` | Clear messages |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents/upload` | Upload file (with conversion) |
| GET | `/api/documents/:id` | Get document with chunks |
| DELETE | `/api/documents/:id` | Delete document |

### RAG (Retrieval-Augmented Generation)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rag/search` | Search documents |
| POST | `/api/rag/context` | Get RAG context for query |
| GET | `/api/rag/stats/summary` | Get document statistics |

### Groq API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groq/chat/completions` | Chat completion (proxy) |
| GET | `/api/groq/models` | List available models |
| POST | `/api/groq/vision/analyze` | Analyze image |
| GET | `/api/groq/test-key` | Test API key |

## Usage Examples

### Register and Login

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword","name":"John Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword"}'
```

### Create Conversation

```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"My Conversation","systemPrompt":"You are a helpful assistant"}'
```

### Upload Document

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "title=My Document"
```

### Search Documents (RAG)

```bash
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"expense policy","topK":5}'
```

### Chat with Groq

```bash
curl -X POST http://localhost:3000/api/groq/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "moonshotai/kimi-k2-instruct",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 1024
  }'
```

## Database Schema

### Tables

- **users** - User accounts with API key storage
- **conversations** - AI conversation sessions
- **messages** - Individual messages in conversations
- **documents** - Uploaded documents with markdown content
- **document_chunks** - Chunks for RAG indexing
- **sheet_contexts** - Saved spreadsheet states
- **api_usage** - API call tracking
- **user_settings** - User preferences

## File Conversion

### Supported Formats

| Format | Conversion Method |
|--------|------------------|
| Images (PNG, JPG, GIF) | Groq Vision or Llama Server |
| PDF | Text extraction + LLM formatting |
| DOCX | Mammoth library + LLM formatting |
| TXT, MD, CSV | Direct text |

### Conversion Flow

1. User uploads file
2. Server detects file type
3. File converted to markdown using:
   - **Groq API** (if configured) for images
   - **llama-server** (if configured) for images
   - **Text extraction** for documents
4. Content chunked for RAG
5. Stored in database

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `sheetnext` |
| `DB_USER` | Database user | `sheetnext` |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `GROQ_API_KEY` | Groq API key | - |
| `GROQ_MODEL` | Default Groq model | `moonshotai/kimi-k2-instruct` |
| `LLAMA_SERVER_URL` | llama-server URL | `http://localhost:8080/v1/chat/completions` |
| `MAX_FILE_SIZE` | Max upload size | `10485760` (10MB) |
| `UPLOAD_DIR` | Upload directory | `./uploads` |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:5173` |

## Frontend Integration

Update your frontend configuration:

```javascript
const SN = new SheetNext(dom, {
  // Backend URL
  BACKEND_URL: 'http://localhost:3000',
  
  // Authentication token (after login)
  AI_TOKEN: 'your_jwt_token',
  
  // Use backend for AI
  AI_URL: 'http://localhost:3000/api/groq/chat/completions',
  
  // Enable RAG
  AI_RAG_ENABLED: true,
  
  // Groq configuration
  USE_GROQ: true,
  GROQ_API_KEY: 'your_groq_api_key'
});
```

## Security

- JWT tokens expire after 7 days (configurable)
- Passwords hashed with bcrypt
- File uploads validated and limited to 10MB
- CORS configured for specific origins
- Rate limiting on API endpoints

## Development

```bash
# Run with auto-reload
npm run dev

# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed
```

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env
# Ensure database exists
```

### Groq API Error

```bash
# Verify API key at https://console.groq.com
# Test with: curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

### File Upload Error

```bash
# Check uploads directory exists and is writable
mkdir -p uploads
chmod 755 uploads

# Check file size limits in .env
```

## License

Apache-2.0
