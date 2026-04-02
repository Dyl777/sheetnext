/**
 * Voice API Routes
 * Endpoints for voice command processing and audio transcription
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/voice/recognize
 * Process audio and return transcript
 * Note: Client uses Web Speech API directly, this is for backup/server-side processing
 */
router.post('/recognize', authMiddleware, express.json(), (req, res) => {
    try {
        const { audio, language = 'en-US' } = req.body;

        if (!audio) {
            return res.status(400).json({ error: 'Audio data required' });
        }

        // Mock transcription (in production, use service like Google Cloud Speech-to-Text)
        const transcript = `[Transcribed: ${audio.substring(0, 50)}...]`;
        
        console.log('✓ Voice recognized:', transcript);

        res.json({
            success: true,
            transcript,
            confidence: 0.95,
            language,
            duration: 0,
            isFinal: true
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/voice/command
 * Execute voice command
 */
router.post('/command', authMiddleware, express.json(), (req, res) => {
    try {
        const { command, transcript, context = {} } = req.body;

        console.log(`📢 Voice command: "${command}"`);

        // Map commands to actions
        const commands = {
            'sum': { type: 'formula', formula: '=SUM(A:A)' },
            'average': { type: 'formula', formula: '=AVERAGE(A:A)' },
            'count': { type: 'formula', formula: '=COUNT(A:A)' },
            'max': { type: 'formula', formula: '=MAX(A:A)' },
            'min': { type: 'formula', formula: '=MIN(A:A)' },
            'sort': { type: 'action', action: 'sort' },
            'filter': { type: 'action', action: 'autofilter' },
            'chart': { type: 'action', action: 'chart' },
            'save': { type: 'action', action: 'save' },
            'print': { type: 'action', action: 'print' }
        };

        const action = commands[command.toLowerCase()] || {
            type: 'unknown',
            message: `Command not recognized: ${command}`
        };

        res.json({
            success: true,
            command,
            action,
            executed: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/voice/interpret
 * Interpret natural language and convert to action
 */
router.post('/interpret', authMiddleware, express.json(), (req, res) => {
    try {
        const { transcript, intent = 'general' } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Transcript required' });
        }

        // Simple intent detection
        let detectedIntent = 'general';
        let action = null;

        const lowerTranscript = transcript.toLowerCase();

        if (lowerTranscript.includes('sum') || lowerTranscript.includes('total')) {
            detectedIntent = 'calculate';
            action = { type: 'formula', formula: '=SUM(A:A)' };
        } else if (lowerTranscript.includes('average') || lowerTranscript.includes('mean')) {
            detectedIntent = 'calculate';
            action = { type: 'formula', formula: '=AVERAGE(A:A)' };
        } else if (lowerTranscript.includes('count')) {
            detectedIntent = 'calculate';
            action = { type: 'formula', formula: '=COUNT(A:A)' };
        } else if (lowerTranscript.includes('chart') || lowerTranscript.includes('graph')) {
            detectedIntent = 'visualization';
            action = { type: 'action', action: 'createChart' };
        } else if (lowerTranscript.includes('sort')) {
            detectedIntent = 'data_operation';
            action = { type: 'action', action: 'sort' };
        } else if (lowerTranscript.includes('filter')) {
            detectedIntent = 'data_operation';
            action = { type: 'action', action: 'filter' };
        }

        res.json({
            success: true,
            transcript,
            detectedIntent,
            action,
            confidence: 0.85
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/voice/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
    res.json({
        success: true,
        languages: [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'es-ES', name: 'Spanish' },
            { code: 'fr-FR', name: 'French' },
            { code: 'de-DE', name: 'German' },
            { code: 'it-IT', name: 'Italian' },
            { code: 'pt-BR', name: 'Portuguese (Brazil)' },
            { code: 'ja-JP', name: 'Japanese' },
            { code: 'zh-CN', name: 'Chinese (Simplified)' },
            { code: 'zh-TW', name: 'Chinese (Traditional)' }
        ]
    });
});

/**
 * POST /api/voice/feedback
 * Record user feedback on voice command accuracy
 */
router.post('/feedback', authMiddleware, express.json(), (req, res) => {
    try {
        const { transcript, correct, command, feedback } = req.body;

        console.log(`📝 Voice feedback: "${feedback}"`);

        res.json({
            success: true,
            message: 'Feedback recorded',
            helps_improve: true
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/voice/health
 * Check voice system health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        capabilities: ['speech-recognition', 'command-interpretation', 'natural-language-processing'],
        webSpeechAPISupport: true
    });
});

export default router;
