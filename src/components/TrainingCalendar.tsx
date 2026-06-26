import { useState } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const GOLD        = '#e8c547';
const GOLD_BG     = 'rgba(232,197,71,0.12)';
const GOLD_BORDER = 'rgba(232,197,71,0.35)';
const BORDER      = '#2a2a2a';
const MUTED       = '#383838';

interface Props {
  trainingDates: Record<string, string>; // YYYY-MM-DD → post slug
  minDate: string; // YYYY-MM-DD of earliest post
}

export default function TrainingCalendar({ trainingDates, minDate }: Props) {
  const today   = new Date();
  const minYear = parseInt(minDate.slice(0, 4));
  const minMon  = parseInt(minDate.slice(5, 7)) - 1; // 0-indexed

  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const atMin = year === minYear && month === minMon;
  const atMax = year === today.getFullYear() && month === today.getMonth();

  function prev() {
    if (atMin) return;
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setShowMonthPicker(false);
  }
  function next() {
    if (atMax) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setShowMonthPicker(false);
  }
  function jumpTo(y: number, m: number) {
    setYear(y); setMonth(m); setShowMonthPicker(false);
  }

  // Build range of selectable years
  const years: number[] = [];
  for (let y = minYear; y <= today.getFullYear(); y++) years.push(y);

  // Calendar grid
  const firstDow     = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr   = today.toISOString().split('T')[0];
  const monthPfx   = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const sessionCount = Object.keys(trainingDates).filter(d => d.startsWith(monthPfx)).length;

  return (
    <div style={{ background: '#141414', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '1.25rem 1.5rem', position: 'relative' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>

        {/* Month + year label — click to open picker */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <button
            onClick={() => setShowMonthPicker(v => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#e0e0e0', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit' }}
          >
            {MONTHS_FULL[month]} {year} {showMonthPicker ? '▲' : '▾'}
          </button>
          {sessionCount > 0 && (
            <span style={{ fontSize: '0.75rem', color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}>
              {sessionCount} session{sessionCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Prev / Today / Next */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button onClick={prev} disabled={atMin} style={{ ...navBtn, opacity: atMin ? 0.25 : 1 }}>‹</button>
          {!atMax && (
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setShowMonthPicker(false); }}
              style={{ ...navBtn, fontSize: '0.7rem', padding: '0.2em 0.5em', color: '#555' }}
            >
              Today
            </button>
          )}
          <button onClick={next} disabled={atMax} style={{ ...navBtn, opacity: atMax ? 0.25 : 1 }}>›</button>
        </div>
      </div>

      {/* ── Month / year picker dropdown ── */}
      {showMonthPicker && (
        <div style={{
          position: 'absolute', top: '4rem', left: '1.5rem', zIndex: 10,
          background: '#1a1a1a', border: `1px solid ${BORDER}`, borderRadius: '6px',
          padding: '1rem', minWidth: '260px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {years.slice().reverse().map(y => (
            <div key={y} style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#555', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'JetBrains Mono', monospace" }}>{y}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {MONTHS_SHORT.map((label, mi) => {
                  const tooEarly = y === minYear && mi < minMon;
                  const tooLate  = y === today.getFullYear() && mi > today.getMonth();
                  const disabled = tooEarly || tooLate;
                  const active   = y === year && mi === month;
                  const hasSessions = Object.keys(trainingDates).some(d => d.startsWith(`${y}-${String(mi + 1).padStart(2, '0')}-`));
                  return (
                    <button
                      key={mi}
                      disabled={disabled}
                      onClick={() => jumpTo(y, mi)}
                      style={{
                        padding: '0.2em 0.5em',
                        fontSize: '0.75rem',
                        borderRadius: '3px',
                        border: `1px solid ${active ? GOLD_BORDER : BORDER}`,
                        background: active ? 'rgba(232,197,71,0.1)' : 'transparent',
                        color: disabled ? '#2a2a2a' : active ? GOLD : hasSessions ? '#aaa' : '#555',
                        cursor: disabled ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                        fontWeight: hasSessions && !active ? 500 : 400,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Day-of-week headers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.4rem' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: '#444', letterSpacing: '0.04em', paddingBottom: '0.4rem' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const slug    = trainingDates[dateStr];
          const trained = !!slug;
          const isToday = dateStr === todayStr;

          const inner = (
            <div style={{
              textAlign: 'center',
              padding: '0.45rem 0.1rem',
              borderRadius: '5px',
              fontSize: '0.82rem',
              fontWeight: trained ? 500 : 400,
              background: trained ? GOLD_BG : 'transparent',
              border: `1px solid ${isToday ? GOLD_BORDER : trained ? 'rgba(232,197,71,0.15)' : 'transparent'}`,
              color: trained ? GOLD : isToday ? '#666' : MUTED,
              cursor: trained ? 'pointer' : 'default',
              transition: 'background 0.1s',
              lineHeight: 1,
            }}>
              {day}
            </div>
          );

          return trained ? (
            <a key={i} href={`/training-log/${slug}`} style={{ textDecoration: 'none' }}>
              {inner}
            </a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid #2a2a2a`,
  color: '#666',
  borderRadius: '4px',
  padding: '0.2em 0.55em',
  fontSize: '1rem',
  cursor: 'pointer',
  lineHeight: 1,
  fontFamily: 'inherit',
};
