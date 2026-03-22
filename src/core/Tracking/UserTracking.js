/**
 * User Tracking Module
 * Tracks mouse movements, clicks, and sessions
 */
export default class UserTracking {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;
        
        this.isTracking = false;
        this.trackingInterval = null;
        this.sessionId = null;
        this.sessionStartTime = null;
        this.movements = [];
        this.clicks = [];
        this.scrolls = [];
        
        this.maxEventsPerBatch = 100;
        this.batchInterval = 5000; // Send batch every 5 seconds
        this.sampleRate = 10; // Sample every 10th movement to reduce data
        
        this._bindEvents();
    }

    /**
     * Start tracking session
     */
    async startTracking() {
        if (this.isTracking) return;

        try {
            // Create new session
            const response = await fetch(`${this.backendUrl}/api/tracking/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    startTime: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    screenWidth: window.screen.width,
                    screenHeight: window.screen.height,
                    windowWidth: window.innerWidth,
                    windowHeight: window.innerHeight
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create tracking session');
            }

            const session = await response.json();
            this.sessionId = session.id;
            this.sessionStartTime = new Date();
            this.isTracking = true;
            this.movements = [];
            this.clicks = [];
            this.scrolls = [];

            // Start batch sending
            this.trackingInterval = setInterval(() => this._sendBatch(), this.batchInterval);

            console.log('Tracking started:', this.sessionId);
        } catch (error) {
            console.error('Failed to start tracking:', error);
            this.isTracking = false;
        }
    }

    /**
     * Stop tracking session
     */
    async stopTracking() {
        if (!this.isTracking) return;

        this.isTracking = false;
        
        // Send remaining events
        await this._sendBatch();

        // End session
        try {
            await fetch(`${this.backendUrl}/api/tracking/sessions/${this.sessionId}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    endTime: new Date().toISOString(),
                    totalMovements: this.movements.length,
                    totalClicks: this.clicks.length,
                    totalScrolls: this.scrolls.length
                })
            });

            clearInterval(this.trackingInterval);
            console.log('Tracking stopped:', this.sessionId);
        } catch (error) {
            console.error('Failed to stop tracking:', error);
        }
    }

    /**
     * Toggle tracking
     */
    async toggleTracking() {
        if (this.isTracking) {
            await this.stopTracking();
        } else {
            await this.startTracking();
        }
        return this.isTracking;
    }

    /**
     * Check if tracking is active
     */
    getTrackingStatus() {
        return this.isTracking;
    }

    /**
     * Record mouse movement
     */
    _recordMovement(x, y) {
        if (!this.isTracking) return;
        
        if (this.movements.length % this.sampleRate === 0) {
            this.movements.push({
                x,
                y,
                timestamp: Date.now() - this.sessionStartTime.getTime()
            });

            if (this.movements.length >= this.maxEventsPerBatch) {
                this._sendBatch();
            }
        }
    }

    /**
     * Record click event
     */
    _recordClick(x, y, element) {
        if (!this.isTracking) return;

        this.clicks.push({
            x,
            y,
            element: element.tagName,
            elementClass: element.className,
            elementId: element.id,
            timestamp: Date.now() - this.sessionStartTime.getTime()
        });

        if (this.clicks.length >= this.maxEventsPerBatch) {
            this._sendBatch();
        }
    }

    /**
     * Record scroll event
     */
    _recordScroll(scrollX, scrollY) {
        if (!this.isTracking) return;

        this.scrolls.push({
            scrollX,
            scrollY,
            timestamp: Date.now() - this.sessionStartTime.getTime()
        });

        if (this.scrolls.length >= this.maxEventsPerBatch) {
            this._sendBatch();
        }
    }

    /**
     * Send batch of events to server
     */
    async _sendBatch() {
        if (!this.isTracking || !this.sessionId) return;

        const batch = {
            movements: [...this.movements],
            clicks: [...this.clicks],
            scrolls: [...this.scrolls]
        };

        // Clear arrays
        this.movements = [];
        this.clicks = [];
        this.scrolls = [];

        try {
            await fetch(`${this.backendUrl}/api/tracking/sessions/${this.sessionId}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(batch)
            });
        } catch (error) {
            console.error('Failed to send tracking batch:', error);
        }
    }

    /**
     * Bind DOM events
     */
    _bindEvents() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            this._recordMovement(e.clientX, e.clientY);
        });

        // Clicks
        document.addEventListener('click', (e) => {
            this._recordClick(e.clientX, e.clientY, e.target);
        });

        // Scroll
        document.addEventListener('scroll', (e) => {
            this._recordScroll(window.scrollX, window.scrollY);
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.isTracking) {
                this._recordClick(window.innerWidth, window.innerHeight, {
                    tagName: 'WINDOW',
                    className: 'RESIZE',
                    id: ''
                });
            }
        });
    }

    /**
     * Get session statistics
     */
    getSessionStats() {
        return {
            sessionId: this.sessionId,
            isTracking: this.isTracking,
            duration: this.isTracking 
                ? Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000)
                : 0,
            totalMovements: this.movements.length,
            totalClicks: this.clicks.length,
            totalScrolls: this.scrolls.length
        };
    }
}
