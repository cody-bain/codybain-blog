import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { remarkMetcon } from './plugins/remarkMetcon.ts';
import remarkBreaks from 'remark-breaks';
import { visit } from 'unist-util-visit';
import yaml from 'js-yaml';
import path from 'path';

// Inlined strength plugin — bypasses any module cache
function remarkStrength() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'strength' || !parent || index === undefined) return;

      const raw = node.value;
      const sepIdx = raw.search(/^---\s*$/m);
      let description, meta = {};
      if (sepIdx !== -1) {
        description = raw.slice(0, sepIdx).trim() || undefined;
        try { meta = yaml.load(raw.slice(sepIdx + 4).trim()) ?? {}; } catch {}
      } else {
        try { meta = yaml.load(raw) ?? {}; } catch {}
      }

      const lift = meta.lift ?? '';
      const unit = meta.unit ?? 'lbs';
      const slug = lift ? lift.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';

      const parseSets = (s) => {
        const items = Array.isArray(s) ? s.map(String) : String(s).split(',');
        return items.flatMap(item => {
          const t = item.trim();
          const m = t.match(/^([\d.]+)[xX]([\d]+)$/);
          if (m) return [{ weight: parseFloat(m[1]), reps: parseInt(m[2]) }];
          const w = parseFloat(t);
          return isNaN(w) ? [] : [{ weight: w, reps: 1 }];
        });
      };
      const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const sets = meta.sets ? parseSets(meta.sets) : [];
      const madeSets = sets.filter(s => s.reps > 0);
      const topSet = madeSets.length ? Math.max(...madeSets.map(s => s.weight)) : null;

      const movementHtml = (description || lift)
        ? `<div style="font-size:1rem;font-weight:600;color:#e8c547;line-height:1.4;margin-bottom:0.6rem;">${esc(description || lift)}</div>`
        : '';

      const noteHtml = meta.note
        ? `<pre style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;color:#888;line-height:1.6;margin:0 0 0.65rem;white-space:pre-wrap;word-break:break-word;">${esc(String(meta.note).trim())}</pre>`
        : '';

      const setsHtml = sets.length
        ? `<div style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#ccc;display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.75rem;">${sets.map(s => `<span>${s.weight}${esc(unit)}×${s.reps}</span>`).join('<span style="color:#444;margin:0 0.1rem;">·</span>')}</div>`
        : '';

      const liftTagHtml = lift
        ? `<a href="/strength/${slug}" class="strength-lift-tag">${esc(lift)}</a>`
        : '';

      const html = `<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:1rem 1.25rem;margin:1rem 0;">${movementHtml}${noteHtml}${setsHtml}${liftTagHtml}</div>`;

      parent.children.splice(index, 1, { type: 'html', value: html });
    });
  };
}

export default defineConfig({
  integrations: [react()],
  site: 'https://codybain.com',
  markdown: {
    remarkPlugins: [remarkBreaks, remarkMetcon, remarkStrength],
  },
});
