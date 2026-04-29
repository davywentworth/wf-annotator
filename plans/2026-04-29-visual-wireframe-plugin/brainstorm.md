# wf-annotator — Brainstorm

**Date**: 2026-04-29  
**Type**: Claude Code plugin (cross-project, lives in `davywentworth/wf-annotator`)

---

## What it is

A Claude Code plugin that generates visual HTML wireframes and lets you annotate them in a browser UI. Annotations flow back to Claude for revision. Loop continues until approved. The approved wireframe is persisted alongside the plan doc so `/implement` can reference it.

Inspired by plannotator, but for visual artifacts rather than markdown text.

---

## Core Flow

1. User invokes `/wf-annotator:annotate [description | path/to/plan.md]` — either manually, or triggered automatically as part of a `/brainstorm` or `/interview` workflow
2. Input is most likely a plan doc; freetext descriptions are also supported
3. Claude generates a self-contained HTML wireframe from the input
4. Plugin writes wireframe to temp, starts local server (`bin/wf-annotator serve`)
5. Browser opens: wireframe rendered in Shadow DOM, annotation layer on top
6. User annotates visually → submits
7. Server captures annotations as JSON → unblocks Claude
8. Claude revises wireframe → diff view shown → repeat
9. User hits **Approve** → wireframe saved to `plans/<date>-<topic>/wireframe.html`, plan doc updated to reference it

### Session resumption

If the session is interrupted (network drop, `/clear`, system restart), the plugin saves state to `plans/<date>-<topic>/wf-annotator-session.json` after each round:

```json
{
  "wireframeVersion": 2,
  "source": "path/to/plan.md",
  "wireframePath": "plans/.../wireframe-v2.html",
  "annotationHistory": [...]
}
```

On next invocation with the same plan path, the plugin detects the session file and resumes from the last saved wireframe version, showing the diff view for context. Mirrors how `/interview` uses `discussion.log` and `/brainstorm` uses the written doc as its resume point.

---

## Wireframe Generation

Claude generates the wireframe from either a freetext description or a plan `.md` file. Both trigger the same generation step.

### Output format

- Self-contained HTML, Tailwind CDN only, no external assets
- No JS frameworks in the initial version; interactive JS may be embedded in future iterations for richer prototyping
- One file, no build step

### Content rules

- **Real content** for load-bearing elements: headings, nav labels, button copy, form labels, card titles
- **Lorem ipsum** for body paragraphs and descriptive text blocks
- Wireframe aesthetic: intentionally rough, gray palette, no real colors or imagery
- Mobile wireframes supported — specify in the description or plan (e.g. "wireframe a mobile settings screen")

### Semantic labeling

Every meaningful element gets a stable `id` for annotation targeting — IDs preferred over classes, uniqueness required. Claude preserves these across iterations. IDs are never reused — if an element is deleted, its ID is retired permanently. A new element added later must receive a fresh ID, even if it serves the same role.

```html
<nav id="nav-primary">...</nav>
<section id="hero">...</section>
<article id="card-product-1">...</article>
```

### Element manifest

A machine-readable comment at the top of the HTML enumerates all annotatable elements. The annotation layer reads this to build the panel without walking the full DOM.

```html
<!-- MANIFEST
nav#nav-primary: Primary navigation
section#hero: Hero / headline area
article#card-product-1: Product card (repeating)
footer#footer: Footer
-->
```

---

## Annotation UI

### Rendering

The wireframe is rendered inside a **Shadow DOM** — not an iframe. Shadow DOM provides CSS isolation without cross-origin click interception. The annotation layer injects event listeners directly onto wireframe elements.

### Interaction model

| Gesture | Effect |
|---|---|
| Hover element | Thin blue ring highlight |
| Click element | Comment input anchored to element |
| Drag element | Ghost preview follows cursor; element snaps back on drop; move annotation created |
| Click "Add general note" | Unanchored annotation added to panel |

### Annotation types

**1. comment** — element-anchored

```json
{ "type": "comment", "selector": "#hero", "label": "Hero", "note": "CTA should be higher" }
```

**2. move** — drag-based, two sub-forms depending on drop target

Magnitude uses nudge-level language derived from drag distance: `"nudge"` (small), `"shift"` (medium), `"far"` (large).

Drop on element:
```json
{
  "type": "move",
  "element": { "selector": "#sidebar", "label": "Sidebar" },
  "target": { "selector": "#header", "position": "after" },
  "magnitude": "shift"
}
```

Drop on empty space (direction + magnitude derived from drag vector):
```json
{
  "type": "move",
  "element": { "selector": "#sidebar", "label": "Sidebar" },
  "direction": "right",
  "magnitude": "far"
}
```

**3. general** — top-level, unanchored

```json
{ "type": "general", "note": "Nav feels too heavy overall" }
```

### Annotation panel (right sidebar)

- "Add general note" button at top
- Annotation cards in order: type badge, element label, content, delete button
- `general` annotations appear first
- Submit button at bottom (disabled until ≥1 annotation exists)
- Approve button at bottom — discards any pending unsent annotations; shows confirmation popup: *"This will discard your current annotations and approve the wireframe. Proceed?"*

---

## Revision Loop

On submit, Claude receives:

```json
{
  "wireframeVersion": 1,
  "source": "description | plan",
  "annotations": [
    { "type": "general", "note": "Nav feels too heavy" },
    { "type": "comment", "selector": "#hero", "label": "Hero", "note": "CTA should be higher" },
    {
      "type": "move",
      "element": { "selector": "#sidebar", "label": "Sidebar" },
      "target": { "selector": "#header", "position": "after" },
      "magnitude": "shift"
    }
  ]
}
```

Claude revises the wireframe and the browser shows a **diff view**:
- Previous version (left) and new version (right) with changed elements highlighted
- A draggable center divider — dragging it adjusts zoom level on each side rather than causing reflow
- Previous-round annotations shown faded on the left for context
- Loop repeats until Approve

On Approve:
- Final wireframe written to `plans/<date>-<topic>/wireframe.html`
- Plan doc updated to reference the wireframe
- Session file cleaned up
- Claude unblocked to proceed

---

## Tech Stack

| Component | Choice |
|---|---|
| Browser app | React + Vite, pre-built into `app/dist/` |
| Local server | Node.js script in `bin/wf-annotator` (no separate install) |
| Server transport | WebSocket (annotation submit) + static file serving |
| Claude integration | `Bash(wf-annotator:*)` — server prints annotations as JSON to stdout |

---

## Plugin Structure

```
wf-annotator/
  .claude-plugin/
    plugin.json
  commands/
    annotate.md          ← /wf-annotator:annotate slash command
  bin/
    wf-annotator         ← Node.js server (added to PATH by plugin)
  app/
    src/                 ← React + Vite source
    dist/                ← pre-built, bundled with plugin
```

---

## Distribution

- GitHub repo: `davywentworth/wf-annotator`
- Plugin marketplace pattern (same as plannotator)
- No separate binary install — server is bundled in `bin/`
- Users install with:
  ```
  /plugin marketplace add davywentworth/wf-annotator
  /plugin install wf-annotator@wf-annotator
  ```

---

## Out of Scope

- Free-form element repositioning (drag = annotation intent, not DOM mutation)
- Annotating existing screenshots or Figma exports (generation only)
- Sharing wireframes externally
