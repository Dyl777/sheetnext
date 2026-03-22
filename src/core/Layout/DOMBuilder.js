import { ToolbarBuilder } from './ToolbarBuilder.js';
import getSvg from '../../assets/mainSvgs.js';

/**
 * @param {string} ns
 * @param {string} menuRightHTML
 * @param {Object|null} [SN=null]
 * @param {function|null} [menuListCallback=null] - Callback `(config: Array) => Array` to customize menu tab config.
 * @returns {{html: string, toolbarBuilder: ToolbarBuilder}}
 */
export function createMainHTML(ns, menuRightHTML, SN = null, menuListCallback = null) {
    const t = (key, fallback = '') => {
        const translated = SN.t(key);
        if (translated === key && fallback) return fallback;
        return translated;
    };

    const toolbarBuilder = new ToolbarBuilder(ns, SN, menuListCallback);
    const panelsHTML = toolbarBuilder.buildPanelsOnly();
    const config = toolbarBuilder.config;
    const zoomAverageLabel = t('layout.zoomAverage');
    const zoomCountLabel = t('layout.zoomCount');
    const zoomSumLabel = t('layout.zoomSum');
    const menuTabsHTML = config.map((panel, idx) => {
        const isContextual = panel.contextual === true;
        const hiddenStyle = isContextual ? ' style="display:none"' : '';
        const contextAttr = isContextual ? ` data-context-type="${panel.contextType || ''}"` : '';
        const tabLabel = panel.labelKey ? t(panel.labelKey) : SN.t(panel.text || panel.key);
        return `<span class="sn-menu-tab${idx === 1 ? ' active' : ''}${isContextual ? ' sn-contextual-tab' : ''}" data-panel="${panel.key}"${contextAttr}${hiddenStyle}>${tabLabel}</span>`;
    }).join('');

    const html = `
            <main class="sn-main">
                <header class="sn-menu">
                    <div class="sn-menu-left">
                        <span class="sn-menu-logo">${getSvg('sn_brandLogo')}</span>
                        <span class="sn-file-name">${t('workbook.defaultName')}</span>
                    </div>
                    <div class="sn-menu-list">${menuTabsHTML}</div>
                    <div class="sn-menu-right">
                        ${menuRightHTML}
                    </div>
                </header>
                <div class="sn-tools">${panelsHTML}</div>
                <div class="sn-op">
                    <div class="sn-chat">
                        <div class="sn-chat-input">
                            <div class="sn-chat-head d-flex justify-content-between align-items-center">
                                ${getSvg('ai_insights')} ${t('ai.panel.title', 'SheetNext AI')}
                                <div class="sn-chat-head-actions">
                                    <button class="sn-chat-head-btn" onclick="${ns}.Layout.toggleCharacteristicsPanel()" title="${t('ai.characteristics.title', 'AI Characteristics')}">
                                        ${getSvg('characteristics')}
                                    </button>
                                    <span onclick="${ns}.Layout.showAIChatWindow=!${ns}.Layout.showAIChatWindow" class="sn-svg-btn">${getSvg('xiaochuangbofang')}</span>
                                </div>
                            </div>
                            <div class="sn-characteristic-selector" onclick="${ns}.Layout.showCharacteristicSelector()">
                                <span class="sn-characteristic-icon">${getSvg('assistant')}</span>
                                <span class="sn-characteristic-name" id="snActiveCharacteristicName">${t('ai.characteristics.default', 'Helpful Assistant')}</span>
                                ${getSvg('arrow-down')}
                            </div>
                            <div class="upImgList"></div>
                            <textarea autocomplete="off" class="sn-prompt-input" rows="3" placeholder="${t('ai.panel.inputPlaceholder', 'Describe what to do with the sheet...')}"></textarea>
                            <div class="input-btns">
                                <button class="AI-btn sn-tooltip" onclick="${ns}.AI.clearChat()" title="${t('ai.panel.resetContext', 'Reset Context')}">
                                    ${getSvg('clear','sn-f16')}
                                </button>
                                <button class="AI-btn sn-tooltip" onclick="${ns}.containerDom.querySelector('.sn-file-input').click()" title="${t('ai.panel.uploadImage', 'Upload File')}">
                                    ${getSvg('tupian1', 'fj-ico')}
                                </button>
                                <input type="file" class="sn-file-input" accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xlsx" style="display: none;" multiple onchange="${ns}.AI.handleFileChange(event)">
                                <button class="sn-send-btn" onclick="${ns}.AI.conversation(${ns}.containerDom.querySelector('.sn-prompt-input').value)">
                                    ${getSvg('ai_send')}
                                </button>
                            </div>
                        </div>
                        <div class="sn-chat-info">
                            <div class="dryd chat-system" onclick="${ns}.containerDom.querySelector('.sn-upload').click()">
                                <span style="font-size:20px;line-height:1;display:inline-flex;">${getSvg('ai_quickImport')}</span>
                                <span>${t('ai.panel.quickImport')}</span>
                            </div>
                            <div class="chat-system sn-chat-examples">
                                <div class="sn-chat-examples-header">
                                    <span class="sn-chat-examples-title">${getSvg('licai')} ${t('ai.panel.examplesTitle')}</span>
                                </div>
                                <ul>
                                    <li onclick="${ns}.AI.chatInput(this.innerText);">${t('ai.panel.examples.item1')}</li>
                                    <li onclick="${ns}.AI.chatInput(this.innerText);">${t('ai.panel.examples.item2')}</li>
                                    <li onclick="${ns}.AI.chatInput(this.innerText);">${t('ai.panel.examples.item3')}</li>
                                    <li onclick="${ns}.AI.chatInput(this.innerText);">${t('ai.panel.examples.item4')}</li>
                                    <li onclick="${ns}.AI.chatInput(this.innerText);">${t('ai.panel.examples.item5')}</li>
                                    <li onclick="${ns}.AI.chatInput(this.innerText);">${t('ai.panel.examples.item6')}</li>
                                    <li onclick="${ns}.AI.chatInput(this.innerText);">${t('ai.panel.examples.item7')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Characteristics Panel -->
                    <div class="sn-characteristics-panel" id="snCharacteristicsPanel">
                        <div class="sn-characteristics-header">
                            <h3>${t('ai.characteristics.title', 'AI Characteristics')}</h3>
                            <button class="sn-panel-close" onclick="${ns}.Layout.toggleCharacteristicsPanel()">${getSvg('cuowu')}</button>
                        </div>
                        <div class="sn-characteristics-list" id="snCharacteristicsList">
                            <!-- Populated dynamically -->
                        </div>
                        <div class="sn-characteristics-footer">
                            <button class="sn-btn sn-btn-primary" onclick="${ns}.Action.openCreateCharacteristic()" style="width:100%">
                                ${getSvg('plus')} ${t('ai.characteristics.create', 'Create New')}
                            </button>
                        </div>
                    </div>
                    
                    <!-- Characteristic Selector Dropdown -->
                    <div class="sn-characteristic-dropdown" id="snCharacteristicDropdown" style="display:none">
                        <div class="sn-characteristic-dropdown-header">${t('ai.characteristics.select', 'Select AI Persona')}</div>
                        <div class="sn-characteristic-dropdown-list" id="snCharacteristicDropdownList">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                    
                    <!-- Cache Management Panel -->
                    <div class="sn-cache-panel" id="snCachePanel">
                        <div class="sn-cache-header">
                            <h3>Cache Management</h3>
                            <button class="sn-panel-close" onclick="${ns}.Layout.toggleCachePanel()">${getSvg('cuowu')}</button>
                        </div>
                        <div class="sn-cache-content">
                            <div class="sn-cache-stats">
                                <div class="sn-cache-stat">
                                    <span class="sn-cache-stat-label">Total Size</span>
                                    <span class="sn-cache-stat-value" id="cacheTotalSize">0</span>
                                </div>
                                <div class="sn-cache-stat">
                                    <span class="sn-cache-stat-label">Hit Rate</span>
                                    <span class="sn-cache-stat-value" id="cacheHitRate">0%</span>
                                </div>
                            </div>
                            <div class="sn-cache-section">
                                <h4>Cache Types</h4>
                                <div class="sn-cache-type-item">
                                    <span>AI Responses</span>
                                    <span id="cacheAISize">0</span>
                                </div>
                                <div class="sn-cache-type-item">
                                    <span>Documents</span>
                                    <span id="cacheDocumentsSize">0</span>
                                </div>
                                <div class="sn-cache-type-item">
                                    <span>API</span>
                                    <span id="cacheAPISize">0</span>
                                </div>
                                <div class="sn-cache-type-item">
                                    <span>General</span>
                                    <span id="cacheGeneralSize">0</span>
                                </div>
                            </div>
                            <div class="sn-cache-actions">
                                <button class="sn-btn" onclick="${ns}.Action.refreshCacheStats()">${getSvg('shuaxin')} Refresh</button>
                                <button class="sn-btn sn-btn-danger" onclick="${ns}.Action.clearCache('ai')">${getSvg('clear')} Clear AI Cache</button>
                                <button class="sn-btn sn-btn-danger" onclick="${ns}.Action.clearCache()">${getSvg('clear')} Clear All</button>
                            </div>
                        </div>
                    </div>
                    <div class="sn-content">
                        <div class="sn-input">
                            <span class="sn-ai-btn sn-text-center" onclick="${ns}.Layout.showAIChat=!${ns}.Layout.showAIChat">${getSvg('ai_insights')}</span>
                            <div class="sn-area-box">
                                <input type="text" class="sn-area-input" value="A1">
                                <span class="sn-area-arrow"></span>
                                <div class="sn-area-dropdown"></div>
                            </div>
                            <div class="formulaBarBox">
                                <div class="sn-color-999 sn-text-center op-btns">
                                    <span class="sn-cur sn-op-cancel">${getSvg('cuowu')}</span>&nbsp;
                                    <span class="sn-cur sn-op-confirm">${getSvg('queding')}</span>&nbsp;
                                    <span class="sn-cur sn-op-fun" onclick="${ns}.Action.openFormulaDialog('all')">${getSvg('gongshi1')}</span>
                                </div>
                                <textarea autocomplete="off" rows="1" class="sn-formula-bar" placeholder=""></textarea>
                            </div>
                        </div>
                        <div class="sn-analysis">
                            <div class="sn-canvas">
                                <div class="sn-loading-div">
                                    <div class="spinner-border sn-text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <div class="f14 sn-color-999">Loading editor...</div>
                                </div>
                                <canvas class="sn-show-layer" width="0" height="0"></canvas>
                                <div class="sn-middle-layer">
                                    <div class="sn-drawings-con"></div>
                                </div>
                                <canvas class="sn-handle-layer"></canvas>
                                <div class="sn-top-layer">
                                    <div class="sn-slicers-con"></div>
                                    <div class="sn-roll-y"><div></div></div>
                                    <div class="sn-roll-x"><div></div></div>
                                    <div class="sn-input-editor" contenteditable="true" tabindex="0" style="z-index: -1; opacity: 0; pointer-events: none;"></div>
                                </div>
                            </div>
                            <div class="sn-sheets">
                                <div class="sn-sheet-left">
                                    <span class="sn-sheets-btn" onclick="${ns}.Layout.scrollSheetTabs(-1)" title="Scroll Left">${getSvg('arrow-left')}</span>
                                    <span class="sn-sheets-btn" onclick="${ns}.Layout.scrollSheetTabs(1)" title="Scroll Right">${getSvg('arrow-right')}</span>
                                    <span class="sn-sheets-btn" onmousedown="${ns}.activeSheet = ${ns}.addSheet();" ontouchstart="${ns}.activeSheet = ${ns}.addSheet();" title="New Sheet">${getSvg('plus')}</span>
                                    <div class="sn-dropdown sn-sheet-dropdown">
                                        <span class="sn-sheets-btn sn-dropdown-toggle sn-no-icon" onmousedown="${ns}.Action.moreSheet(this)" ontouchstart="${ns}.Action.moreSheet(this)" title="All Sheets">${getSvg('gengduo')}</span>
                                        <ul class="sn-dropdown-menu sn-sheet-menu"></ul>
                                    </div>
                                </div>
                                <div class="sn-sheet-list">
                                    <div class="sn-sheet-scroll">
                                        <button class="sheet-sel">Sheet1</button>
                                    </div>
                                </div>
                                <div class="sn-sheet-right">
                                    <span class="sn-stat-item" data-stat="avg" title="${zoomAverageLabel}">${zoomAverageLabel}: -</span>
                                    <span class="sn-stat-item" data-stat="count" title="${zoomCountLabel}">${zoomCountLabel}: -</span>
                                    <span class="sn-stat-item" data-stat="sum" title="${zoomSumLabel}">${zoomSumLabel}: -</span>
                                    <div class="sn-dropdown">
                                        <span class="sn-sheets-btn sn-dropdown-toggle">${getSvg('dangqianhangliegaoliang')}</span>
                                        <ul class="sn-dropdown-menu sn-highlight-menu">${toolbarBuilder.buildHighlightMenuHTML()}</ul>
                                    </div>
                                    <span class="sn-sheets-btn" onclick="${ns}.Action.fullScreen()" title="Full Screen">${getSvg('fullscreen')}</span>
                                    <div class="sn-zoom-ctrl">
                                        <span class="sn-sheets-btn" title="Zoom Out">${getSvg('minus')}</span>
                                        <span class="sn-zoom-val">100%</span>
                                        <span class="sn-sheets-btn" title="Zoom In">${getSvg('plus')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="sn-pivot-panel">
                        <div class="sn-pivot-header">
                            <span class="sn-pivot-title">PivotTable Fields</span>
                            <div class="sn-pivot-header-btns">
                                <button class="sn-pivot-header-btn" data-action="settings" title="Settings">${getSvg('shezhi')}</button>
                                <button class="sn-pivot-header-btn" data-action="close" title="Close">${getSvg('cuowu')}</button>
                            </div>
                        </div>
                        <div class="sn-pivot-search">
                            <input type="text" class="sn-pivot-search-input" placeholder="Search fields...">
                        </div>
                        <div class="sn-pivot-fields">
                            <div class="sn-pivot-fields-header">Choose fields to add to the report:</div>
                            <div class="sn-pivot-fields-list"></div>
                        </div>
                        <div class="sn-pivot-drop-hint">Drag fields between these areas:</div>
                        <div class="sn-pivot-drop-zones">
                            <div class="sn-pivot-zone" data-zone="filter">
                                <div class="sn-pivot-zone-header">Filter</div>
                                <div class="sn-pivot-zone-list"></div>
                            </div>
                            <div class="sn-pivot-zone" data-zone="column">
                                <div class="sn-pivot-zone-header">Columns</div>
                                <div class="sn-pivot-zone-list"></div>
                            </div>
                            <div class="sn-pivot-zone" data-zone="row">
                                <div class="sn-pivot-zone-header">Rows</div>
                                <div class="sn-pivot-zone-list"></div>
                            </div>
                            <div class="sn-pivot-zone" data-zone="value">
                                <div class="sn-pivot-zone-header">Values</div>
                                <div class="sn-pivot-zone-list"></div>
                            </div>
                        </div>
                        <div class="sn-pivot-footer">
                            <label class="sn-pivot-delay-update">
                                <input type="checkbox">
                                <span>Defer Layout Update</span>
                            </label>
                            <button class="sn-pivot-update-btn">Update</button>
                        </div>
                    </div>
                </div>
            </main>
            <input type="file" accept=".xlsx,.csv,.json" class="sn-upload" hidden="hidden" />
        `;
    return { html, toolbarBuilder };
}
