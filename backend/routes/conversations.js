import express from 'express';
import { conversationModel, messageModel } from '../models/Conversation.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all conversations for user
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const conversations = await conversationModel.findByUserId(
      req.userId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Create new conversation
router.post('/', async (req, res) => {
  try {
    const { name, systemPrompt, settings } = req.body;
    
    const conversation = await conversationModel.create(
      req.userId,
      name || 'New Conversation',
      systemPrompt,
      settings || {}
    );
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversation by ID with messages
router.get('/:id', async (req, res) => {
  try {
    const conversation = await conversationModel.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { limit = 100, offset = 0 } = req.query;
    const messages = await messageModel.findByConversationId(
      req.params.id,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      conversation,
      messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Update conversation
router.put('/:id', async (req, res) => {
  try {
    const conversation = await conversationModel.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, systemPrompt, settings, metadata, isArchived } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (systemPrompt !== undefined) updates.system_prompt = systemPrompt;
    if (settings !== undefined) updates.settings = settings;
    if (metadata !== undefined) updates.metadata = metadata;
    if (isArchived !== undefined) updates.is_archived = isArchived;
    
    const updated = await conversationModel.update(req.params.id, updates);
    res.json(updated);
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:id', async (req, res) => {
  try {
    const conversation = await conversationModel.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await conversationModel.delete(req.params.id);
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Add message to conversation
router.post('/:id/messages', async (req, res) => {
  try {
    const conversation = await conversationModel.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { role, content, metadata, toolCalls } = req.body;
    
    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }
    
    const message = await messageModel.create(
      req.params.id,
      role,
      content,
      metadata || {},
      toolCalls
    );
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Get messages for conversation
router.get('/:id/messages', async (req, res) => {
  try {
    const conversation = await conversationModel.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { limit = 100, offset = 0 } = req.query;
    const messages = await messageModel.findByConversationId(
      req.params.id,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Clear conversation messages
router.delete('/:id/messages', async (req, res) => {
  try {
    const conversation = await conversationModel.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deletedCount = await messageModel.deleteByConversationId(req.params.id);
    res.json({ message: `Deleted ${deletedCount} messages` });
  } catch (error) {
    console.error('Clear messages error:', error);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

export default router;
