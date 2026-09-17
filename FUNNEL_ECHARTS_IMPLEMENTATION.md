# ECharts Funnel Implementation

## Overview

Added a traditional pyramid-style funnel visualization using ECharts to replace the horizontal bar-style funnel.

## Changes Made

### 1. New File: `frontend/src/metabase/visualizations/echarts/funnel/option.ts`

- Created ECharts funnel configuration generator
- Implements traditional funnel shape (inverted pyramid)
- Features:
  - White borders between sections
  - Labels inside funnel sections
  - Hover emphasis effect
  - Tooltip on hover

### 2. Modified: `frontend/src/metabase/visualizations/visualizations/Funnel/Funnel.tsx`

- Added new funnel type option: "Funnel (Classic)"
- Imported ECharts renderer and funnel option generator
- Added conditional rendering for ECharts funnel

## How to Use

### In the UI:

1. Open your funnel chart
2. Click ⚙️ **Settings**
3. Go to **Display** section
4. Find **"Funnel type"** dropdown
5. Select **"Funnel (Classic)"** for the pyramid style

### Options Available:

- **Funnel**: Horizontal bar style (original)
- **Funnel (Classic)**: Traditional pyramid funnel (NEW!)
- **Bar chart**: Horizontal bars

## Visual Comparison

### Before (Horizontal Bars):

```
Create Item  ████████████████████ 1071
Invite       ███████████████████  1063
Subscribe    ███████████████████  1051
Signup       ██████████████████   1024
Checkout     █████████████████    975
```

### After (Classic Funnel):

```
        ┌─────────────────────────┐
        │   Create Item - 1071    │  ◄── Widest
        └─────────────────────────┘
               ▼
           ┌──────────────────┐
           │  Invite - 1063   │
           └──────────────────┘
                ▼
             ┌────────────┐
             │ Subscribe  │
             │   1051     │
             └────────────┘
                  ▼
               ┌────────┐
               │ Signup │
               │  1024  │
               └────────┘
                   ▼
                ┌─────┐
                │ 975 │  ◄── Narrowest
                └─────┘
```

## Technical Details

### ECharts Configuration:

- **Type**: "funnel"
- **Layout**: Vertical (top to bottom)
- **Sorting**: Descending (largest at top)
- **Labels**: Inside sections, white text
- **Borders**: 1px white borders
- **Hover**: Increases font size on emphasis

### Data Flow:

1. Raw data from Metabase query
2. Transformed to ECharts format: `[{ name: "Step", value: count }]`
3. Rendered using `ResponsiveEChartsRenderer`

## Future Enhancements (Optional)

- Add color customization options
- Add label position settings (inside/outside)
- Add sorting options (ascending/descending/custom)
- Add percentage labels option
- Add funnel orientation (vertical/horizontal)
