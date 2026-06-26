import { useState } from 'react';

const GOLD = '#e8c547';
const GOLD_BG_DIM = 'rgba(232,197,71,0.1)';
const GOLD_BORDER = 'rgba(232,197,71,0.4)';
const SURFACE = '#141414';
const CELL_EMPTY = '#1c1c1c';
const BORDER = '#252525';

export interface WeekRow {
  weekStart: string;
  label: string;
  hits: Record<string, boolean>;
}

interface Props {
  weeks: WeekRow[];
  columns: string[];
}

const VIEW_OPTIONS = [
  { label: '12w', value: 12 },
  { label: '26w', value: 26 },
  { label: 'All', value: null },
] as const;

export default function FrequencyTracker({ weeks, columns }: Props) {
  const [view, setView] = useState<number | null>(12);

  const displayed = view === null ? weeks : weeks.slice(0, view);

  // Count hits per column across displayed weeks for the summary bar
  const hitCounts = Object.fromEntries(
    columns.map(col => [col, displayed.filter(w => w.hits[col]).length])
  );

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: '8px',
      padding: '1.25rem 1.5rem',
      marginBottom: '2rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: GOLD, fontWeight: 600 }}>
            Frequency
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {VIEW_OPTIONS.map(opt => {
            const active = view === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => setView(opt.value as number | null)}
                style={{
                  padding: '0.2em 0.7em',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: `1px solid ${active ? GOLD_BORDER : BORDER}`,
                  background: active ? GOLD_BG_DIM : 'transparent',
                  color: active ? GOLD : '#888',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '64px' }} />
            {columns.map(col => <col key={col} />)}
          </colgroup>

          <thead>
            <tr>
              <th />
              {columns.map(col => (
                <th key={col} style={{ padding: '0 4px 10px', verticalAlign: 'bottom', textAlign: 'center' }}>
                  <div style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    fontSize: '0.7rem',
                    color: GOLD,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    margin: '0 auto',
                  }}>
                    {col}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {displayed.map((week, rowIdx) => {
              const isCurrentWeek = rowIdx === 0;
              return (
                <tr key={week.weekStart}>
                  <td style={{
                    fontSize: '0.7rem',
                    color: isCurrentWeek ? GOLD : '#888',
                    whiteSpace: 'nowrap',
                    paddingRight: '0.5rem',
                    paddingTop: '3px',
                    paddingBottom: '3px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: isCurrentWeek ? 600 : 400,
                  }}>
                    {week.label}
                  </td>
                  {columns.map(col => {
                    const hit = week.hits[col];
                    return (
                      <td key={col} style={{ padding: '3px 4px', textAlign: 'center' }}>
                        <div style={{
                          height: '24px',
                          borderRadius: '4px',
                          background: hit ? GOLD_BG_DIM : CELL_EMPTY,
                          border: `1px solid ${hit ? GOLD_BORDER : '#222'}`,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {hit && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: GOLD,
                            }} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          {/* Summary row */}
          <tfoot>
            <tr>
              <td style={{
                paddingTop: '10px',
                fontSize: '0.65rem',
                color: '#444',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Total
              </td>
              {columns.map(col => {
                const count = hitCounts[col];
                const total = displayed.length;
                const pct = total > 0 ? count / total : 0;
                return (
                  <td key={col} style={{ paddingTop: '10px', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.65rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: pct > 0.6 ? GOLD : pct > 0.3 ? '#888' : '#444',
                      fontWeight: pct > 0.6 ? 600 : 400,
                    }}>
                      {count}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
