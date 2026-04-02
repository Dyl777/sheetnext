/**
 * VisionAnalysisUI - AI-powered image and cell analysis
 * Uses Groq vision model to analyze images and suggest data
 */

export default class VisionAnalysisUI {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.token = options.AI_TOKEN || null;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
    }

    /**
     * Analyze image and extract data
     */
    async analyzeImage(imageFile, analysisType = 'extract') {
        if (!imageFile) return;

        try {
            const response = await fetch(`${this.backendUrl}/api/groq/vision/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    imageBase64: await this._fileToBase64(imageFile),
                    analysisType,
                    prompt: this._getAnalysisPrompt(analysisType)
                })
            });

            if (response.ok) {
                const result = await response.json();
                return result.analysis;
            }
        } catch (error) {
            console.error('Vision analysis failed:', error);
        }
        return null;
    }

    /**
     * Get analysis prompt based on type
     */
    _getAnalysisPrompt(type) {
        const prompts = {
            'extract': 'Extract all data from this image. Return as JSON array of rows.',
            'table': 'Extract table data. Return as JSON with headers and data rows.',
            'chart': 'Analyze chart and extract values shown.',
            'text': 'Extract all readable text from image.',
            'math': 'Analyze mathematical content and equations.'
        };
        return prompts[type] || prompts['extract'];
    }

    /**
     * Convert file to base64
     */
    async _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Create vision analysis UI
     */
    createVisionUI(containerId = null) {
        const container = containerId 
            ? document.getElementById(containerId)
            : this._SN.containerDom?.querySelector('[data-vision-container]');

        if (!container) return;

        container.innerHTML = `
            <div class="vision-panel">
                <h3>Vision Analysis</h3>
                
                <div class="vision-upload">
                    <input type="file" id="visionImageInput" accept="image/*" style="display:none;">
                    <button class="btn btn-primary" id="selectImageBtn">📷 Select Image</button>
                    <button class="btn btn-secondary" id="cameraBtn">📹 Take Photo</button>
                </div>
                
                <div id="visionPreview" style="display:none; margin: 12px 0;">
                    <img id="previewImg" style="max-width: 100%; border-radius: 4px;">
                </div>
                
                <div class="analysis-options">
                    <label>Analysis Type:</label>
                    <select id="analysisType">
                        <option value="extract">Extract Data</option>
                        <option value="table">Extract Table</option>
                        <option value="chart">Analyze Chart</option>
                        <option value="text">Extract Text</option>
                        <option value="math">Analyze Math</option>
                    </select>
                </div>
                
                <button class="btn btn-success" id="analyzeBtn">🤖 Analyze</button>
                
                <div id="analysisResult" style="display:none; margin-top: 16px;"></div>
            </div>
        `;

        const imageInput = container.querySelector('#visionImageInput');
        const selectBtn = container.querySelector('#selectImageBtn');
        const cameraBtn = container.querySelector('#cameraBtn');
        const analyzeBtn = container.querySelector('#analyzeBtn');

        selectBtn?.addEventListener('click', () => imageInput?.click());
        cameraBtn?.addEventListener('click', () => this._capturePhoto());
        analyzeBtn?.addEventListener('click', () => this._performAnalysis(container));

        imageInput?.addEventListener('change', (e) => this._previewImage(e, container));
    }

    /**
     * Preview selected image
     */
    _previewImage(event, container) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = container.querySelector('#visionPreview');
            const img = container.querySelector('#previewImg');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    /**
     * Capture photo from camera
     */
    async _capturePhoto() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            setTimeout(() => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                
                stream.getTracks().forEach(track => track.stop());
                
                // Convert canvas to blob
                canvas.toBlob(blob => {
                    const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
                    const event = new Event('change', { bubbles: true });
                    event.target = { files: [file] };
                    const fileInput = document.querySelector('#visionImageInput');
                    fileInput?.dispatchEvent(event);
                });
            }, 2000);
        } catch (error) {
            alert('Camera access denied');
        }
    }

    /**
     * Perform analysis
     */
    async _performAnalysis(container) {
        const fileInput = container.querySelector('#visionImageInput');
        const file = fileInput?.files[0];
        const analysisType = container.querySelector('#analysisType')?.value || 'extract';

        if (!file) {
            alert('Please select an image');
            return;
        }

        const result = container.querySelector('#analysisResult');
        result.innerHTML = '⏳ Analyzing...';
        result.style.display = 'block';

        const analysis = await this.analyzeImage(file, analysisType);

        if (analysis) {
            result.innerHTML = `<pre>${JSON.stringify(analysis, null, 2)}</pre>
                <button class="btn btn-small" onclick="this.parentElement.style.display='none'">Close</button>`;
        } else {
            result.innerHTML = 'Analysis failed. Please try again.';
        }
    }
}
