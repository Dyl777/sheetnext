import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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

dotenv.config();

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

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|md|csv|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype.replace('vnd.openxmlformats-officedocument.', ''));
  
  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, PDF, DOC, DOCX, TXT, MD, CSV, XLSX'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter
});

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
