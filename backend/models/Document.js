import pool from '../database/db.js';
import crypto from 'crypto';

export const documentModel = {
  async create(userId, title, originalFilename, fileType, fileSize, filePath, markdownContent = null, metadata = {}) {
    const contentHash = markdownContent ? crypto.createHash('sha256').update(markdownContent).digest('hex') : null;
    
    const result = await pool.query(
      `INSERT INTO documents (user_id, title, original_filename, file_type, file_size, file_path, content_hash, markdown_content, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, title, originalFilename, fileType, fileSize, filePath, contentHash, markdownContent, JSON.stringify(metadata)]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByUserId(userId, limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM documents 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  async update(id, updates) {
    const allowedFields = ['title', 'markdown_content', 'metadata'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'markdown_content') {
          const contentHash = crypto.createHash('sha256').update(value).digest('hex');
          setClauses.push(`${key} = $${paramIndex}, content_hash = $${paramIndex + 1}`);
          values.push(value, contentHash);
          paramIndex += 2;
        } else {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(key === 'metadata' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE documents SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  async findByTitle(userId, title) {
    const result = await pool.query(
      'SELECT * FROM documents WHERE user_id = $1 AND title ILIKE $2',
      [userId, `%${title}%`]
    );
    return result.rows;
  }
};

export const documentChunkModel = {
  async create(documentId, chunkIndex, content, metadata = {}) {
    const result = await pool.query(
      `INSERT INTO document_chunks (document_id, chunk_index, content, metadata) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [documentId, chunkIndex, content, JSON.stringify(metadata)]
    );
    return result.rows[0];
  },

  async createMany(documentId, chunks) {
    const values = [];
    const placeholders = [];
    
    chunks.forEach((chunk, index) => {
      values.push(documentId, index, chunk.content, JSON.stringify(chunk.metadata || {}));
      placeholders.push(`($${values.length - 3}, $${values.length - 2}, $${values.length - 1}, $${values.length})`);
    });

    if (placeholders.length === 0) return [];

    const result = await pool.query(
      `INSERT INTO document_chunks (document_id, chunk_index, content, metadata) 
       VALUES ${placeholders.join(', ')} RETURNING *`,
      values
    );
    return result.rows;
  },

  async findByDocumentId(documentId) {
    const result = await pool.query(
      `SELECT * FROM document_chunks 
       WHERE document_id = $1 
       ORDER BY chunk_index ASC`,
      [documentId]
    );
    return result.rows;
  },

  async deleteByDocumentId(documentId) {
    const result = await pool.query(
      'DELETE FROM document_chunks WHERE document_id = $1',
      [documentId]
    );
    return result.rowCount;
  },

  async search(documentIds, query, limit = 10) {
    const searchTerm = `%${query}%`;
    const result = await pool.query(
      `SELECT dc.*, d.title as document_title 
       FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE dc.document_id = ANY($1) AND dc.content ILIKE $2
       LIMIT $3`,
      [documentIds, searchTerm, limit]
    );
    return result.rows;
  }
};
