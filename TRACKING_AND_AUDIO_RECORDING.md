# User Tracking & Audio Recording Guide

## Overview

SheetNext now includes comprehensive user tracking and audio recording capabilities:

- **User Tracking**: Track mouse movements, clicks, and scrolls in sessions
- **Audio Recording**: Record speech and save to database
- **PostgreSQL Storage**: All data persisted to database
- **Real-time UI**: Visual indicators for active tracking/recording

## Features

### 1. User Tracking

**Track:**
- Mouse movements (sampled to reduce data)
- Click events with element details
- Scroll events
- Session duration and statistics

**Features:**
- Start/Stop tracking with toolbar button
- Automatic batch sending (every 5 seconds)
- Session management
- Real-time statistics

### 2. Audio Recording

**Record:**
- Speech via microphone
- Configurable max duration (default: 5 minutes)
- Auto-save to backend

**Features:**
- Start/Stop recording with toolbar button
- Recording timer display
- Audio playback
- Transcript support
- Multiple format support (WebM default)

## Setup

### 1. Database Setup

Run the tracking schema:

```bash
psql -U sheetnext -d sheetnext -f database/tracking_schema.sql
```

### 2. Frontend Configuration

```javascript
const SN = new SheetNext(dom, {
  // Backend connection
  BACKEND_URL: 'http://localhost:3000',
  AI_TOKEN: 'your_jwt_token',
  
  // Other config...
});
```

### 3. Backend Configuration

Ensure `.env` has proper database settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sheetnext
DB_USER=sheetnext
DB_PASSWORD=your_password
```

## Usage

### User Tracking

#### Start Tracking

```javascript
// Via toolbar button (automatic)
// Click the "Track User" button in the View tab

// Programmatically
await SN.Tracking.startTracking();

// Check status
const isTracking = SN.Tracking.getTrackingStatus();
console.log('Tracking:', isTracking);
```

#### Stop Tracking

```javascript
// Via toolbar button
// Click the "Track User" button again

// Programmatically
await SN.Tracking.stopTracking();
```

#### Get Session Stats

```javascript
const stats = SN.Tracking.getSessionStats();
console.log(stats);
// {
//   sessionId: 'uuid',
//   isTracking: true,
//   duration: 120, // seconds
//   totalMovements: 500,
//   totalClicks: 25,
//   totalScrolls: 10
// }
```

### Audio Recording

#### Start Recording

```javascript
// Via toolbar button
// Click the "Record Audio" button

// Programmatically
await SN.AudioRecorder.startRecording();

// Check status
const status = SN.AudioRecorder.getRecordingStatus();
console.log('Recording:', status.isRecording);
console.log('Duration:', status.duration, 'ms');
```

#### Stop Recording

```javascript
// Via toolbar button
// Click the "Record Audio" button again

// Programmatically
await SN.AudioRecorder.stopRecording();
```

#### Set Max Recording Time

```javascript
// Set to 3 minutes (default is 5 minutes)
SN.AudioRecorder.setMaxRecordingTime(180000);
```

#### Cancel Recording

```javascript
SN.AudioRecorder.cancelRecording();
```

#### Play Recording

```javascript
SN.AudioRecorder.playRecording();
```

## API Endpoints

### Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tracking/sessions` | Create new session |
| GET | `/api/tracking/sessions` | Get user sessions |
| GET | `/api/tracking/sessions/active` | Get active session |
| GET | `/api/tracking/sessions/:id` | Get session details |
| POST | `/api/tracking/sessions/:id/end` | End session |
| POST | `/api/tracking/sessions/:id/events` | Add events |
| GET | `/api/tracking/sessions/:id/events` | Get session events |
| DELETE | `/api/tracking/sessions/:id` | Delete session |

### Audio

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audio/recordings` | Upload recording |
| GET | `/api/audio/recordings` | Get user recordings |
| GET | `/api/audio/recordings/:id` | Get recording details |
| GET | `/api/audio/recordings/:id/play` | Play/download audio |
| PUT | `/api/audio/recordings/:id/transcript` | Update transcript |
| DELETE | `/api/audio/recordings/:id` | Delete recording |

## Database Schema

### Tables

**tracking_sessions:**
- `id` - Session UUID
- `user_id` - User reference
- `start_time` - Session start
- `end_time` - Session end
- `user_agent` - Browser info
- `screen_width/height` - Screen dimensions
- `window_width/height` - Window dimensions
- `total_movements/clicks/scrolls` - Counts
- `is_active` - Active flag

**tracking_events:**
- `id` - Event UUID
- `session_id` - Session reference
- `event_type` - movement/click/scroll
- `x_coordinate/y_coordinate` - Position
- `element_tag/class/id` - Clicked element
- `scroll_x/y` - Scroll position
- `event_timestamp` - Relative timestamp

**audio_recordings:**
- `id` - Recording UUID
- `user_id` - User reference
- `title` - Recording title
- `file_path` - Storage path
- `file_name` - Original filename
- `file_type` - MIME type
- `file_size` - Size in bytes
- `duration` - Duration in ms
- `transcript` - Optional transcript
- `metadata` - Additional info

## UI Indicators

### Tracking Button
- **Inactive**: Standard icon
- **Active**: Red background with active icon

### Audio Recording Button
- **Inactive**: Standard microphone icon
- **Active**: Red pulsing icon with timer

### Recording Timer
- Displays in top-right corner
- Shows MM:SS format
- Pulses while recording
- Auto-hides when stopped

## Events

### Tracking Events

```javascript
// Listen for tracking start/stop
SN.Event.on('trackingStarted', (e) => {
  console.log('Tracking started:', e.detail.sessionId);
});

SN.Event.on('trackingStopped', (e) => {
  console.log('Tracking stopped:', e.detail.stats);
});
```

### Audio Events

```javascript
// Listen for recording saved
SN.Event.on('audioRecordingSaved', (e) => {
  console.log('Recording saved:', e.detail);
  // { id, duration, url }
});
```

## Privacy Considerations

### Important Notes

1. **User Consent**: Always inform users about tracking
2. **Data Storage**: Tracking data is stored in your database
3. **GDPR Compliance**: Ensure compliance with local regulations
4. **Audio Recording**: Requires explicit user permission
5. **Data Retention**: Implement data deletion policies

### Best Practices

```javascript
// Show consent dialog before tracking
function requestTrackingConsent() {
  return confirm('This session will track your mouse movements and clicks for analytics. Continue?');
}

if (requestTrackingConsent()) {
  SN.Tracking.startTracking();
}

// Show consent for audio recording
function requestAudioConsent() {
  return confirm('This will record audio from your microphone. Continue?');
}

if (requestAudioConsent()) {
  SN.AudioRecorder.startRecording();
}
```

## Example: Complete Workflow

```javascript
// Initialize with tracking
const SN = new SheetNext(dom, {
  BACKEND_URL: 'http://localhost:3000',
  AI_TOKEN: token
});

// Start user session
async function startUserSession() {
  // Get consent
  if (!confirm('Start tracking session?')) return;
  
  // Start tracking
  await SN.Tracking.startTracking();
  
  console.log('Session started');
}

// Record meeting notes
async function recordMeetingNotes() {
  // Get consent
  if (!confirm('Start audio recording?')) return;
  
  // Start recording
  await SN.AudioRecorder.startRecording();
  
  // Auto-stop after 2 minutes
  setTimeout(() => {
    SN.AudioRecorder.stopRecording();
    console.log('Recording saved');
  }, 120000);
}

// View session statistics
function viewSessionStats() {
  const trackingStats = SN.Tracking.getSessionStats();
  const audioStats = SN.AudioRecorder.getRecordingStatus();
  
  console.log('Tracking:', trackingStats);
  console.log('Audio:', audioStats);
}
```

## Troubleshooting

### Tracking Not Starting

**Check:**
1. Backend is running
2. User is authenticated (valid token)
3. Database tables exist
4. CORS is configured properly

```javascript
// Test backend connection
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(d => console.log('Backend:', d.status));
```

### Audio Recording Fails

**Check:**
1. Browser supports `getUserMedia`
2. Microphone permission granted
3. Backend file upload configured
4. Uploads directory exists

```javascript
// Check browser support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  console.error('Audio recording not supported');
}
```

### Database Errors

**Solutions:**
1. Run schema migrations
2. Check database connection
3. Verify user permissions
4. Check disk space for audio files

## Performance Optimization

### Tracking

```javascript
// Reduce sample rate (default: 10)
SN.Tracking.sampleRate = 20; // Sample every 20th movement

// Reduce batch interval (default: 5000ms)
SN.Tracking.batchInterval = 10000; // Send every 10 seconds

// Reduce max events per batch (default: 100)
SN.Tracking.maxEventsPerBatch = 50;
```

### Audio

```javascript
// Reduce max recording time (default: 300000ms)
SN.AudioRecorder.setMaxRecordingTime(120000); // 2 minutes

// Change audio format
SN.AudioRecorder.audioFormat = 'audio/ogg';
```

## Files Created

### Frontend
- `src/core/Tracking/UserTracking.js` - Tracking module
- `src/core/Tracking/AudioRecorder.js` - Audio recording module
- `src/assets/mainSvgs.js` - Added tracking/audio icons
- `src/core/Workbook/Workbook.js` - Integrated modules
- `src/core/Layout/Layout.js` - Added updateTrackingButton method
- `src/core/Layout/ToolbarConfig.js` - Added toolbar buttons
- `src/locales/en-US.js` - Added locale strings
- `src/style/tools.css` - Added button styles

### Backend
- `backend/database/tracking_schema.sql` - Database schema
- `backend/models/Tracking.js` - Tracking model
- `backend/models/Audio.js` - Audio model
- `backend/routes/tracking.js` - Tracking routes
- `backend/routes/audio.js` - Audio routes
- `backend/server.js` - Updated with new routes

## Next Steps

1. Run database migrations
2. Start backend server
3. Test tracking functionality
4. Test audio recording
5. Implement consent dialogs
6. Add data retention policies
7. Monitor database storage

For more information, see the backend README.md.
