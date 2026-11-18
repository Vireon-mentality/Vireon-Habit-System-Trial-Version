import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Activity, Archive, ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Info, Minus, Plus, Settings2, Star, Trash2, X } from 'lucide-react';
import { addDays, dayStats, Habit, iso, isDue, KEY, LEGACY_KEY, monthDays, monthWeeks, pad, parseDate, safeStore, Settings, Store, calculateMonthProgress, calculateFireStreak } from './utils';
import { StreakFlame, getStreakState, STREAK_STATES } from './StreakFlame';
import { RankEmblem, RankStars, RANKS, calculateRankAndStars } from './RankEmblem';
import { DailyConsistencyChart } from './DailyConsistencyChart';
import { MonthProgressDonut } from './MonthProgressDonut';
import { PWAInstallButton } from './PWAInstallButton';
import { GraceStatusBadge } from './GraceStatusBadge';
import { YearlyActivityHeatmap } from './YearlyActivityHeatmap';

const today = new Date(); today.setHours(0,0,0,0);
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const mondayLabels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const months=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('en',{month:'long'}).format(new Date(2024,i,1)));
const blankStore: Store={habits:[],completions:[],plans:[],settings:{target:80,allowFuture:false},penaltyAppliedDays:[]};
const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const fmt=(d:Date, options:Intl.DateTimeFormatOptions={month:'short',day:'numeric'})=>new Intl.DateTimeFormat('en',{...options,timeZone:'UTC'}).format(new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())));
const pct=(n:number,d:number)=>d?Math.round(n/d*100):0;

const TRIAL_KEY = 'vireon-trial-v1';
const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
const FULL_VERSION_URL = 'https://vireonmentality.gumroad.com/l/yzgccu';

type TrialRecord = { trialStartedAt: number; trialExpiresAt: number };

const parseTrial = (raw: string | null): TrialRecord | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const start = Number(parsed?.trialStartedAt);
    const end = Number(parsed?.trialExpiresAt);
    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end > start) {
      return { trialStartedAt: start, trialExpiresAt: end };
    }
    return null;
  } catch {
    return null;
  }
};

const getOrCreateTrial = (): TrialRecord => {
  try {
    const existing = parseTrial(localStorage.getItem(TRIAL_KEY));
    if (existing) return existing;
    const now = Date.now();
    const created: TrialRecord = {
      trialStartedAt: now,
      trialExpiresAt: now + TRIAL_DURATION_MS,
    };
    localStorage.setItem(TRIAL_KEY, JSON.stringify(created));
    return created;
  } catch {
    const now = Date.now();
    return { trialStartedAt: now, trialExpiresAt: now + TRIAL_DURATION_MS };
  }
};

function App(){
  const [trial,setTrial]=useState<TrialRecord>(()=>getOrCreateTrial());
  const [nowMs,setNowMs]=useState<number>(()=>Date.now());
  const [isTrialExpired,setIsTrialExpired]=useState<boolean>(()=>Date.now()>=trial.trialExpiresAt);
  const [data,setData]=useState<Store>(()=>safeStore(localStorage.getItem(KEY))??blankStore);
  const [year,setYear]=useState(today.getFullYear()); const [month,setMonth]=useState(today.getMonth());
  const [modal,setModal]=useState<'add'|'edit'|null>(null); const [editing,setEditing]=useState<Habit|null>(null);
  const [habitName,setHabitName]=useState(''); const [schedule,setSchedule]=useState<number[]>([1,2,3,4,5,6,0]);
  const [selectedWeek,setSelectedWeek]=useState(''); const [planText,setPlanText]=useState(''); const [selectedDate,setSelectedDate]=useState(''); const [notice,setNotice]=useState('');
  const [openWeek,setOpenWeek]=useState('');
  const [streakModalOpen,setStreakModalOpen]=useState(false);
  const [rankModalOpen,setRankModalOpen]=useState(false);
  const [archivedModalOpen,setArchivedModalOpen]=useState(false);
  const [deletingHabit,setDeletingHabit]=useState<Habit|null>(null);
  const [confirmClearOpen,setConfirmClearOpen]=useState(false);
  const [editingPlanId,setEditingPlanId]=useState<string|null>(null);
  const [editingPlanText,setEditingPlanText]=useState('');

  useEffect(()=>{
    const checkExpiration=()=>{
      const now = Date.now();
      setNowMs(now);
      let stored: TrialRecord | null = null;
      try {
        stored = parseTrial(localStorage.getItem(TRIAL_KEY));
      } catch {
        stored = null;
      }
      const active = stored ?? trial;
      if (stored && (stored.trialStartedAt !== trial.trialStartedAt || stored.trialExpiresAt !== trial.trialExpiresAt)) {
        setTrial(stored);
      }
      setIsTrialExpired(now >= active.trialExpiresAt);
    };

    checkExpiration();
    const remaining = Math.max(0, trial.trialExpiresAt - Date.now());
    let expiryTimer: number | undefined;
    if (remaining > 0 && remaining <= 2147483000) {
      expiryTimer = window.setTimeout(checkExpiration, remaining + 50);
    }
    const interval = window.setInterval(checkExpiration, 1000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TRIAL_KEY) checkExpiration();
    };
    window.addEventListener('focus', checkExpiration);
    document.addEventListener('visibilitychange', checkExpiration);
    window.addEventListener('storage', onStorage);
    return () => {
      if (expiryTimer) window.clearTimeout(expiryTimer);
      window.clearInterval(interval);
      window.removeEventListener('focus', checkExpiration);
      document.removeEventListener('visibilitychange', checkExpiration);
      window.removeEventListener('storage', onStorage);
    };
  },[trial]);

  useEffect(()=>{
    try {
      if(localStorage.getItem(LEGACY_KEY)){
        localStorage.removeItem(LEGACY_KEY);
      }
      localStorage.setItem(KEY,JSON.stringify(data));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  },[data]);

  useEffect(()=>{if(!notice)return;const t=window.setTimeout(()=>setNotice(''),3000);return()=>window.clearTimeout(t);},[notice]);

  // Global Escape key dismiss for all dialogs and inline edit
  useEffect(()=>{
    const handleKeyDown=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){
        if(editingPlanId)setEditingPlanId(null);
        else if(deletingHabit)setDeletingHabit(null);
        else if(confirmClearOpen)setConfirmClearOpen(false);
        else if(archivedModalOpen)setArchivedModalOpen(false);
        else if(selectedDate)setSelectedDate('');
        else if(streakModalOpen)setStreakModalOpen(false);
        else if(rankModalOpen)setRankModalOpen(false);
        else if(modal)setModal(null);
      }
    };
    window.addEventListener('keydown',handleKeyDown);
    return()=>window.removeEventListener('keydown',handleKeyDown);
  },[editingPlanId,deletingHabit,confirmClearOpen,archivedModalOpen,selectedDate,streakModalOpen,rankModalOpen,modal]);

  const habits=data.habits.filter(h=>!h.archived);
  const archivedHabits=data.habits.filter(h=>h.archived);
  const allHabits=data.habits;
  const completions=useMemo(()=>new Set(data.completions),[data.completions]);
  const days=monthDays(year,month); const dates=Array.from({length:days},(_,i)=>new Date(year,month,i+1));
  const { dueMonth, doneMonth, monthPct } = calculateMonthProgress(year, month, allHabits, completions);
  const weeks=useMemo(()=>monthWeeks(year,month),[year,month]);
  const thisWeek=weeks.find(w=>today>=w.start&&today<=w.end); const defaultWeek=iso((thisWeek??weeks[0]).start);
  const activeWeek=weeks.some(w=>iso(w.start)===selectedWeek)?selectedWeek:defaultWeek;
  const maxYear=today.getFullYear()+3; const years=Array.from({length:maxYear-2019},(_,i)=>2020+i);
  const todayIso = iso(today);
  const penaltyAppliedDays = useMemo(() => data.penaltyAppliedDays || [], [data.penaltyAppliedDays]);

  // Check if at least one scheduled habit has been checked today
  const anyScheduledCheckedToday = useMemo(() => {
    return habits.some(h => isDue(h, today, false) && completions.has(`${h.id}|${todayIso}`));
  }, [habits, completions, today, todayIso]);

  // Habit Performance: ordered by today's performance (completed first, neutral second, missed last)
  const habitStats = useMemo(() => {
    const list = habits.map((h) => {
      const dueDates = dates.filter(
        (d) => d >= parseDate(h.createdAt) && h.weekdays.includes(d.getDay())
      );
      const completeCount = dueDates.filter((d) => completions.has(`${h.id}|${iso(d)}`)).length;
      const val = pct(completeCount, dueDates.length);

      // Only habits scheduled for the current date are evaluated for completion/missed status
      const isScheduledToday = isDue(h, today, false);
      const isCheckedToday = isScheduledToday && completions.has(`${h.id}|${todayIso}`);

      let todayStatus: 'completed' | 'missed' | 'neutral' = 'neutral';
      let sortPriority = 2; // 1 = completed, 2 = neutral, 3 = missed

      if (!anyScheduledCheckedToday) {
        // Reset every habit's arrow to neutral gray horizontal dash until user checks at least one habit
        todayStatus = 'neutral';
        sortPriority = 2;
      } else if (isScheduledToday) {
        if (isCheckedToday) {
          // Scheduled and completed today -> green upward arrow
          todayStatus = 'completed';
          sortPriority = 1;
        } else {
          // Scheduled and left unchecked today while at least one other habit checked -> red downward arrow
          todayStatus = 'missed';
          sortPriority = 3;
        }
      } else {
        // Not scheduled today -> neutral gray horizontal dash
        todayStatus = 'neutral';
        sortPriority = 2;
      }

      return {
        habit: h,
        due: dueDates.length,
        complete: completeCount,
        pct: val,
        todayStatus,
        sortPriority,
      };
    });

    // 1. Habits completed today first.
    // 2. Neutral habits second.
    // 3. Habits missed today last.
    list.sort((a, b) => a.sortPriority - b.sortPriority);

    return list;
  }, [habits, dates, completions, today, todayIso, anyScheduledCheckedToday]);

  // Current day scheduled habits and completion status
  const todayDueHabits = useMemo(() => allHabits.filter(h => isDue(h, today, true)), [allHabits]);
  const todayDoneCount = useMemo(() => todayDueHabits.filter(h => completions.has(`${h.id}|${todayIso}`)).length, [todayDueHabits, completions, todayIso]);
  const hasTodayDue = todayDueHabits.length > 0;
  const isTodayFullyCompleted = hasTodayDue && todayDoneCount === todayDueHabits.length;
  const isTodayIncomplete = hasTodayDue && !isTodayFullyCompleted;
  const isPenaltyAppliedForToday = penaltyAppliedDays.includes(todayIso);

  // 24-hour grace period calculation from most recent checklist action or evaluation start
  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
  const graceStartTime = data.lastChecklistActionAt ?? data.gracePeriodStartedAt ?? Date.now();
  const graceExpiry = graceStartTime + GRACE_PERIOD_MS;

  // Tab visibility: pause nonessential animations and intervals when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      document.body.classList.toggle('page-hidden', document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Initialize gracePeriodStartedAt if pending day is evaluated for the first time
  useEffect(() => {
    if (isTodayIncomplete && data.lastChecklistActionAt == null && data.gracePeriodStartedAt == null) {
      setData(v => ({ ...v, gracePeriodStartedAt: Date.now() }));
    }
  }, [isTodayIncomplete, data.lastChecklistActionAt, data.gracePeriodStartedAt]);

  const isGraceExpired = isTodayIncomplete && (Date.now() >= graceExpiry);
  const isTodayExtinguished = isTodayIncomplete && (isGraceExpired || isPenaltyAppliedForToday);
  const isTodayPending = isTodayIncomplete && !isGraceExpired && !isPenaltyAppliedForToday;

  // Real-time one-time penalty application when grace period expires
  useEffect(() => {
    if (!isTodayIncomplete || isPenaltyAppliedForToday) return;

    const remainingMs = Math.max(0, graceExpiry - Date.now());
    const timer = setTimeout(() => {
      setData(v => {
        const penalties = v.penaltyAppliedDays || [];
        if (penalties.includes(todayIso)) return v;
        return { ...v, penaltyAppliedDays: [...penalties, todayIso] };
      });
      setNotice('24-hour grace period expired: 1 rank star deducted and streak reset.');
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [isTodayIncomplete, isPenaltyAppliedForToday, graceExpiry, todayIso]);

  const { currentStreak, bestStreak } = useMemo(
    () => calculateFireStreak(allHabits, completions, today, isTodayExtinguished),
    [allHabits, completions, today, isTodayExtinguished]
  );
  const streakState = useMemo(() => getStreakState(currentStreak), [currentStreak]);

  const rankData = useMemo(
    () => calculateRankAndStars(allHabits, completions, today, penaltyAppliedDays),
    [allHabits, completions, today, penaltyAppliedDays]
  );
  const { rank, nextRank, stars, rankIndex, progressPct: rankProgress, starsToNext } = rankData;

  // Rank-change animation and accessibility announcement (debounced, no initial-load trigger)
  const [rankAnimState, setRankAnimState] = useState<'promoted' | 'demoted' | null>(null);
  const [rankAnnouncement, setRankAnnouncement] = useState<string>('');
  const prevRankIndexRef = useRef<number>(rankIndex);
  const rankAnimTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevRankIndexRef.current !== rankIndex) {
      if (rankAnimTimeoutRef.current) clearTimeout(rankAnimTimeoutRef.current);

      if (rankIndex > prevRankIndexRef.current) {
        setRankAnimState('promoted');
        setRankAnnouncement(`Rank up: ${rank.name} achieved`);
      } else {
        setRankAnimState('demoted');
        setRankAnnouncement(`Rank decreased to ${rank.name}`);
      }
      prevRankIndexRef.current = rankIndex;

      rankAnimTimeoutRef.current = window.setTimeout(() => {
        setRankAnimState(null);
      }, 700);

      return () => {
        if (rankAnimTimeoutRef.current) clearTimeout(rankAnimTimeoutRef.current);
      };
    }
  }, [rankIndex, rank.name]);

  const currentPlans = useMemo(() => data.plans.filter(p => p.weekStart === activeWeek), [data.plans, activeWeek]);
  const updateSettings = (settings: Settings) => setData(v => ({ ...v, settings }));
  const toggleCompletion=(h:Habit,d:Date)=>{if(d<parseDate(h.createdAt)){setNotice('This habit did not exist on that date.');return;}const key=`${h.id}|${iso(d)}`;const actionTimestamp=Date.now();setData(v=>({...v,lastChecklistActionAt:actionTimestamp,completions:v.completions.includes(key)?v.completions.filter(x=>x!==key):[...v.completions,key]}));};
  const openHabit=(h?:Habit)=>{setEditing(h??null);setHabitName(h?.name??'');setSchedule(h?[...h.weekdays]:[1,2,3,4,5,6,0]);setModal(h?'edit':'add');};
  const saveHabit=(e:FormEvent)=>{e.preventDefault();const name=habitName.trim();if(!name){setNotice('Enter a habit name first.');return;}if(!schedule.length){setNotice('Choose at least one scheduled day.');return;}
    if(editing)setData(v=>({...v,habits:v.habits.map(h=>h.id===editing.id?{...h,name,weekdays:[...schedule]}:h)}));else setData(v=>({...v,habits:[...v.habits,{id:uid(),name,weekdays:[...schedule],createdAt:iso(today)}]}));setModal(null);setNotice(editing?'Habit updated.':'Habit added.');};
  const archiveHabit=(h:Habit)=>{setData(v=>({...v,habits:v.habits.map(x=>x.id===h.id?{...x,archived:true,archivedAt:x.archivedAt||iso(today)}:x)}));setNotice(`${h.name} archived and kept in your history.`);};
  const restoreHabit=(h:Habit)=>{setData(v=>({...v,habits:v.habits.map(x=>x.id===h.id?{...x,archived:false,archivedAt:undefined}:x)}));setNotice(`${h.name} restored to active habits.`);};
  const confirmDeleteHabit=()=>{if(!deletingHabit)return;const h=deletingHabit;setData(v=>({...v,habits:v.habits.map(x=>x.id===h.id?{...x,archived:true,archivedAt:x.archivedAt||iso(today)}:x)}));setNotice(`${h.name} deleted; historical records preserved.`);setDeletingHabit(null);};
  const confirmClearData=()=>{setData(blankStore);setNotice('All app data cleared.');setConfirmClearOpen(false);};
  const addPlan=(e:FormEvent)=>{e.preventDefault();const text=planText.trim();if(!text)return;setData(v=>({...v,plans:[...v.plans,{id:uid(),weekStart:activeWeek,text,done:false}]}));setPlanText('');};
  const selectedSummary=selectedDate?dayStats(parseDate(selectedDate),allHabits,completions,true):null;
  const selectedRecords=selectedDate?allHabits.filter(h=>isDue(h,parseDate(selectedDate),true)):[];
  const selectedWeekObj=weeks.find(w=>iso(w.start)===openWeek);
  const openWeekStats=selectedWeekObj?(()=>{let due=0,completed=0;for(let d=new Date(selectedWeekObj.start);d<=selectedWeekObj.end;d=addDays(d,1)){if(d.getMonth()!==month||d>today)continue;const s=dayStats(d,allHabits,completions,true);due+=s.due;completed+=s.completed;}return {due,completed};})():null;

  const msRemaining = Math.max(0, trial.trialExpiresAt - nowMs);
  const totalSecondsRemaining = Math.floor(msRemaining / 1000);
  const remDays = Math.floor(totalSecondsRemaining / 86400);
  const remHours = Math.floor((totalSecondsRemaining % 86400) / 3600);
  const remMinutes = Math.floor((totalSecondsRemaining % 3600) / 60);
  const remSeconds = totalSecondsRemaining % 60;
  const isTrialEndingSoon = msRemaining <= 24 * 60 * 60 * 1000;

  if(isTrialExpired){
    return (
      <main className="levelup-shell">
        <section className="panel levelup-card" aria-labelledby="levelup-title">
          <div className="brand-mark levelup-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path d="M7 11h8l9 13 9-13h8L24 39 7 11Z"/>
              <path d="M14 11h6l4 6 4-6h6L24 27 14 11Z"/>
            </svg>
          </div>
          <span className="eyebrow">VIREON HABIT SYSTEM</span>
          <h1 id="levelup-title">Level Up to Full Version</h1>
          <p className="levelup-copy">
            Your 3-day full access period has ended. Your habits, streaks, ranks, and history remain safely saved.
          </p>
          <a
            href={FULL_VERSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button levelup-cta"
          >
            GET FULL VERSION
          </a>
        </section>
      </main>
    );
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M7 11h8l9 13 9-13h8L24 39 7 11Z"/>
            <path d="M14 11h6l4 6 4-6h6L24 27 14 11Z"/>
          </svg>
        </div>
        <div>
          <h1>VIREON HABIT SYSTEM</h1>
          <p>SYSTEM GAMIFICATION CONSISTENCY</p>
        </div>
      </div>
      <PWAInstallButton />
    </header>

    <section className={`panel trial-reminder-banner ${isTrialEndingSoon ? 'ending-soon' : ''}`} role="region" aria-label="3-day trial countdown and reminder">
      <div className="trial-reminder-info">
        <div className="trial-reminder-icon" aria-hidden="true">
          <Clock size={16} />
        </div>
        <div className="trial-reminder-text">
          <strong>3-Day Full Version Trial</strong>
          <span>
            {isTrialEndingSoon
              ? 'Your Full Version trial is ending soon — get the Full Version now to keep uninterrupted access.'
              : 'Your Full Version trial is approaching its end — unlock the Full Version anytime to keep all features.'}
          </span>
        </div>
      </div>
      <div className="trial-reminder-actions">
        <div className="trial-countdown" aria-live="off" aria-label={`Time remaining: ${remDays} days, ${remHours} hours, ${remMinutes} minutes, ${remSeconds} seconds`}>
          <div className="countdown-unit"><b>{pad(remDays)}</b><small>d</small></div>
          <span className="countdown-sep" aria-hidden="true">:</span>
          <div className="countdown-unit"><b>{pad(remHours)}</b><small>h</small></div>
          <span className="countdown-sep" aria-hidden="true">:</span>
          <div className="countdown-unit"><b>{pad(remMinutes)}</b><small>m</small></div>
          <span className="countdown-sep" aria-hidden="true">:</span>
          <div className="countdown-unit"><b>{pad(remSeconds)}</b><small>s</small></div>
        </div>
        <a
          href={FULL_VERSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-button trial-reminder-cta"
        >
          GET FULL VERSION
        </a>
      </div>
    </section>

    <section className="overview-grid">
      <div className="panel period-panel"><div className="period-controls"><label className="period-label-month">Month<span className="select-wrap"><select aria-label="Select month" value={month} onChange={e=>setMonth(Number(e.target.value))}>{months.map((m,i)=><option value={i} key={m}>{m}</option>)}</select><ChevronDown size={16}/></span></label><label className="period-label-year">Year<span className="select-wrap"><select aria-label="Select year" value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select><ChevronDown size={16}/></span></label><button className="outline-button today-button" onClick={()=>{setMonth(today.getMonth());setYear(today.getFullYear());}}>Today</button></div></div>
      <div className="panel month-progress">
        <MonthProgressDonut pct={monthPct} due={dueMonth} />
        <div>
          <span className="eyebrow">MONTH PROGRESS</span>
          {dueMonth ? (
            <>
              <strong className="big-number">{monthPct}%</strong>
              <p>{doneMonth} of {dueMonth} scheduled<br/>occurrences completed</p>
            </>
          ) : (
            <p className="empty-copy">No scheduled habits this month</p>
          )}
        </div>
      </div>
    </section>

    <section className="panel metrics-panel">
      <div className="streak-block">
        <div className="streak-header-row">
          <span className="section-kicker">CURRENT STREAK</span>
          <button
            type="button"
            className="streak-info-btn"
            onClick={()=>setStreakModalOpen(true)}
            title="View fire-streak indicator levels"
            aria-label="View fire-streak indicator levels"
          >
            <Info size={12}/>
          </button>
        </div>
        <div
          className="streak-value-wrap"
          onClick={()=>setStreakModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setStreakModalOpen(true);}}}
          title={`Current streak: ${currentStreak} day${currentStreak===1?'':'s'} (Level ${streakState.level}: ${streakState.name} — ${streakState.description})`}
          aria-label={`Current streak: ${currentStreak} days. Level ${streakState.level}: ${streakState.name}. Click to view all flame tiers.`}
        >
          <div className="streak-value">
            <span>{currentStreak}</span>
            <StreakFlame streak={currentStreak} size={36}/>
          </div>
          <div className={`streak-badge streak-badge-lvl-${streakState.level}`}>
            <span className="streak-badge-dot" aria-hidden="true"/>
            <span>{isTodayExtinguished ? 'Extinguished' : streakState.badge}</span>
          </div>
        </div>
        <GraceStatusBadge
          graceExpiry={graceExpiry}
          hasTodayDue={hasTodayDue}
          isTodayPending={isTodayPending}
          isTodayExtinguished={isTodayExtinguished}
          isTodayFullyCompleted={isTodayFullyCompleted}
        />
        <p>Best streak: <b>{bestStreak}</b> days</p>
      </div>
      <DailyConsistencyChart
        year={year}
        month={month}
        monthName={months[month]}
        target={data.settings.target}
        allHabits={allHabits}
        completions={completions}
        today={today}
      />
      <div className="rank-block">
        <div className="rank-header-row">
          <span className="section-kicker">YOUR RANK</span>
          <button
            type="button"
            className="rank-info-btn"
            onClick={()=>setRankModalOpen(true)}
            title="View rank roadmap and emblems"
            aria-label="View rank roadmap and emblems"
          >
            <Info size={12}/>
          </button>
        </div>
        <div
          className={`rank-clickable-area ${rankAnimState ? `rank-card-${rankAnimState}` : ''}`}
          onClick={()=>setRankModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setRankModalOpen(true);}}}
          title={`Current Rank: ${rank.name} (${stars}/5 stars) · ${rank.subtitle}. Click to view rank details.`}
          aria-label={`Current rank: ${rank.name}, ${stars} of 5 stars. Click to view rank details.`}
        >
          <div className="rank-main-info">
            <h2>{rank.name.toUpperCase()}</h2>
            <div className="rank-art">
              <RankEmblem rankIndex={rankIndex} size={50}/>
              <div>
                <RankStars stars={stars} maxStars={5} rankName={rank.name} rankIndex={rankIndex}/>
                <small>{stars} of 5 stars · {rankData.successfulDays} perfect day{rankData.successfulDays===1?'':'s'}</small>
              </div>
            </div>
          </div>
          <div className="rank-progress-wrap">
            <div className="rank-progress">
              <div className="progress-track"><i style={{width:`${rankProgress}%`}}/></div>
              <small>{nextRank ? `${starsToNext} star${starsToNext===1?'':'s'} to ${nextRank.name}` : (stars === 5 ? 'Top rank reached (5/5 stars)' : `${5-stars} star${5-stars===1?'':'s'} to Apex mastery`)}</small>
            </div>
            <p className="rank-tip">{rank.tip}</p>
          </div>
        </div>
        {/* Accessible live announcement for rank changes */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {rankAnnouncement}
        </div>
      </div>
    </section>

    <section className="panel tracker-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">DAILY PRACTICE</span>
          <h2>Habit tracker <span className="month-caption">{months[month]} {year}</span></h2>
        </div>
        <div className="header-actions">
          {archivedHabits.length > 0 && (
            <button
              type="button"
              className="archived-toggle-btn"
              onClick={() => setArchivedModalOpen(true)}
              title={`View ${archivedHabits.length} archived habit${archivedHabits.length === 1 ? '' : 's'}`}
            >
              <Archive size={13} /> {archivedHabits.length} archived
            </button>
          )}
          <button className="primary-button" onClick={() => openHabit()}>
            <Plus size={16} /> Add habit
          </button>
        </div>
      </div>
      <div className="table-shell"><div className="tracker-scroll"><table className="habit-table"><thead><tr><th className="habit-sticky">HABIT <span>{habits.length} active</span></th>{dates.map(d=>{const isTodayDate=iso(d)===iso(today);return <th key={d.toISOString()} className={`${d.getDay()===0||d.getDay()===6?'weekend':''} ${isTodayDate?'today-col':''}`}><span className="day-number">{d.getDate()}</span><span className="weekday">{weekdays[d.getDay()].slice(0,3)}</span>{isTodayDate&&<span className="today-badge">TODAY</span>}</th>;})}</tr></thead><tbody>{habits.map(h=><tr key={h.id}><th className="habit-sticky habit-name"><div><span>{h.name}</span><small>{h.weekdays.length===7?'Daily':h.weekdays.map(d=>weekdays[d].slice(0,3)).join(' · ')}</small></div><div className="row-actions"><button aria-label={`Edit ${h.name}`} title="Edit habit" onClick={()=>openHabit(h)}><Settings2 size={14}/></button><button aria-label={`Archive ${h.name}`} title="Archive habit" onClick={()=>archiveHabit(h)}><Archive size={14}/></button><button aria-label={`Delete ${h.name}`} title="Delete habit" onClick={()=>setDeletingHabit(h)}><Trash2 size={14}/></button></div></th>{dates.map(d=>{const isTodayDate=iso(d)===iso(today);const due=isDue(h,d);const key=`${h.id}|${iso(d)}`;const checked=completions.has(key);const future=d>today;return <td key={iso(d)} className={`${d.getDay()===0||d.getDay()===6?'weekend':''} ${future?'future-cell':''} ${isTodayDate?'today-cell':''}`}>{due?<button className={`check-cell ${checked?'checked':''}`} aria-label={`${checked?'Unmark':'Mark'} ${h.name} on ${fmt(d,{weekday:'long',month:'long',day:'numeric'})}${isTodayDate?', today':''}${future?', future':''}`} aria-pressed={checked} title={`${h.name} · ${fmt(d,{month:'short',day:'numeric'})}${isTodayDate?' (Today)':''}`} onClick={()=>toggleCompletion(h,d)}><span>{checked?<Check size={13}/>:''}</span></button>:<span className="not-scheduled" aria-label="Not scheduled">·</span>}</td>;})}</tr>)}{!habits.length&&<tr><td className="empty-table" colSpan={days+1}><div className="empty-icon"><Activity/></div><b>No active habits yet</b><p>Add your first habit to start building consistency.</p><button className="outline-button" onClick={()=>openHabit()}><Plus size={14}/> Add a habit</button></td></tr>}</tbody></table></div></div>
    </section>

    <section className="middle-grid">
      <div className="panel performance-panel">
        <div className="panel-heading compact">
          <div>
            <span className="eyebrow">THIS MONTH</span>
            <h2>Habit performance</h2>
          </div>
        </div>
        {habitStats.length ? (
          habitStats.map(({ habit, complete, due, pct: val, todayStatus }) => (
            <div className="performance-row" key={habit.id}>
              <div className="performance-title">
                <div className="performance-habit-lead">
                  <span
                    className={`perf-indicator indicator-${todayStatus}`}
                    aria-label={
                      todayStatus === 'completed'
                        ? `${habit.name}: Completed today`
                        : todayStatus === 'missed'
                        ? `${habit.name}: Incomplete today`
                        : `${habit.name}: Neutral`
                    }
                    title={
                      todayStatus === 'completed'
                        ? 'Completed today'
                        : todayStatus === 'missed'
                        ? 'Incomplete today'
                        : 'Neutral'
                    }
                  >
                    {todayStatus === 'completed' && <ArrowUp size={13} strokeWidth={2.6} aria-hidden="true" />}
                    {todayStatus === 'missed' && <ArrowDown size={13} strokeWidth={2.6} aria-hidden="true" />}
                    {todayStatus === 'neutral' && <Minus size={13} strokeWidth={2.4} aria-hidden="true" />}
                  </span>
                  <span className="performance-habit-name" title={habit.name}>{habit.name}</span>
                </div>
                <b>{due ? `${val}%` : '—'}</b>
              </div>
              <div className="progress-track"><i style={{ width: `${val}%` }} /></div>
              <small>
                {complete} of {due} due occurrences{due ? ' completed' : ' · no occurrences due yet'}
              </small>
            </div>
          ))
        ) : (
          <div className="empty-copy">Your habit performance will appear here once you add a habit.</div>
        )}
        <div className="settings-box">
          <div>
            <Settings2 size={16} />
            <div>
              <b>Daily success target</b>
              <small>Used to calculate streaks and rank</small>
            </div>
          </div>
          <label>
            <input
              type="number"
              min="1"
              max="100"
              value={data.settings.target}
              aria-label="Daily target percentage"
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 1 && n <= 100) updateSettings({ ...data.settings, target: n });
              }}
            />
            %
          </label>
        </div>
      </div>
    <div className="panel weekly-panel"><div className="panel-heading compact"><div><span className="eyebrow">WEEK BY WEEK</span><h2>Weekly execution</h2></div><span className="small-note">Mon – Sun</span></div><div className="weekly-list">{weeks.map((w,i)=>{let due=0,complete=0;for(let d=new Date(w.start);d<=w.end;d=addDays(d,1)){if(d.getMonth()!==month)continue;const s=dayStats(d,allHabits,completions,true);due+=s.due;complete+=s.completed;}const val=pct(complete,due);const rate=due?Math.min(5,Math.floor(val/20)):0;const id=iso(w.start);return <button className={`week-row ${openWeek===id?'selected':''}`} key={id} onClick={()=>setOpenWeek(openWeek===id?'':id)} aria-expanded={openWeek===id}><span className="week-info"><b>Week {i+1}</b><small>{fmt(w.start)} – {fmt(w.end)}</small></span>{due?<><span className="week-percent">{val}% <small>· {complete}/{due}</small></span><span className="stars tiny-stars" aria-label={`${rate} of 5 weekly stars`}>{'★★★★★'.split('').map((x,j)=><i key={j} className={j<rate?'':'dim'}>{x}</i>)}</span></>:<span className="no-activity">No scheduled habits</span>}</button>;})}</div>{selectedWeekObj&&<div className="week-detail"><b>{fmt(selectedWeekObj.start,{month:'long',day:'numeric'})} – {fmt(selectedWeekObj.end,{month:'long',day:'numeric'})}</b><span>{openWeekStats?.due?`${openWeekStats.completed} of ${openWeekStats.due} occurrences complete · ${pct(openWeekStats.completed,openWeekStats.due)}%`:'No scheduled habits'} · {data.plans.filter(p=>p.weekStart===openWeek).length} plans</span></div>}</div></section>

    <section className="panel plans-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">MAKE IT HAPPEN</span>
          <h2>Weekly plans</h2>
        </div>
        <div className="week-select">
          <button aria-label="Previous week" onClick={()=>{const index=weeks.findIndex(w=>iso(w.start)===activeWeek);setSelectedWeek(iso(weeks[Math.max(0,index-1)].start));}}><ChevronLeft size={16}/></button>
          <span>Week {Math.max(0,weeks.findIndex(w=>iso(w.start)===activeWeek)+1)} <small>· {fmt(parseDate(activeWeek))} – {fmt(addDays(parseDate(activeWeek),6))}</small></span>
          <button aria-label="Next week" onClick={()=>{const index=weeks.findIndex(w=>iso(w.start)===activeWeek);setSelectedWeek(iso(weeks[Math.min(weeks.length-1,index+1)].start));}}><ChevronRight size={16}/></button>
        </div>
      </div>
      <div className="plan-cards">
        {weeks.map((w,i)=>{
          const ps=data.plans.filter(p=>p.weekStart===iso(w.start));
          return (
            <button className={`plan-week ${iso(w.start)===activeWeek?'active':''}`} key={iso(w.start)} onClick={()=>setSelectedWeek(iso(w.start))}>
              <b>Week {i+1}</b>
              <small>{fmt(w.start)} – {fmt(w.end)}</small>
              <span>{ps.filter(p=>p.done).length}/{ps.length} complete</span>
              {ps.slice(0,2).map(p=><em key={p.id} className={p.done?'plan-done':''}>{p.text}</em>)}
              {ps.length>2&&<em>+{ps.length-2} more</em>}
            </button>
          );
        })}
      </div>
      <form className="plan-form" onSubmit={addPlan}>
        <label className="sr-only" htmlFor="plan-input">New plan for selected week</label>
        <input id="plan-input" value={planText} onChange={e=>setPlanText(e.target.value)} placeholder={`Add a plan for Week ${Math.max(0,weeks.findIndex(w=>iso(w.start)===activeWeek)+1)}…`} maxLength={120}/>
        <button className="primary-button" type="submit" aria-label="Add plan"><Plus size={19}/></button>
      </form>
      <div className="plan-list">
        {currentPlans.map(p=>(
          <div className={`plan-item ${p.done?'done':''}`} key={p.id}>
            <button className="plan-check" aria-label={`${p.done?'Reopen':'Complete'} plan: ${p.text}`} aria-pressed={p.done} onClick={()=>setData(v=>({...v,plans:v.plans.map(q=>q.id===p.id?{...q,done:!q.done}:q)}))}>
              {p.done&&<Check size={13}/>}
            </button>
            {editingPlanId===p.id ? (
              <form
                className="plan-inline-edit"
                onSubmit={e=>{
                  e.preventDefault();
                  const text=editingPlanText.trim();
                  if(!text){setNotice('A plan needs a name.');return;}
                  setData(v=>({...v,plans:v.plans.map(q=>q.id===p.id?{...q,text}:q)}));
                  setEditingPlanId(null);
                }}
              >
                <input
                  value={editingPlanText}
                  autoFocus
                  onChange={e=>setEditingPlanText(e.target.value)}
                  maxLength={120}
                  aria-label="Edit plan description"
                />
                <button type="submit" className="plan-edit-save" title="Save changes" aria-label="Save changes"><Check size={14}/></button>
                <button type="button" className="plan-edit-cancel" title="Cancel edit" aria-label="Cancel edit" onClick={()=>setEditingPlanId(null)}><X size={14}/></button>
              </form>
            ) : (
              <span>{p.text}</span>
            )}
            {editingPlanId!==p.id && (
              <div>
                <button title="Edit plan" aria-label={`Edit plan ${p.text}`} onClick={()=>{setEditingPlanId(p.id);setEditingPlanText(p.text);}}><Settings2 size={14}/></button>
                <button title="Delete plan" aria-label={`Delete plan ${p.text}`} onClick={()=>setData(v=>({...v,plans:v.plans.filter(q=>q.id!==p.id)}))}><X size={15}/></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>

    <YearlyActivityHeatmap
      year={year}
      allHabits={allHabits}
      completions={completions}
      onSelectDate={setSelectedDate}
    />

    <footer className="footer"><span><span className="footer-mark">V</span> Consistency, built one day at a time.</span><button onClick={()=>setConfirmClearOpen(true)} className="clear-button"><Trash2 size={13}/> Clear all app data</button></footer>
    {notice&&<div className="toast" role="status">{notice}</div>}

    {modal&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="habit-dialog-title"><button className="dialog-close" onClick={()=>setModal(null)} aria-label="Close dialog"><X size={18}/></button><span className="eyebrow">HABIT SETUP</span><h2 id="habit-dialog-title">{editing?'Edit habit':'Add a habit'}</h2><form onSubmit={saveHabit}><label className="form-label">Habit name<input autoFocus value={habitName} onChange={e=>setHabitName(e.target.value)} placeholder="e.g. Read for 20 minutes" maxLength={60}/></label><fieldset className="schedule-fieldset"><legend>Schedule</legend><div className="schedule-options"><button type="button" className={schedule.length===7?'selected':''} onClick={()=>setSchedule(schedule.length===7?[1,2,3,4,5]:[0,1,2,3,4,5,6])}>Every day</button>{mondayLabels.map((d,i)=>{const day=(i+1)%7;const isSel=schedule.includes(day);return <button type="button" key={d} className={isSel?'selected':''} aria-pressed={isSel} onClick={()=>setSchedule(v=>v.includes(day)?(v.length>1?v.filter(x=>x!==day):v):[...v,day].sort((a,b)=>a-b))}>{d}</button>;})}</div></fieldset><p className="form-hint">Historical completion records stay with this habit when you edit its schedule.</p><div className="dialog-actions"><button type="button" className="outline-button" onClick={()=>setModal(null)}>Cancel</button><button className="primary-button" type="submit">{editing?'Save changes':'Add habit'}</button></div></form></section></div>}

    {selectedDate&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedDate('');}}><section className="dialog day-dialog" role="dialog" aria-modal="true" aria-labelledby="day-dialog-title"><button className="dialog-close" onClick={()=>setSelectedDate('')} aria-label="Close day details"><X size={18}/></button><span className="eyebrow">DAY SUMMARY</span><h2 id="day-dialog-title">{fmt(parseDate(selectedDate),{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</h2>{selectedSummary?.due?<><div className="day-summary-stats"><b>{selectedSummary.completed}<small> completed</small></b><b>{selectedSummary.due}<small> scheduled</small></b><b>{selectedSummary.pct}%<small> activity</small></b></div><p className="day-record-hint">Click checkmarks to record or update habit completions</p><div className="day-record-list">{selectedRecords.map(h=>{const done=completions.has(`${h.id}|${selectedDate}`);return <div key={h.id}><button type="button" className={done?'record-check yes':'record-check'} onClick={()=>toggleCompletion(h,parseDate(selectedDate))} aria-label={`${done?'Unmark':'Mark'} ${h.name} on ${selectedDate}`}>{done?<Check size={13}/>:''}</button><span>{h.name}</span><small>{done?'Completed':'Not completed'}</small></div>;})}</div></>:<p className="empty-copy">No scheduled habits for this date.</p>}<button className="primary-button full-button" onClick={()=>setSelectedDate('')}>Done</button></section></div>}

    {streakModalOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setStreakModalOpen(false);}}><section className="dialog streak-dialog" role="dialog" aria-modal="true" aria-labelledby="streak-dialog-title"><button className="dialog-close" onClick={()=>setStreakModalOpen(false)} aria-label="Close streak details"><X size={18}/></button><span className="eyebrow">FIRE-STREAK SYSTEM</span><h2 id="streak-dialog-title">Streak Fire Levels</h2><p className="dialog-intro">Your flame evolves with consecutive completed days. If scheduled habits for today are incomplete, a 24-hour grace period begins from your most recent checklist action. If the grace period expires without completion, your streak is extinguished to Level 0 cool ash. Skips on past or future dates never extinguish your Fire Streak.</p><div className="streak-tiers-list">{STREAK_STATES.map(tier=>{const isActive=tier.level===streakState.level;return <div key={tier.level} className={`streak-tier-card lvl-${tier.level} ${isActive?'active-tier':''}`}><div className="streak-tier-flame"><StreakFlame streak={tier.level} size={34} showTooltip={false}/></div><div className="streak-tier-content"><div className="streak-tier-title"><strong>Level {tier.level}: {tier.name}</strong>{isActive&&<span className="active-tag">Active ({currentStreak}d)</span>}</div><p>{tier.description}</p></div></div>;})}</div><button className="primary-button full-button" onClick={()=>setStreakModalOpen(false)}>Done</button></section></div>}

    {rankModalOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setRankModalOpen(false);}}><section className="dialog rank-dialog" role="dialog" aria-modal="true" aria-labelledby="rank-dialog-title"><button className="dialog-close" onClick={()=>setRankModalOpen(false)} aria-label="Close rank roadmap"><X size={18}/></button><span className="eyebrow">PRESTIGE ROADMAP</span><h2 id="rank-dialog-title">Rank Hierarchy</h2><p className="dialog-intro">Each rank holds 5 stars. Earning all 5 stars promotes you to the next rank and resets stars to 0. You earn 1 star when all scheduled habits on a day are checked complete. Only incomplete scheduled habits for the current day can trigger a penalty after a 24-hour grace period expires, removing exactly 1 rank star (with demotion down to 4 stars on the previous rank, floored at Iron 0★). Skips on past or future dates never deduct stars. Days with no habits scheduled have no effect.</p><div className="rank-tiers-list">{RANKS.map((tier,idx)=>{const isCurrent=idx===rankIndex;const isPromoted=idx<rankIndex;return <div key={tier.name} className={`rank-tier-card rank-card-${tier.name.toLowerCase()} ${isCurrent?'current-tier':''} ${isPromoted?'achieved-tier':''}`}><div className="rank-tier-emblem"><RankEmblem rankIndex={idx} size={42}/></div><div className="rank-tier-content"><div className="rank-tier-title"><div><strong>Tier {idx+1}: {tier.name}</strong><span className="rank-tier-subtitle">{tier.subtitle}</span></div>{isCurrent&&<span className="active-tag">Current ({stars}/5 ★)</span>}{isPromoted&&<span className="achieved-tag">Promoted</span>}{idx>rankIndex&&<span className="locked-tag">Locked</span>}</div><div className="rank-tier-stars-preview">{Array.from({length:5},(_,s)=><Star key={s} size={13} fill={(isCurrent&&s<stars)||isPromoted?'currentColor':'none'} className={(isCurrent&&s<stars)||isPromoted?'gold':'muted-star'}/>)}<span className="threshold-pill">{idx<7?'5 stars to promote':'Apex rank (max 5★)'}</span></div><p className="rank-tier-desc">{tier.tip}</p></div></div>;})}</div><button className="primary-button full-button" onClick={()=>setRankModalOpen(false)}>Done</button></section></div>}

    {archivedModalOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setArchivedModalOpen(false);}}><section className="dialog archived-dialog" role="dialog" aria-modal="true" aria-labelledby="archived-dialog-title"><button className="dialog-close" onClick={()=>setArchivedModalOpen(false)} aria-label="Close archived habits"><X size={18}/></button><span className="eyebrow">ARCHIVED HABITS</span><h2 id="archived-dialog-title">Archived Habits ({archivedHabits.length})</h2><p className="dialog-intro">Archived habits preserve your past streaks and rank history, but are hidden from your active tracker.</p><div className="archived-list">{archivedHabits.map(h=><div key={h.id} className="archived-item"><div className="archived-item-info"><strong>{h.name}</strong><small>Archived {h.archivedAt?fmt(parseDate(h.archivedAt)):''}</small></div><button type="button" className="outline-button restore-btn" onClick={()=>restoreHabit(h)}>Restore habit</button></div>)}</div><button className="primary-button full-button" onClick={()=>setArchivedModalOpen(false)}>Done</button></section></div>}

    {deletingHabit&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDeletingHabit(null);}}><section className="dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title"><button className="dialog-close" onClick={()=>setDeletingHabit(null)} aria-label="Cancel"><X size={18}/></button><span className="eyebrow">CONFIRM DELETE</span><h2 id="delete-dialog-title">Delete “{deletingHabit.name}”?</h2><p>This habit will be removed from your active daily tracker. All past check-in records and star achievements will remain preserved in your rank history.</p><div className="dialog-actions"><button type="button" className="outline-button" onClick={()=>setDeletingHabit(null)}>Cancel</button><button type="button" className="primary-button danger-button" onClick={confirmDeleteHabit}>Delete Habit</button></div></section></div>}

    {confirmClearOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmClearOpen(false);}}><section className="dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-dialog-title"><button className="dialog-close" onClick={()=>setConfirmClearOpen(false)} aria-label="Cancel"><X size={18}/></button><span className="eyebrow">RESET APP</span><h2 id="clear-dialog-title">Clear all app data?</h2><p>This will erase all habits, check-ins, weekly plans, and custom settings from this browser. This action cannot be undone.</p><div className="dialog-actions"><button type="button" className="outline-button" onClick={()=>setConfirmClearOpen(false)}>Cancel</button><button type="button" className="primary-button danger-button" onClick={confirmClearData}>Clear Everything</button></div></section></div>}
  </main>
}
export default App;
