# wf-annotator — Brainstorm

**Date**: 2026-04-29  
**Type**: Claude Code plugin (cross-project, lives in `claude-skills`)

---

## What it is

A Claude Code plugin that generates visual HTML wireframes and lets you annotate them in a browser UI. Annotations flow back to Claude for revision. Loop continues until approved. The approved wireframe is persisted alongside the plan doc so `/implement` can reference it.

Inspired by plannotator, but for visual artifacts rather than markdown text.

---

## Core Flow

1. User runs `/wireframe [description | path/to/plan.md]`
2. Claude reads input and generates a self-contained HTML wireframe
3. Plugin writes wireframe to temp, starts local server (`bin/wireframe serve`)
4. Browser opens: wireframe rendered in Shadow DOM, annotation layer on top
5. User annotates visually → submits
6. Server captures annotations as JSON → unblocks Claude
7. Claude revises wireframe → diff view shown → repeat
8. User hits **Approve** → wireframe saved to `plans/<date>-<topic>/wireframe.html`, plan doc updated to reference it

---

## Wireframe Generation

Claude generates the wireframe from either a freetext description or a plan `.md` file. Both trigger the same generation step.

### Output format

- Self-contained HTML, Tailwind CDN only, no external assets, no JS frameworks
- One file, no build step

### Content rules

- **Real content** for load-bearing elements: headings, nav labels, button copy, form labels, card titles
- **Lorem ipsum** for body paragraphs and descriptive text blocks
- Wireframe aesthetic: intentionally rough, gray palette, no real colors or imagery

### Semantic labeling

Every meaningful element gets a stable `id` or `class` for annotation targeting. Selectors must survive revisions — Claude preserves these across iterations.

```html
<nav id="nav-primary">...</nav>
<section id="hero">...</section>
<div class="card-product">...</div>
```

### Element manifest

A machine-readable comment at the top of the HTML enumerates all annotatable elements. The annotation layer reads this to build the panel without walking the full DOM.

```html
<!-- MANIFEST
nav#nav-primary: Primary navigation
section#hero: Hero / headline area
div.card-product: Product card (repeating)
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

Drop on element:
```json
{
  "type": "move",
  "element": { "selector": "#sidebar", "label": "Sidebar" },
  "target": { "selector": "#header", "position": "after" }
}
```

Drop on empty space (direction derived from drag vector):
```json
{
  "type": "move",
  "element": { "selector": "#sidebar", "label": "Sidebar" },
  "direction": "right"
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
- Approve button at bottom (bypasses further annotation, accepts current wireframe)

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
    { "type": "move", "element": { "selector": "#sidebar", "label": "Sidebar" }, "target": { "selector": "#header", "position": "after" } }
  ]
}
```

Claude revises the wireframe and the browser shows a **diff view**:
- Previous version (left) with faded previous-round annotations for context
- New version (right) with changed elements highlighted
- Loop repeats until Approve

On Approve:
- Final wireframe written to `plans/<date>-<topic>/wireframe.html`
- Plan doc updated to reference the wireframe
- Claude unblocked to proceed

---

## Tech Stack

| Component | Choice |
|---|---|
| Browser app | React + Vite, pre-built into `app/dist/` |
| Local server | Node.js script in `bin/wireframe` (no separate install) |
| Server transport | WebSocket (annotation submit) + static file serving |
| Claude integration | `Bash(wireframe:*)` — server prints annotations as JSON to stdout |

---

## Plugin Structure

```
wf-annotator/
  .claude-plugin/
    plugin.json
  commands/
    wireframe.md         ← /wireframe slash command
  bin/
    wireframe            ← Node.js server (added to PATH by plugin)
  app/
    src/                 ← React + Vite source
    dist/                ← pre-built, bundled with plugin
```

---

## Distribution

- GitHub repo: `<owner>/wf-annotator`
- Plugin marketplace pattern (same as plannotator)
- No separate binary install — server is bundled in `bin/`
- Users install with:
  ```
  /plugin marketplace add <owner>/wf-annotator
  /plugin install wf-annotator@wf-annotator
  ```

---

## Out of Scope

- Free-form element repositioning (drag = annotation intent, not DOM mutation)
- Annotating existing screenshots or Figma exports (generation only)
- Sharing wireframes externally
- Mobile annotation UI
