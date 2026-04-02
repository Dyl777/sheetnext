import express from 'express';
import Groq from 'groq-sdk';
import { authMiddleware } from '../middleware/auth.js';
import { userModel } from '../models/User.js';

const router = express.Router();

// Chat completion endpoint
router.post('/chat/completions', authMiddleware, async (req, res) => {
  try {
    const { messages, model = 'llama-3.2-90b-vision-preview', max_tokens = 4096, stream = false } = req.body;
    
    // Get user's Groq API key or use environment variable
    const user = await userModel.findById(req.userId);
    const apiKey = user?.groq_api_key || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Groq API key not configured. Please set your API key in settings.' 
      });
    }
    
    const groq = new Groq({ apiKey });
    
    const response = await groq.chat.completions.create({
      model,
      messages,
      max_tokens,
      stream
    });
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      for await (const chunk of response) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('Groq chat error:', error);
    
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid Groq API key' });
    }
    
    res.status(500).json({ 
      error: 'Groq API request failed',
      details: error.message 
    });
  }
});

// List available models
router.get('/models', authMiddleware, async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    const apiKey = user?.groq_api_key || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'Groq API key not configured' });
    }
    
    const groq = new Groq({ apiKey });
    const models = await groq.models.list();
    
    res.json({
      models: models.data.map(m => ({
        id: m.id,
        name: m.id,
        created: m.created,
        ownedBy: m.owned_by
      }))
    });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

// Vision/image analysis endpoint
router.post('/vision/analyze', authMiddleware, async (req, res) => {
  try {
    const { imageUrl, prompt = 'Describe this image in detail and convert any text or tables to markdown.' } = req.body;
    
    const user = await userModel.findById(req.userId);
    const apiKey = user?.groq_api_key || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'Groq API key not configured' });
    }
    
    const groq = new Groq({ apiKey });
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 4096
    });
    
    res.json({
      analysis: response.choices[0].message.content,
      model: 'llama-3.2-90b-vision-preview'
    });
  } catch (error) {
    console.error('Vision analysis error:', error);
    res.status(500).json({ error: 'Vision analysis failed' });
  }
});

// Test API key endpoint
router.get('/test-key', authMiddleware, async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    const apiKey = user?.groq_api_key || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Groq API key not configured' 
      });
    }
    
    const groq = new Groq({ apiKey });
    
    // Test with a simple request
    await groq.models.list();
    
    res.json({
      valid: true,
      message: 'Groq API key is valid',
      hasKey: !!user?.groq_api_key
    });
  } catch (error) {
    console.error('Test key error:', error);
    res.json({
      valid: false,
      error: error.message || 'Invalid API key'
    });
  }
});

// Fallback-enabled chat endpoint (tries Groq, falls back to llama-server)
router.post('/chat/completions-with-fallback', authMiddleware, async (req, res) => {
  try {
    const { messages, model, max_tokens = 4096, stream = false, preferProvider = 'groq' } = req.body;
    
    const user = await userModel.findById(req.userId);
    const groqApiKey = user?.groq_api_key || process.env.GROQ_API_KEY;
    const llamaServerUrl = process.env.LLAMA_SERVER_URL || 'http://localhost:8080/v1/chat/completions';

    let primaryError = null;
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      const shouldUseGroq = (preferProvider === 'groq' && attempt === 0) || (preferProvider !== 'groq' && attempt === 1);

      try {
        if (shouldUseGroq) {
          if (!groqApiKey) {
            throw new Error('Groq API key not configured');
          }

          const groq = new Groq({ apiKey: groqApiKey });
          const response = await groq.chat.completions.create({
            model: model || 'llama-3.2-90b-vision-preview',
            messages,
            max_tokens,
            stream
          });

          if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            for await (const chunk of response) {
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            
            res.write('data: [DONE]\n\n');
            res.end();
          } else {
            res.json(response);
          }
          return;
        } else {
          // Fallback to llama-server
          const response = await fetch(llamaServerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model || 'llama',
              messages,
              max_tokens,
              stream
            })
          });

          if (!response.ok) {
            throw new Error(`llama-server error: ${response.statusText}`);
          }

          if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                res.write('data: [DONE]\n\n');
                res.end();
                break;
              }
              res.write(decoder.decode(value));
            }
          } else {
            const data = await response.json();
            res.json(data);
          }
          return;
        }
      } catch (err) {
        primaryError = err;
        console.warn(`${shouldUseGroq ? 'Groq' : 'llama-server'} failed: ${err.message}`);
        attempt++;
        
        if (attempt < maxAttempts) {
          console.log(`Attempting fallback to ${!shouldUseGroq ? 'Groq' : 'llama-server'}...`);
        }
      }
    }

    // Both providers failed
    res.status(503).json({
      error: 'Both AI providers failed',
      details: primaryError?.message,
      providers: {
        groq: groqApiKey ? 'available (failed)' : 'not configured',
        llamaServer: llamaServerUrl
      }
    });
  } catch (error) {
    console.error('Fallback chat error:', error);
    res.status(500).json({
      error: 'Chat completion failed',
      details: error.message
    });
  }
});

export default router;
