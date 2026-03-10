export default class AI {
    constructor(SN) {
        this._SN = SN;
    }

    chatInput(text) {
        console.log("AI Chat Input:", text);
    }

    async conversation(text) {
        console.log("AI Conversation Triggered with:", text);
    }

    clearChat() {
        console.log("AI Chat Cleared");
    }

    handleFileChange(event) {
        console.log("AI file changed:", event);
    }

    _handlePastedImage() {
        return false;
    }

    _previewImage() {
        return false;
    }
}
