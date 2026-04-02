/**
 * AI Characteristics/Personas Manager
 * Manages different AI personality instances with custom system prompts and settings
 */
export default class AICharacteristics {
    constructor(SN, options = {}) {
        this._SN = SN;
        this.backendUrl = options.BACKEND_URL || 'http://localhost:3000';
        this.token = options.AI_TOKEN || null;

        // Default characteristics
        this.defaultCharacteristics = [
            {
                id: 'default_assistant',
                name: 'Helpful Assistant',
                description: 'A friendly and helpful general-purpose assistant',
                systemPrompt: `You are a helpful spreadsheet assistant integrated with SheetNext. You help users with formulas, data analysis, templates, and spreadsheet tasks. Be clear, accurate, and friendly.`,
                settings: {
                    temperature: 0.7,
                    maxTokens: 4096,
                    topP: 0.9,
                    tone: 'friendly',
                    responseStyle: 'detailed'
                },
                icon: 'assistant',
                color: '#1890ff',
                isDefault: true,
                isCustom: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 'data_analyst',
                name: 'Data Analyst',
                description: 'Expert in data analysis and insights',
                systemPrompt: `You are an expert data analyst specializing in spreadsheet data analysis. You provide deep insights, identify patterns and trends, and make data-driven recommendations. Be analytical, precise, and insightful. Focus on:
- Statistical analysis
- Trend identification
- Data quality assessment
- Actionable recommendations
- Clear visualizations suggestions`,
                settings: {
                    temperature: 0.5,
                    maxTokens: 4096,
                    topP: 0.9,
                    tone: 'professional',
                    responseStyle: 'analytical'
                },
                icon: 'analyst',
                color: '#722ed1',
                isDefault: true,
                isCustom: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 'formula_expert',
                name: 'Formula Expert',
                description: 'Specialist in Excel/SheetNext formulas',
                systemPrompt: `You are a formula expert specializing in Excel and SheetNext formulas. You help users create complex formulas, debug formula errors, and optimize formula performance. Be precise and technical. Focus on:
- Formula construction
- Function explanations
- Error debugging
- Performance optimization
- Best practices`,
                settings: {
                    temperature: 0.3,
                    maxTokens: 2048,
                    topP: 0.9,
                    tone: 'technical',
                    responseStyle: 'concise'
                },
                icon: 'formula',
                color: '#52c41a',
                isDefault: true,
                isCustom: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 'teacher',
                name: 'Teacher',
                description: 'Patient educator who explains concepts clearly',
                systemPrompt: `You are a patient and encouraging teacher who specializes in teaching spreadsheet skills. You explain concepts clearly, use examples, and check for understanding. Be supportive and educational. Focus on:
- Step-by-step explanations
- Real-world examples
- Building foundational knowledge
- Encouraging questions
- Positive reinforcement`,
                settings: {
                    temperature: 0.7,
                    maxTokens: 3072,
                    topP: 0.9,
                    tone: 'encouraging',
                    responseStyle: 'educational'
                },
                icon: 'teacher',
                color: '#fa8c16',
                isDefault: true,
                isCustom: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 'code_reviewer',
                name: 'Code Reviewer',
                description: 'Reviews and improves formulas and scripts',
                systemPrompt: `You are a code reviewer specializing in spreadsheet formulas and VBA/macros. You review code for errors, efficiency, and best practices. Be constructive and thorough. Focus on:
- Error identification
- Code optimization
- Best practices
- Security considerations
- Maintainability`,
                settings: {
                    temperature: 0.4,
                    maxTokens: 4096,
                    topP: 0.9,
                    tone: 'critical',
                    responseStyle: 'structured'
                },
                icon: 'reviewer',
                color: '#eb2f96',
                isDefault: true,
                isCustom: false,
                createdAt: new Date().toISOString()
            }
        ];
        
        // Load characteristics
        this.characteristics = [...this.defaultCharacteristics];
        this.activeCharacteristicId = 'default_assistant';
        
        // Load from backend if available
        this._loadCustomCharacteristics();
    }

    _bearer() {
        return (
            this.token ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('sheetnext_token') : null)
        );
    }

    /**
     * Get all characteristics
     */
    getAllCharacteristics() {
        return this.characteristics;
    }

    /**
     * Get characteristic by ID
     */
    getCharacteristic(id) {
        return this.characteristics.find(c => c.id === id);
    }

    /**
     * Get active characteristic
     */
    getActiveCharacteristic() {
        return this.getCharacteristic(this.activeCharacteristicId);
    }

    /**
     * Set active characteristic
     */
    setActiveCharacteristic(id) {
        const characteristic = this.getCharacteristic(id);
        if (characteristic) {
            this.activeCharacteristicId = id;
            
            // Apply to current AI conversation
            this._applyCharacteristic(characteristic);
            
            // Emit event
            this._SN.Event.emit('characteristicChanged', {
                characteristic,
                id
            });
            
            return true;
        }
        return false;
    }

    /**
     * Create new custom characteristic
     */
    async createCharacteristic(data) {
        const characteristic = {
            id: `custom_${Date.now()}`,
            name: data.name,
            description: data.description || '',
            systemPrompt: data.systemPrompt,
            settings: {
                temperature: data.temperature || 0.7,
                maxTokens: data.maxTokens || 4096,
                topP: data.topP || 0.9,
                tone: data.tone || 'neutral',
                responseStyle: data.responseStyle || 'balanced',
                ...data.settings
            },
            icon: data.icon || 'custom',
            color: data.color || '#1890ff',
            isDefault: false,
            isCustom: true,
            createdAt: new Date().toISOString()
        };

        this.characteristics.push(characteristic);
        
        // Save to backend
        await this._saveCharacteristic(characteristic);
        
        return characteristic;
    }

    /**
     * Update characteristic
     */
    async updateCharacteristic(id, updates) {
        const index = this.characteristics.findIndex(c => c.id === id);
        if (index === -1) return null;
        
        const characteristic = this.characteristics[index];
        
        // Don't update default characteristics
        if (characteristic.isDefault) {
            // Create a custom copy instead
            const customCharacteristic = {
                ...characteristic,
                id: `custom_${Date.now()}`,
                isDefault: false,
                isCustom: true,
                ...updates
            };
            
            this.characteristics.push(customCharacteristic);
            await this._saveCharacteristic(customCharacteristic);
            return customCharacteristic;
        }
        
        // Update custom characteristic
        const updated = {
            ...characteristic,
            ...updates,
            settings: {
                ...characteristic.settings,
                ...(updates.settings || {})
            }
        };
        
        this.characteristics[index] = updated;
        
        // Update in backend
        await this._saveCharacteristic(updated);
        
        // Refresh if active
        if (this.activeCharacteristicId === id) {
            this._applyCharacteristic(updated);
        }
        
        return updated;
    }

    /**
     * Delete characteristic
     */
    async deleteCharacteristic(id) {
        const characteristic = this.getCharacteristic(id);
        if (!characteristic) return false;
        
        // Can't delete default characteristics
        if (characteristic.isDefault) {
            return false;
        }
        
        // Remove from list
        this.characteristics = this.characteristics.filter(c => c.id !== id);
        
        // Delete from backend
        await this._deleteCharacteristic(id);
        
        // Switch to default if this was active
        if (this.activeCharacteristicId === id) {
            this.setActiveCharacteristic('default_assistant');
        }
        
        return true;
    }

    /**
     * Reset to default characteristics
     */
    async resetToDefaults() {
        // Remove all custom characteristics
        this.characteristics = this.characteristics.filter(c => c.isDefault);
        
        // Delete custom from backend
        await this._clearCustomCharacteristics();
        
        // Reset to default assistant
        this.setActiveCharacteristic('default_assistant');
    }

    /**
     * Apply characteristic to current AI
     */
    _applyCharacteristic(characteristic) {
        // Update AI settings
        this._SN.AI.setConfig({
            temperature: characteristic.settings.temperature,
            maxTokens: characteristic.settings.maxTokens,
            topP: characteristic.settings.topP
        });
        
        // Update system prompt in current conversation
        this._SN.AI.setSystemPrompt(characteristic.systemPrompt);
        
        console.log(`Applied characteristic: ${characteristic.name}`);
    }

    /**
     * Load custom characteristics from backend
     */
    async _loadCustomCharacteristics() {
        const auth = this._bearer();
        if (!auth || !this.backendUrl) return;

        try {
            const response = await fetch(`${this.backendUrl}/api/characteristics`, {
                headers: {
                    Authorization: `Bearer ${auth}`
                }
            });
            
            if (response.ok) {
                const custom = await response.json();
                this.characteristics = [
                    ...this.defaultCharacteristics,
                    ...custom
                ];
            }
        } catch (error) {
            console.warn('Failed to load custom characteristics:', error);
        }
    }

    /**
     * Save characteristic to backend
     */
    async _saveCharacteristic(characteristic) {
        const auth = this._bearer();
        if (!auth || !this.backendUrl) return;

        try {
            await fetch(`${this.backendUrl}/api/characteristics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth}`
                },
                body: JSON.stringify(characteristic)
            });
        } catch (error) {
            console.warn('Failed to save characteristic:', error);
        }
    }

    /**
     * Delete characteristic from backend
     */
    async _deleteCharacteristic(id) {
        const auth = this._bearer();
        if (!auth || !this.backendUrl) return;

        try {
            await fetch(`${this.backendUrl}/api/characteristics/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${auth}`
                }
            });
        } catch (error) {
            console.warn('Failed to delete characteristic:', error);
        }
    }

    /**
     * Clear all custom characteristics from backend
     */
    async _clearCustomCharacteristics() {
        const auth = this._bearer();
        if (!auth || !this.backendUrl) return;

        try {
            await fetch(`${this.backendUrl}/api/characteristics/custom`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${auth}`
                }
            });
        } catch (error) {
            console.warn('Failed to clear characteristics:', error);
        }
    }

    /**
     * Export characteristics
     */
    exportCharacteristics() {
        return JSON.stringify(this.characteristics, null, 2);
    }

    /**
     * Import characteristics
     */
    async importCharacteristics(json) {
        try {
            const imported = JSON.parse(json);
            if (Array.isArray(imported)) {
                for (const characteristic of imported) {
                    if (!characteristic.isDefault) {
                        await this.createCharacteristic(characteristic);
                    }
                }
                return true;
            }
        } catch (error) {
            console.error('Failed to import characteristics:', error);
        }
        return false;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            total: this.characteristics.length,
            default: this.defaultCharacteristics.length,
            custom: this.characteristics.filter(c => c.isCustom).length,
            active: this.activeCharacteristicId
        };
    }
}
