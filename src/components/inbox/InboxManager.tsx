import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Plus,
  CheckSquare,
  Lightbulb,
  Bell,
  FileText,
  Link2,
  Check,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  Tag,
  AlertCircle,
  Pill,
  ReceiptText,
  Flame,
  Star,
  Archive,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InboxItem, InboxItemType, InboxItemPriority } from '../../types';
import { QuoteBanner } from '../common/QuoteBanner';
import { ScrollableCompactDateStrip } from '../common/ScrollableCompactDateStrip';

type InboxFilterTab = 'all' | 'captures' | 'actions_today' | 'health_habits' | 'finances' | 'completed';

export const InboxManager: React.FC = () => {
  const {
    inboxItems,
    addInboxItem,
    updateInboxItem,
    deleteInboxItem,
    toggleInboxItemComplete,
    convertInboxItemToTask,
    tasks,
    toggleTask,
    medications,
    doseLogs,
    logDose,
    habits,
    toggleHabitDay,
    bills,
    markBillPaid,
    setActiveTab,
    selectedDate: selectedDateStr,
    setSelectedDate: setSelectedDateStr,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<InboxFilterTab>('all');

  // Quick Capture Form State
  const [captureTitle, setCaptureTitle] = useState('');
  const [captureDetails, setCaptureDetails] = useState('');
  const [captureType, setCaptureType] = useState<InboxItemType>('task');
  const [capturePriority, setCapturePriority] = useState<InboxItemPriority>('medium');
  const [captureTag, setCaptureTag] = useState('@work');
  const [captureDueDate, setCaptureDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdvancedCapture, setShowAdvancedCapture] = useState(false);

  // System cross-category actionable items
  const pendingTasksToday = tasks.filter(t => !t.completed && t.dueDate && t.dueDate <= todayStr);
  const activeMeds = medications.filter(m => m.active);
  const takenMedsTodayCount = doseLogs.filter(d => d.status === 'taken' && d.loggedAt.startsWith(todayStr)).length;
  const pendingMedsCount = Math.max(0, activeMeds.length - takenMedsTodayCount);
  const pendingHabitsToday = habits.filter(h => !h.completionHistory?.[todayStr]);
  const unpaidBillsDueSoon = bills.filter(b => !b.isPaid);

  // Filtered Inbox Items
  const filteredInboxItems = useMemo(() => {
    return inboxItems.filter(item => {
      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDetails = item.details?.toLowerCase().includes(q);
        const matchesTag = item.contextTag?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDetails && !matchesTag) return false;
      }

      // Filter Tab
      if (activeFilterTab === 'all') {
        return !item.isCompleted && !item.isArchived;
      }
      if (activeFilterTab === 'captures') {
        return !item.isCompleted && !item.isArchived && (item.type === 'thought' || item.type === 'note' || item.type === 'link');
      }
      if (activeFilterTab === 'actions_today') {
        return !item.isCompleted && !item.isArchived && (item.dueDate === todayStr || item.priority === 'high' || (item.priority as string) === 'p1');
      }
      if (activeFilterTab === 'completed') {
        return item.isCompleted || item.isArchived;
      }
      return !item.isCompleted && !item.isArchived;
    });
  }, [inboxItems, searchQuery, activeFilterTab, todayStr]);

  const activeInboxCount = inboxItems.filter(i => !i.isCompleted && !i.isArchived).length;
  const totalActionCount = activeInboxCount + pendingTasksToday.length + pendingMedsCount + pendingHabitsToday.length;

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureTitle.trim()) return;

    addInboxItem({
      title: captureTitle.trim(),
      details: captureDetails.trim() || undefined,
      type: captureType,
      priority: capturePriority,
      contextTag: captureTag,
      dueDate: captureDueDate || undefined,
      isCompleted: false,
      isArchived: false,
      isStarred: false,
    });

    setCaptureTitle('');
    setCaptureDetails('');
    setShowAdvancedCapture(false);
  };

  const getPriorityColor = (priority: InboxItemPriority) => {
    switch (priority) {
      case 'high':
      case 'p1' as any:
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'medium':
      case 'p2' as any:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'low':
      case 'p3' as any:
      case 'p4' as any:
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  const getTypeIcon = (type: InboxItemType) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'thought':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
      case 'reminder':
        return <Bell className="w-3.5 h-3.5 text-rose-500" />;
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-emerald-500" />;
      case 'link':
        return <Link2 className="w-3.5 h-3.5 text-cyan-500" />;
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/60 shrink-0 shadow-2xs">
            <Inbox className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Inbox
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                {activeInboxCount} items to triage
              </span>
              {pendingTasksToday.length > 0 && (
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0 hidden sm:inline">
                  {pendingTasksToday.length} tasks due today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Universal GTD capture, thought clarification & centralized daily triage cockpit
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            id="btn-inbox-focus-capture"
            onClick={() => {
              const input = document.getElementById('inbox-quick-capture-input');
              input?.focus();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Capture</span>
          </button>
          <button
            type="button"
            id="btn-view-tasks-hub"
            onClick={() => setActiveTab('tasks')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            <span>Tasks Hub</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Daily Wisdom Widget (Positioned under the top header) */}
      <QuoteBanner />

      {/* Scrollable Compact Date Strip */}
      <ScrollableCompactDateStrip selectedDateStr={selectedDateStr} onSelectDate={setSelectedDateStr} className="my-2" />

          {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilterTab === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>All Inbox ({activeInboxCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('captures')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilterTab === 'captures'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Raw Captures</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('actions_today')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilterTab === 'actions_today'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>Due Today ({pendingTasksToday.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('health_habits')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilterTab === 'health_habits'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-amber-500" />
            <span>Meds & Habits ({pendingMedsCount + pendingHabitsToday.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('finances')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilterTab === 'finances'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Bills & Dues ({unpaidBillsDueSoon.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('completed')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeFilterTab === 'completed'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Triaged & Done</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search inbox..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500 transition outline-hidden"
          />
        </div>
      </div>

      {/* Cross-System Actionable Items (Surfaced for immediate 1-click triage) */}
      {(activeFilterTab === 'all' || activeFilterTab === 'health_habits' || activeFilterTab === 'finances' || activeFilterTab === 'actions_today') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Priority Task Due Today Quick Triage Card */}
          {pendingTasksToday.length > 0 && (activeFilterTab === 'all' || activeFilterTab === 'actions_today') && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Due Today ({pendingTasksToday.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Tasks <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {pendingTasksToday[0].title}
              </p>
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500">{pendingTasksToday[0].project || 'Inbox'}</span>
                <button
                  type="button"
                  onClick={() => toggleTask(pendingTasksToday[0].id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold transition flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}

          {/* Pending Dose Quick Action Card */}
          {pendingMedsCount > 0 && (activeFilterTab === 'all' || activeFilterTab === 'health_habits') && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  Meds Due Today ({pendingMedsCount})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('medications')}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Meds <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {activeMeds[0]?.name || 'Scheduled Doses'}
              </p>
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500 truncate">{activeMeds[0]?.dosage || 'Prescribed'}</span>
                {activeMeds[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      logDose(
                        activeMeds[0].id,
                        activeMeds[0].schedules[0]?.time || '08:00',
                        'taken'
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold transition flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Take Dose</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pending Habits Today */}
          {pendingHabitsToday.length > 0 && (activeFilterTab === 'all' || activeFilterTab === 'health_habits') && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Habit Check-in ({pendingHabitsToday.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('habits')}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Habits <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {pendingHabitsToday[0]?.name}
              </p>
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500">{pendingHabitsToday[0]?.currentStreak || 0}d streak</span>
                <button
                  type="button"
                  onClick={() => toggleHabitDay(pendingHabitsToday[0].id, todayStr)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold transition flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Complete</span>
                </button>
              </div>
            </div>
          )}

          {/* Unpaid Bill Due */}
          {unpaidBillsDueSoon.length > 0 && (activeFilterTab === 'all' || activeFilterTab === 'finances') && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ReceiptText className="w-3.5 h-3.5" />
                  Pending Bill
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('bills')}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Bills <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {unpaidBillsDueSoon[0]?.title}
              </p>
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500 font-mono font-bold">
                  {unpaidBillsDueSoon[0]?.currency} {unpaidBillsDueSoon[0]?.amount}
                </span>
                <button
                  type="button"
                  onClick={() => markBillPaid(unpaidBillsDueSoon[0].id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold transition flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark Paid</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Inbox Items Stream */}
      <div className="space-y-2.5">
        {filteredInboxItems.length === 0 ? (
          /* Inbox Zero Zen Achievement Card */
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Inbox Zero Achieved
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Every captured thought has been clarified, scheduled, or completed. Your mind is free to focus on deep execution.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('inbox-quick-capture-input');
                  input?.focus();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
              >
                Capture New Thought
              </button>
              {activeFilterTab !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('all')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  View All Items
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredInboxItems.map(item => {
            const isDone = item.isCompleted || item.isArchived;

            return (
              <div
                key={item.id}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition hover:border-indigo-200 dark:hover:border-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  isDone ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/30' : ''
                }`}
              >
                {/* Left: Checkbox + Meta + Title */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleInboxItemComplete(item.id)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 cursor-pointer ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800'
                    }`}
                    title={isDone ? 'Mark as active' : 'Quick Complete (2-min rule)'}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type Badge */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {getTypeIcon(item.type)}
                        <span className="capitalize">{item.type}</span>
                      </span>

                      {/* Priority Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityColor(item.priority)}`}>
                        {item.priority.toUpperCase()}
                      </span>

                      {/* Context Tag */}
                      {item.contextTag && (
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">
                          {item.contextTag}
                        </span>
                      )}

                      {/* Due Date Indicator */}
                      {item.dueDate && (
                        <span className={`text-[10px] font-medium flex items-center gap-1 ${
                          item.dueDate === todayStr
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          <span>{item.dueDate === todayStr ? 'Today' : item.dueDate}</span>
                        </span>
                      )}

                      {item.convertedTo === 'task' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" /> Converted to Task
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words ${
                      isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}>
                      {item.title}
                    </h4>

                    {item.details && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Quick Triage Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {/* Convert to Task with 1-click */}
                  {!isDone && (
                    <button
                      type="button"
                      id={`btn-convert-task-${item.id}`}
                      onClick={() => convertInboxItemToTask(item.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/80 hover:bg-white text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                      title="Convert directly to formal Task item"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>To Task</span>
                    </button>
                  )}

                  {/* Schedule for Today */}
                  {!isDone && item.dueDate !== todayStr && (
                    <button
                      type="button"
                      onClick={() => updateInboxItem(item.id, { dueDate: todayStr })}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Schedule for Today"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Star / Pin toggle */}
                  <button
                    type="button"
                    onClick={() => updateInboxItem(item.id, { isStarred: !item.isStarred })}
                    className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer ${
                      item.isStarred
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={item.isStarred ? 'Unstar item' : 'Star item'}
                  >
                    <Star className={`w-3.5 h-3.5 ${item.isStarred ? 'fill-amber-500' : ''}`} />
                  </button>

                  {/* Delete / Dismiss */}
                  <button
                    type="button"
                    id={`btn-delete-inbox-${item.id}`}
                    onClick={() => deleteInboxItem(item.id)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
