# SheetNext Test User Setup

## Quick Start - Create a Test Account

Open browser console and run:

```javascript
// Register test user
window.register('TestUser', 'test@example.com', 'password123').then(res => {
    console.log('Registration result:', res);
});
```

Or login with:
```javascript
// Login
window.login('test@example.com', 'password123').then(res => {
    console.log('Login result:', res);
});
```

## API Endpoint Tests

After authenticating, test the cache and voice APIs:

```javascript
// Test cache health (no auth needed)
fetch('http://localhost:3000/api/cache/api/health')
    .then(r => r.json())
    .then(d => console.log('Cache health:', d));

// Test voice health (no auth needed)
fetch('http://localhost:3000/api/voice/health')
    .then(r => r.json())
    .then(d => console.log('Voice health:', d));
```

## Database Reset

If you need to reset the database:

```bash
# Reset PostgreSQL
npm run db-reset  # if available

# Or manually in PostgreSQL:
# DROP DATABASE sheetnext;
# CREATE DATABASE sheetnext;
# Then run migrations
```

## Troubleshooting

### "User not authenticated" 
→ Run `window.register()` or `window.login()` in console

### "API request failed: Unauthorized"
→ Token not set in headers. After login, verify:
```javascript
console.log('Token:', localStorage.getItem('sheetnext_token'));
```

### "Both providers failed: llama-server & Groq"
→ AI providers not configured. Check:
1. `GROQ_API_KEY` in `.env`
2. llama-server running on port 8080
3. Or disable and set AI provider to 'local'

## Testing Your New Components

After environment is ready:

```javascript
// Test VoiceInputManager
import VoiceInputManager from './src/components/VoiceInputManager.js';
const voice = new VoiceInputManager(window.SN);
voice.show();

// Test settings
import SettingsPanel from './src/components/SettingsPanel.js';
const settings = new SettingsPanel(window.SN);
settings.show();

// etc.
```
