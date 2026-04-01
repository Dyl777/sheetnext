# Action Recording & Automation System

## Overview

SheetNext now includes a comprehensive **action recording system** that captures user interactions with full screen context, stores them in an LLM-trainable format, and enables automation through scheduling and rules.

## Features

### 1. Action Recording with Screen Context

**Captures:**
- Mouse clicks (with coordinates and element info)
- Mouse movements
- Keyboard input
- Scroll events
- Cell edits
- Sheet changes
- Screenshots (configurable interval)
- Audio narration

**Screen Context:**
- Active element details (tag, class, text, position, hierarchy)
- Current sheet state (name, selection, scroll, zoom)
- Toolbar state (active panel, visible panels)
- Viewport information (size, scroll position)

### 2. LLM-Training Compatible Format

Each action is stored with:
- **Prompt**: Natural language description
- **Context**: Full screen state
- **Expected Outcome**: What should happen
- **Tags**: For categorization and search

### 3. Action Scheduler

**Schedule Types:**
- **Interval**: Run every X milliseconds
- **Cron**: Run at specific times (minute, hour, day)
- **One-time**: Run once at specified time

**Action Types:**
- Click simulation
- Input simulation
- Sheet navigation
- Formula execution
- AI conversation
- Custom scripts

### 4. Automation Rules

**Triggers:**
- Event-based (on cell edit, on sheet change, etc.)
- Condition-based (if value > X, if sheet = Y)
- Time-based

**Actions:**
- Execute recorded actions
- Run AI prompts
- Execute formulas
- Run custom scripts

### 5. RAG Integration

- Actions stored for LLM retrieval
- Search by tags
- Semantic search (with pgvector)
- LLM can reference past actions
- Automated action suggestions

## Usage

### Start Recording

```javascript
// Start action recording
await SN.ActionRecorder.startRecording('My Session');

// Stop recording
await SN.ActionRecorder.stopRecording();

// Get stats
const stats = SN.ActionRecorder.getSessionStats();
console.log(stats);
// { sessionId, actionCount, screenshotCount, pendingLLMActions }
```

### Schedule a Task

```javascript
// Schedule recurring task
SN.ActionScheduler.schedule({
    name: 'Daily Report',
    type: 'interval',
    interval: 3600000, // 1 hour
    actions: [
        {
            type: 'navigate',
            sheet: 'Report'
        },
        {
            type: 'formula',
            range: { r: 0, c: 0 },
            formula: '=SUM(A2:A100)'
        },
        {
            type: 'ai',
            prompt: 'Generate a summary of the data'
        }
    ]
});

// Schedule one-time task
SN.ActionScheduler.schedule({
    name: 'Backup at 5 PM',
    type: 'one-time',
    schedule: Date.now() + 3600000, // 1 hour from now
    actions: [
        {
            type: 'script',
            code: 'SN.IO.export("JSON")'
        }
    ]
});
```

### Create Automation Rule

```javascript
// Auto-format when cell is edited
SN.ActionScheduler.createAutomation({
    name: 'Auto-format Currency',
    trigger: {
        type: 'event',
        event: 'afterCellEdit'
    },
    conditions: [
        {
            field: 'column',
            operator: 'equals',
            value: 2 // Column C
        }
    ],
    actions: [
        {
            type: 'script',
            code: `
                const sheet = SN.activeSheet;
                sheet.setCellStyle(e.detail.r, e.detail.c, {
                    numFmt: '$#,##0.00'
                });
                SN.Canvas.render();
            `
        }
    ]
});

// Auto-run AI analysis on sheet change
SN.ActionScheduler.createAutomation({
    name: 'AI Sheet Analysis',
    trigger: {
        type: 'event',
        event: 'afterActiveSheetChange'
    },
    actions: [
        {
            type: 'ai',
            prompt: 'Analyze the data in this sheet and provide insights'
        }
    ]
});
```

### Export for LLM Training

```javascript
// Export session in LLM format
const llmData = SN.ActionRecorder.exportForLLM('json');

// Export in Llama.cpp format
const llamaData = SN.ActionRecorder.exportForLLM('llamafile');

// Send to backend for RAG storage
const pendingActions = SN.ActionRecorder.getPendingLLMActions();
pendingActions.forEach(async action => {
    await fetch('http://localhost:3000/api/actions/llm-actions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            sessionId: SN.ActionRecorder.sessionId,
            actionData: action,
            llmResponse: await processWithLLM(action),
            tags: action.trainingFormat?.tags || []
        })
    });
});
```

### Search LLM Actions

```javascript
// Search by tags
const actions = await fetch('http://localhost:3000/api/actions/llm-actions/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        tags: ['formula', 'SUM', 'math']
    })
});

// Search for RAG
const ragActions = await fetch('http://localhost:3000/api/actions/llm-actions/rag?query=how to create sum formula&limit=10', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

## Configuration

### Recording Options

```javascript
const SN = new SheetNext(dom, {
    // Action recording
    ACTION_CAPTURE_SCREENSHOTS: true,
    ACTION_CAPTURE_AUDIO: true,
    ACTION_CAPTURE_MOUSE: true,
    ACTION_CAPTURE_KEYBOARD: true,
    ACTION_CAPTURE_SCROLL: true,
    
    // Screenshot interval (ms)
    ACTION_SCREENSHOT_INTERVAL: 2000,
    
    // Max actions per session
    ACTION_MAX_ACTIONS: 1000,
    
    // Backend
    BACKEND_URL: 'http://localhost:3000',
    AI_TOKEN: 'your-token'
});
```

## API Endpoints

### Action Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/sessions` | Create session |
| GET | `/api/actions/sessions` | Get sessions |
| GET | `/api/actions/sessions/:id` | Get session |
| DELETE | `/api/actions/sessions/:id` | Delete session |

### Automation Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/tasks/:id` | Create/update task |
| GET | `/api/actions/tasks` | Get tasks |
| DELETE | `/api/actions/tasks/:id` | Delete task |

### Automation Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/rules/:id` | Create/update rule |
| GET | `/api/actions/rules` | Get rules |
| DELETE | `/api/actions/rules/:id` | Delete rule |

### LLM Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/llm-actions` | Store processed action |
| POST | `/api/actions/llm-actions/search` | Search by tags |
| GET | `/api/actions/llm-actions/rag` | Search for RAG |

## Data Format

### Action Structure

```json
{
  "type": "click",
  "sessionId": "session_123",
  "timestamp": 1234,
  "absoluteTimestamp": 1709856000000,
  "data": {
    "x": 100,
    "y": 200,
    "button": 0
  },
  "screenContext": {
    "activeElement": {
      "tag": "button",
      "id": "formatBold",
      "className": "sn-tool-btn",
      "text": "Bold",
      "position": {
        "x": 95,
        "y": 195,
        "width": 30,
        "height": 30,
        "centerX": 110,
        "centerY": 210
      },
      "hierarchy": "div.sn-tools > button#formatBold.sn-tool-btn"
    },
    "sheet": {
      "name": "Sheet1",
      "selection": "A1:B10",
      "scrollLeft": 0,
      "scrollTop": 100,
      "zoom": 1
    },
    "toolbar": {
      "activePanel": "start",
      "visiblePanels": ["start", "insert"]
    },
    "viewport": {
      "width": 1920,
      "height": 1080,
      "scrollX": 0,
      "scrollY": 0
    }
  },
  "trainingFormat": {
    "prompt": "User clicked on button at position (100, 200). Element text: \"Bold\"",
    "context": {
      "screen_state": {...},
      "action_type": "click",
      "coordinates": {"x": 100, "y": 200}
    },
    "expected_outcome": "Element should be activated/selected",
    "tags": ["click", "sheet:Sheet1", "element:button", "button:formatBold"]
  }
}
```

## Database Schema

### Tables

**action_sessions:**
- Stores recording sessions with all actions
- Includes screenshots count and metadata

**automation_tasks:**
- Scheduled tasks with intervals/cron
- Tracks execution history

**automation_rules:**
- Event-triggered automation rules
- Conditions and actions

**llm_processed_actions:**
- Actions processed by LLM
- Tags for search
- Embeddings for semantic search (pgvector)

## Best Practices

### 1. Recording

- Start recording before important workflows
- Include voice narration for context
- Keep sessions focused (one task per session)
- Review and tag actions after recording

### 2. Automation

- Test actions manually before scheduling
- Use conditions to prevent unwanted execution
- Set appropriate intervals (not too frequent)
- Monitor execution logs

### 3. LLM Training

- Tag actions consistently
- Include clear prompts
- Review LLM responses for accuracy
- Regularly clean up old actions

### 4. Performance

- Limit screenshot frequency
- Set max actions per session
- Clean up old sessions regularly
- Use tags for efficient searching

## Files Created

**Frontend:**
- `src/core/Recording/ActionRecorder.js` - Action recording
- `src/core/Recording/ActionScheduler.js` - Scheduling & automation
- `src/core/Workbook/Workbook.js` - Integration

**Backend:**
- `backend/routes/actions.js` - API routes
- `backend/database/action_recording_schema.sql` - Database schema
- `backend/server.js` - Route registration

## Summary

SheetNext now provides:

✅ **Action Recording** - Full screen context capture
✅ **Screenshot Capture** - Configurable interval screenshots
✅ **Audio Narration** - Voice context for actions
✅ **LLM Training Format** - Ready for model training
✅ **Action Scheduler** - Interval, cron, one-time tasks
✅ **Automation Rules** - Event-triggered automation
✅ **RAG Integration** - Searchable action database
✅ **Tag System** - Organize and find actions
✅ **API Endpoints** - Full HTTP API
✅ **Database Storage** - PostgreSQL persistence

All features are production-ready and fully integrated!
