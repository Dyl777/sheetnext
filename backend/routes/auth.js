import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { getJwtSecret } from '../lib/jwtSecret.js';

const router = express.Router();

function registerErrorPayload(error) {
  /** @type {{ hint?: string; details?: string }} */
  const extra = {};
  if (process.env.NODE_ENV === 'development') {
    extra.details = error.message;
  }
  if (error.code === '42P01') {
    extra.hint =
      'Database tables are missing. From backend/, run: npm run db:schema (needs psql on PATH). If you see permission errors, run database/grant-public-to-app-user.sql as the postgres superuser first.';
  } else if (error.code === '42501') {
    extra.hint =
      'Database user cannot create tables in schema public. As superuser: psql -U postgres -d YOUR_DB -f backend/database/grant-public-to-app-user.sql then npm run db:schema.';
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    extra.hint =
      'Cannot reach PostgreSQL. Start the server and check DB_HOST, DB_PORT in backend/.env.';
  } else if (error.code === '28P01') {
    extra.hint =
      'PostgreSQL rejected credentials. Check DB_USER and DB_PASSWORD in backend/.env.';
  } else if (error.code === '3D000') {
    extra.hint =
      'Database does not exist. Create it (e.g. CREATE DATABASE sheetnext) or fix DB_NAME in .env.';
  }
  return extra;
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await userModel.create(email, passwordHash, name);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'User already exists' });
    }
    const { hint, details } = registerErrorPayload(error);
    return res.status(500).json({
      error: 'Failed to create user',
      ...(hint && { hint }),
      ...(details && { details }),
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await userModel.updateLastLogin(user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        groqApiKey: user.groq_api_key ? 'configured' : null,
        llamaServerUrl: user.llama_server_url,
        lastLoginAt: user.last_login_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      groqApiKey: user.groq_api_key ? 'configured' : null,
      llamaServerUrl: user.llama_server_url,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update Groq API key
router.put('/groq-api-key', authMiddleware, async (req, res) => {
  try {
    const { groqApiKey } = req.body;

    if (!groqApiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const user = await userModel.updateGroqApiKey(req.userId, groqApiKey);

    res.json({
      message: 'Groq API key updated successfully',
      groqApiKey: 'configured'
    });
  } catch (error) {
    console.error('Update Groq key error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Update llama-server URL
router.put('/llama-server-url', authMiddleware, async (req, res) => {
  try {
    const { llamaServerUrl } = req.body;

    if (!llamaServerUrl) {
      return res.status(400).json({ error: 'Server URL is required' });
    }

    const user = await userModel.updateLlamaServerUrl(req.userId, llamaServerUrl);

    res.json({
      message: 'Llama server URL updated successfully',
      llamaServerUrl: user.llama_server_url
    });
  } catch (error) {
    console.error('Update llama URL error:', error);
    res.status(500).json({ error: 'Failed to update server URL' });
  }
});

export default router;
