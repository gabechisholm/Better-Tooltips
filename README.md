# Better Tooltips - Power BI Custom Visual

**Better Tooltips** is a professional custom visual designed for Microsoft Power BI report authors. It allows builders to place a compact hover/click trigger (an icon, a text label, or an invisible transparent block) anywhere on a report canvas. On hover or click, it renders a rich, customizable tooltip styled in Markdown, enabling premium layouts (headings, bold/italic, lists, tables, links, images, and GIFs) without cluttering the canvas or blocking background interactions.

---

## Technical Architecture & Sandbox Workarounds

Because Power BI custom visuals are securely isolated within sandboxed, cross-origin iframes, elements **cannot break out** of the designated visual rectangular boundary on the parent canvas. To work around this browser boundary, **Better Tooltips** supports three distinct design workflows:

### 1. Transparent Canvas Mode (Recommended)
Resize the **Better Tooltips** visual to cover a larger portion of the report (e.g., $300 \times 250\text{ px}$ or a custom rectangle). The background of the visual is 100% transparent.
- **In Edit Mode**: A subtle blue dashed border and text indicator will outline the transparent trigger block, making it easy for the report author to size and align.
- **In View Mode**: The boundary lines disappear, rendering only the trigger and tooltip. Mouse events on transparent areas within the iframe are managed dynamically to allow users to interact with background visuals.

### 2. Compact Border-Bound Mode
Slightly size the visual container (e.g., $280 \times 180\text{ px}$) and position the trigger in one corner (e.g., top-left). The Markdown tooltip will render inside this container below or to the side of the trigger. Clicks on the transparent parts of the container may intercept background elements, but this behavior is limited to the visual's boundaries.

### 3. Dynamic DAX Measure Tooltip (Zero-Space Fallback)
If you prefer a visual that takes up only $24 \times 24\text{ px}$ without blocking any element, you can bind a DAX measure to the **Tooltip Measure** field. The visual will render the trigger, and hovering over it will invoke the native Power BI tooltips API (which is rendered in the parent DOM outside the iframe sandbox) displaying the measure's string content. *Note: Native Power BI tooltips do not support HTML/CSS or rich Markdown formatting.*

---

## Core Features

- **Rich Markdown Elements**: Full support for Headings (`#`), Bold (`**`), Italics (`*`), Bullet Lists, Numbered Lists, Hyperlinks, inline Code, Images, GIFs, and Markdown Tables.
- **Security & Sanitization**: Built-in HTML sanitization engine powered by `DOMParser` recursively sweeps elements, stripping out `<script>`, `<iframe>`, event listeners (`on*`), and `javascript:` URIs to ensure compliance with enterprise security.
- **Trigger Versatility**:
  - **Icon**: Render an info symbol `ℹ` or any Unicode char.
  - **Text**: Custom descriptive labels (e.g., "See notes").
  - **Icon + Text**: Inline combo.
  - **Transparent Block**: An invisible overlay block.
- **Animations**: Soft transition animations (Fade, Slide, Scale) with custom speed duration (in ms).
- **Auto-Positioning**: Smart coordinate computation flips the tooltip direction (Top, Bottom, Left, Right) to keep it inside the screen viewport.
- **Hyperlink Redirection**: Clicking markdown links intercepts normal routing and safely triggers the official `host.launchUrl(url)` method.
- **Accessibility**:
  - Supports keyboard Tab focus and activation (Enter/Space).
  - Press `Escape` to close tooltips.
  - Screen-reader labels (`aria-expanded`, `aria-label`, `role="tooltip"`).
  - High Contrast mode support via system colors (`forced-colors: active`).

---

## Formatting Pane Settings

### Trigger Settings
- **Trigger Type**: Choose between `Icon`, `Text`, `Icon + Text`, or `Transparent Block`.
- **Trigger Text**: Text content for labels (default: "Details").
- **Icon Symbol / Text**: Unicode symbol or character (default: `ℹ`).
- **Icon/Text Size**: Font size of the trigger element in pixels.
- **Color**: Text and icon fill color.
- **Background Color**: Background behind the trigger.
- **Border Color & Width**: Configure solid borders around the trigger.

### Tooltip Settings
- **Markdown Content**: Enter static Markdown text.
- **Width**: Width of the tooltip panel in pixels (default: `280px`).
- **Maximum Height**: Restricts tooltip height; taller content will show a premium scrollbar (default: `300px`).
- **Colors**: Separate fill pickers for tooltip background, text, and borders.
- **Border Radius**: Roundness of tooltip corners in pixels.
- **Shadow**: Toggle soft drop shadows on/off.
- **Font Settings**: Customize font family and size (in points).
- **Padding**: Internal padding around tooltip text in pixels.
- **Placement**: Select `Auto`, `Top`, `Right`, `Bottom`, or `Left`.
- **Offsets**: Fine-tune X/Y distance from the trigger.
- **Show Close Button**: Render an `×` close button (for click trigger mode).
- **Open Behavior**: Open on `Hover` or `Click`.
- **Animations**: Transition types (`None`, `Fade`, `Slide`, `Scale`) and custom durations.
- **Z-Index**: Configure depth sorting inside the iframe layer.

---

## Developer Guide & Build Instructions

### Prerequisites
Make sure you have Node.js and NPM installed. The Power BI Visuals CLI should be installed globally:
```bash
npm install -g powerbi-visuals-tools
```

### Installation
Restore project node packages:
```bash
npm install
```

### Running Locally
To test the visual in Power BI Service:
1. Start the visual server:
   ```bash
   pbiviz start
   ```
2. Open a report in Power BI Service (app.powerbi.com), click Edit, and add the **Developer Visual** from the visualizations pane.
3. Configure settings to test live updates.

### Creating the `.pbiviz` Package
To bundle the project for distribution (importing into Power BI Desktop or Service):
```bash
pbiviz package
```
This generates a compiled package file inside the `dist/` directory:
- `dist/betterTooltips.1.0.0.0.pbiviz`

You can import this file directly into any Power BI report by selecting **Import a visual from a file** in the visualizations pane.
