// Client-safe types and pure utility functions for strength tracking.
// No Node.js or astro:content imports — safe to use in React islands.

export interface SetEntry {
  weight: number;
  reps: number;
}

export interface StrengthSession {
  date: string;       // YYYY-MM-DD
  postSlug: string;
  lift: string;
  unit: 'lbs' | 'kg';
  description?: string;
  sets: SetEntry[];
  topSet: number;
  totalVolume: number;
  totalReps: number;
  pct1rm?: number;    // % of active 1RM at session date (0-100)
}

export interface LiftData {
  lift: string;
  slug: string;
  sessions: StrengthSession[];
}

export interface WeeklyVolume {
  week: string;
  weekLabel: string;
  volume: number;
  reps: number;
}

// ── Unit conversion ──────────────────────────────────────────────────────────

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

export function convertWeight(weight: number, from: 'lbs' | 'kg', to: 'lbs' | 'kg'): number {
  if (from === to) return weight;
  return from === 'lbs' ? lbsToKg(weight) : kgToLbs(weight);
}

// ── Weekly volume aggregation ────────────────────────────────────────────────

function getISOWeek(dateStr: string): { year: number; week: number } {
  const d = new Date(dateStr + 'T12:00:00');
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d.getTime() - startOfWeek1.getTime();
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { year: d.getFullYear(), week };
}

function getMondayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function aggregateWeeklyVolume(
  sessions: StrengthSession[],
  displayUnit: 'lbs' | 'kg'
): WeeklyVolume[] {
  const weekMap = new Map<string, WeeklyVolume>();

  for (const s of sessions) {
    const { year, week } = getISOWeek(s.date);
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    const vol = s.sets.reduce((sum, set) => {
      const w = convertWeight(set.weight, s.unit, displayUnit);
      return sum + w * set.reps;
    }, 0);

    if (!weekMap.has(key)) {
      weekMap.set(key, { week: key, weekLabel: getMondayLabel(s.date), volume: 0, reps: 0 });
    }
    const entry = weekMap.get(key)!;
    entry.volume = Math.round(entry.volume + vol);
    entry.reps += s.totalReps;
  }

  return Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week));
}
