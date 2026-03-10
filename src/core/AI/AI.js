export default class AI {
    constructor(SN) {
        this._SN = SN;
        this.messages = [
            { role: "system", content: "You are a helpful spreadsheet assistant. Help the user with their data." }
        ];

        // Configuration for local inference engines (vLLM, sglang, llamacli, ollama, etc.)
        this.apiUrl = "http://localhost:8000/v1/chat/completions";
        this.modelName = "local-model";
        this.apiKey = "sk-no-key";
    }

    chatInput(text) {
        const inputEl = this._SN.containerDom.querySelector('.sn-prompt-input');
        if (inputEl) {
            inputEl.value = text;
            inputEl.focus();
        }
    }

    async conversation(text) {
        if (!text || text.trim() === "") return;

        const infoContainer = this._SN.containerDom.querySelector('.sn-chat-info');
        if (!infoContainer) return;

        // Clear default UI if this is the first message
        if (this.messages.length === 1) {
            infoContainer.innerHTML = '';
        }

        // Add user message to UI
        this._appendMessageToUI(text, 'user');
        this.messages.push({ role: "user", content: text });

        // Clear input
        const inputEl = this._SN.containerDom.querySelector('.sn-prompt-input');
        if (inputEl) inputEl.value = '';

        // Add loading indicator
        const loadingId = this._appendMessageToUI("Thinking...", 'ai', true);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: this.messages,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`API Request failed: ${response.statusText}`);
            }

            const data = await response.json();
            const aiRawResponse = data.choices[0].message.content;

            // Remove loading indicator and append real response
            this._removeMessageFromUI(loadingId);
            this._appendMessageToUI(aiRawResponse, 'ai');
            this.messages.push({ role: "assistant", content: aiRawResponse });

        } catch (err) {
            console.error(err);
            this._removeMessageFromUI(loadingId);
            this._appendMessageToUI(`Error: Could not connect to local inference engine. Ensure your server (vllm, sglang, etc.) is running at ${this.apiUrl}`, 'error');
        }
    }

    clearChat() {
        this.messages = [
            { role: "system", content: "You are a helpful spreadsheet assistant. Help the user with their data." }
        ];
        const infoContainer = this._SN.containerDom.querySelector('.sn-chat-info');
        if (infoContainer) {
            infoContainer.innerHTML = `<div style="padding: 10px; color: #666; font-size: 14px;">Context cleared.</div>`;
        }
    }

    handleFileChange(event) {
        console.log("AI file changed:", event);
    }

    _appendMessageToUI(text, sender, isLoading = false) {
        const infoContainer = this._SN.containerDom.querySelector('.sn-chat-info');
        if (!infoContainer) return null;

        const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const div = document.createElement('div');
        div.id = id;
        div.style.padding = '10px';
        div.style.margin = '10px';
        div.style.borderRadius = 'var(--radius, 4px)';
        div.style.fontSize = '14px';
        div.style.lineHeight = '1.5';

        if (sender === 'user') {
            div.style.backgroundColor = '#e6f7ff';
            div.style.border = '1px solid #91d5ff';
            div.style.color = '#0050b3';
            div.innerHTML = `<strong>You:</strong><br>${this._escapeHTML(text)}`;
        } else if (sender === 'ai') {
            div.style.backgroundColor = '#f6ffed';
            div.style.border = '1px solid #b7eb8f';
            div.style.color = '#237804';
            div.innerHTML = `<strong>Assistant:</strong><br>${isLoading ? '<i>' + text + '</i>' : this._formatMarkdown(text)}`;
        } else {
            div.style.backgroundColor = '#fff2f0';
            div.style.border = '1px solid #ffccc7';
            div.style.color = '#cf1322';
            div.innerHTML = `<strong>System:</strong><br>${this._escapeHTML(text)}`;
        }

        infoContainer.appendChild(div);
        infoContainer.scrollTop = infoContainer.scrollHeight;
        return id;
    }

    _removeMessageFromUI(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    _escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    _formatMarkdown(str) {
        let html = this._escapeHTML(str);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;margin-top:5px;"><code>$1</code></pre>');
        html = html.replace(/`([^`]*)`/g, '<code style="background:#f5f5f5;padding:2px 4px;border-radius:2px;">$1</code>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    _handlePastedImage() {
        return false;
    }

    _previewImage() {
        return false;
    }
}
