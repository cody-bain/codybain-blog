import { useState } from 'react';
import type { DistanceStats } from '../utils/parseMetcons';

const GOLD = '#e8c547';
const BORDER = '#2a2a2a';
const MUTED = '#888';

interface Props {
  stats: DistanceStats[];
}

const M_TO_KM = 0.001;
const M_TO_MI = 0.000621371;

function fmt(meters: number, unit: 'km' | 'mi'): string {
  if (meters === 0) return '—';
  const val = meters * (unit === 'km' ? M_TO_KM : M_TO_MI);
  return val.toFixed(1) + ' ' + unit;
}

export default function DistanceTracker({ stats }: Props) {
  const [unit, setUnit] = useState<'km' | 'mi'>('km');

  const hasAnyData = stats.some(s => s.lifetime > 0);
  if (!hasAnyData) return null;

  return (
    <div style={{
      background: '#141414',
      border: `1px solid ${BORDER}`,
      borderRadius: '8px',
      padding: '1.25rem 1.5rem',
      marginBottom: '2rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD, fontWeight: 600 }}>
          Engine Log
        </span>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {(['km', 'mi'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              style={{
                padding: '0.15em 0.55em',
                fontSize: '0.75rem',
                borderRadius: '3px',
                border: `1px solid ${unit === u ? 'rgba(232,197,71,0.4)' : BORDER}`,
                background: unit === u ? 'rgba(232,197,71,0.1)' : 'transparent',
                color: unit === u ? GOLD : MUTED,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: '0.68rem', color: MUTED, fontWeight: 500, paddingBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Movement</th>
            <th style={{ textAlign: 'right', fontSize: '0.68rem', color: MUTED, fontWeight: 500, paddingBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Lifetime
              <span style={{ display: 'block', fontSize: '0.62rem', color: '#3a3a3a', letterSpacing: '0.02em', textTransform: 'none', fontWeight: 400, marginTop: '0.1rem' }}>since May 18, 2026</span>
            </th>
            <th style={{ textAlign: 'right', fontSize: '0.68rem', color: MUTED, fontWeight: 500, paddingBottom: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>This Month</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.movement} style={{ borderTop: `1px solid ${BORDER}` }}>
              <td style={{ padding: '0.6rem 0', fontSize: '0.85rem', color: '#ccc' }}>{s.movement}</td>
              <td style={{ padding: '0.6rem 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: s.lifetime > 0 ? GOLD : MUTED }}>{fmt(s.lifetime, unit)}</td>
              <td style={{ padding: '0.6rem 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: s.month > 0 ? '#ccc' : MUTED }}>{fmt(s.month, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
