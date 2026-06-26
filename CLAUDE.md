# CLAUDE.md — codybain-blog

Astro v6 static site for a training journal + conditioning log + articles, hosted at codybain.com. Posts are written locally in markdown and pushed to GitHub, which auto-deploys the site.

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| Astro | ^6.1.8 | Static site generator, content collections, routing |
| React | ^19 | Search/filter UI islands (`WorkoutSearch.tsx`, `StrengthDashboard.tsx`) |
| Recharts | ^3 | Data visualization for strength charts |
| Fuse.js | ^7 | Client-side fuzzy search |
| js-yaml | ^4 | YAML parsing inside metcon/strength blocks |
| unist-util-visit | ^5 | AST traversal in remark plugins |
| remark-breaks | ^4 | Soft line breaks → `<br>` (Typora Shift+Enter compat) |

---

## Project Structure

```
plugins/
  remarkMetcon.ts          # Remark plugin: transforms metcon code blocks → HTML
  remarkStrength.ts        # Remark plugin: transforms strength code blocks → HTML cards
public/
  styles/global.css        # CSS variables, prose styles, blockquote/tag styles
src/
  content.config.ts        # Astro v6 content collection schema (glob loader)
  content/
    posts/                 # Journal markdown files — named YYYY-MM-DD.md
    articles/              # Article markdown files — named anything (slug = filename)
  data/
    prs.yaml               # Manual PR entries for 1RM % intensity calculations
  layouts/Base.astro       # Master layout: header, nav, footer
  pages/
    index.astro            # Home — two-column (journal + articles) + workout DB callout
    blog/
      index.astro          # All posts grouped by year, sorted by date desc
      [slug].astro         # Individual post — renders markdown + metcon/strength cards inline
    articles/
      index.astro          # All articles, sorted by date desc, with description previews
      [slug].astro         # Individual article — full prose layout
    conditioning/
      index.astro          # Searchable conditioning log (WorkoutSearch island)
      [slug].astro         # Individual session — description + performance history table
    strength/
      index.astro          # Lift grid — 12 tracked lifts + session count / best
      [lift].astro         # Individual lift page — StrengthDashboard React island
  components/
    MetconCard.astro       # Metcon card component (available but cards rendered by remark plugin)
    WorkoutSearch.tsx      # React island: fuzzy search + type/movement/equipment filters
    StrengthDashboard.tsx  # React island: unit toggle, 3 Recharts charts, history table
  utils/
    parseMetcons.ts        # Build-time conditioning DB builder
    parseStrength.ts       # Build-time strength DB builder (server-only: astro:content, fs)
    strengthTypes.ts       # Shared types + pure utils (client-safe, used by StrengthDashboard)
astro.config.mjs           # Remark plugins registered here
```

---

## Content Collections

### Posts (Training Journal)
- Files: `src/content/posts/YYYY-MM-DD.md`
- Slug = filename without extension (e.g. `2026-04-21`)
- Frontmatter schema:
  ```yaml
  title: "2026-04-21, Tuesday"
  date: 2026-04-21
  tags: [training]
  ```

### Articles
- Files: `src/content/articles/your-slug.md`
- Slug = filename without extension
- Frontmatter schema:
  ```yaml
  title: "Article Title"
  date: 2026-04-22
  description: "Short summary shown on listing and in meta tags."   # optional but recommended
  tags: [crossfit]                                                  # optional
  ```

---

## Content Pipeline

```
YYYY-MM-DD.md (written locally in Obsidian/any editor)
  │
  ├─▶ Astro content collection (glob loader, src/content/posts/)
  │     Schema: { title: string, date: Date, tags?: string[] }
  │
  ├─▶ Remark pipeline at build time:
  │     1. remark-breaks    → soft line breaks become <br>
  │     2. remarkMetcon     → ```conditioning/metcon blocks → inline HTML cards
  │     3. remarkStrength   → ```strength blocks → inline HTML cards
  │
  ├─▶ /blog/[slug]          → rendered journal post (markdown + cards inline)
  │
  ├─▶ parseMetcons.ts (called by /conditioning pages at build time)
  │     • scans post.body for conditioning blocks, deduplicates by slug
  │     └─▶ /conditioning/[slug]  → session detail + history table
  │         /conditioning/        → WorkoutSearch (client-side React + Fuse.js)
  │
  └─▶ parseStrength.ts (called by /strength pages at build time)
        • scans post.body for strength blocks, groups by lift name
        • reads src/data/prs.yaml for PR time-series → computes % 1RM per session
        └─▶ /strength/[lift]  → StrengthDashboard (Recharts charts + history table)
            /strength/         → lift grid overview
```

---

## Conditioning Block Format

Written inside journal markdown using a fenced code block with language `conditioning` (or legacy `metcon` — both are supported):

````markdown
```conditioning
For Time:
21-15-9
Thrusters @ 95 lb
Pull-ups
---
name: "Fran"
score: "4:23 Rx"
type: "For Time"
movements: [Thrusters, Pull-ups]
equipment: [Barbell, Pull-up Bar]
```
````

**Rules:**
- Everything **before** `---` is the session description (rendered as `<pre>` with gold left border)
- Everything **after** `---` is YAML metadata
- All YAML fields are optional
- `name` omitted → slug defaults to the post filename date (e.g. `2026-04-21`)
- `score` is a free-form string (times, reps, calories, rounds — anything)
- `type` is a free-form string (EMOM, AMRAP, For Time, etc.) — drives type filter; rendered as purple tag
- `movements` and `equipment` are arrays — drive include/exclude filters in the conditioning log
- The block is **replaced** by the remark plugin with raw HTML; the raw code block is never shown
- Multiple conditioning blocks per post are supported

**Naming convention:**
- Named benchmark workouts (Fran, Helen, etc.) → always use the name
- Unnamed gym programming → omit `name`, auto-slugs to date
- Repeated unnamed sessions → add a consistent `name` so they group in the log
- If a session is unnamed on first log and named later, manually add `name:` to the first post to backfill

**Backward compat:** Old `metcon` blocks still render and are picked up by the database. New posts should use `conditioning`.

---

## Routing

| URL | Source | Notes |
|-----|--------|-------|
| `/` | `pages/index.astro` | Home: recent journal + articles + conditioning log callout |
| `/blog` | `pages/blog/index.astro` | All posts, grouped by year |
| `/blog/:slug` | `pages/blog/[slug].astro` | Slug = post filename without `.md` |
| `/articles` | `pages/articles/index.astro` | All articles, sorted by date desc |
| `/articles/:slug` | `pages/articles/[slug].astro` | Slug = article filename without `.md` |
| `/conditioning` | `pages/conditioning/index.astro` | Client-side search, React island |
| `/conditioning/:slug` | `pages/conditioning/[slug].astro` | Slug = `toSlug(name)` or date slug |
| `/strength` | `pages/strength/index.astro` | Lift grid — 12 tracked lifts |
| `/strength/:lift` | `pages/strength/[lift].astro` | Slug = `liftToSlug(lift)` |

Slugs are deterministic: `toSlug(str)` / `liftToSlug(str)` → lowercase, spaces→hyphens, strip non-alphanumeric.

---

## Conditioning Log Database

Built at static generation time by `buildWorkoutsDb()` in `src/utils/parseMetcons.ts`.

```typescript
interface Workout {
  name: string;
  slug: string;
  description?: string;    // from first logged instance
  type?: string;
  movements: string[];
  equipment: string[];
  performances: Performance[];
}

interface Performance {
  date: string;    // YYYY-MM-DD
  score?: string;
  postSlug: string;
}
```

Same workout done multiple times → one `Workout` entry with multiple `Performance` records. Matched by slug, so the `name` field must be spelled identically across posts.

### Conditioning Log Filters (`WorkoutSearch.tsx`)
- **Type** (purple toggle buttons) — single or multi-select; filters to workouts of that type
- **Movements** — three-state: click once = include (gold), click again = exclude (red strikethrough), click again = off
- **Equipment** — same three-state behavior as movements
- **Text search** — Fuse.js fuzzy search across name, movements, type

---

## Key Conventions

**Post files:** Named `YYYY-MM-DD.md`. Date in frontmatter `date:` field controls sort order — use the real training date even for retroactively added posts.

**Date rendering:** Always construct dates as `new Date(isoStr + 'T12:00:00')` before calling `toLocaleDateString` to avoid UTC→local timezone shift showing the wrong day.

**Astro v6 specifics:**
- Content config lives at `src/content.config.ts` (not `src/content/config.ts`)
- Use `post.id` not `post.slug` — the glob loader uses `id`
- `markdown.remarkPlugins` in `astro.config.mjs` applies to content collection posts

**Dev server caveat:** The remark plugin is cached aggressively by the dev server. When iterating on `remarkMetcon.ts`, use `npm run build && npm run preview` to verify output rather than `npm run dev`.

**CSS:** Global styles in `public/styles/global.css`. All CSS variables are defined in `:root`. The remark plugin uses inline styles (not classes) since it generates raw HTML outside Astro's scoped style system. Colors in inline styles must match CSS variable values manually:
- Accent gold: `#e8c547`
- Surface: `#1a1a1a`
- Background: `#0f0f0f`
- Border: `#2a2a2a`
- Type purple: `rgba(91,79,207,...)` / `#9b8fef`
- Exclude red: `rgba(220,50,50,...)`/ `#ff6b6b`

**Blockquotes** (`>`): styled as gold monospace score badges — use them in posts to call out scores or notes (e.g. `> 165, 170, 170` or `> Done. 378 cals.`).

---

## Strength Block Format

Written inside journal markdown using a fenced code block with language `strength`:

````markdown
```strength
High Hang Snatch + Squat Snatch + OHS
2x(1+1+2), 2x(1+1+1)
---
lift: Snatch
unit: lbs
sets: 205x3, 215x3, 225x3, 225x3
```
````

**Rules:**
- Everything **before** `---` is the description (rendered as `<pre>` with gold left border)
- Everything **after** `---` is YAML metadata
- `lift`: must match one of the 12 tracked lifts exactly (case-sensitive)
- `unit`: `lbs` or `kg` (default: `lbs`)
- `sets`: comma-separated `weightxreps` notation (e.g. `225x3, 235x2, 240x1`)
  - Single number without `x` is treated as 1 rep
- `lift` is required — blocks without a lift field are ignored by `parseStrength.ts`
- Multiple strength blocks per post are supported
- The block is **replaced** by the remark plugin with a styled HTML card

**12 tracked lifts** (must match exactly):
- Snatch, Clean & Jerk, Clean, Jerk, Power Snatch, Power Clean, Power Jerk
- Back Squat, Front Squat, Overhead Squat, Snatch Balance, Push Press

---

## PR Tracking (`src/data/prs.yaml`)

Manually add a new entry each time you set a new PR. **Never overwrite old entries** — the system uses the full history to calculate % 1RM at the time of each session.

```yaml
- lift: Snatch
  weight: 225
  unit: lbs
  date: 2026-01-15

- lift: Back Squat
  weight: 405
  unit: lbs
  date: 2026-03-01
```

**% 1RM logic:** For each session, find the most recent PR entry where `pr.date <= session.date` for the same lift, then calculate `topSet / prWeight × 100`. Unit conversion is applied automatically if units differ.

---

## Strength Database

Built at static generation time by `buildStrengthDb()` in `src/utils/parseStrength.ts`.

```typescript
interface StrengthSession {
  date: string;        // YYYY-MM-DD
  postSlug: string;
  lift: string;
  unit: 'lbs' | 'kg';
  description?: string;
  sets: SetEntry[];    // [{ weight, reps }, ...]
  topSet: number;      // heaviest single set
  totalVolume: number; // Σ(weight × reps)
  totalReps: number;
  pct1rm?: number;     // % of active 1RM (only if PR data exists)
}
```

### StrengthDashboard Charts (`StrengthDashboard.tsx`)
- **Top Set Over Time** — LineChart (x=date, y=weight in display unit)
- **Weekly Volume** — BarChart (x=ISO week, y=total tonnage in display unit)
- **% 1RM Intensity** — LineChart with 100% reference line (only renders when PR data exists)
- Unit toggle (lbs/kg) in the header — converts all chart values and table display on the fly
- Charts only render when there are ≥ 2 data points
- History table: date, top set, individual sets, volume, % 1RM, journal link

---

## Scripts

```bash
npm run dev       # Dev server (use for prose/layout; metcon cards may be stale)
npm run build     # Full static build
npm run preview   # Serve dist/ — source of truth for metcon card rendering
```
