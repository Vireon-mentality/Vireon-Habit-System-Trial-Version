import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { Habit, iso, parseDate, addDays, isDue } from './utils';

export interface RankInfo {
  index: number;
  name: string;
  color: string;
  accent: string;
  glow: string;
  subtitle: string;
  tip: string;
  starsToPromote: number;
}

export const RANKS: RankInfo[] = [
  {
    index: 0,
    name: 'Iron',
    color: '#9ca3af',
    accent: '#4b5563',
    glow: 'rgba(156, 163, 175, 0.25)',
    subtitle: 'Initiate Discipline',
    tip: 'Build your daily foundation. Complete all scheduled habits each day to forge consistency.',
    starsToPromote: 5,
  },
  {
    index: 1,
    name: 'Bronze',
    color: '#d97706',
    accent: '#92400e',
    glow: 'rgba(217, 119, 6, 0.3)',
    subtitle: 'Tempered Routine',
    tip: 'Great momentum. Complete 100% of your daily scheduled habits to temper your routine.',
    starsToPromote: 5,
  },
  {
    index: 2,
    name: 'Silver',
    color: '#cbd5e1',
    accent: '#64748b',
    glow: 'rgba(203, 213, 225, 0.35)',
    subtitle: 'Solidified Habit',
    tip: 'Discipline is solidifying. Full daily execution earns stars toward the golden echelon.',
    starsToPromote: 5,
  },
  {
    index: 3,
    name: 'Gold',
    color: '#f59e0b',
    accent: '#b45309',
    glow: 'rgba(245, 158, 11, 0.45)',
    subtitle: 'Royal Execution',
    tip: 'Exemplary consistency. Maintain perfect days to advance toward high-tier mastery.',
    starsToPromote: 5,
  },
  {
    index: 4,
    name: 'Platinum',
    color: '#38bdf8',
    accent: '#0284c7',
    glow: 'rgba(56, 189, 248, 0.5)',
    subtitle: 'Precision Mastery',
    tip: 'Exceptional resilience. Precision execution without missed days leads to elite status.',
    starsToPromote: 5,
  },
  {
    index: 5,
    name: 'Diamond',
    color: '#06b6d4',
    accent: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.55)',
    subtitle: 'Indomitable Will',
    tip: 'Flawless focus. You are among the most disciplined, pushing toward the celestial tier.',
    starsToPromote: 5,
  },
  {
    index: 6,
    name: 'Ascendant',
    color: '#c084fc',
    accent: '#7e22ce',
    glow: 'rgba(192, 132, 252, 0.65)',
    subtitle: 'Celestial Focus',
    tip: 'Celestial consistency. Five final perfect days to achieve true immortal Legend.',
    starsToPromote: 5,
  },
  {
    index: 7,
    name: 'Legend',
    color: '#ef4444',
    accent: '#b91c1c',
    glow: 'rgba(239, 68, 68, 0.75)',
    subtitle: 'Immortal Habit Master',
    tip: 'Pinnacle of discipline achieved. Maintain your 5-star crown of immortal habit mastery.',
    starsToPromote: 5,
  },
];

export interface RankProgress {
  rankIndex: number;
  rank: RankInfo;
  nextRank: RankInfo | null;
  stars: number; // 0 to 5
  progressPct: number; // 0 to 100%
  starsToNext: number;
  successfulDays: number;
  missedDays: number;
  neutralDays: number;
  totalScheduledDays: number;
}

export function calculateRankAndStars(
  allHabits: Habit[],
  completions: Set<string>,
  today: Date,
  penaltyAppliedDays: string[] = []
): RankProgress {
  if (!allHabits.length) {
    return {
      rankIndex: 0,
      rank: RANKS[0],
      nextRank: RANKS[1],
      stars: 0,
      progressPct: 0,
      starsToNext: 5,
      successfulDays: 0,
      missedDays: 0,
      neutralDays: 0,
      totalScheduledDays: 0,
    };
  }

  // History start: earliest createdAt date among habits
  const historyStart = new Date(Math.min(...allHabits.map(h => parseDate(h.createdAt).getTime())));
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let rankIndex = 0; // 0 = Iron, 7 = Legend
  let stars = 0; // 0 to 5
  let successfulDays = 0;
  let missedDays = 0;
  let neutralDays = 0;
  let totalScheduledDays = 0;

  // Determine latest date to evaluate: at least today, or the latest date with any recorded completion
  let maxTime = todayClean.getTime();
  completions.forEach(c => {
    const parts = c.split('|');
    if (parts[1]) {
      const dt = parseDate(parts[1]).getTime();
      if (!isNaN(dt) && dt > maxTime) {
        maxTime = dt;
      }
    }
  });
  const maxDate = new Date(maxTime);

  // Iterate day-by-day in chronological order from historyStart up to maxDate
  for (let d = new Date(historyStart); d <= maxDate; d = addDays(d, 1)) {
    const dueHabits = allHabits.filter(h => isDue(h, d, true));

    // A day with no habits scheduled has no effect: neither earns nor removes a star
    if (dueHabits.length === 0) {
      neutralDays++;
      continue;
    }

    const dIso = iso(d);
    totalScheduledDays++;
    const completedCount = dueHabits.filter(h => completions.has(`${h.id}|${dIso}`)).length;
    const isAllComplete = completedCount === dueHabits.length;
    const isPenalized = penaltyAppliedDays.includes(dIso);

    if (isAllComplete) {
      // Calendar day where every scheduled habit is checked complete: earn 1 star
      successfulDays++;
      if (rankIndex === 7) {
        // At the highest rank, keep the user at that rank after reaching five stars
        stars = Math.min(5, stars + 1);
      } else {
        stars += 1;
        // Earning all five stars promotes the user to the next rank and resets stars to zero
        if (stars === 5) {
          rankIndex += 1;
          stars = 0;
        }
      }
    } else if (isPenalized) {
      // Only current-day expired grace period can trigger a penalty
      missedDays++;
      if (stars > 0) {
        stars -= 1;
      } else if (rankIndex > 0) {
        // Demote to previous rank with 4 stars
        rankIndex -= 1;
        stars = 4;
      } else {
        // At Iron with zero stars, a penalty cannot lower the user further
        stars = 0;
      }
    } else {
      // Skips on past or future dates without an applied penalty do not remove stars
      neutralDays++;
    }
  }

  const rank = RANKS[rankIndex];
  const nextRank = rankIndex < 7 ? RANKS[rankIndex + 1] : null;
  // Progress to next rank: 5 stars per rank
  const progressPct = rankIndex === 7 && stars === 5 ? 100 : Math.round((stars / 5) * 100);
  const starsToNext = rankIndex < 7 ? 5 - stars : Math.max(0, 5 - stars);

  return {
    rankIndex,
    rank,
    nextRank,
    stars,
    progressPct,
    starsToNext,
    successfulDays,
    missedDays,
    neutralDays,
    totalScheduledDays,
  };
}

// -------------------------------------------------------------

// EMBLEM COMPONENT
// -------------------------------------------------------------
interface RankEmblemProps {
  rankIndex: number;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

const RankEmblemComponent: React.FC<RankEmblemProps> = ({
  rankIndex,
  size = 54,
  className = '',
  showTooltip = false,
}) => {
  const safeIndex = Math.min(7, Math.max(0, rankIndex));
  const rank = RANKS[safeIndex];

  return (
    <div
      className={`rank-emblem-wrap rank-emblem-${rank.name.toLowerCase()} ${className}`}
      title={showTooltip ? `${rank.name} Emblem (Tier ${safeIndex + 1})` : undefined}
      role="img"
      aria-label={`${rank.name} rank emblem`}
      style={{
        width: `${size}px`,
        height: `${Math.round(size * 1.08)}px`,
        filter: `drop-shadow(0 2px 6px rgba(0,0,0,0.6)) drop-shadow(0 0 10px ${rank.glow})`,
      }}
    >
      <svg
        viewBox="0 0 64 68"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="emblem-svg"
      >
        <defs>
          {/* Iron Gradients */}
          <linearGradient id="ironShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="ironBevel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Bronze Gradients */}
          <linearGradient id="bronzeShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id="bronzeGoldRim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Silver Gradients */}
          <linearGradient id="silverShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="silverHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>

          {/* Gold Gradients */}
          <linearGradient id="goldShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="royalGoldCore" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Platinum Gradients */}
          <linearGradient id="platShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="45%" stopColor="#38bdf8" />
            <stop offset="80%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="platWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* Diamond Gradients */}
          <linearGradient id="diamondShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="40%" stopColor="#22d3ee" />
            <stop offset="80%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#083344" />
          </linearGradient>
          <linearGradient id="diamondFacet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.4" />
          </linearGradient>

          {/* Ascendant Gradients */}
          <linearGradient id="ascendantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="35%" stopColor="#c084fc" />
            <stop offset="75%" stopColor="#7e22ce" />
            <stop offset="100%" stopColor="#3b0764" />
          </linearGradient>
          <linearGradient id="celestialGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Legend Gradients */}
          <linearGradient id="legendGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="30%" stopColor="#ef4444" />
            <stop offset="75%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
          <linearGradient id="legendCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* ---------------- 1. IRON ---------------- */}
        {safeIndex === 0 && (
          <g className="emblem-g-iron">
            {/* Hexagonal Iron Shield */}
            <path
              d="M10 14 L32 6 L54 14 L49 46 L32 62 L15 46 Z"
              fill="url(#ironShieldGrad)"
              stroke="url(#ironBevel)"
              strokeWidth="2"
            />
            {/* Inner Plate */}
            <path
              d="M16 18 L32 12 L48 18 L44 43 L32 55 L20 43 Z"
              fill="#282d37"
              stroke="#4b5563"
              strokeWidth="1.2"
            />
            {/* Corner Rivets */}
            <circle cx="16" cy="18" r="1.8" fill="#9ca3af" />
            <circle cx="48" cy="18" r="1.8" fill="#9ca3af" />
            <circle cx="43" cy="42" r="1.8" fill="#9ca3af" />
            <circle cx="21" cy="42" r="1.8" fill="#9ca3af" />
            <circle cx="32" cy="11" r="1.8" fill="#9ca3af" />
            {/* Center Forged Chevron V */}
            <path
              d="M23 23 L32 37 L41 23 L38 23 L32 32 L26 23 Z"
              fill="#9ca3af"
              stroke="#6b7280"
              strokeWidth="0.8"
            />
            <path
              d="M20 45 L32 53 L44 45"
              stroke="#4b5563"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ---------------- 2. BRONZE ---------------- */}
        {safeIndex === 1 && (
          <g className="emblem-g-bronze">
            {/* Contoured Hoplite Shield */}
            <path
              d="M12 12 C24 8, 40 8, 52 12 C56 28, 54 44, 32 63 C10 44, 8 28, 12 12 Z"
              fill="url(#bronzeShieldGrad)"
              stroke="url(#bronzeGoldRim)"
              strokeWidth="2"
            />
            {/* Inner Ring */}
            <path
              d="M17 16 C26 13, 38 13, 47 16 C50 30, 47 43, 32 56 C17 43, 14 30, 17 16 Z"
              fill="#451a03"
              opacity="0.6"
              stroke="#d97706"
              strokeWidth="1.2"
            />
            {/* Bronze Studs */}
            <circle cx="19" cy="18" r="1.5" fill="#fcd34d" />
            <circle cx="32" cy="13" r="1.6" fill="#fcd34d" />
            <circle cx="45" cy="18" r="1.5" fill="#fcd34d" />
            <circle cx="48" cy="33" r="1.5" fill="#fcd34d" />
            <circle cx="41" cy="46" r="1.5" fill="#fcd34d" />
            <circle cx="23" cy="46" r="1.5" fill="#fcd34d" />
            <circle cx="16" cy="33" r="1.5" fill="#fcd34d" />
            {/* Bronze Gladius / Spear Emblem */}
            <path
              d="M32 18 L36 29 L34 44 L32 47 L30 44 L28 29 Z"
              fill="url(#bronzeGoldRim)"
              stroke="#78350f"
              strokeWidth="0.8"
            />
            <path d="M26 31 L38 31" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="32" cy="49" r="1.8" fill="#fbbf24" />
          </g>
        )}

        {/* ---------------- 3. SILVER ---------------- */}
        {safeIndex === 2 && (
          <g className="emblem-g-silver">
            {/* Winged Kite Shield */}
            <path
              d="M7 16 L32 6 L57 16 L53 38 L32 64 L11 38 Z"
              fill="url(#silverShieldGrad)"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* Dual Silver Wings */}
            <path
              d="M7 16 L17 13 L20 30 L11 38 Z"
              fill="#94a3b8"
              opacity="0.7"
              stroke="#cbd5e1"
              strokeWidth="0.8"
            />
            <path
              d="M57 16 L47 13 L44 30 L53 38 Z"
              fill="#94a3b8"
              opacity="0.7"
              stroke="#cbd5e1"
              strokeWidth="0.8"
            />
            {/* Inner Crest */}
            <path
              d="M17 18 L32 12 L47 18 L44 37 L32 56 L20 37 Z"
              fill="#334155"
              stroke="url(#silverHighlight)"
              strokeWidth="1.4"
            />
            {/* Polished Silver Blade Motif */}
            <path
              d="M32 17 L36 28 L39 42 L32 50 L25 42 L28 28 Z"
              fill="url(#silverHighlight)"
              stroke="#1e293b"
              strokeWidth="0.8"
            />
            {/* Specular Star Sparkle */}
            <path
              d="M32 26 L34 32 L40 32 L35 36 L37 42 L32 38 L27 42 L29 36 L24 32 L30 32 Z"
              fill="#ffffff"
            />
          </g>
        )}

        {/* ---------------- 4. GOLD ---------------- */}
        {safeIndex === 3 && (
          <g className="emblem-g-gold">
            {/* Crowned Knight Aegis */}
            <path
              d="M8 18 C18 12, 46 12, 56 18 C58 36, 52 50, 32 65 C12 50, 6 36, 8 18 Z"
              fill="url(#goldShieldGrad)"
              stroke="#fef08a"
              strokeWidth="1.8"
            />
            {/* Royal Triple Crown on Top */}
            <path
              d="M20 14 L24 4 L32 11 L40 4 L44 14 Z"
              fill="url(#royalGoldCore)"
              stroke="#b45309"
              strokeWidth="1"
            />
            <circle cx="24" cy="4" r="1.4" fill="#ffffff" />
            <circle cx="32" cy="11" r="1.6" fill="#fef08a" />
            <circle cx="40" cy="4" r="1.4" fill="#ffffff" />
            {/* Inner Royal Shield */}
            <path
              d="M16 22 C23 18, 41 18, 48 22 C49 35, 46 45, 32 57 C18 45, 15 35, 16 22 Z"
              fill="#451a03"
              stroke="url(#royalGoldCore)"
              strokeWidth="1.4"
            />
            {/* Central Vireon Gold Crest */}
            <path
              d="M23 26 L41 26 L32 46 Z"
              fill="url(#royalGoldCore)"
              stroke="#b45309"
              strokeWidth="1"
            />
            <path d="M26 26 L38 26 L32 40 Z" fill="#fffbeb" />
            <circle cx="32" cy="33" r="2.4" fill="#f59e0b" />
            {/* Golden Laurel Flares */}
            <path
              d="M11 26 C13 36, 17 44, 25 50"
              stroke="#fef08a"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M53 26 C51 36, 47 44, 39 50"
              stroke="#fef08a"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* ---------------- 5. PLATINUM ---------------- */}
        {safeIndex === 4 && (
          <g className="emblem-g-platinum">
            {/* Modern High-Tech Faceted Aegis */}
            <path
              d="M6 16 L20 8 L32 4 L44 8 L58 16 L52 46 L32 65 L12 46 Z"
              fill="url(#platShieldGrad)"
              stroke="#e0f2fe"
              strokeWidth="1.8"
            />
            {/* Angular Cybernetic Wings */}
            <path
              d="M6 16 L18 13 L22 32 L12 46 Z"
              fill="url(#platWingGrad)"
              opacity="0.75"
              stroke="#38bdf8"
              strokeWidth="0.8"
            />
            <path
              d="M58 16 L46 13 L42 32 L52 46 Z"
              fill="url(#platWingGrad)"
              opacity="0.75"
              stroke="#38bdf8"
              strokeWidth="0.8"
            />
            {/* Inner Core Plate */}
            <path
              d="M17 19 L32 13 L47 19 L43 42 L32 56 L21 42 Z"
              fill="#082f49"
              stroke="#38bdf8"
              strokeWidth="1.4"
            />
            {/* Glowing Cyan Diamond Matrix */}
            <path d="M32 20 L40 33 L32 46 L24 33 Z" fill="url(#platWingGrad)" stroke="#e0f2fe" strokeWidth="1" />
            <path d="M32 24 L37 33 L32 42 L27 33 Z" fill="#ffffff" />
            {/* Precision Circuit Accents */}
            <line x1="32" y1="6" x2="32" y2="13" stroke="#bae6fd" strokeWidth="1.5" />
            <circle cx="32" cy="33" r="2" fill="#0284c7" />
          </g>
        )}

        {/* ---------------- 6. DIAMOND ---------------- */}
        {safeIndex === 5 && (
          <g className="emblem-g-diamond">
            {/* Prismatic Brilliant Diamond Shield */}
            <path
              d="M5 20 L20 6 L32 2 L44 6 L59 20 L51 48 L32 66 L13 48 Z"
              fill="url(#diamondShieldGrad)"
              stroke="#cffafe"
              strokeWidth="1.8"
            />
            {/* Diamond Spires (Upper Jewels) */}
            <polygon points="20,6 32,2 32,16 18,17" fill="url(#diamondFacet)" />
            <polygon points="44,6 32,2 32,16 46,17" fill="url(#diamondFacet)" opacity="0.8" />
            <polygon points="5,20 20,6 23,22 10,28" fill="#0891b2" opacity="0.6" />
            <polygon points="59,20 44,6 41,22 54,28" fill="#0891b2" opacity="0.6" />
            {/* Inner Prismatic Heart */}
            <path
              d="M16 23 L32 15 L48 23 L43 45 L32 58 L21 45 Z"
              fill="#083344"
              stroke="#67e8f9"
              strokeWidth="1.5"
            />
            {/* Faceted Brilliant Cut Diamond in Center */}
            <polygon points="32,22 42,32 32,48 22,32" fill="#a5f3fc" stroke="#ffffff" strokeWidth="1" />
            <polygon points="32,22 42,32 32,34" fill="#ffffff" />
            <polygon points="32,22 22,32 32,34" fill="#67e8f9" />
            <polygon points="22,32 32,48 32,34" fill="#0891b2" />
            <polygon points="42,32 32,48 32,34" fill="#06b6d4" />
            {/* Refraction Flares */}
            <circle cx="32" cy="34" r="2.2" fill="#ffffff" />
            <line x1="32" y1="18" x2="32" y2="50" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
            <line x1="18" y1="34" x2="46" y2="34" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
          </g>
        )}

        {/* ---------------- 7. ASCENDANT ---------------- */}
        {safeIndex === 6 && (
          <g className="emblem-g-ascendant">
            {/* Celestial Floating Halo Arc */}
            <path
              d="M14 12 C22 4, 42 4, 50 12"
              stroke="url(#celestialGold)"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="21" cy="7" r="1.8" fill="#fef08a" />
            <circle cx="32" cy="4" r="2.4" fill="#ffffff" />
            <circle cx="43" cy="7" r="1.8" fill="#fef08a" />
            {/* Soaring Angelic Wing Mantle */}
            <path
              d="M3 18 C10 16, 18 20, 20 34 L12 50 C4 36, 1 24, 3 18 Z"
              fill="url(#celestialGold)"
              opacity="0.8"
              stroke="#fef08a"
              strokeWidth="0.8"
            />
            <path
              d="M61 18 C54 16, 46 20, 44 34 L52 50 C60 36, 63 24, 61 18 Z"
              fill="url(#celestialGold)"
              opacity="0.8"
              stroke="#fef08a"
              strokeWidth="0.8"
            />
            {/* Celestial Aegis Body */}
            <path
              d="M13 18 L32 10 L51 18 L47 48 L32 66 L17 48 Z"
              fill="url(#ascendantGrad)"
              stroke="url(#celestialGold)"
              strokeWidth="2"
            />
            {/* Cosmic Amethyst Inner Void */}
            <path
              d="M19 22 L32 16 L45 22 L42 45 L32 58 L22 45 Z"
              fill="#2e1065"
              stroke="#c084fc"
              strokeWidth="1.2"
            />
            {/* Transcendent Starlight Cross */}
            <path
              d="M32 20 L35 30 L45 33 L35 36 L32 46 L29 36 L19 33 L29 30 Z"
              fill="#ffffff"
              stroke="#fef08a"
              strokeWidth="0.8"
            />
            <circle cx="32" cy="33" r="2.8" fill="#fde047" />
          </g>
        )}

        {/* ---------------- 8. LEGEND ---------------- */}
        {safeIndex === 7 && (
          <g className="emblem-g-legend">
            {/* Mythic Radiant Sunburst Aura */}
            <g opacity="0.85" className="legend-sunburst">
              <line x1="32" y1="0" x2="32" y2="7" stroke="#fef08a" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="16" y1="4" x2="20" y2="9" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="48" y1="4" x2="44" y2="9" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="4" y1="16" x2="9" y2="19" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="60" y1="16" x2="55" y2="19" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
            </g>
            {/* Imperial Sovereign Crown */}
            <path
              d="M18 14 L21 4 L28 11 L32 2 L36 11 L43 4 L46 14 Z"
              fill="url(#legendCrownGrad)"
              stroke="#450a0a"
              strokeWidth="1.2"
            />
            {/* Crown Ruby Jewels */}
            <circle cx="21" cy="4" r="1.5" fill="#ef4444" />
            <circle cx="32" cy="2" r="2.2" fill="#ffffff" />
            <circle cx="43" cy="4" r="1.5" fill="#ef4444" />
            <circle cx="28" cy="11" r="1.2" fill="#fef08a" />
            <circle cx="36" cy="11" r="1.2" fill="#fef08a" />
            {/* Fiery Phoenix Wings flanking */}
            <path
              d="M2 18 C12 16, 17 25, 18 36 L11 53 C3 38, 0 26, 2 18 Z"
              fill="url(#legendCrownGrad)"
              stroke="#fef08a"
              strokeWidth="1"
            />
            <path
              d="M62 18 C52 16, 47 25, 46 36 L53 53 C61 38, 64 26, 62 18 Z"
              fill="url(#legendCrownGrad)"
              stroke="#fef08a"
              strokeWidth="1"
            />
            {/* Sovereign Dragon Shield */}
            <path
              d="M11 18 L32 9 L53 18 L48 50 L32 67 L16 50 Z"
              fill="url(#legendGrad)"
              stroke="url(#legendCrownGrad)"
              strokeWidth="2.2"
            />
            {/* Inner Crimson Chamber */}
            <path
              d="M17 22 L32 15 L47 22 L43 46 L32 60 L21 46 Z"
              fill="#450a0a"
              stroke="#f59e0b"
              strokeWidth="1.4"
            />
            {/* Center Incandescent Vireon Phoenix Emblem */}
            <path
              d="M22 26 L42 26 L32 48 Z"
              fill="url(#legendCrownGrad)"
              stroke="#ffffff"
              strokeWidth="1"
            />
            <path d="M26 26 L38 26 L32 40 Z" fill="#ffffff" />
            <circle cx="32" cy="33" r="3.2" fill="#ef4444" />
            <circle cx="32" cy="33" r="1.8" fill="#fef08a" />
            {/* Imperial Golden Laurel Base */}
            <path
              d="M18 52 C23 57, 41 57, 46 52"
              stroke="#fef08a"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
export const RankEmblem = React.memo(RankEmblemComponent);

// -------------------------------------------------------------
// ANIMATED STARS COMPONENT
// -------------------------------------------------------------
interface RankStarsProps {
  stars: number; // 0 to 5
  maxStars?: number; // 5
  rankName: string;
  rankIndex?: number;
}

const RankStarsComponent: React.FC<RankStarsProps> = ({
  stars,
  maxStars = 5,
  rankName,
  rankIndex = 0,
}) => {
  const [animMap, setAnimMap] = useState<{ [index: number]: 'earned' | 'lost' | 'promoted' }>({});
  const prevStarsRef = useRef<number>(stars);
  const prevRankIndexRef = useRef<number>(rankIndex);
  const animTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Rank changed: Promotion or Demotion
    if (rankIndex !== prevRankIndexRef.current) {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);

      if (rankIndex > prevRankIndexRef.current) {
        // Promotion! All stars celebrate promotion burst
        const promoAnim: { [index: number]: 'earned' | 'lost' | 'promoted' } = {};
        for (let i = 0; i < maxStars; i++) promoAnim[i] = 'promoted';
        setAnimMap(promoAnim);
      } else {
        // Demotion: indicate loss
        const demoAnim: { [index: number]: 'earned' | 'lost' | 'promoted' } = {};
        demoAnim[maxStars - 1] = 'lost';
        setAnimMap(demoAnim);
      }
      prevStarsRef.current = stars;
      prevRankIndexRef.current = rankIndex;

      animTimeoutRef.current = window.setTimeout(() => {
        setAnimMap({});
      }, 600);
      return () => {
        if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      };
    }

    // Same rank, stars changed
    if (stars !== prevStarsRef.current) {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);

      const nextAnim: { [index: number]: 'earned' | 'lost' | 'promoted' } = {};
      if (stars > prevStarsRef.current) {
        // Stars gained!
        for (let i = prevStarsRef.current; i < stars; i++) {
          nextAnim[i] = 'earned';
        }
      } else {
        // Stars lost!
        for (let i = stars; i < prevStarsRef.current; i++) {
          nextAnim[i] = 'lost';
        }
      }

      setAnimMap(nextAnim);
      prevStarsRef.current = stars;

      animTimeoutRef.current = window.setTimeout(() => {
        setAnimMap({});
      }, 400);

      return () => {
        if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      };
    }
  }, [stars, rankIndex, maxStars]);

  return (
    <div
      className="stars rank-stars-row"
      aria-label={`${stars} of ${maxStars} rank stars for ${rankName}`}
      role="group"
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const isFilled = i < stars;
        const animState = animMap[i];

        let stateClass = '';
        if (animState === 'earned') stateClass = 'star-anim-earned';
        else if (animState === 'lost') stateClass = 'star-anim-lost';
        else if (animState === 'promoted') stateClass = 'star-anim-promoted';

        return (
          <span
            key={i}
            className={`rank-star-slot ${isFilled ? 'filled' : 'empty'} ${stateClass}`}
            title={`Star ${i + 1} of ${maxStars}${isFilled ? ' (Earned)' : ''}`}
            style={animState === 'promoted' ? { animationDelay: `${i * 35}ms` } : undefined}
          >
            <Star
              size={18}
              fill={(isFilled || animState === 'promoted') ? 'currentColor' : 'none'}
              className={(isFilled || animState === 'promoted') ? 'gold' : 'muted-star'}
            />
            {(animState === 'earned' || animState === 'promoted') && <span className="star-burst" aria-hidden="true" />}
            {animState === 'lost' && <span className="star-puff" aria-hidden="true" />}
          </span>
        );
      })}
    </div>
  );
};
export const RankStars = React.memo(RankStarsComponent);
