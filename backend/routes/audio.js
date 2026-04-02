import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { audioModel } from '../models/Audio.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/multer.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All routes require authentication
router.use(authMiddleware);

// Upload audio recording
router.post('/recordings', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { duration, timestamp, title } = req.body;
    const file = req.file;

    // Create audio record
    const recording = await audioModel.create(req.userId, {
      title: title || 'Recording',
      filePath: file.path,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      duration: parseInt(duration) || 0,
      metadata: {
        timestamp: timestamp || new Date().toISOString(),
        originalName: file.originalname
      }
    });

    res.status(201).json({
      id: recording.id,
      title: recording.title,
      duration: recording.duration,
      url: `/api/audio/recordings/${recording.id}/play`,
      createdAt: recording.created_at
    });
  } catch (error) {
    console.error('Upload audio error:', error);
    res.status(500).json({ error: 'Failed to upload audio recording' });
  }
});

// Get all recordings for user
router.get('/recordings', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const recordings = await audioModel.getByUser(
      req.userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json(recordings.map(r => ({
      id: r.id,
      title: r.title,
      duration: r.duration,
      fileSize: r.file_size,
      createdAt: r.created_at,
      url: `/api/audio/recordings/${r.id}/play`
    })));
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({ error: 'Failed to get recordings' });
  }
});

// Get recording by ID
router.get('/recordings/:id', async (req, res) => {
  try {
    const recording = await audioModel.getById(req.params.id, req.userId);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json({
      id: recording.id,
      title: recording.title,
      duration: recording.duration,
      fileSize: recording.file_size,
      fileType: recording.file_type,
      createdAt: recording.created_at,
      transcript: recording.transcript,
      metadata: recording.metadata
    });
  } catch (error) {
    console.error('Get recording error:', error);
    res.status(500).json({ error: 'Failed to get recording' });
  }
});

// Play/download recording
router.get('/recordings/:id/play', async (req, res) => {
  try {
    const recording = await audioModel.getById(req.params.id, req.userId);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    const filePath = recording.file_path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    res.setHeader('Content-Type', recording.file_type);
    res.setHeader('Content-Length', recording.file_size);
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Play recording error:', error);
    res.status(500).json({ error: 'Failed to play recording' });
  }
});

// Update transcript
router.put('/recordings/:id/transcript', async (req, res) => {
  try {
    const { transcript } = req.body;
    
    const recording = await audioModel.getById(req.params.id, req.userId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    const updated = await audioModel.updateTranscript(req.params.id, transcript);
    res.json({ transcript: updated.transcript });
  } catch (error) {
    console.error('Update transcript error:', error);
    res.status(500).json({ error: 'Failed to update transcript' });
  }
});

// Delete recording
router.delete('/recordings/:id', async (req, res) => {
  try {
    const recording = await audioModel.getById(req.params.id, req.userId);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    // Delete file from disk
    if (recording.file_path && fs.existsSync(recording.file_path)) {
      fs.unlinkSync(recording.file_path);
    }
    
    await audioModel.delete(req.params.id);
    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

export default router;
