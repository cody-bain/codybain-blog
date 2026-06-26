import { getCollection } from 'astro:content';
import yaml from 'js-yaml';

export interface Performance {
  date: string;
  score?: string | string[];
  postSlug: string;
  distance?: number; // meters
}

export interface Workout {
  name: string;
  slug: string;
  description?: string;
  type?: string;
  movements: string[];
  equipment: string[];
  performances: Performance[];
}

export interface DistanceStats {
  movement: string;
  lifetime: number; // meters
  month: number;    // meters
  week: number;     // meters
}

interface RawMetcon {
  name?: string;
  type?: string;
  score?: string | string[];
  movements?: string[];
  equipment?: string[];
  'distance (m)'?: number;
}

const METCON_REGEX = /```(?:metcon|conditioning)\n([\s\S]*?)```/g;

export const MONO_MOVEMENTS = ['Bike Erg', 'Row', 'Run'] as const;

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function parseMetconBlock(raw: string): { description?: string; meta: RawMetcon } {
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

export function normaliseScore(raw: string | string[] | undefined): string | string[] | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw);
}

export async function buildWorkoutsDb(): Promise<Workout[]> {
  const posts = await getCollection('posts');
  posts.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

  const workoutsMap = new Map<string, Workout>();
  const unnamedPerDate = new Map<string, number>();

  for (const post of posts) {
    const dateStr = post.data.date.toISOString().split('T')[0];
    const matches = [...(post.body ?? '').matchAll(METCON_REGEX)];

    for (const match of matches) {
      const { description, meta } = parseMetconBlock(match[1]);

      let name: string;
      let slug: string;
      if (meta.name) {
        name = meta.name;
        slug = toSlug(name);
      } else {
        const count = (unnamedPerDate.get(dateStr) ?? 0) + 1;
        unnamedPerDate.set(dateStr, count);
        name = count === 1 ? dateStr : `${dateStr}-${count}`;
        slug = toSlug(name);
      }

      const performance: Performance = {
        date: dateStr,
        score: normaliseScore(meta.score),
        postSlug: post.id,
        distance: typeof meta['distance (m)'] === 'number' ? meta['distance (m)'] : undefined,
      };

      if (workoutsMap.has(slug)) {
        const existing = workoutsMap.get(slug)!;
        existing.performances.push(performance);
        if (!existing.description && description) existing.description = description;
      } else {
        workoutsMap.set(slug, {
          name,
          slug,
          description,
          type: meta.type,
          movements: meta.movements ?? [],
          equipment: meta.equipment ?? [],
          performances: [performance],
        });
      }
    }
  }

  return Array.from(workoutsMap.values()).sort((a, b) => {
    const aLatest = a.performances[a.performances.length - 1]?.date ?? '';
    const bLatest = b.performances[b.performances.length - 1]?.date ?? '';
    return bLatest.localeCompare(aLatest);
  });
}

const TRACKING_START = '2026-05-18';

export function aggregateDistances(workouts: Workout[]): DistanceStats[] {
  const today = new Date();
  const monthPrefix = today.toISOString().slice(0, 7); // YYYY-MM
  const dow = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekStartStr = weekStart.toISOString().split('T')[0];

  return MONO_MOVEMENTS.map(movement => {
    let lifetime = 0, month = 0, week = 0;
    for (const w of workouts) {
      if (!w.movements.includes(movement)) continue;
      for (const p of w.performances) {
        if (p.distance == null) continue;
        if (p.date < TRACKING_START) continue;
        lifetime += p.distance;
        if (p.date.startsWith(monthPrefix)) month += p.distance;
        if (p.date >= weekStartStr) week += p.distance;
      }
    }
    return { movement, lifetime, month, week };
  });
}
