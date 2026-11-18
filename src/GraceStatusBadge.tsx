import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Clock } from 'lucide-react';

interface GraceStatusBadgeProps {
  graceExpiry: number;
  hasTodayDue: boolean;
  isTodayPending: boolean;
  isTodayExtinguished: boolean;
  isTodayFullyCompleted: boolean;
  onGraceExpired?: () => void;
}

export const GraceStatusBadge: React.FC<GraceStatusBadgeProps> = React.memo(({
  graceExpiry,
  hasTodayDue,
  isTodayPending,
  isTodayExtinguished,
  isTodayFullyCompleted,
  onGraceExpired,
}) => {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (!hasTodayDue || !isTodayPending) return;

    let intervalId: number | null = null;

    const startTimer = () => {
      if (document.hidden) return;
      if (intervalId === null) {
        setNowMs(Date.now());
        intervalId = window.setInterval(() => {
          const now = Date.now();
          setNowMs(now);
          if (now >= graceExpiry && onGraceExpired) {
            onGraceExpired();
          }
        }, 1000);
      }
    };

    const stopTimer = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hasTodayDue, isTodayPending, graceExpiry, onGraceExpired]);

  if (!hasTodayDue) return null;

  if (isTodayPending) {
    const msLeft = Math.max(0, graceExpiry - nowMs);
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

    let urgencyClass = 'urgency-muted';
    if (msLeft < 1 * 60 * 60 * 1000) {
      urgencyClass = 'urgency-urgent';
    } else if (msLeft <= 6 * 60 * 60 * 1000) {
      urgencyClass = 'urgency-warning';
    }

    return (
      <div
        className={`streak-status-tag pending ${urgencyClass}`}
        title={`24h grace period starts from your last checklist action. Remaining: ${hoursLeft}h ${minsLeft}m`}
        role="status"
      >
        <Clock size={11} aria-hidden="true" />
        <span>Pending · {hoursLeft}h {minsLeft}m grace remaining</span>
      </div>
    );
  }

  if (isTodayExtinguished) {
    return (
      <div className="streak-status-tag extinguished" title="Grace period expired with incomplete scheduled habits for today. Star deducted and streak reset.">
        <AlertTriangle size={11} aria-hidden="true" />
        <span>Extinguished · Grace expired</span>
      </div>
    );
  }

  if (isTodayFullyCompleted) {
    return (
      <div className="streak-status-tag complete" title="All habits scheduled for today are completed!">
        <Check size={11} aria-hidden="true" />
        <span>Today complete · Flame secure</span>
      </div>
    );
  }

  return null;
});
