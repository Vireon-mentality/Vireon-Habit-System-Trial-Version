import React, { useMemo } from 'react';
import { Habit, iso, startMonday, addDays, dayStats } from './utils';

const fmt = (d: Date, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
  new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  );

interface YearlyActivityHeatmapProps {
  year: number;
  allHabits: Habit[];
  completions: Set<string>;
  onSelectDate: (isoDate: string) => void;
}

interface HeatCellData {
  isoDate: string;
  date: Date;
  outside: boolean;
  level: string;
  row: number;
  col: number;
  ariaLabel: string;
  title: string;
}

const months = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2024, i, 1))
);

export const YearlyActivityHeatmap: React.FC<YearlyActivityHeatmapProps> = React.memo(({
  year,
  allHabits,
  completions,
  onSelectDate,
}) => {
  const { heatStart, heatDays } = useMemo(() => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const start = startMonday(yearStart);
    const end = addDays(startMonday(yearEnd), 6);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      days.push(d);
    }
    return { heatStart: start, heatDays: days };
  }, [year]);

  const cells: HeatCellData[] = useMemo(() => {
    return heatDays.map((d, i) => {
      const outside = d.getFullYear() !== year;
      const s = dayStats(d, allHabits, completions, true);
      const level = !s.due ? 'none' : s.pct === 0 ? 'level0' : s.pct < 40 ? 'level1' : s.pct < 70 ? 'level2' : 'level3';
      const row = ((d.getDay() + 6) % 7) + 1;
      const col = Math.floor(i / 7) + 1;
      const isoDate = iso(d);
      const ariaLabel = `${fmt(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}: ${
        s.due ? `${s.completed} of ${s.due} completed, ${s.pct}%` : 'no scheduled habits'
      }`;
      const title = `${fmt(d, { month: 'short', day: 'numeric' })} · ${
        s.due ? `${s.completed}/${s.due} · ${s.pct}%` : 'no scheduled habits'
      }`;

      return {
        isoDate,
        date: d,
        outside,
        level,
        row,
        col,
        ariaLabel,
        title,
      };
    });
  }, [heatDays, allHabits, completions, year]);

  return (
    <section className="panel heatmap-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ZOOM OUT</span>
          <h2>Yearly activity <span className="month-caption">{year}</span></h2>
        </div>
        <div className="heat-legend">
          <span>Less</span>
          {['none', 'level0', 'level1', 'level2', 'level3'].map(x => (
            <i key={x} className={`heat-cell ${x}`} aria-hidden="true" />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="heatmap-scroll">
        <div className="heatmap-canvas">
          <div className="heat-months">
            {months.map((m, i) => {
              const daysDiff = Math.round((new Date(year, i, 1).getTime() - heatStart.getTime()) / 86400000);
              const col = Math.floor(daysDiff / 7) + 1;
              return <span key={m} style={{ gridColumnStart: col, gridRow: 1 }}>{m.slice(0, 3)}</span>;
            })}
          </div>
          <div className="heat-grid">
            {cells.map(cell => (
              <button
                key={cell.isoDate}
                className={`heat-cell ${cell.level} ${cell.outside ? 'outside' : ''}`}
                style={{ gridRow: `${cell.row}`, gridColumn: `${cell.col}` }}
                aria-label={cell.ariaLabel}
                title={cell.title}
                onClick={() => !cell.outside && onSelectDate(cell.isoDate)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="heat-foot">
        <span><i className="heat-cell level0" /> Scheduled, no completions</span>
        <span><i className="heat-cell none" /> No scheduled habits</span>
        <small>Select a day to view its activity</small>
      </div>
    </section>
  );
});
