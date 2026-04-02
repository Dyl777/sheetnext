# Icon Updates Summary

## Changes Made

### 1. Added AI Icons to mainSvgs.js

Added the following new SVG icons:
- `ai_generate` - AI formula generation icon (target with concentric circles)
- `ai_analyze` - AI data analysis icon (chart with magnifying glass)
- `ai_template` - AI template icon (grid layout)
- `ai_format` - AI formatting icon (paintbrush)
- `ai_insights` - AI insights icon (bar chart)
- `ai_send` - AI send button icon (paper plane)
- `ai_quickImport` - AI quick import icon (download tray)
- `monifenxi` - Analysis icon (chart with magnifying glass)

### 2. Updated DOMBuilder.js

**Replaced emojis with icons:**
- AI Chat header: `🤖` → `${getSvg('ai_insights')}`
- Examples title: `💡` → `${getSvg('licai')}`
- AI button: `🤖` → `${getSvg('ai_insights')}`
- Pivot settings: `⚙` → `${getSvg('shezhi')}`
- Pivot close: `✕` → `${getSvg('cuowu')}`

**Updated file upload:**
- Changed accept attribute to include more file types: `image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xlsx`
- Updated title from "Upload Image" to "Upload File"

### 3. Updated Layout.js

**Replaced emojis with icons:**
- Comment header: `🎨 UI 布局` → `UI Layout`
- Pivot remove button: `✕` → `${getSvg('cuowu')}`
- Pivot settings button: `⚙` → `${getSvg('shezhi')}`

### 4. Updated AutoFilter.js

**Replaced emoji in comment:**
- `🔍 自动筛选` → `Auto Filter`

### 5. Updated ToolbarBuilder.js

**Replaced emoji with icon:**
- Highlight off button: `✕` → `${getSvg('cuowu')}`

### 6. Updated AI.js

**Replaced emojis in markdown export:**
- User message: `👤` → `[U]`
- Assistant message: `🤖` → `[A]`

## All Icons Now Use SVG

All user-facing emojis have been replaced with consistent SVG icons from the mainSvgs library. This provides:

1. **Consistent styling** - All icons match the application design
2. **Scalable graphics** - SVG icons scale perfectly at any size
3. **Theme support** - Icons use `currentColor` for theme compatibility
4. **Better accessibility** - Proper SVG semantics

## New File Types Supported for Upload

The file upload now accepts:
- Images: PNG, JPG, GIF, etc.
- Documents: PDF, DOC, DOCX
- Text files: TXT, MD
- Data files: CSV, XLSX

These files will be converted to markdown using:
- **Groq Vision API** for images (if configured)
- **llama-server** for images (fallback)
- **Text extraction** for documents

## Configuration

To use Groq API for image/document conversion:

```javascript
const SN = new SheetNext(dom, {
  GROQ_API_KEY: 'your_groq_api_key',
  USE_GROQ: true,
  GROQ_MODEL: 'moonshotai/kimi-k2-instruct'
});
```

## Files Modified

1. `src/assets/mainSvgs.js` - Added AI icon SVG paths
2. `src/core/Layout/DOMBuilder.js` - Replaced emojis with icons
3. `src/core/Layout/Layout.js` - Replaced emojis with icons
4. `src/core/AI/AI.js` - Replaced emojis in export
5. `src/core/AutoFilter/AutoFilter.js` - Updated comment
6. `src/core/Layout/ToolbarBuilder.js` - Replaced emoji with icon
