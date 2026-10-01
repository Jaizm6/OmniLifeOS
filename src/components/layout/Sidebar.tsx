import React, { useState } from 'react';
import {
  Inbox,
  Pill,
  CheckSquare,
  BookLock,
  BarChart3,
  Droplets,
  AlertCircle,
  Timer,
  Plus,
  Flame,
  Target,
  ReceiptText,
  Settings,
  Quote,
  CalendarClock,
  Calendar as CalendarIcon,
  Clock,
  Settings2,
  Bell,
  BellOff,
  Check,
  Pause,
  Play,
  FolderKanban,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { ActiveTab } from '../../types';
import { HydrationDashboard } from '../dashboard/widgets/HydrationDashboard';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    inboxItems,
    tasks,
    medications,
    hydration,
    addWater,
    setHydrationTarget,
    toggleWaterReminder,
    pomodoro,
    startPomodoro,
    pausePomodoro,
    stopPomodoro,
    habits,
    bills,
    quotes,
    isSidebarCollapsed,
    toggleSidebar,
    openEntitiesModal,
  } = useApp();

  const { session, pauseSession, resumeSession, stopSession } = useActiveSession();

  const [showHydrationSettings, setShowHydrationSettings] = useState(false);
  const [customHydrationTarget, setCustomHydrationTarget] = useState(hydration.targetMl.toString());
  const [glassStepperCount, setGlassStepperCount] = useState(1);

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter(t => !t.completed && t.dueDate <= todayStr);
  const lowStockMeds = medications.filter(m => m.active && m.remainingPills <= m.refillThreshold);
  const pendingBills = bills.filter(b => !b.isPaid);
  const unprocessedInboxCount = inboxItems.filter(i => !i.isCompleted && !i.isArchived).length;

  const currentHydrationTotal = hydration.todayLogs.reduce((acc, c) => acc + c.amountMl, 0);
  const hydrationPct = Math.min(100, Math.round((currentHydrationTotal / hydration.targetMl) * 100));
  const currentGlasses = Math.round((currentHydrationTotal / 250) * 10) / 10;
  const targetGlasses = Math.round((hydration.targetMl / 250) * 10) / 10;

  const handleSaveHydrationTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customHydrationTarget, 10);
    if (!isNaN(val) && val >= 500) {
      setHydrationTarget(val);
      setShowHydrationSettings(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activePomodoroTask = tasks.find(t => t.id === pomodoro.taskId);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: <Inbox className="w-4 h-4" />,
      badge: unprocessedInboxCount > 0 ? unprocessedInboxCount : undefined,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingTasks.length > 0 ? pendingTasks.length : undefined,
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: <CalendarClock className="w-4 h-4" />,
    },
    {
      id: 'habits',
      label: 'Habits',
      icon: <Flame className="w-4 h-4" />,
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: 'medications',
      label: 'Meds',
      icon: <Pill className="w-4 h-4" />,
      badge: lowStockMeds.length > 0 ? lowStockMeds.length : undefined,
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: <ReceiptText className="w-4 h-4" />,
      badge: pendingBills.length > 0 ? pendingBills.length : undefined,
    },
    { id: 'journal', label: 'Journal', icon: <BookLock className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  if (isSidebarCollapsed) {
    return null;
  }

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 select-none self-stretch min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-3.125rem)] z-30">
      <div className="sticky top-12 sm:top-12.5 h-[calc(100vh-3rem)] sm:h-[calc(100vh-3.125rem)] flex flex-col p-2.5 sm:p-3 overflow-y-auto custom-scrollbar">
      {/* Navigation items */}
      <div className="space-y-1">
        {navItems.map(item => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'planner' && (activeTab === 'calendar' || activeTab === 'timeline' || activeTab === 'schedule'));
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="my-2.5 border-t border-slate-200 dark:border-slate-800" />

      {/* Quick Metrics & Mini Controls */}
      <div className="space-y-3">
        {/* Real-Time Active Activity Indicator */}
        {session.activeId && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 dark:from-emerald-950/40 dark:to-cyan-950/40 border border-emerald-500/30 dark:border-emerald-500/40 shadow-xs animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate">
                  Active {session.timerMode === 'focus' ? 'Focus' : 'Stopwatch'} ({session.type})
                </span>
              </div>
              <span className="text-xs font-mono font-black text-emerald-800 dark:text-emerald-200 tabular-nums">
                {session.timerMode === 'focus'
                  ? `${Math.floor(session.timeRemaining / 60).toString().padStart(2, '0')}:${(session.timeRemaining % 60).toString().padStart(2, '0')}`
                  : `${Math.floor(session.timeElapsed / 60).toString().padStart(2, '0')}:${(session.timeElapsed % 60).toString().padStart(2, '0')}`
                }
              </span>
            </div>

            <p className="text-xs font-bold text-slate-900 dark:text-white truncate mb-2" title={session.title}>
              {session.title || 'Active Session'}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (session.isRunning) pauseSession();
                  else resumeSession();
                }}
                className="flex-1 py-1 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {session.isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{session.isRunning ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                type="button"
                onClick={() => stopSession()}
                className="py-1 px-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition cursor-pointer"
                title="Stop Session"
              >
                Stop
              </button>
            </div>
          </div>
        )}
        <HydrationDashboard />

        {/* Low Stock Warning if any */}
        {lowStockMeds.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Refill Alert ({lowStockMeds.length})</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 font-medium">
              {lowStockMeds[0].name} ({lowStockMeds[0].remainingPills} left)
            </p>
          </div>
        )}
        {/* Central Hub Management Button */}
        <button
          type="button"
          onClick={() => openEntitiesModal('projects')}
          className="mt-3 w-full py-2 px-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
          title="Manage Projects, Goals & Tags"
        >
          <FolderKanban className="w-4 h-4" />
          <span>Projects, Goals & Tags Hub</span>
        </button>
      </div>

      {/* Offline First Footer */}
      <div className="mt-auto pt-3 pb-2 text-[10px] font-medium text-slate-400 dark:text-slate-500 text-center flex items-center justify-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>E2E Encrypted &bull; Offline First</span>
      </div>
      </div>
    </aside>
  );
};
