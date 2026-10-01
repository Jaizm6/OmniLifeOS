import React, { useState, useRef, useEffect } from 'react';
import {
  Inbox,
  CheckSquare,
  Flame,
  Target,
  Pill,
  ReceiptText,
  BookLock,
  BarChart3,
  Settings,
  MoreHorizontal,
  X,
  Lock,
  Quote,
  CalendarClock,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { playLockSound } from '../../utils/audio';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, inboxItems, tasks, medications, doseLogs, bills, lockApp } = useApp();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const unreadInboxCount = inboxItems.filter(i => !i.isCompleted && !i.isArchived).length;
  const pendingTasksCount = tasks.filter(t => !t.completed && t.dueDate <= todayStr).length;

  // Meds due today count
  const takenMedsCount = doseLogs.filter(d => d.status === 'taken' && d.loggedAt.startsWith(todayStr)).length;
  const totalMedsToday = medications.filter(m => m.active).length;
  const pendingMedsCount = Math.max(0, totalMedsToday - takenMedsCount);
  const unpaidBillsCount = bills.filter(b => !b.isPaid).length;

  // Requested sequence: Inbox, Tasks, Habits, Goals & Projects, Meds, Bills, Journal, Analytics
  const allNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    desc: string;
  }[] = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: <Inbox className="w-5 h-5" />,
      badge: unreadInboxCount > 0 ? unreadInboxCount : undefined,
      desc: 'Universal capture, triage & GTD inbox',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
      desc: 'Todoist priorities & Super Productivity Kanban',
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: <CalendarClock className="w-5 h-5" />,
      desc: 'Calendar, Timeline & Time-blocking',
    },
    {
      id: 'habits',
      label: 'Habits',
      icon: <Flame className="w-5 h-5" />,
      desc: 'Streak tracking & habit chains',
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: <Target className="w-5 h-5" />,
      desc: 'Workspaces, OKRs & milestones',
    },
    {
      id: 'medications',
      label: 'Meds',
      icon: <Pill className="w-5 h-5" />,
      badge: pendingMedsCount > 0 ? pendingMedsCount : undefined,
      desc: 'Dose schedules & inventory alerts',
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: <ReceiptText className="w-5 h-5" />,
      badge: unpaidBillsCount > 0 ? unpaidBillsCount : undefined,
      desc: 'Subscriptions & recurring utilities',
    },
    {
      id: 'journal',
      label: 'Journal',
      icon: <BookLock className="w-5 h-5" />,
      desc: 'AES-256 encrypted personal reflections',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      desc: 'Health adherence & productivity trends',
    },
  ];

  // Auto-scroll the active tab into view in the bottom bar
  useEffect(() => {
    const activeEl = document.getElementById(`tab-mobile-${activeTab}`);
    if (activeEl && scrollContainerRef.current) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex items-center justify-between h-16 px-1">
          {/* Horizontally scrollable dock with smooth touch handling */}
          <div
            ref={scrollContainerRef}
            className="flex-1 flex items-center overflow-x-auto no-scrollbar scroll-smooth gap-1 px-1 py-1"
          >
            {allNavItems.map(tab => {
              const isActive =
                activeTab === tab.id ||
                (tab.id === 'planner' && (activeTab === 'calendar' || activeTab === 'timeline' || activeTab === 'schedule'));
              return (
                <button
                  key={tab.id}
                  id={`tab-mobile-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMoreMenuOpen(false);
                  }}
                  className="relative shrink-0 flex flex-col items-center justify-center min-w-[62px] h-14 min-h-[44px] px-1 text-xs font-medium transition select-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavPill"
                      className="absolute inset-x-1 top-1 bottom-1 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <span
                      className={
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {tab.icon}
                    </span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold ring-1 ring-white dark:ring-slate-900">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`mt-1 text-[10.5px] tracking-tight leading-tight whitespace-nowrap ${
                      isActive
                        ? 'font-bold text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Menu Overview Trigger */}
          <div className="shrink-0 pl-1 border-l border-slate-200 dark:border-slate-800 pr-1">
            <button
              id="tab-mobile-more"
              onClick={() => setIsMoreMenuOpen(prev => !prev)}
              className="relative flex flex-col items-center justify-center w-12 h-14 min-h-[44px] text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
              title="All Sections Menu"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="mt-1 text-[10px] leading-tight">All</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Full Sections Bottom Sheet */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 pb-8 max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    OmniLifeOS
                  </h3>
                  <p className="text-xs text-slate-400">All Modules in Sequence</p>
                </div>
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                {allNavItems.map((tab, idx) => {
                  const isActive =
                    activeTab === tab.id ||
                    (tab.id === 'planner' && (activeTab === 'calendar' || activeTab === 'timeline' || activeTab === 'schedule'));
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMoreMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between py-2.5 px-3 rounded-2xl text-left transition ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                          {tab.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                            <span>{tab.label}</span>
                            {tab.badge !== undefined && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 text-[10px] font-bold">
                                {tab.badge} due
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{tab.desc}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    playLockSound();
                    lockApp();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock OmniLifeOS</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
