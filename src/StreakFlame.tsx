import React from 'react';

export interface StreakStateInfo {
  level: number;
  name: string;
  badge: string;
  description: string;
  color: string;
  glowColor: string;
}

export const STREAK_STATES: StreakStateInfo[] = [
  {
    level: 0,
    name: 'Cool Ash',
    badge: '0d · Cool Ash',
    description: '0 days: cool gray ash and faint wisps, with no active flame.',
    color: '#73766f',
    glowColor: 'transparent',
  },
  {
    level: 1,
    name: 'Kindled Spark',
    badge: '1d · Kindled',
    description: '1 day: a small, subtle flame.',
    color: '#e5a93b',
    glowColor: 'rgba(229, 169, 59, 0.28)',
  },
  {
    level: 2,
    name: 'Rising Flame',
    badge: '2d · Rising',
    description: '2 days: a brighter, taller flame.',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    level: 3,
    name: 'Steady Fire',
    badge: '3d · Steady',
    description: '3 days: a steady orange flame with gentle movement.',
    color: '#ff7315',
    glowColor: 'rgba(255, 115, 21, 0.52)',
  },
  {
    level: 4,
    name: 'Blazing Surge',
    badge: '4d · Blazing',
    description: '4 days: a large, vivid orange-red flame.',
    color: '#ff451a',
    glowColor: 'rgba(255, 69, 26, 0.65)',
  },
  {
    level: 5,
    name: 'Inferno Blaze',
    badge: '5+d · Inferno',
    description: '5 or more days: an intense, blazing red flame.',
    color: '#ef233c',
    glowColor: 'rgba(239, 35, 60, 0.8)',
  },
];

export const getStreakState = (streak: number): StreakStateInfo => {
  const level = Math.min(5, Math.max(0, streak));
  return STREAK_STATES[level];
};

interface StreakFlameProps {
  streak: number;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

const StreakFlameComponent: React.FC<StreakFlameProps> = ({
  streak,
  size = 38,
  className = '',
  showTooltip = true,
}) => {
  const level = Math.min(5, Math.max(0, streak));
  const state = STREAK_STATES[level];
  const tooltipText = `Streak: ${streak} day${streak === 1 ? '' : 's'} (Level ${level}: ${state.name} — ${state.description})`;

  return (
    <div
      className={`streak-flame-container lvl-${level} ${className}`}
      style={{ '--streak-color': state.color, '--streak-glow': state.glowColor } as React.CSSProperties}
      title={showTooltip ? tooltipText : undefined}
      role="img"
      aria-label={tooltipText}
    >
      <svg
        className={`streak-svg streak-svg-lvl-${level}`}
        viewBox="0 0 44 48"
        width={size}
        height={size * (48 / 44)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Level 0: Ash & Wisps */}
          <linearGradient id="ashBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#484b45" />
            <stop offset="50%" stopColor="#363833" />
            <stop offset="100%" stopColor="#222421" />
          </linearGradient>
          <linearGradient id="wispGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#9da098" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#7a7d74" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#555850" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wispGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#b4b8af" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#8c8f86" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#646660" stopOpacity="0" />
          </linearGradient>

          {/* Level 1: Subtle warm flame */}
          <linearGradient id="flameGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="55%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="coreGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>

          {/* Level 2: Brighter, taller flame */}
          <linearGradient id="flameGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>
          <linearGradient id="coreGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="60%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Level 3: Steady orange flame */}
          <linearGradient id="flameGrad3" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#9a3412" />
            <stop offset="35%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
          <linearGradient id="coreGrad3" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Level 4: Large vivid orange-red flame */}
          <linearGradient id="flameGrad4" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="30%" stopColor="#dc2626" />
            <stop offset="65%" stopColor="#ff5038" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id="coreGrad4" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="45%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Level 5: Intense blazing red flame */}
          <linearGradient id="flameGrad5" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="25%" stopColor="#b91c1c" />
            <stop offset="55%" stopColor="#ef233c" />
            <stop offset="85%" stopColor="#ff451a" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
          <linearGradient id="coreGrad5" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Filters for aura & glow */}
          <filter id="flameSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="flameIntenseGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ===================== LEVEL 0 ===================== */}
        {level === 0 && (
          <g className="streak-g-lvl-0">
            {/* Ash mound */}
            <path
              d="M7 43 C12 37, 17 36, 22 36 C27 36, 32 37, 37 43 C33 46, 11 46, 7 43 Z"
              fill="url(#ashBaseGrad)"
            />
            {/* Ash rim / texture */}
            <path
              d="M10 42 C15 38.5, 20 38, 26 38.5 C30 39, 33 40.5, 35 42.5"
              stroke="#5a5e56"
              strokeWidth="1"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />
            {/* Small cold ash cinders */}
            <circle cx="15" cy="41.5" r="1.4" fill="#31332f" />
            <circle cx="21" cy="39.5" r="1.8" fill="#42453e" />
            <circle cx="28" cy="40.5" r="1.3" fill="#353733" />
            <circle cx="18" cy="42" r="1" fill="#50534c" />
            <circle cx="25" cy="42.5" r="1.2" fill="#3e413b" />

            {/* Faint rising smoke wisps - animated */}
            <g className="streak-wisps-group">
              <path
                className="streak-wisp streak-wisp-1"
                d="M19 36 C16 30, 22 23, 18 16 C15 10, 20 5, 17 2"
                fill="none"
                stroke="url(#wispGrad1)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                className="streak-wisp streak-wisp-2"
                d="M25 35 C28 28, 22 21, 26 14 C28 9, 23 4, 25 1"
                fill="none"
                stroke="url(#wispGrad2)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                className="streak-wisp streak-wisp-3"
                d="M22 34 C20 28, 23 22, 21 16"
                fill="none"
                stroke="url(#wispGrad1)"
                strokeWidth="1.1"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>
          </g>
        )}

        {/* ===================== LEVEL 1 ===================== */}
        {level === 1 && (
          <g className="streak-g-lvl-1">
            {/* Base ember bed */}
            <ellipse cx="22" cy="42" rx="10" ry="2.8" fill="#4a3b1a" opacity="0.6" />
            <ellipse cx="22" cy="41.5" rx="7" ry="1.8" fill="#b45309" opacity="0.45" />

            {/* Small subtle flame */}
            <g className="streak-flame-motion-1" filter="url(#flameSoftGlow)">
              <path
                className="streak-flame-body-1"
                d="M22 21 C26 26.5, 29 32, 29 37 C29 41.5, 25.8 43.5, 22 43.5 C18.2 43.5, 15 41.5, 15 37 C15 32, 18 26.5, 22 21 Z"
                fill="url(#flameGrad1)"
              />
              {/* Inner core */}
              <path
                className="streak-flame-core-1"
                d="M22 30 C24.2 33.5, 25.5 36.5, 25.5 39.5 C25.5 42, 23.8 43, 22 43 C20.2 43, 18.5 42, 18.5 39.5 C18.5 36.5, 19.8 33.5, 22 30 Z"
                fill="url(#coreGrad1)"
              />
            </g>
          </g>
        )}

        {/* ===================== LEVEL 2 ===================== */}
        {level === 2 && (
          <g className="streak-g-lvl-2">
            {/* Base embers */}
            <ellipse cx="22" cy="42" rx="12" ry="3.2" fill="#7c2d12" opacity="0.5" />
            <ellipse cx="22" cy="41" rx="8" ry="2" fill="#ea580c" opacity="0.6" />

            {/* Brighter taller flame */}
            <g className="streak-flame-motion-2" filter="url(#flameSoftGlow)">
              {/* Outer mantle */}
              <path
                className="streak-flame-body-2"
                d="M22 13 C27 20, 31 27, 31 35 C31 40.5, 27 43.5, 22 43.5 C17 43.5, 13 40.5, 13 35 C13 27, 17 20, 22 13 Z"
                fill="url(#flameGrad2)"
              />
              {/* Secondary dancing tongue */}
              <path
                className="streak-tongue-2"
                d="M21 16 C25 22, 28 29, 27 36 C25 39, 21 40, 19 36 C17 32, 18 24, 21 16 Z"
                fill="url(#flameGrad2)"
                opacity="0.85"
              />
              {/* Bright inner core */}
              <path
                className="streak-flame-core-2"
                d="M22 24 C25 29, 26.5 33.5, 26.5 38 C26.5 41.5, 24.5 42.8, 22 42.8 C19.5 42.8, 17.5 41.5, 17.5 38 C17.5 33.5, 19 29, 22 24 Z"
                fill="url(#coreGrad2)"
              />
            </g>
          </g>
        )}

        {/* ===================== LEVEL 3 ===================== */}
        {level === 3 && (
          <g className="streak-g-lvl-3">
            {/* Glowing base */}
            <ellipse cx="22" cy="42.5" rx="13" ry="3.5" fill="#9a3412" opacity="0.6" />
            <ellipse cx="22" cy="41.5" rx="9" ry="2.2" fill="#f97316" opacity="0.75" />

            {/* Steady orange flame with gentle movement */}
            <g className="streak-flame-motion-3" filter="url(#flameSoftGlow)">
              {/* Main flame body with dual lick */}
              <path
                className="streak-flame-body-3"
                d="M22 7 C24.5 13, 33 22, 33 33 C33 40.5, 28 44, 22 44 C16 44, 11 40.5, 11 33 C11 25, 16 19, 18 13 C19 16, 21 13, 22 7 Z"
                fill="url(#flameGrad3)"
              />
              {/* Side flick tongue */}
              <path
                className="streak-tongue-3"
                d="M17 14 C15 20, 13 25, 15 31 C17 34, 21 34, 21 28 C21 23, 19 17, 17 14 Z"
                fill="url(#flameGrad3)"
                opacity="0.9"
              />
              {/* Hot core */}
              <path
                className="streak-flame-core-3"
                d="M22 18 C25.5 24, 27.5 30, 27.5 36.5 C27.5 41.5, 25 43, 22 43 C19 43, 16.5 41.5, 16.5 36.5 C16.5 30, 18.5 24, 22 18 Z"
                fill="url(#coreGrad3)"
              />
            </g>

            {/* Rising glowing ember spark */}
            <circle className="streak-spark streak-spark-1" cx="24" cy="18" r="1.3" fill="#fef08a" />
          </g>
        )}

        {/* ===================== LEVEL 4 ===================== */}
        {level === 4 && (
          <g className="streak-g-lvl-4">
            {/* Blazing base glow */}
            <ellipse cx="22" cy="42.5" rx="14" ry="4" fill="#991b1b" opacity="0.65" />
            <ellipse cx="22" cy="41.5" rx="10" ry="2.6" fill="#ff5038" opacity="0.8" />

            {/* Large vivid flame with animated flare */}
            <g className="streak-flame-motion-4" filter="url(#flameIntenseGlow)">
              {/* Outer mantle */}
              <path
                className="streak-flame-body-4"
                d="M22 3 C25.5 10, 35 19, 35 32 C35 41, 29.5 44.5, 22 44.5 C14.5 44.5, 9 41, 9 32 C9 22.5, 16 16, 17 9 C18 14, 20.5 10, 22 3 Z"
                fill="url(#flameGrad4)"
              />
              {/* Dynamic licking tongues */}
              <path
                className="streak-tongue-4a"
                d="M26 9 C29 16, 31 24, 29 32 C27 37, 22 36, 23 28 C24 21, 24.5 14, 26 9 Z"
                fill="url(#flameGrad4)"
                opacity="0.85"
              />
              <path
                className="streak-tongue-4b"
                d="M16 11 C13 18, 11 25, 14 33 C16 37, 20 36, 20 29 C20 22, 18 16, 16 11 Z"
                fill="url(#flameGrad4)"
                opacity="0.9"
              />
              {/* Bright fiery center */}
              <path
                className="streak-flame-core-4"
                d="M22 13 C26 20, 28.5 27, 28.5 35 C28.5 41.5, 25.5 43.5, 22 43.5 C18.5 43.5, 15.5 41.5, 15.5 35 C15.5 27, 18 20, 22 13 Z"
                fill="url(#coreGrad4)"
              />
              {/* Ultra hot white point */}
              <ellipse cx="22" cy="35" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.9" />
            </g>

            {/* Rising embers */}
            <circle className="streak-spark streak-spark-1" cx="26" cy="14" r="1.4" fill="#fed7aa" />
            <circle className="streak-spark streak-spark-2" cx="17" cy="20" r="1.2" fill="#fef08a" />
          </g>
        )}

        {/* ===================== LEVEL 5 ===================== */}
        {level === 5 && (
          <g className="streak-g-lvl-5">
            {/* Blazing corona / ambient heat halo */}
            <circle className="streak-aura-pulse" cx="22" cy="26" r="19" fill="url(#flameGrad5)" opacity="0.22" />

            {/* Base intense glow */}
            <ellipse cx="22" cy="43" rx="15" ry="4.5" fill="#7f1d1d" opacity="0.8" />
            <ellipse cx="22" cy="42" rx="11" ry="3" fill="#ef233c" opacity="0.9" />

            {/* Intense, blazing red flame with triple tongues */}
            <g className="streak-flame-motion-5" filter="url(#flameIntenseGlow)">
              {/* Outer violent mantle */}
              <path
                className="streak-flame-body-5"
                d="M22 1 C26 7.5, 36 17, 36 30.5 C36 41, 30 45, 22 45 C14 45, 8 41, 8 30.5 C8 19.5, 15 13.5, 16 6 C17.5 11.5, 20.5 8, 22 1 Z"
                fill="url(#flameGrad5)"
              />
              {/* Right crest tongue */}
              <path
                className="streak-tongue-5a"
                d="M27 6 C31 13, 33 22, 31 31 C29 37, 23 37, 24 29 C25 21, 25.5 12, 27 6 Z"
                fill="url(#flameGrad5)"
                opacity="0.9"
              />
              {/* Left crest tongue */}
              <path
                className="streak-tongue-5b"
                d="M15 8 C11 15, 10 24, 13 32 C15 37, 20 37, 20 30 C20 22, 17 14, 15 8 Z"
                fill="url(#flameGrad5)"
                opacity="0.92"
              />
              {/* Brilliant inner flame */}
              <path
                className="streak-flame-core-5"
                d="M22 9 C26.5 16, 29.5 24, 29.5 34 C29.5 42, 26 44, 22 44 C18 44, 14.5 42, 14.5 34 C14.5 24, 17.5 16, 22 9 Z"
                fill="url(#coreGrad5)"
              />
              {/* White-hot center teardrop */}
              <path
                className="streak-hot-heart-5"
                d="M22 22 C24.5 27, 26 31, 26 36 C26 40.5, 24.2 42, 22 42 C19.8 42, 18 40.5, 18 36 C18 31, 19.5 27, 22 22 Z"
                fill="#ffffff"
                opacity="0.95"
              />
            </g>

            {/* Rising embers drifting upwards */}
            <circle className="streak-spark streak-spark-1" cx="26" cy="11" r="1.5" fill="#fef08a" />
            <circle className="streak-spark streak-spark-2" cx="16" cy="16" r="1.3" fill="#ffedd5" />
            <circle className="streak-spark streak-spark-3" cx="21" cy="6" r="1.1" fill="#ffffff" />
          </g>
        )}
      </svg>
    </div>
  );
};
export const StreakFlame = React.memo(StreakFlameComponent);
