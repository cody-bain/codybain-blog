import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { StrengthSession, WeeklyVolume } from '../utils/strengthTypes';
import { convertWeight, aggregateWeeklyVolume } from '../utils/strengthTypes';

interface Props {
  sessions: StrengthSession[];
  lift: string;
  slug: string;
}

type DisplayUnit = 'lbs' | 'kg';

// ── Recharts custom tooltip ─────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2a2a2a',
      borderRadius: 4, padding: '0.5rem 0.75rem', fontSize: '0.82rem',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ color: '#888', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          {unit ? ` ${unit}` : ''}
        </div>
      ))}
    </div>
  );
}

// ── History table ────────────────────────────────────────────────────────────

function HistoryTable({ sessions, displayUnit }: { sessions: StrengthSession[]; displayUnit: DisplayUnit }) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', fontFamily: "'JetBrains Mono', monospace" }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#888', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>Date</th>
            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>Top Set</th>
            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>Sets</th>
            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>Volume</th>
            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>% 1RM</th>
            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>Entry</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const top = convertWeight(s.topSet, s.unit, displayUnit);
            const vol = Math.round(s.sets.reduce((sum, set) => {
              return sum + convertWeight(set.weight, s.unit, displayUnit) * set.reps;
            }, 0));
            const setsStr = s.sets.map(set => {
              const w = convertWeight(set.weight, s.unit, displayUnit);
              return `${w}×${set.reps}`;
            }).join(', ');
            return (
              <tr key={i} style={{ borderBottom: '1px solid #1f1f1f' }}>
                <td style={{ padding: '0.5rem 0.75rem', color: '#888' }}>{s.date}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#e8c547', fontWeight: 600 }}>
                  {top} {displayUnit}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#e0e0e0', fontSize: '0.8rem' }}>{setsStr}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#888' }}>{vol.toLocaleString()} {displayUnit}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: s.pct1rm ? '#9b8fef' : '#2a2a2a' }}>
                  {s.pct1rm ? `${s.pct1rm}%` : '—'}
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <a href={`/training-log/${s.postSlug}`} style={{ color: '#888', fontSize: '0.8rem' }}>→</a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StrengthDashboard({ sessions, lift, slug }: Props) {
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>(() => {
    // Default to the unit most commonly used in sessions
    const lbsCount = sessions.filter(s => s.unit === 'lbs').length;
    return lbsCount >= sessions.length / 2 ? 'lbs' : 'kg';
  });

  const hasPct = sessions.some(s => s.pct1rm !== undefined);

  // ── Chart data ──────────────────────────────────────────────────────────

  const topSetData = useMemo(() => {
    return [...sessions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => ({
        date: s.date,
        label: s.date,
        weight: convertWeight(s.topSet, s.unit, displayUnit),
      }));
  }, [sessions, displayUnit]);

  const weeklyData: WeeklyVolume[] = useMemo(() => {
    return aggregateWeeklyVolume(sessions, displayUnit);
  }, [sessions, displayUnit]);

  const pctData = useMemo(() => {
    return [...sessions]
      .filter(s => s.pct1rm !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => ({
        date: s.date,
        label: s.date,
        pct: s.pct1rm!,
      }));
  }, [sessions]);

  // ── Stats ───────────────────────────────────────────────────────────────

  const allTopSets = sessions.map(s => convertWeight(s.topSet, s.unit, displayUnit));
  const bestEver = allTopSets.length > 0 ? Math.max(...allTopSets) : null;
  const totalSessions = sessions.length;

  // ── Render ──────────────────────────────────────────────────────────────

  const sectionStyle: React.CSSProperties = {
    marginBottom: '2.5rem',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#888',
    marginBottom: '1rem',
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: '2rem' }}>
          {bestEver !== null && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e8c547', fontFamily: "'JetBrains Mono', monospace" }}>
                {bestEver} <span style={{ fontSize: '0.85rem', color: '#888' }}>{displayUnit}</span>
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sessions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e0e0e0', fontFamily: "'JetBrains Mono', monospace" }}>
              {totalSessions}
            </div>
          </div>
        </div>

        {/* Unit toggle */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['lbs', 'kg'] as const).map(u => (
            <button
              key={u}
              onClick={() => setDisplayUnit(u)}
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: 4,
                border: '1px solid',
                borderColor: displayUnit === u ? '#e8c547' : '#2a2a2a',
                background: displayUnit === u ? 'rgba(232,197,71,0.1)' : 'transparent',
                color: displayUnit === u ? '#e8c547' : '#888',
                fontSize: '0.75rem',
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'pointer',
              }}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Chart: Top Set Over Time */}
      {topSetData.length >= 2 && (
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Top Set Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={topSetData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} unit={` ${displayUnit}`} width={70} />
              <Tooltip content={<ChartTooltip unit={displayUnit} />} />
              <Line type="monotone" dataKey="weight" name="Top Set" stroke="#e8c547" strokeWidth={2} dot={{ r: 3, fill: '#e8c547' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart: Weekly Volume */}
      {weeklyData.length >= 2 && (
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Weekly Volume ({displayUnit})</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
              <XAxis dataKey="weekLabel" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip content={<ChartTooltip unit={displayUnit} />} />
              <Bar dataKey="volume" name="Volume" fill="rgba(232,197,71,0.25)" stroke="#e8c547" strokeWidth={1} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart: % 1RM Intensity */}
      {hasPct && pctData.length >= 2 && (
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Intensity (% 1RM)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={pctData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2a2a2a' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} domain={[50, 110]} unit="%" width={50} />
              <Tooltip content={<ChartTooltip unit="%" />} />
              <ReferenceLine y={100} stroke="rgba(232,197,71,0.3)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="pct" name="% 1RM" stroke="#9b8fef" strokeWidth={2} dot={{ r: 3, fill: '#9b8fef' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Session History</h3>
        <HistoryTable sessions={sessions} displayUnit={displayUnit} />
      </div>
    </div>
  );
}
