/**
 * Audio Recording Module
 * Records user speech and saves to backend
 */
export default class AudioRecorder {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.startTime = null;
        this.recordingTime = 0;
        this.timerInterval = null;
        
        this.maxRecordingTime = 300000; // 5 minutes max
        this.audioFormat = 'audio/webm'; // Default format
        
        this._checkBrowserSupport();
    }

    /**
     * Check if browser supports audio recording
     */
    _checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('Audio recording is not supported in this browser');
            return false;
        }
        return true;
    }

    /**
     * Start recording
     */
    async startRecording() {
        if (this.isRecording) return;

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            // Create media recorder
            const options = { mimeType: this.audioFormat };
            this.mediaRecorder = new MediaRecorder(stream, options);
            
            // Setup data handler
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Setup stop handler
            this.mediaRecorder.onstop = () => {
                this._saveRecording();
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            this.audioChunks = [];
            this.startTime = new Date();
            
            // Start timer
            this.timerInterval = setInterval(() => {
                this.recordingTime = Date.now() - this.startTime.getTime();
                this._updateRecordingTimer();
                
                // Auto-stop if max time reached
                if (this.recordingTime >= this.maxRecordingTime) {
                    this.stopRecording();
                }
            }, 1000);

            console.log('Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Microphone access denied or not available');
        }
    }

    /**
     * Stop recording
     */
    async stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        // Stop all tracks
        if (this.mediaRecorder) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        console.log('Recording stopped:', this.recordingTime, 'ms');
    }

    /**
     * Toggle recording
     */
    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
        return this.isRecording;
    }

    /**
     * Save recording to backend
     */
    async _saveRecording() {
        if (this.audioChunks.length === 0) return;

        try {
            // Create blob from chunks
            const blob = new Blob(this.audioChunks, { type: this.audioFormat });
            
            // Create form data
            const formData = new FormData();
            formData.append('audio', blob, `recording_${Date.now()}.webm`);
            formData.append('duration', this.recordingTime);
            formData.append('timestamp', this.startTime.toISOString());

            // Upload to backend
            const response = await fetch(`${this.backendUrl}/api/audio/recordings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to save recording');
            }

            const result = await response.json();
            console.log('Recording saved:', result.id);
            
            // Notify UI
            this._onRecordingSaved(result);
        } catch (error) {
            console.error('Failed to save recording:', error);
        }
    }

    /**
     * Update recording timer UI
     */
    _updateRecordingTimer() {
        const timerEl = this._SN.containerDom.querySelector('.sn-recording-timer');
        if (timerEl) {
            const seconds = Math.floor(this.recordingTime / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Callback when recording is saved
     */
    _onRecordingSaved(result) {
        // Show notification
        this._SN.Utils.toast(`Recording saved: ${Math.floor(this.recordingTime / 1000)}s`);
        
        // Emit event
        this._SN.Event.emit('audioRecordingSaved', {
            id: result.id,
            duration: this.recordingTime,
            url: result.url
        });
    }

    /**
     * Get recording status
     */
    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            duration: this.recordingTime,
            maxDuration: this.maxRecordingTime
        };
    }

    /**
     * Set max recording time
     */
    setMaxRecordingTime(ms) {
        this.maxRecordingTime = ms;
    }

    /**
     * Cancel current recording
     */
    cancelRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.mediaRecorder) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        this.audioChunks = [];
        console.log('Recording cancelled');
    }

    /**
     * Get audio blob (for preview or local use)
     */
    getAudioBlob() {
        if (this.audioChunks.length === 0) return null;
        return new Blob(this.audioChunks, { type: this.audioFormat });
    }

    /**
     * Play current recording
     */
    playRecording() {
        const blob = this.getAudioBlob();
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        
        audio.onended = () => {
            URL.revokeObjectURL(url);
        };
    }
}
