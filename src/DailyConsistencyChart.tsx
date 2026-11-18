import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Target, X } from 'lucide-react';
import { Habit, iso, isDue, monthDays } from './utils';

interface DailyConsistencyChartProps {
  year: number;
  month: number;
  monthName: string;
  target: number;
  allHabits: Habit[];
  completions: Set<string>;
  today: Date;
  selectedDate?: string;
  onSelectDate?: (isoDate: string) => void;
}

interface DayPoint {
  day: number;
  date: Date;
  isoDate: string;
  dueCount: number;
  completedCount: number;
  pct: number;
  hasScheduled: boolean;
  isFuture: boolean;
  isToday: boolean;
  x: number;
  y: number;
}

const fmtDate = (d: Date, options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  );

const DailyConsistencyChartComponent: React.FC<DailyConsistencyChartProps> = ({
  year,
  month,
  monthName,
  target,
  allHabits,
  completions,
  today,
  selectedDate,
  onSelectDate,
}) => {
  const chartId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const pointRefs = useRef<(SVGGElement | null)[]>([]);

  const days = monthDays(year, month);
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Dimensions in SVG space
  const svgWidth = 600;
  const svgHeight = 120;
  const padLeft = 24;
  const padRight = 24;
  const padTop = 16;
  const padBottom = 20;
  const usableWidth = svgWidth - padLeft - padRight;
  const usableHeight = svgHeight - padTop - padBottom;
  const baselineY = svgHeight - padBottom; // y coordinate for 0%
  const topY = padTop; // y coordinate for 100%

  // Build data points for each day of the month (memoized)
  const todayTime = todayClean.getTime();
  const points: DayPoint[] = useMemo(() => {
    const list: DayPoint[] = [];
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      const dateIso = iso(date);
      const dueHabits = allHabits.filter(h => isDue(h, date, true));
      const dueCount = dueHabits.length;
      const completedCount = dueHabits.filter(h => completions.has(`${h.id}|${dateIso}`)).length;
      const hasScheduled = dueCount > 0;
      const pct = hasScheduled ? Math.round((completedCount / dueCount) * 100) : 0;
      const isFuture = date.getTime() > todayTime;
      const isToday = date.getTime() === todayTime;

      const x = padLeft + ((d - 1) / Math.max(1, days - 1)) * usableWidth;
      const y = hasScheduled ? baselineY - (pct / 100) * usableHeight : baselineY;

      list.push({
        day: d,
        date,
        isoDate: dateIso,
        dueCount,
        completedCount,
        pct,
        hasScheduled,
        isFuture,
        isToday,
        x,
        y,
      });
    }
    return list;
  }, [days, year, month, allHabits, completions, todayTime, padLeft, usableWidth, baselineY, usableHeight]);

  // Hover and selection state separated
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Sync with selectedDate prop if provided externally
  useEffect(() => {
    if (selectedDate) {
      const idx = points.findIndex(p => p.isoDate === selectedDate);
      if (idx !== -1) {
        setSelectedIndex(idx);
      }
    }
  }, [selectedDate, year, month, points]);

  // Click outside and Escape key handling
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedIndex(null);
        setHoverIndex(null);
      }
    };

    const handleDocumentKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndex(null);
        setHoverIndex(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchstart', handleDocumentClick, { passive: true });
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, []);

  // Construct SVG paths (memoized)
  const { lineD, areaD } = useMemo(() => {
    const line = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`, '');
    const firstX = points[0]?.x ?? padLeft;
    const lastX = points[points.length - 1]?.x ?? svgWidth - padRight;
    const area = `${line} L ${lastX.toFixed(2)} ${baselineY.toFixed(2)} L ${firstX.toFixed(2)} ${baselineY.toFixed(2)} Z`;
    return { lineD: line, areaD: area };
  }, [points, padLeft, svgWidth, padRight, baselineY]);

  const targetY = baselineY - (target / 100) * usableHeight;

  // Active point: Selected takes precedence over hover. If neither, null.
  const activeIndex = selectedIndex !== null ? selectedIndex : hoverIndex;
  const isSelected = selectedIndex !== null;
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  // Handle point click or tap: toggles selection if same point is clicked again
  const handlePointClick = (index: number) => {
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex(index);
      if (onSelectDate) onSelectDate(points[index].isoDate);
    }
  };

  // Keyboard navigation on chart points
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = Math.min(days - 1, index + 1);
      setSelectedIndex(nextIdx);
      pointRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = Math.max(0, index - 1);
      setSelectedIndex(prevIdx);
      pointRefs.current[prevIdx]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
      pointRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(days - 1);
      pointRefs.current[days - 1]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePointClick(index);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSelectedIndex(null);
      setHoverIndex(null);
    }
  };

  const totalDueInMonth = points.reduce((acc, p) => acc + p.dueCount, 0);

  // Compact smart positioning for tooltip so it doesn't cover chart points or go off-screen
  let tooltipStyle: React.CSSProperties = {};
  let alignmentClass = 'align-center';
  if (activePoint) {
    const rawLeftPct = (activePoint.x / svgWidth) * 100;
    const isUpperHalf = activePoint.y < (baselineY + topY) / 2;
    const topPct = (activePoint.y / svgHeight) * 100;

    if (rawLeftPct > 70) {
      alignmentClass = 'align-right';
    } else if (rawLeftPct < 30) {
      alignmentClass = 'align-left';
    } else {
      alignmentClass = 'align-center';
    }

    // Clamp left percentage to keep badge safely inside viewport edges
    const pointLeftPct = Math.max(6, Math.min(94, rawLeftPct));

    tooltipStyle = {
      left: `${pointLeftPct}%`,
      top: `${topPct}%`,
      transform: isUpperHalf
        ? (alignmentClass === 'align-right' ? 'translate(-94%, 12px)' : alignmentClass === 'align-left' ? 'translate(-6%, 12px)' : 'translate(-50%, 12px)')
        : (alignmentClass === 'align-right' ? 'translate(-94%, calc(-100% - 12px))' : alignmentClass === 'align-left' ? 'translate(-6%, calc(-100% - 12px))' : 'translate(-50%, calc(-100% - 12px))'),
    };
  }

  return (
    <div className="chart-block" ref={containerRef}>
      <div className="chart-head">
        <div className="chart-title-group">
          <span>DAILY CONSISTENCY</span>
          {activePoint ? (
            <span className="chart-live-stat">
              <b>{fmtDate(activePoint.date, { weekday: 'short', month: 'short', day: 'numeric' })}</b>:{' '}
              {activePoint.hasScheduled ? (
                <>
                  <span className="live-stat-pct">{activePoint.pct}%</span> ({activePoint.completedCount}/{activePoint.dueCount} complete)
                  {activePoint.pct >= target && <span className="live-target-badge met">Target met</span>}
                </>
              ) : (
                <span className="live-stat-empty">No habits scheduled</span>
              )}
              {activePoint.isFuture && <span className="live-future-tag">Future</span>}
            </span>
          ) : (
            <span className="chart-subtitle-note">
              {monthName} {year} · Hover or tap points
            </span>
          )}
        </div>
        <span className="target-label" title={`Success target set to ${target}%`}>
          <Target size={13} aria-hidden="true" /> {target}% target
        </span>
      </div>

      <div className="chart-area-wrapper">
        <div
          className="chart-area"
          onMouseLeave={() => setHoverIndex(null)}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedIndex(null);
            }
          }}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            role="region"
            aria-label={`${monthName} ${year} daily consistency line chart with ${days} calendar days`}
            className="consistency-chart-svg"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedIndex(null);
              }
            }}
          >
            <defs>
              <linearGradient id={`areaGrad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f4b400" stopOpacity="0.25" />
                <stop offset="65%" stopColor="#f4b400" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#f4b400" stopOpacity="0.0" />
              </linearGradient>

              <filter id={`pointGlow-${chartId}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal guidelines */}
            <line className="chart-gridline top" x1={padLeft} x2={svgWidth - padRight} y1={topY} y2={topY} />
            <line
              className="chart-gridline mid"
              x1={padLeft}
              x2={svgWidth - padRight}
              y1={baselineY - 0.5 * usableHeight}
              y2={baselineY - 0.5 * usableHeight}
            />
            <line className="chart-gridline baseline" x1={padLeft} x2={svgWidth - padRight} y1={baselineY} y2={baselineY} />

            {/* Target line */}
            <g className="chart-target-ref">
              <line
                className="target-line"
                x1={padLeft}
                x2={svgWidth - padRight}
                y1={targetY}
                y2={targetY}
              />
              <text x={svgWidth - padRight + 2} y={targetY + 3} className="target-ref-text">
                {target}%
              </text>
            </g>

            {/* Area fill beneath line */}
            {totalDueInMonth > 0 && (
              <path
                className="consistency-area"
                d={areaD}
                fill={`url(#areaGrad-${chartId})`}
                aria-hidden="true"
              />
            )}

            {/* Main Line */}
            <path
              className="consistency-line"
              d={lineD}
              fill="none"
              stroke="#f4b400"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              aria-hidden="true"
            />

            {/* Vertical crosshair guide */}
            {activePoint && (
              <line
                className="chart-crosshair"
                x1={activePoint.x}
                x2={activePoint.x}
                y1={topY - 4}
                y2={baselineY + 4}
                aria-hidden="true"
              />
            )}

            {/* Day Points */}
            {points.map((p, index) => {
              const isPointSelected = selectedIndex === index;
              const isPointHovered = hoverIndex === index;
              const isPointActive = isPointSelected || isPointHovered;
              const meetsTarget = p.hasScheduled && p.pct >= target;

              let dotClass = 'chart-dot';
              if (p.isFuture) dotClass += ' future';
              if (!p.hasScheduled) dotClass += ' nodue';
              if (meetsTarget) dotClass += ' on-target';
              if (isPointActive) dotClass += ' active';
              if (isPointSelected) dotClass += ' selected';

              const radius = isPointActive ? 5.5 : p.hasScheduled ? 3.6 : 2.4;

              const label = `${fmtDate(p.date, { weekday: 'long', month: 'long', day: 'numeric' })}: ${
                p.hasScheduled ? `${p.completedCount} of ${p.dueCount} completed (${p.pct}%)` : 'no scheduled habits'
              }${meetsTarget ? ', target met' : ''}${p.isFuture ? ', future date' : ''}${isPointSelected ? ', selected' : ''}`;

              return (
                <g
                  key={p.day}
                  ref={el => { pointRefs.current[index] = el; }}
                  tabIndex={0}
                  role="button"
                  aria-label={label}
                  aria-pressed={isPointSelected}
                  className={`chart-point-group ${isPointActive ? 'focused' : ''}`}
                  onMouseEnter={() => setHoverIndex(index)}
                  onFocus={() => setHoverIndex(index)}
                  onBlur={() => setHoverIndex(null)}
                  onClick={() => handlePointClick(index)}
                  onKeyDown={e => handleKeyDown(e, index)}
                >
                  {/* Generous hit circle */}
                  <circle cx={p.x} cy={p.y} r="14" className="chart-hit" />

                  {/* Pulse aura */}
                  {isPointActive && (
                    <circle
                      className="chart-dot-aura"
                      cx={p.x}
                      cy={p.y}
                      r="8.5"
                      filter={`url(#pointGlow-${chartId})`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Main Circle */}
                  <circle
                    className={dotClass}
                    cx={p.x}
                    cy={p.y}
                    r={radius}
                    aria-hidden="true"
                  />
                </g>
              );
            })}
          </svg>

          {/* Compact Dismissable Day Summary Box */}
          {activePoint && (
            <div
              className={`chart-tooltip-badge compact-day-summary ${alignmentClass} ${isSelected ? 'is-selected' : 'is-hover'}`}
              style={tooltipStyle}
              role={isSelected ? 'dialog' : 'tooltip'}
              aria-label={`Day summary for ${fmtDate(activePoint.date)}`}
            >
              <div className="tooltip-head">
                <strong>{fmtDate(activePoint.date, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                <div className="tooltip-tags">
                  {activePoint.isToday && <span className="tooltip-today-tag">Today</span>}
                  {activePoint.isFuture && <span className="tooltip-future-tag">Future</span>}
                  {isSelected && (
                    <button
                      type="button"
                      className="summary-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(null);
                        setHoverIndex(null);
                      }}
                      title="Dismiss day summary (Esc)"
                      aria-label="Dismiss day summary"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
              <div className="tooltip-body">
                {activePoint.hasScheduled ? (
                  <>
                    <span className="tooltip-stat">
                      <b>{activePoint.completedCount}</b>/{activePoint.dueCount} done
                    </span>
                    <span className={`tooltip-pct ${activePoint.pct >= target ? 'met' : ''}`}>
                      {activePoint.pct}%
                    </span>
                  </>
                ) : (
                  <span className="tooltip-no-habits">No scheduled habits</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chart-labels">
        <span>1</span>
        <span>{Math.ceil(days / 4)}</span>
        <span>{Math.ceil(days / 2)}</span>
        <span>{Math.ceil((days * 3) / 4)}</span>
        <span>{days}</span>
      </div>
    </div>
  );
};
export const DailyConsistencyChart = React.memo(DailyConsistencyChartComponent);
