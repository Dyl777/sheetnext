import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { getJwtSecret } from './lib/jwtSecret.js';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import documentRoutes from './routes/documents.js';
import ragRoutes from './routes/rag.js';
import groqRoutes from './routes/groq.js';
import trackingRoutes from './routes/tracking.js';
import audioRoutes from './routes/audio.js';
import characteristicsRoutes from './routes/characteristics.js';
import cacheRoutes from './routes/cache.js';
import advancedCacheRoutes from './routes/cache-advanced.js';
import cacheApiRoutes from './routes/cache-api.js';
import voiceApiRoutes from './routes/voice-api.js';
import actionRoutes from './routes/actions.js';
import automationRoutes from './routes/automation.js';
import { upload } from './middleware/multer.js';

dotenv.config();

try {
  getJwtSecret();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling middleware for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/groq', groqRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/characteristics', characteristicsRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/cache/advanced', advancedCacheRoutes);
app.use('/api/cache/api', cacheApiRoutes);
app.use('/api/voice', voiceApiRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/automation', automationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   SheetNext Backend Server                                ║
║                                                           ║
║   Running on: http://localhost:${PORT}                     ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                           ║
║   Features:                                               ║
║   ✓ PostgreSQL Database                                   ║
║   ✓ Groq API Integration                                  ║
║   ✓ File Upload & Markdown Conversion                     ║
║   ✓ RAG Document Search                                   ║
║   ✓ Multi-Conversation Support                            ║
║   ✓ User Tracking & Sessions                              ║
║   ✓ Audio Recording                                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
