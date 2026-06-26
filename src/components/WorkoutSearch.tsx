import { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import type { Workout } from '../utils/parseMetcons';

interface Props {
  workouts: Workout[];
}

type TagState = 'include' | 'exclude';

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function cycleTag(prev: Map<string, TagState>, key: string): Map<string, TagState> {
  const next = new Map(prev);
  const cur = next.get(key);
  if (!cur) next.set(key, 'include');
  else if (cur === 'include') next.set(key, 'exclude');
  else next.delete(key);
  return next;
}

// ── Dropdown ─────────────────────────────────────────────────────────────────

function FilterDropdown({ label, items, filters, setFilters }: {
  label: string;
  items: string[];
  filters: Map<string, TagState>;
  setFilters: React.Dispatch<React.SetStateAction<Map<string, TagState>>>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const includeCount = [...filters.values()].filter(v => v === 'include').length;
  const excludeCount = [...filters.values()].filter(v => v === 'exclude').length;
  const hasActive = filters.size > 0;

  const summary = hasActive
    ? [includeCount > 0 && `+${includeCount}`, excludeCount > 0 && `−${excludeCount}`].filter(Boolean).join(' ')
    : '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: hasActive ? 'rgba(232,197,71,0.06)' : 'var(--surface)',
          border: `1px solid ${hasActive ? 'rgba(232,197,71,0.35)' : 'var(--border)'}`,
          color: hasActive ? 'var(--accent)' : 'var(--text-muted)',
          borderRadius: '6px',
          padding: '0.5rem 0.85rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {summary && <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{summary}</span>}
        <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && items.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 100,
          background: '#1c1c1c',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '0.4rem',
          minWidth: '200px',
          maxHeight: '300px',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {items.map(item => {
            const state = filters.get(item);
            return (
              <button
                key={item}
                onClick={() => setFilters(prev => cycleTag(prev, item))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  width: '100%',
                  background: state === 'include'
                    ? 'rgba(232,197,71,0.06)'
                    : state === 'exclude'
                      ? 'rgba(220,50,50,0.06)'
                      : 'transparent',
                  border: 'none',
                  padding: '0.4rem 0.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  color: state === 'include' ? 'var(--accent)' : state === 'exclude' ? '#ff6b6b' : 'var(--text-muted)',
                  textAlign: 'left',
                  textDecoration: state === 'exclude' ? 'line-through' : 'none',
                }}
              >
                <span style={{
                  width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                  border: `1px solid ${state === 'include' ? 'rgba(232,197,71,0.5)' : state === 'exclude' ? 'rgba(220,50,50,0.4)' : '#333'}`,
                  background: state === 'include' ? 'rgba(232,197,71,0.15)' : state === 'exclude' ? 'rgba(220,50,50,0.12)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem',
                  color: state === 'include' ? 'var(--accent)' : '#ff6b6b',
                }}>
                  {state === 'include' ? '✓' : state === 'exclude' ? '✕' : ''}
                </span>
                {item}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkoutSearch({ workouts }: Props) {
  const [query, setQuery] = useState('');
  const [typeFilters,      setTypeFilters]      = useState<Map<string, TagState>>(new Map());
  const [movementFilters,  setMovementFilters]  = useState<Map<string, TagState>>(new Map());
  const [equipmentFilters, setEquipmentFilters] = useState<Map<string, TagState>>(new Map());

  const allTypes     = useMemo(() => [...new Set(workouts.map(w => w.type).filter(Boolean) as string[])].sort(), [workouts]);
  const allMovements = useMemo(() => [...new Set(workouts.flatMap(w => w.movements))].sort(), [workouts]);
  const allEquipment = useMemo(() => [...new Set(workouts.flatMap(w => w.equipment))].sort(), [workouts]);

  const fuse = useMemo(() => new Fuse(workouts, { keys: ['name', 'movements', 'type'], threshold: 0.35 }), [workouts]);

  const results = useMemo(() => {
    let list = query.trim() ? fuse.search(query).map(r => r.item) : [...workouts];

    for (const [t, state] of typeFilters) {
      list = state === 'include' ? list.filter(w => w.type === t) : list.filter(w => w.type !== t);
    }
    for (const [m, state] of movementFilters) {
      list = state === 'include' ? list.filter(w => w.movements.includes(m)) : list.filter(w => !w.movements.includes(m));
    }
    for (const [e, state] of equipmentFilters) {
      list = state === 'include' ? list.filter(w => w.equipment.includes(e)) : list.filter(w => !w.equipment.includes(e));
    }
    return list;
  }, [query, typeFilters, movementFilters, equipmentFilters, fuse, workouts]);

  const hasFilters = query || typeFilters.size > 0 || movementFilters.size > 0 || equipmentFilters.size > 0;

  function clearAll() {
    setQuery('');
    setTypeFilters(new Map());
    setMovementFilters(new Map());
    setEquipmentFilters(new Map());
  }

  return (
    <div>
      {/* Search */}
      <input
        type="search"
        placeholder="Search by name or movement…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.65rem 1rem', borderRadius: '6px', fontSize: '1rem', marginBottom: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
      />

      {/* Filter dropdowns */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        {allTypes.length > 0 && (
          <FilterDropdown label="Type" items={allTypes} filters={typeFilters} setFilters={setTypeFilters} />
        )}
        {allMovements.length > 0 && (
          <FilterDropdown label="Movements" items={allMovements} filters={movementFilters} setFilters={setMovementFilters} />
        )}
        {allEquipment.length > 0 && (
          <FilterDropdown label="Equipment" items={allEquipment} filters={equipmentFilters} setFilters={setEquipmentFilters} />
        )}

        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {results.length} workout{results.length !== 1 ? 's' : ''}
          {hasFilters && (
            <button onClick={clearAll} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}>
              clear
            </button>
          )}
        </span>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {results.map(w => (
          <a key={w.slug} href={`/workouts/${w.slug}`} style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem 1.25rem', textDecoration: 'none', color: 'var(--text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '1rem' }}>{w.name}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {w.performances.length}× · last {fmtDate(w.performances[w.performances.length - 1].date)}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {w.type && <span style={{ fontSize: '0.75rem', background: 'rgba(91,79,207,0.15)', border: '1px solid rgba(91,79,207,0.35)', color: '#9b8fef', padding: '0.15em 0.5em', borderRadius: '3px' }}>{w.type}</span>}
              {w.movements.slice(0, 4).map(m => (
                <span key={m} style={{ fontSize: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.15em 0.5em', borderRadius: '3px' }}>{m}</span>
              ))}
              {w.movements.length > 4 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{w.movements.length - 4} more</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
