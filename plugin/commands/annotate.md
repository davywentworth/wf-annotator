# /wf-annotator:annotate

Generate a visual HTML wireframe from a description or plan document, then open an interactive browser UI for annotation. Loop until approved, then save the result.

## Usage

```
/wf-annotator:annotate [description | path/to/plan.md]
```

If no argument is given, ask the user what they want to wireframe.

---

## Step 1 — Set up the session

Derive a session slug from the input:
- If the argument is a file path like `plans/2026-04-29-dashboard/brainstorm.md`, the slug is `2026-04-29-dashboard`
- If the argument is a freetext description, derive a short kebab-case slug from it (e.g. "mobile settings screen" → `2026-04-29-mobile-settings-screen`) using today's date as the prefix

Create the session directory:
```bash
mkdir -p plans/<slug>
```

Check for an existing session:
```bash
ls plans/<slug>/wf-annotator-session.json 2>/dev/null
```

If found, read it and resume from the last wireframe version (skip to step 4 with N = wireframeVersion + 1, using the existing wireframe as the "previous" version). Tell the user: "Resuming wf-annotator session at version N."

---

## Step 2 — Generate the wireframe (first round only)

Generate a self-contained HTML wireframe from the input. Rules:

**Format:**
- Self-contained HTML file, Tailwind CDN only, no external assets, no JS frameworks
- Single file, no build step
- Wireframe aesthetic: gray palette (`gray-100` to `gray-500`), no real colors or photography

**Content:**
- **Real content** for load-bearing elements: nav labels, headings, button copy, form labels, card titles
- **Lorem ipsum** for body paragraphs and descriptive text blocks

**Semantic labeling — required:**
Every meaningful element must have a stable `id` attribute:
```html
<nav id="nav-primary">...</nav>
<section id="hero">...</section>
<article id="card-product-1">...</article>
```

IDs are permanent — never reuse an ID, even if the element it belonged to is removed in a future revision.

**MANIFEST comment — required:**
Place a machine-readable comment as the first child of `<body>`:
```html
<!-- MANIFEST
nav#nav-primary: Primary navigation
section#hero: Hero / headline area
article#card-product-1: Product card (repeating)
footer#footer: Footer
-->
```

---

## Step 3 — Write the wireframe file

```bash
# Write wireframe HTML to the session directory
cat > plans/<slug>/wireframe-v<N>.html << 'WIREFRAME_EOF'
<the generated HTML>
WIREFRAME_EOF
```

Save the session state:
```bash
cat > plans/<slug>/wf-annotator-session.json << 'EOF'
{
  "wireframeVersion": <N>,
  "source": "<description or file path>",
  "wireframePath": "plans/<slug>/wireframe-v<N>.html",
  "annotationHistory": []
}
EOF
```

---

## Step 4 — Run the annotation server

First, locate the binary. `$CLAUDE_PLUGIN_ROOT` is only set in hook commands, not in Bash tool calls, so derive the path explicitly:

```bash
_wf="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/scripts/wf-annotator}"
if [ -z "$_wf" ]; then
  _wf=$(find ~/.claude/plugins/cache -maxdepth 6 -name "wf-annotator" -path "*/scripts/wf-annotator" 2>/dev/null | head -1)
fi
if [ -z "$_wf" ]; then
  echo "wf-annotator not found. Run: /plugin install davywentworth/wf-annotator" >&2
  exit 1
fi
```

**First round (N = 1):**
```bash
result=$("$_wf" serve --wireframe plans/<slug>/wireframe-v1.html --version 1 --port 7823)
```

**Subsequent rounds (N ≥ 2, shows diff view):**
```bash
result=$("$_wf" serve \
  --wireframe plans/<slug>/wireframe-v<N>.html \
  --previous plans/<slug>/wireframe-v<N-1>.html \
  --annotations plans/<slug>/annotations-v<N-1>.json \
  --version <N> \
  --port 7823)
```

The server opens the browser and blocks. When the user submits or approves, `$result` is JSON printed to stdout.

---

## Step 5 — Handle the result

Parse `$result`:

**If `"approved": true`:** go to **Step 6 — Approve**.

**Otherwise** (annotations submitted):

1. Save annotations:
```bash
echo '$result' > plans/<slug>/annotations-v<N>.json
```

2. Update the session file's `annotationHistory` by appending the new annotations object.

3. Read the annotations and generate a revised wireframe (version N+1):
   - Apply `comment` annotations: modify the annotated element based on the note text (e.g. "CTA should be higher" → move the CTA element earlier in the DOM)
   - Apply `move` annotations: use `target.selector + target.position` (drop on element) or `direction + magnitude` (drop on empty space) to reorder elements
   - Apply `general` annotations: make overall structural changes
   - Preserve all existing element IDs; only retire an ID if the element is truly deleted
   - Update the MANIFEST to reflect added/removed elements

4. Increment N and go back to **Step 3**.

---

## Step 6 — Approve

1. Copy the final wireframe as the canonical approved file:
```bash
cp plans/<slug>/wireframe-v<N>.html plans/<slug>/wireframe.html
```

2. If the input was a plan `.md` file, append a wireframe reference to it:
```bash
echo "" >> <plan-file>
echo "<!-- wireframe: plans/<slug>/wireframe.html -->" >> <plan-file>
```

3. Clean up the session file:
```bash
rm plans/<slug>/wf-annotator-session.json
```

4. Tell the user: "Wireframe approved and saved to `plans/<slug>/wireframe.html`."

---

## Notes

- If `$CLAUDE_PLUGIN_ROOT` is not set, remind the user to install the plugin: `/plugin install wf-annotator@davywentworth`
- If port 7823 is in use, try `--port 7824` (increment until free)
- Annotation revision is Claude's judgment — treat annotation notes as intent, not literal DOM surgery
- The diff view is automatic when `--previous` is passed; no extra steps needed
