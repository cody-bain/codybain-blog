import { visit } from 'unist-util-visit';
import yaml from 'js-yaml';
import path from 'path';
import type { Root, Code } from 'mdast';

interface RawMetcon {
  name?: string;
  score?: string | string[];
  type?: string;
  movements?: string[];
  equipment?: string[];
  'distance (m)'?: number;
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseBlock(raw: string): { description?: string; meta: RawMetcon } {
  const sepIdx = raw.search(/^---\s*$/m);
  if (sepIdx !== -1) {
    const description = raw.slice(0, sepIdx).trim();
    const yamlPart = raw.slice(sepIdx + 4).trim();
    let meta: RawMetcon = {};
    try { meta = yaml.load(yamlPart) as RawMetcon; } catch {}
    return { description: description || undefined, meta };
  }
  let meta: RawMetcon = {};
  try { meta = yaml.load(raw) as RawMetcon; } catch {}
  return { meta };
}

export function remarkMetcon() {
  return (tree: Root, vfile: any) => {
    const rawPath = vfile?.path ?? vfile?.history?.[0] ?? vfile?.stem ?? '';
    const filename = path.basename(rawPath, path.extname(rawPath));
    const fallbackDate = /^\d{4}-\d{2}-\d{2}/.test(filename) ? filename : '';
    visit(tree, 'code', (node: Code, index, parent) => {
      if ((node.lang !== 'metcon' && node.lang !== 'conditioning') || !parent || index === undefined) return;

      const { description, meta } = parseBlock(node.value);
      const name = meta.name ?? '';
      const slug = name ? toSlug(name) : toSlug(fallbackDate);
      const movements: string[] = meta.movements ?? [];
      const equipment: string[] = meta.equipment ?? [];

      const displayName = name || fallbackDate;
      const nameHtml = slug
        ? `<a href="/workouts/${slug}" style="font-weight:600;color:#e8c547;font-size:1.05rem;text-decoration:none;">${escapeHtml(displayName)}</a>`
        : `<span style="font-weight:600;color:#e8c547;font-size:1.05rem;">${escapeHtml(displayName)}</span>`;

      const scoreLines = meta.score == null ? [] : Array.isArray(meta.score) ? meta.score.map(String) : [String(meta.score)];
      const scoreHtml = scoreLines.length
        ? `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem;">${scoreLines.map(s => `<span style="font-family:'JetBrains Mono',monospace;font-size:0.9rem;color:#e8c547;background:rgba(232,197,71,0.1);padding:0.2em 0.6em;border-radius:3px;white-space:nowrap;">${escapeHtml(s)}</span>`).join('')}</div>`
        : '';

      const descHtml = description
        ? `<pre style="font-family:'JetBrains Mono',monospace;font-size:0.95rem;line-height:1.6;color:#e0e0e0;background:#0f0f0f;border-left:3px solid #e8c547;padding:0.75rem 1rem;border-radius:0 4px 4px 0;margin:0.75rem 0 0.85rem;white-space:pre-wrap;word-break:break-word;">${escapeHtml(description)}</pre>`
        : '';

      const typeTag = meta.type
        ? `<span style="display:inline-block;background:rgba(91,79,207,0.15);border:1px solid rgba(91,79,207,0.35);color:#9b8fef;font-size:0.75rem;padding:0.2em 0.6em;border-radius:3px;">${escapeHtml(meta.type)}</span>`
        : '';

      const tagsHtml = typeTag + [...movements, ...equipment]
        .map(t => `<span style="display:inline-block;background:#0f0f0f;border:1px solid #2a2a2a;color:#888;font-size:0.75rem;padding:0.2em 0.6em;border-radius:3px;">${escapeHtml(t)}</span>`)
        .join(' ');

      const html = `<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:1rem 1.25rem;margin:1rem 0;">
  <div style="display:flex;justify-content:space-between;align-items:center;">${nameHtml}${scoreHtml}</div>${descHtml}<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">${tagsHtml}</div>
</div>`;

      parent.children.splice(index, 1, { type: 'html', value: html });
    });
  };
}
