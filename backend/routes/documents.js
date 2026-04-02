import express from 'express';
import { documentModel, documentChunkModel } from '../models/Document.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/multer.js';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all documents for user
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const documents = await documentModel.findByUserId(
      req.userId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Upload file and convert to markdown
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, metadata } = req.body;
    const file = req.file;

    // Get user's API keys
    const user = await import('../models/User.js').then(m => m.userModel.findById(req.userId));
    
    let markdownContent = '';

    // Determine conversion method based on file type and available API
    const groqApiKey = user?.groq_api_key || process.env.GROQ_API_KEY;
    const llamaServerUrl = user?.llama_server_url || process.env.LLAMA_SERVER_URL;

    if (file.mimetype.startsWith('image/')) {
      // Image to markdown using vision model
      if (groqApiKey) {
        markdownContent = await convertImageWithGroq(file.path, groqApiKey);
      } else if (llamaServerUrl) {
        markdownContent = await convertImageWithLlama(file.path, llamaServerUrl);
      } else {
        markdownContent = `![${file.originalname}](${file.path})\n\n*Image uploaded. No vision model configured.*`;
      }
    } else if (file.mimetype === 'application/pdf') {
      // PDF to markdown
      markdownContent = await convertPdfToMarkdown(file.path);
    } else if (file.mimetype.includes('wordprocessingml') || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX to markdown
      markdownContent = await convertDocxToMarkdown(file.path);
    } else {
      // Text-based files
      markdownContent = fs.readFileSync(file.path, 'utf-8');
    }

    // Create document record
    const document = await documentModel.create(
      req.userId,
      title || file.originalname,
      file.originalname,
      file.mimetype,
      file.size,
      file.path,
      markdownContent,
      metadata ? JSON.parse(metadata) : {}
    );

    // Chunk the content for RAG
    const chunks = chunkContent(markdownContent);
    await documentChunkModel.createMany(
      document.id,
      chunks.map((content, index) => ({
        content,
        metadata: { chunkIndex: index, documentId: document.id }
      }))
    );

    res.status(201).json({
      message: 'File uploaded and converted successfully',
      document: {
        id: document.id,
        title: document.title,
        fileType: document.file_type,
        fileSize: document.file_size,
        chunkCount: chunks.length,
        markdownPreview: markdownContent.slice(0, 500) + '...'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get document by ID
router.get('/:id', async (req, res) => {
  try {
    const document = await documentModel.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const chunks = await documentChunkModel.findByDocumentId(req.params.id);
    
    res.json({
      document,
      chunks
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const document = await documentModel.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete file from disk
    if (document.file_path && fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    
    // Delete chunks first
    await documentChunkModel.deleteByDocumentId(req.params.id);
    
    // Delete document
    await documentModel.delete(req.params.id);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Helper functions for file conversion

async function convertImageWithGroq(filePath, apiKey) {
  const groq = new Groq({ apiKey });
  
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = path.extname(filePath).slice(1);
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.2-90b-vision-preview',
    messages: [
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
              url: `data:image/${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 4096
  });
  
  return response.choices[0].message.content;
}

async function convertImageWithLlama(filePath, llamaUrl) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = path.extname(filePath).slice(1);
  
  const response = await fetch(llamaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llava',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and convert its content to markdown format.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function convertPdfToMarkdown(filePath) {
  // Simple PDF text extraction
  // For production, use pdf-parse library
  const content = fs.readFileSync(filePath, 'utf-8');
  return `# PDF Document\n\n${content}`;
}

async function convertDocxToMarkdown(filePath) {
  // Simple DOCX extraction
  // For production, use mammoth library
  const content = fs.readFileSync(filePath, 'utf-8');
  return `# DOCX Document\n\n${content.replace(/<[^>]*>/g, '')}`;
}

function chunkContent(content, chunkSize = 512, overlap = 50) {
  const chunks = [];
  let start = 0;
  
  while (start < content.length) {
    let end = start + chunkSize;
    
    if (end < content.length) {
      const lastPeriod = content.lastIndexOf('.', end);
      const lastSpace = content.lastIndexOf(' ', end);
      end = Math.max(lastPeriod, lastSpace, start + chunkSize / 2);
    }
    
    chunks.push(content.slice(start, Math.min(end, content.length)).trim());
    start = end - overlap;
    
    if (start <= 0) break;
  }
  
  return chunks;
}

export default router;
