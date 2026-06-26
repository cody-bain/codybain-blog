// Server-only: uses astro:content, fs, path.
// Do NOT import this in React components.
import { getCollection } from 'astro:content';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import type { StrengthSession, LiftData, SetEntry } from './strengthTypes';

export { convertWeight, aggregateWeeklyVolume, kgToLbs, lbsToKg } from './strengthTypes';
export type { StrengthSession, LiftData, SetEntry, WeeklyVolume } from './strengthTypes';

export const TRACKED_LIFTS = [
  'Snatch',
  'Clean & Jerk',
  'Clean',
  'Jerk',
  'Power Snatch',
  'Power Clean',
  'Back Squat',
  'Front Squat',
  'Overhead Squat',
  'Snatch Balance',
  'Push Press',
] as const;

export type LiftName = typeof TRACKED_LIFTS[number];

export function liftToSlug(lift: string): string {
  return lift.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function slugToLift(slug: string): string | undefined {
  return TRACKED_LIFTS.find(l => liftToSlug(l) === slug);
}

// ────────────────────────────────────────────────
// PR types
// ────────────────────────────────────────────────

export interface PR {
  lift: string;
  weight: number;
  unit: 'lbs' | 'kg';
  date: string;
}

// ────────────────────────────────────────────────
// Parsing helpers
// ────────────────────────────────────────────────

interface RawStrengthMeta {
  lift?: string;
  unit?: string;
  sets?: string | string[];
}

const STRENGTH_REGEX = /```strength\n([\s\S]*?)```/g;

function parseSets(raw: string | string[]): SetEntry[] {
  const entries: SetEntry[] = [];
  const items = Array.isArray(raw) ? raw.map(String) : String(raw).split(',');
  for (const item of items) {
    const trimmed = item.trim();
    const m = trimmed.match(/^([\d.]+)[xX]([\d]+)$/);
    if (m) {
      entries.push({ weight: parseFloat(m[1]), reps: parseInt(m[2], 10) });
    } else {
      const w = parseFloat(trimmed);
      if (!isNaN(w)) entries.push({ weight: w, reps: 1 });
    }
  }
  return entries;
}

export function parseStrengthBlock(raw: string): { description?: string; meta: RawStrengthMeta } {
  const sepIdx = raw.search(/^---\s*$/m);
  if (sepIdx !== -1) {
    const description = raw.slice(0, sepIdx).trim();
    const yamlPart = raw.slice(sepIdx + 4).trim();
    let meta: RawStrengthMeta = {};
    try { meta = yaml.load(yamlPart) as RawStrengthMeta; } catch {}
    return { description: description || undefined, meta };
  }
  let meta: RawStrengthMeta = {};
  try { meta = yaml.load(raw) as RawStrengthMeta; } catch {}
  return { meta };
}

// ────────────────────────────────────────────────
// PR loader
// ────────────────────────────────────────────────

export function loadPRs(): PR[] {
  const prPath = path.resolve('src/data/prs.yaml');
  if (!fs.existsSync(prPath)) return [];
  try {
    const raw = yaml.load(fs.readFileSync(prPath, 'utf-8'));
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (r): boolean =>
          r &&
          typeof r.lift === 'string' &&
          typeof r.weight === 'number' &&
          (r.unit === 'lbs' || r.unit === 'kg') &&
          (typeof r.date === 'string' || r.date instanceof Date)
      )
      .map(r => ({
        ...r,
        // js-yaml parses bare YYYY-MM-DD values as Date objects — normalize to string
        date: r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : r.date,
      })) as PR[];
  } catch {
    return [];
  }
}

export function activePR(prs: PR[], lift: string, sessionDate: string): PR | undefined {
  return prs
    .filter(pr => pr.lift === lift && pr.date <= sessionDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// ────────────────────────────────────────────────
// Database builder
// ────────────────────────────────────────────────

export async function buildStrengthDb(): Promise<LiftData[]> {
  const posts = await getCollection('posts');
  posts.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

  const prs = loadPRs();
  const liftMap = new Map<string, StrengthSession[]>();

  for (const post of posts) {
    const dateStr = post.data.date.toISOString().split('T')[0];
    const matches = [...(post.body ?? '').matchAll(STRENGTH_REGEX)];

    for (const match of matches) {
      const { description, meta } = parseStrengthBlock(match[1]);
      if (!meta.lift) continue;

      const lift = meta.lift;
      const unit: 'lbs' | 'kg' = meta.unit === 'kg' ? 'kg' : 'lbs';
      const sets = meta.sets ? parseSets(meta.sets) : [];

      if (sets.length === 0) continue;

      const madeSets = sets.filter(s => s.reps > 0);
      if (madeSets.length === 0) continue;
      const topSet = Math.max(...madeSets.map(s => s.weight));
      const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);

      const pr = activePR(prs, lift, dateStr);
      let pct1rm: number | undefined;
      if (pr) {
        const prWeight = pr.unit === unit
          ? pr.weight
          : pr.unit === 'kg'
            ? pr.weight * 2.20462
            : pr.weight / 2.20462;
        pct1rm = Math.round((topSet / prWeight) * 100);
      }

      const session: StrengthSession = {
        date: dateStr,
        postSlug: post.id,
        lift,
        unit,
        description,
        sets,
        topSet,
        totalVolume,
        totalReps,
        pct1rm,
      };

      if (!liftMap.has(lift)) liftMap.set(lift, []);
      liftMap.get(lift)!.push(session);
    }
  }

  return Array.from(liftMap.entries()).map(([lift, sessions]) => ({
    lift,
    slug: liftToSlug(lift),
    sessions,
  }));
}
