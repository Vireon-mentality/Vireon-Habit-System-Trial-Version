export type Habit = { id: string; name: string; weekdays: number[]; archived?: boolean; archivedAt?: string; createdAt: string };
export type Plan = { id: string; weekStart: string; text: string; done: boolean };
export type Settings = { target: number; allowFuture: boolean };
export type Store = {
  habits: Habit[];
  completions: string[];
  plans: Plan[];
  settings: Settings;
  lastChecklistActionAt?: number;
  gracePeriodStartedAt?: number;
  penaltyAppliedDays?: string[];
};
export const KEY = 'vireon-habit-system-v2';
export const LEGACY_KEY = 'vireon-habit-system-v1';
export const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parseDate = (s: string) => {
  if (!s || typeof s !== 'string') return new Date();
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
};
export const startMonday = (d: Date) => addDays(new Date(d.getFullYear(),d.getMonth(),d.getDate()),-((d.getDay()+6)%7));
export const sameMonth = (s: string, y: number, m: number) => { const d = parseDate(s); return d.getFullYear()===y && d.getMonth()===m; };
export const isDue = (h: Habit, date: Date, includeArchived = false) => {
  const dateIso = iso(date);
  const createdIso = h.createdAt || '2020-01-01';
  if (createdIso > dateIso) return false;
  if (!h.weekdays.includes(date.getDay())) return false;
  if (!h.archived) return true;
  if (!includeArchived) return false;
  return !h.archivedAt || dateIso <= h.archivedAt;
};
export const safeStore = (raw: string | null): Store | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;

    // Salvage habits
    const habitsRaw = Array.isArray(v.habits) ? v.habits : [];
    const habits: Habit[] = habitsRaw
      .filter((h: any) => h && typeof h.id === 'string' && typeof h.name === 'string')
      .map((h: any) => {
        const rawW = Array.isArray(h.weekdays) ? h.weekdays : [0, 1, 2, 3, 4, 5, 6];
        const weekdays = rawW.filter((n: any) => Number.isInteger(n) && n >= 0 && n <= 6);
        return {
          id: String(h.id),
          name: String(h.name).slice(0, 80),
          weekdays: weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6],
          archived: !!h.archived,
          archivedAt: typeof h.archivedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.archivedAt) ? h.archivedAt : undefined,
          createdAt: typeof h.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.createdAt) ? h.createdAt : '2020-01-01',
        };
      });

    // Salvage completions
    const completionsRaw = Array.isArray(v.completions) ? v.completions : [];
    const completions: string[] = completionsRaw
      .filter((s: any) => typeof s === 'string' && /^.+\|\d{4}-\d{2}-\d{2}$/.test(s));

    // Salvage plans
    const plansRaw = Array.isArray(v.plans) ? v.plans : [];
    const plans: Plan[] = plansRaw
      .filter((p: any) => p && typeof p.id === 'string' && typeof p.text === 'string')
      .map((p: any) => ({
        id: String(p.id),
        weekStart: typeof p.weekStart === 'string' ? p.weekStart : '',
        text: String(p.text).slice(0, 140),
        done: !!p.done,
      }));

    // Salvage settings
    const target = Number(v.settings?.target);
    const validTarget = Number.isFinite(target) ? Math.min(100, Math.max(1, target)) : 80;
    const allowFuture = !!v.settings?.allowFuture;

    // Salvage grace period & penalties
    const lastChecklistActionAt = typeof v.lastChecklistActionAt === 'number' && Number.isFinite(v.lastChecklistActionAt) ? v.lastChecklistActionAt : undefined;
    const gracePeriodStartedAt = typeof v.gracePeriodStartedAt === 'number' && Number.isFinite(v.gracePeriodStartedAt) ? v.gracePeriodStartedAt : undefined;
    const penaltyAppliedDays = Array.isArray(v.penaltyAppliedDays) ? v.penaltyAppliedDays.filter((s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) : [];

    return {
      habits,
      completions,
      plans,
      settings: { target: validTarget, allowFuture },
      lastChecklistActionAt,
      gracePeriodStartedAt,
      penaltyAppliedDays,
    };
  } catch {
    return null;
  }
};
export function monthDays(y: number,m: number) { return new Date(y,m+1,0).getDate(); }
export function dayStats(date: Date, habits: Habit[], completions: Set<string>, includeArchived = false) {
  const due = habits.filter(h=>isDue(h,date,includeArchived));
  const count=due.filter(h=>completions.has(`${h.id}|${iso(date)}`)).length;
  return {due:due.length,completed:count,pct:due.length?Math.round(count/due.length*100):0};
}
export type Week = {start: Date; end: Date};
export function monthWeeks(y: number,m: number): Week[] { const first=startMonday(new Date(y,m,1)); const last=new Date(y,m,monthDays(y,m)); const weeks:Week[]=[]; for(let s=new Date(first);s<=last;s=addDays(s,7))weeks.push({start:new Date(s),end:addDays(s,6)}); return weeks; }

export function calculateMonthProgress(
  year: number,
  month: number,
  allHabits: Habit[],
  completions: Set<string>
): { dueMonth: number; doneMonth: number; monthPct: number } {
  const days = monthDays(year, month);
  let dueMonth = 0;
  let doneMonth = 0;

  for (let day = 1; day <= days; day++) {
    const d = new Date(year, month, day);
    for (const h of allHabits) {
      if (isDue(h, d, true)) {
        dueMonth++;
        if (completions.has(`${h.id}|${iso(d)}`)) {
          doneMonth++;
        }
      }
    }
  }

  const monthPct = dueMonth > 0 ? Math.round((doneMonth / dueMonth) * 100) : 0;
  return { dueMonth, doneMonth, monthPct };
}

export function calculateFireStreak(
  allHabits: Habit[],
  completions: Set<string>,
  today: Date,
  isTodayExtinguished: boolean = false
): { currentStreak: number; bestStreak: number } {
  if (!allHabits.length) return { currentStreak: 0, bestStreak: 0 };

  const historyStart = new Date(Math.min(...allHabits.map(h => parseDate(h.createdAt).getTime())));
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Determine latest completion date to compute all-time best streak across history
  let latestCompletionTime = todayClean.getTime();
  completions.forEach(c => {
    const parts = c.split('|');
    if (parts[1]) {
      const dt = parseDate(parts[1]).getTime();
      if (!isNaN(dt) && dt > latestCompletionTime) {
        latestCompletionTime = dt;
      }
    }
  });

  // Calculate historical best streak by scanning chronological runs of completed days
  let bestStreak = 0;
  let histRun = 0;
  for (let d = new Date(historyStart); d <= new Date(latestCompletionTime); d = addDays(d, 1)) {
    const due = allHabits.filter(h => isDue(h, d, true));
    if (due.length === 0) continue; // neutral
    const done = due.filter(h => completions.has(`${h.id}|${iso(d)}`)).length;
    if (done === due.length) {
      histRun++;
      if (histRun > bestStreak) bestStreak = histRun;
    } else {
      histRun = 0;
    }
  }

  // If the 24-hour grace period for today expired with incomplete habits, the Fire Streak is reset to 0 (extinguished)
  if (isTodayExtinguished) {
    return { currentStreak: 0, bestStreak: Math.max(bestStreak, 0) };
  }

  // Calculate current active streak:
  let currentStreak = 0;
  const todayDue = allHabits.filter(h => isDue(h, todayClean, true));
  const todayDone = todayDue.filter(h => completions.has(`${h.id}|${iso(todayClean)}`)).length;
  const isTodayComplete = todayDue.length > 0 && todayDone === todayDue.length;

  if (isTodayComplete) {
    currentStreak++;
  }

  // Count future consecutive fully completed days (if user marked check-ins ahead)
  let forwardDate = addDays(todayClean, 1);
  while (true) {
    const due = allHabits.filter(h => isDue(h, forwardDate, true));
    if (due.length === 0) {
      const hasFurther = Array.from(completions).some(c => c.split('|')[1] > iso(forwardDate));
      if (!hasFurther) break;
      forwardDate = addDays(forwardDate, 1);
      continue;
    }
    const done = due.filter(h => completions.has(`${h.id}|${iso(forwardDate)}`)).length;
    if (done === due.length) {
      currentStreak++;
      forwardDate = addDays(forwardDate, 1);
    } else {
      break;
    }
  }

  // Step backwards from yesterday through past consecutive completed days
  let backDate = addDays(todayClean, -1);
  while (backDate >= historyStart) {
    const due = allHabits.filter(h => isDue(h, backDate, true));
    if (due.length === 0) {
      // Day with no habits scheduled is neutral: neither breaks nor adds to streak
      backDate = addDays(backDate, -1);
      continue;
    }
    const done = due.filter(h => completions.has(`${h.id}|${iso(backDate)}`)).length;
    if (done === due.length) {
      currentStreak++;
      backDate = addDays(backDate, -1);
    } else {
      // Reached an incomplete scheduled day in the past: current continuous streak ends
      break;
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);
  return { currentStreak, bestStreak };
}

