# AI Characteristics Implementation Guide

## Overview

AI Characteristics allows users to create, manage, and select different AI personas with custom system prompts and settings.

## Features Implemented

### 1. AICharacteristics Module (`src/core/AI/AICharacteristics.js`)

**Default Personas:**
- **Helpful Assistant** - General-purpose friendly assistant
- **Data Analyst** - Expert in data analysis and insights
- **Formula Expert** - Specialist in Excel/SheetNext formulas
- **Teacher** - Patient educator
- **Code Reviewer** - Reviews and improves code

**Features:**
- Create custom personas
- Edit existing personas (creates copy for defaults)
- Delete custom personas
- Switch between personas
- Import/Export personas
- Persist to backend

### 2. UI Components Added

**Characteristics Panel:**
- Sidebar showing all available personas
- Create new persona button
- Edit/Delete buttons for each persona
- Visual indicators for active persona

**Characteristic Selector:**
- Dropdown in chat header
- Shows current active persona
- Quick switch between personas

**Chat Header:**
- Characteristics button to open panel
- Active persona display with icon

### 3. Icons Added
- `characteristics` - Settings/gears icon
- `assistant` - Robot face icon

## Remaining Implementation

### A. Add Methods to Layout.js

```javascript
/**
 * Toggle characteristics panel
 */
toggleCharacteristicsPanel() {
    const panel = this.SN.containerDom.querySelector('#snCharacteristicsPanel');
    if (panel) {
        panel.classList.toggle('active');
        this.renderCharacteristicsList();
    }
}

/**
 * Show characteristic selector dropdown
 */
showCharacteristicSelector() {
    const dropdown = this.SN.containerDom.querySelector('#snCharacteristicDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        this.renderCharacteristicDropdown();
    }
}

/**
 * Render characteristics list in panel
 */
renderCharacteristicsList() {
    const list = this.SN.containerDom.querySelector('#snCharacteristicsList');
    if (!list) return;
    
    const characteristics = this.SN.AICharacteristics.getAllCharacteristics();
    const activeId = this.SN.AICharacteristics.activeCharacteristicId;
    
    list.innerHTML = characteristics.map(c => `
        <div class="sn-characteristic-item ${c.id === activeId ? 'active' : ''}" 
             style="border-left: 3px solid ${c.color}"
             onclick="${this.SN.namespace}.Action.selectCharacteristic('${c.id}')">
            <div class="sn-characteristic-item-header">
                <span class="sn-characteristic-item-icon" style="color: ${c.color}">
                    ${this.SN.Utils.getSvg(c.icon || 'assistant')}
                </span>
                <div class="sn-characteristic-item-info">
                    <div class="sn-characteristic-item-name">${c.name}</div>
                    <div class="sn-characteristic-item-desc">${c.description}</div>
                </div>
                <div class="sn-characteristic-item-actions">
                    ${!c.isDefault ? `
                        <button onclick="${this.SN.namespace}.Action.editCharacteristic('${c.id}')" title="Edit">
                            ${this.SN.Utils.getSvg('shezhi')}
                        </button>
                        <button onclick="${this.SN.namespace}.Action.deleteCharacteristic('${c.id}')" title="Delete">
                            ${this.SN.Utils.getSvg('cuowu')}
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Render characteristic selector dropdown
 */
renderCharacteristicDropdown() {
    const list = this.SN.containerDom.querySelector('#snCharacteristicDropdownList');
    if (!list) return;
    
    const characteristics = this.SN.AICharacteristics.getAllCharacteristics();
    const activeId = this.SN.AICharacteristics.activeCharacteristicId;
    
    list.innerHTML = characteristics.map(c => `
        <div class="sn-characteristic-dropdown-item ${c.id === activeId ? 'active' : ''}"
             onclick="${this.SN.namespace}.Action.selectCharacteristic('${c.id}');${this.SN.namespace}.Layout.showCharacteristicSelector()">
            <span style="color: ${c.color}">${this.SN.Utils.getSvg(c.icon || 'assistant')}</span>
            <span>${c.name}</span>
        </div>
    `).join('');
}

/**
 * Update active characteristic display
 */
updateActiveCharacteristicDisplay() {
    const characteristic = this.SN.AICharacteristics.getActiveCharacteristic();
    if (!characteristic) return;
    
    const nameEl = this.SN.containerDom.querySelector('#snActiveCharacteristicName');
    const iconEl = this.SN.containerDom.querySelector('.sn-characteristic-icon');
    
    if (nameEl) {
        nameEl.textContent = characteristic.name;
    }
    if (iconEl) {
        iconEl.innerHTML = this.SN.Utils.getSvg(characteristic.icon || 'assistant');
    }
}
```

### B. Add Methods to Action.js

```javascript
// Add to src/action/Action.js and import AIActions

export async function selectCharacteristic(id) {
    const success = this.SN.AICharacteristics.setActiveCharacteristic(id);
    if (success) {
        this.SN.Layout.updateActiveCharacteristicDisplay();
        this.SN.Layout.renderCharacteristicsList();
        this.SN.Utils.toast(`Switched to ${this.SN.AICharacteristics.getActiveCharacteristic().name}`);
    }
}

export async function openCreateCharacteristic() {
    const html = `
        <div class="sn-characteristic-form">
            <div class="sn-form-group">
                <label>Name</label>
                <input type="text" id="charName" placeholder="My Custom Assistant">
            </div>
            <div class="sn-form-group">
                <label>Description</label>
                <input type="text" id="charDesc" placeholder="Brief description">
            </div>
            <div class="sn-form-group">
                <label>System Prompt</label>
                <textarea id="charPrompt" rows="6" placeholder="You are a helpful assistant..."></textarea>
            </div>
            <div class="sn-form-group">
                <label>Temperature: <span id="tempValue">0.7</span></label>
                <input type="range" id="charTemp" min="0" max="1" step="0.1" value="0.7">
            </div>
            <div class="sn-form-group">
                <label>Color</label>
                <input type="color" id="charColor" value="#1890ff">
            </div>
        </div>
    `;
    
    this.SN.Utils.showModal(html, 'Create New Characteristic');
    
    // Add event listeners
    setTimeout(() => {
        document.getElementById('charTemp').oninput = (e) => {
            document.getElementById('tempValue').textContent = e.target.value;
        };
    }, 100);
}

export async function saveCharacteristic() {
    const container = this.SN.containerDom.querySelector('.sn-modal-content');
    const data = {
        name: container.querySelector('#charName').value,
        description: container.querySelector('#charDesc').value,
        systemPrompt: container.querySelector('#charPrompt').value,
        temperature: parseFloat(container.querySelector('#charTemp').value),
        color: container.querySelector('#charColor').value
    };
    
    if (!data.name || !data.systemPrompt) {
        this.SN.Utils.toast('Name and System Prompt are required');
        return;
    }
    
    await this.SN.AICharacteristics.createCharacteristic(data);
    this.SN.Utils.closeModal();
    this.SN.Layout.renderCharacteristicsList();
    this.SN.Utils.toast('Characteristic created successfully');
}

export async function editCharacteristic(id) {
    const characteristic = this.SN.AICharacteristics.getCharacteristic(id);
    if (!characteristic) return;
    
    // Similar to create but pre-fill values
    // Call updateCharacteristic on save
}

export async function deleteCharacteristic(id) {
    if (confirm('Are you sure you want to delete this characteristic?')) {
        const success = await this.SN.AICharacteristics.deleteCharacteristic(id);
        if (success) {
            this.SN.Layout.renderCharacteristicsList();
            this.SN.Layout.updateActiveCharacteristicDisplay();
            this.SN.Utils.toast('Characteristic deleted');
        } else {
            this.SN.Utils.toast('Cannot delete default characteristics');
        }
    }
}
```

### C. Add CSS Styles

```css
/* Characteristics Panel */
.sn-characteristics-panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 350px;
    background: #fff;
    border-left: 1px solid #e8e8e8;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s;
    z-index: 1000;
}

.sn-characteristics-panel.active {
    transform: translateX(0);
}

.sn-characteristics-header {
    padding: 16px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sn-characteristics-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.sn-characteristics-footer {
    padding: 16px;
    border-top: 1px solid #e8e8e8;
}

/* Characteristic Item */
.sn-characteristic-item {
    padding: 12px;
    margin-bottom: 12px;
    background: #fafafa;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.sn-characteristic-item:hover {
    background: #f0f0f0;
}

.sn-characteristic-item.active {
    background: #e6f7ff;
}

.sn-characteristic-item-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.sn-characteristic-item-icon {
    font-size: 24px;
}

.sn-characteristic-item-info {
    flex: 1;
}

.sn-characteristic-item-name {
    font-weight: 600;
    color: #262626;
}

.sn-characteristic-item-desc {
    font-size: 12px;
    color: #8c8c8c;
}

.sn-characteristic-item-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.sn-characteristic-item:hover .sn-characteristic-item-actions {
    opacity: 1;
}

/* Characteristic Selector */
.sn-characteristic-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 4px;
    margin: 8px 16px;
    cursor: pointer;
    transition: all 0.2s;
}

.sn-characteristic-selector:hover {
    background: #e8e8e8;
}

.sn-characteristic-icon {
    font-size: 18px;
}

.sn-characteristic-name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
}

/* Characteristic Dropdown */
.sn-characteristic-dropdown {
    position: absolute;
    top: 100%;
    left: 16px;
    width: 280px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 1001;
    overflow: hidden;
}

.sn-characteristic-dropdown-header {
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;
    font-weight: 600;
}

.sn-characteristic-dropdown-list {
    max-height: 300px;
    overflow-y: auto;
}

.sn-characteristic-dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: background 0.2s;
}

.sn-characteristic-dropdown-item:hover {
    background: #f5f5f5;
}

.sn-characteristic-dropdown-item.active {
    background: #e6f7ff;
}

/* Chat Head Actions */
.sn-chat-head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sn-chat-head-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
}

.sn-chat-head-btn:hover {
    background: #f0f0f0;
}

/* Form Styles */
.sn-characteristic-form {
    padding: 16px;
}

.sn-form-group {
    margin-bottom: 16px;
}

.sn-form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.sn-form-group input[type="text"],
.sn-form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 14px;
}

.sn-form-group input[type="range"] {
    width: 100%;
}

.sn-form-group input[type="color"] {
    width: 100%;
    height: 40px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    cursor: pointer;
}
```

### D. Add Locale Strings

```javascript
// In src/locales/en-US.js
"ai": {
    "characteristics": {
        "title": "AI Characteristics",
        "default": "Helpful Assistant",
        "create": "Create New",
        "edit": "Edit",
        "delete": "Delete",
        "select": "Select AI Persona",
        "active": "Active",
        "name": "Name",
        "description": "Description",
        "systemPrompt": "System Prompt",
        "temperature": "Temperature",
        "color": "Color",
        "save": "Save",
        "cancel": "Cancel",
        "confirmDelete": "Are you sure you want to delete this characteristic?",
        "cannotDeleteDefault": "Cannot delete default characteristics",
        "created": "Characteristic created",
        "updated": "Characteristic updated",
        "deleted": "Characteristic deleted",
        "switched": "Switched to"
    }
}
```

### E. Backend Routes (Create `backend/routes/characteristics.js`)

```javascript
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../database/db.js';

const router = express.Router();
router.use(authMiddleware);

// Get all characteristics for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_characteristics WHERE user_id = $1 ORDER BY created_at',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get characteristics' });
  }
});

// Create characteristic
router.post('/', async (req, res) => {
  try {
    const { id, name, description, systemPrompt, settings, icon, color } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_characteristics 
       (user_id, id, name, description, system_prompt, settings, icon, color, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [req.userId, id, name, description, systemPrompt, JSON.stringify(settings), icon, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create characteristic' });
  }
});

// Delete characteristic
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM ai_characteristics WHERE id = $1 AND user_id = $2 AND is_custom = true',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete characteristic' });
  }
});

// Delete all custom characteristics
router.delete('/custom', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM ai_characteristics WHERE user_id = $1 AND is_custom = true',
      [req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear characteristics' });
  }
});

export default router;
```

### F. Database Schema (`backend/database/characteristics_schema.sql`)

```sql
-- AI Characteristics table
CREATE TABLE IF NOT EXISTS ai_characteristics (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    icon VARCHAR(100) DEFAULT 'assistant',
    color VARCHAR(50) DEFAULT '#1890ff',
    is_default BOOLEAN DEFAULT false,
    is_custom BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_characteristics_user_id ON ai_characteristics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_characteristics_custom ON ai_characteristics(is_custom);
```

## Usage Examples

```javascript
// Get all characteristics
const chars = SN.AICharacteristics.getAllCharacteristics();

// Get active characteristic
const active = SN.AICharacteristics.getActiveCharacteristic();

// Switch characteristic
SN.AICharacteristics.setActiveCharacteristic('data_analyst');

// Create custom characteristic
await SN.AICharacteristics.createCharacteristic({
    name: 'Sales Expert',
    description: 'Expert in sales analytics',
    systemPrompt: 'You are a sales analytics expert...',
    temperature: 0.6,
    color: '#52c41a'
});

// Update characteristic
await SN.AICharacteristics.updateCharacteristic('custom_123', {
    name: 'Updated Name'
});

// Delete characteristic
await SN.AICharacteristics.deleteCharacteristic('custom_123');

// Listen for changes
SN.Event.on('characteristicChanged', (e) => {
    console.log('Switched to:', e.detail.characteristic.name);
});
```

## Files to Create/Modify

**Create:**
- `backend/routes/characteristics.js`
- `backend/database/characteristics_schema.sql`

**Modify:**
- `src/core/Layout/Layout.js` - Add panel methods
- `src/action/Action.js` - Add characteristic actions
- `src/style/editor.css` - Add CSS styles
- `src/locales/en-US.js` - Add locale strings
- `backend/server.js` - Add route import
