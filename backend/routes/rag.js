import express from 'express';
import { documentModel, documentChunkModel } from '../models/Document.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Search documents
router.post('/search', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Get all user documents
    const documents = await documentModel.findByUserId(req.userId, 1000);
    const documentIds = documents.map(d => d.id);
    
    if (documentIds.length === 0) {
      return res.json({ results: [], query, totalResults: 0 });
    }
    
    // Search chunks
    const chunks = await documentChunkModel.search(documentIds, query, parseInt(topK) * 2);
    
    // Format and deduplicate results
    const results = chunks.map(chunk => ({
      documentId: chunk.document_id,
      documentTitle: chunk.document_title,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      metadata: chunk.metadata
    }));
    
    res.json({
      results,
      query,
      totalResults: results.length
    });
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get RAG context for a query
router.post('/context', async (req, res) => {
  try {
    const { query, topK = 3, includeMetadata = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Get all user documents
    const documents = await documentModel.findByUserId(req.userId, 1000);
    const documentIds = documents.map(d => d.id);
    
    if (documentIds.length === 0) {
      return res.json({
        context: '',
        sources: [],
        query
      });
    }
    
    // Search chunks
    const chunks = await documentChunkModel.search(documentIds, query, parseInt(topK) * 2);
    
    // Build context string
    const contextParts = chunks.map((chunk, index) => {
      return `[Source ${index + 1}: ${chunk.document_title}]\n${chunk.content}`;
    });
    
    const context = contextParts.join('\n\n---\n\n');
    
    // Build sources list
    const sources = chunks.map(chunk => ({
      documentId: chunk.document_id,
      documentTitle: chunk.document_title,
      chunkIndex: chunk.chunk_index
    }));
    
    res.json({
      context,
      sources: includeMetadata ? sources : [],
      query,
      chunkCount: chunks.length
    });
  } catch (error) {
    console.error('RAG context error:', error);
    res.status(500).json({ error: 'Failed to get context' });
  }
});

// Get document stats
router.get('/stats/summary', async (req, res) => {
  try {
    const documents = await documentModel.findByUserId(req.userId, 1000);
    
    const stats = {
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0),
      fileTypes: {},
      recentDocuments: documents.slice(0, 5)
    };
    
    // Count file types
    documents.forEach(doc => {
      const type = doc.file_type || 'unknown';
      stats.fileTypes[type] = (stats.fileTypes[type] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Generate embeddings for text chunks
router.post('/embed-chunks', async (req, res) => {
  try {
    const { chunks } = req.body;
    
    if (!chunks || !Array.isArray(chunks)) {
      return res.status(400).json({ error: 'Chunks array required' });
    }
    
    // Simple hash-based embedding generation for demonstration
    // In production, use a proper embedding service (Groq embeddings, OpenAI, etc.)
    const embeddedChunks = chunks.map((chunk, index) => {
      const embedding = generateSimpleEmbedding(chunk);
      return {
        id: `chunk_${Date.now()}_${index}`,
        text: chunk,
        embedding: embedding,
        metadata: { index, length: chunk.length }
      };
    });
    
    res.json(embeddedChunks);
  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({ error: 'Failed to generate embeddings' });
  }
});

/**
 * Generate simple embedding (hash-based for demo)
 * In production, replace with actual embedding model
 */
function generateSimpleEmbedding(text) {
  // Create a simple 768-dimensional embedding from text
  // This is for demonstration only - use real embeddings in production
  const embedding = new Float32Array(768);
  
  // Hash the text to seed the embedding
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Generate embedding based on hash
  for (let i = 0; i < 768; i++) {
    embedding[i] = Math.sin(hash ^ i) / Math.sqrt(768);
  }
  
  return Array.from(embedding);
}

export default router;
