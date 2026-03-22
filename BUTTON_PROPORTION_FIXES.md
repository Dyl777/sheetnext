# AI Button Proportion Fixes

## Problem
AI toolbar buttons were too small compared to other toolbar buttons.

## Solution

### 1. Changed Button Layout Structure
Changed from `stack` to `row` layout for AI buttons to match other toolbar buttons:

**Before:**
```javascript
{
    type: 'stack', items: [
        { icon: 'ai_analyze', ... },
        { icon: 'ai_template', ... },
    ]
}
```

**After:**
```javascript
{
    type: 'row', items: [
        { icon: 'ai_analyze', ... },
        { icon: 'ai_template', ... },
    ]
}
```

This matches the layout used by font formatting buttons (bold, italic, underline, etc.)

### 2. Added CSS Icon Sizing Rules

**File:** `src/style/tools.css`

Added proper sizing for toolbar row icons:
```css
.sn-tools-row .sn-svg {
    font-size: 16px;
    width: 18px;
    height: 18px;
}
```

Added specific sizing for AI icons:
```css
.sn-tools-item .sn-svg[data-icon="ai_generate"],
.sn-tools-item .sn-svg[data-icon="ai_analyze"],
.sn-tools-item .sn-svg[data-icon="ai_template"],
.sn-tools-item .sn-svg[data-icon="ai_format"],
.sn-tools-item .sn-svg[data-icon="ai_insights"] {
    font-size: 18px;
}
```

Added consistent sizing for stack items:
```css
.sn-tools-stack-item .sn-svg {
    font-size: 16px;
}
```

## Button Sizes Reference

| Button Type | Icon Size | Usage |
|-------------|-----------|-------|
| Large | 21px | Main actions (Format Brush, Paste, etc.) |
| Row Icons | 16px (18px for AI) | Font formatting, AI actions |
| Stack Icons | 16px | Grouped actions |
| Small | 14px | Secondary actions |

## Files Modified

1. **`src/core/Layout/ToolbarConfig.js`**
   - Changed AI button groups from `stack` to `row` layout
   - Added `titleKey` to all AI buttons for tooltips
   - Added `labelKey` for proper labeling

2. **`src/style/tools.css`**
   - Added `.sn-tools-row .sn-svg` sizing rule
   - Added AI-specific icon sizing rules
   - Updated `.sn-tools-stack-item .sn-svg` with explicit font-size

## Result

AI buttons now:
- ✅ Match the size of other toolbar buttons (bold, italic, etc.)
- ✅ Have consistent 18px icon size
- ✅ Display properly in rows with correct spacing
- ✅ Have proper tooltips on hover
- ✅ Scale correctly at different zoom levels

## Visual Comparison

**Before:**
- AI icons appeared smaller (~14px)
- Inconsistent with surrounding buttons
- Less clickable area

**After:**
- AI icons at 18px (matching other action buttons)
- Consistent visual weight
- Better click targets
- Professional appearance
