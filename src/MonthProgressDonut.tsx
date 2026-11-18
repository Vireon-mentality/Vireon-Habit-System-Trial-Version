import React, { useEffect, useRef, useState } from 'react';

interface MonthProgressDonutProps {
  pct: number;
  due: number;
  size?: number;
  className?: string;
}

const MonthProgressDonutComponent: React.FC<MonthProgressDonutProps> = ({
  pct,
  due,
  size = 86,
  className = '',
}) => {
  const [animatedPct, setAnimatedPct] = useState(pct);
  const animFrameRef = useRef<number | null>(null);
  const prevPctRef = useRef(pct);

  // SVG Geometry
  const center = size / 2;
  const strokeWidth = 8.5;
  const radius = center - strokeWidth / 2 - 2; // e.g. 43 - 4.25 - 2 = 36.75
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // If percentage hasn't changed, do not run animation loop
    if (prevPctRef.current === pct) {
      return;
    }

    // Check user preference for reduced motion or hidden tab
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || (typeof document !== 'undefined' && document.hidden)) {
      setAnimatedPct(pct);
      prevPctRef.current = pct;
      return;
    }

    const startVal = prevPctRef.current;
    const endVal = pct;
    const duration = 400; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentVal = startVal + (endVal - startVal) * eased;

      setAnimatedPct(currentVal);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatedPct(endVal);
        prevPctRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pct]);

  // Dashoffset calculation
  const targetPct = due > 0 ? Math.min(100, Math.max(0, animatedPct)) : 0;
  const strokeDashoffset = circumference - (targetPct / 100) * circumference;

  return (
    <div
      className={`month-progress-donut-wrap ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={due > 0 ? Math.round(targetPct) : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Month progress: ${due > 0 ? `${Math.round(targetPct)}%` : 'No scheduled habits'}`}
    >
      <svg
        className="month-donut-svg"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id="monthDonutGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d99b00" />
            <stop offset="60%" stopColor="#f4b400" />
            <stop offset="100%" stopColor="#fae082" />
          </linearGradient>
          <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer subtle shadow track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#171816"
          strokeWidth={strokeWidth}
          className="donut-track-bg"
        />

        {/* Inner track border */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#2d2e2b"
          strokeWidth={strokeWidth - 2}
          className="donut-track"
        />

        {/* Animated Progress Arc */}
        {due > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#monthDonutGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            className="donut-progress-circle"
            filter="url(#donutGlow)"
          />
        )}
      </svg>

      {/* Center Label */}
      <div className="donut-center-label">
        <strong>{due > 0 ? `${Math.round(targetPct)}%` : '—'}</strong>
      </div>
    </div>
  );
};
export const MonthProgressDonut = React.memo(MonthProgressDonutComponent);
