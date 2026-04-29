export function parseManifest(html) {
  if (!html) return {};
  const match = html.match(/<!--\s*MANIFEST\s*\n([\s\S]*?)-->/);
  if (!match) return {};
  const map = {};
  for (const line of match[1].trim().split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const selector = line.slice(0, colonIdx).trim();
    const label = line.slice(colonIdx + 1).trim();
    const idMatch = selector.match(/#([^\s.#:[\]]+)/);
    if (idMatch) map[idMatch[1]] = label;
  }
  return map;
}
