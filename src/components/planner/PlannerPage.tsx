import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Flame,
  CheckSquare,
  Target,
  CreditCard,
  BookLock,
  Clock,
  Filter,
  Plus,
  ArrowRight,
  Star,
  Search,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Bell,
  AlarmClock,
  ListTodo,
  Tag,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  ChevronUp,
  CalendarClock,
  Printer,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TaskItem, Habit, Goal, Bill, ScheduleItem, JournalEntry, Priority, ReminderType } from '../../types';
import { QuoteBanner } from '../common/QuoteBanner';
import { soundEngine } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { formatLocalDate, toDateString } from '../../utils/date';
import { TaskDetailModal } from '../tasks/TaskDetailModal';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { HourlyScheduleView } from '../schedule/HourlyScheduleView';
import { PriorityScheduleView } from '../schedule/PriorityScheduleView';
import { DeadlineScheduleView } from '../schedule/DeadlineScheduleView';
import { PrintableScheduleView } from '../schedule/PrintableScheduleView';
import { ScheduleEventModal } from '../schedule/ScheduleEventModal';
import { isScheduleItemOnDate } from '../../utils/scheduleRecurrence';
import { motion } from 'framer-motion';
import { CheckmarkCelebration, AnimatedCheckIcon } from '../common/CheckmarkCelebration';
import { AnimatedStreakBadge } from '../common/AnimatedStreakBadge';
import { ScrollableCompactDateStrip } from '../common/ScrollableCompactDateStrip';

export type PlannerViewMode = 'day' | 'timeline' | 'hourly' | 'week' | 'month' | 'priority' | 'deadlines' | 'printable';

export interface TimelineUnifiedItem {
  id: string;
  sourceType: 'task' | 'event' | 'habit' | 'reminder';
  title: string;
  startTime?: string;
  endTime?: string;
  completed: boolean;
  category?: string;
  priority?: Priority;
  notes?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
  reminderType?: ReminderType;
  rawTask?: TaskItem;
  rawSchedule?: ScheduleItem;
  rawHabit?: Habit;
}

export interface MasterEventItem {
  id: string;
  type: 'task' | 'habit' | 'goal' | 'bill' | 'schedule' | 'journal';
  title: string;
  date: string;
  time?: string;
  completed: boolean;
  color: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
  subtitle?: string;
  rawItem: any;
}

export const PlannerPage: React.FC = () => {
  const {
    tasks,
    toggleTask,
    updateTask,
    deleteTask,
    toggleStarTask,
    addTask,
    habits,
    toggleHabitDay,
    goals,
    toggleGoalMilestone,
    bills,
    markBillPaid,
    formatCurrency,
    scheduleItems,
    toggleScheduleItem,
    addScheduleItem,
    autoScheduleTasksForDate,
    journalEntries,
    startPomodoro,
    stopPomodoro,
    pomodoro,
    setPomodoroTask,
    pushNotification,
    selectedDate,
    setSelectedDate,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Primary Planner View Tabs: 'day' (unified Day & Week), 'month', 'priority', 'deadlines', 'printable'
  const [activeView, setActiveView] = useState<PlannerViewMode>('day');
  const [dayViewMode, setDayViewMode] = useState<'timeline' | 'hourly' | 'week' | 'split'>('timeline');

  // Filter systems
  const [filterTasks, setFilterTasks] = useState(true);
  const [filterHabits, setFilterHabits] = useState(true);
  const [filterGoals, setFilterGoals] = useState(true);
  const [filterBills, setFilterBills] = useState(true);
  const [filterSchedule, setFilterSchedule] = useState(true);
  const [filterJournal, setFilterJournal] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Drawers and quick adds
  const [isUnplannedOpen, setIsUnplannedOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Modals for editing task & schedule items
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleItem | null>(null);
  const [initialHourForAdd, setInitialHourForAdd] = useState<string | undefined>(undefined);

  // Micro-celebration interaction state for planner items
  const [celebratingPlannerId, setCelebratingPlannerId] = useState<string | null>(null);
  const [plannerCelebrationKey, setPlannerCelebrationKey] = useState<number>(0);
  const [plannerBadgeText, setPlannerBadgeText] = useState<string>('Done✅');

  const handleToggleWithCelebration = (id: string, type: 'task' | 'schedule' | 'habit') => {
    if (type === 'task') {
      const t = tasks.find(item => item.id === id);
      const wasCompleted = t?.completed;
      toggleTask(id, { skipSound: true });
      if (!wasCompleted) {
        setPlannerBadgeText('Done✅');
        setCelebratingPlannerId(id);
        setPlannerCelebrationKey(k => k + 1);
        try {
          soundEngine.playWaterDropNotification();
          haptics.complete();
        } catch {}
        setTimeout(() => setCelebratingPlannerId(null), 1200);
      } else {
        haptics.toggle();
      }
    } else if (type === 'schedule') {
      const s = scheduleItems.find(item => item.id === id);
      const wasCompleted = s?.completed;
      toggleScheduleItem(id);
      if (!wasCompleted) {
        setPlannerBadgeText('Done✔️');
        setCelebratingPlannerId(id);
        setPlannerCelebrationKey(k => k + 1);
        try {
          soundEngine.playWaterDropNotification();
          haptics.complete();
        } catch {}
        setTimeout(() => setCelebratingPlannerId(null), 1200);
      } else {
        haptics.toggle();
      }
    } else if (type === 'habit') {
      const habit = habits.find(item => item.id === id);
      const wasChecked = !!habit?.completionHistory?.[selectedDate];
      toggleHabitDay(id, selectedDate, { skipSound: true });
      if (!wasChecked) {
        const streakNum = (habit?.currentStreak || 0) + 1;
        setPlannerBadgeText(`Done🔥 ${Math.max(1, streakNum)}D`);
        setCelebratingPlannerId(id);
        setPlannerCelebrationKey(k => k + 1);
        try {
          soundEngine.playWaterDropNotification();
          haptics.complete();
        } catch {}
        setTimeout(() => setCelebratingPlannerId(null), 1200);
      } else {
        haptics.toggle();
      }
    }
  };

  // Month navigation
  const monthYear = currentMonthDate.getFullYear();
  const monthNum = currentMonthDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(monthYear, monthNum - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(monthYear, monthNum + 1, 1));
  };

  const handleToday = () => {
    setCurrentMonthDate(new Date());
    setSelectedDate(todayStr);
  };

  // Stepper for selected date (prev / next day)
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const newStr = formatLocalDate(d);
    setSelectedDate(newStr);
    setCurrentMonthDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const newStr = formatLocalDate(d);
    setSelectedDate(newStr);
    setCurrentMonthDate(d);
  };

  const handlePrevWeek = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    const newStr = formatLocalDate(d);
    setSelectedDate(newStr);
    setCurrentMonthDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    const newStr = formatLocalDate(d);
    setSelectedDate(newStr);
    setCurrentMonthDate(d);
  };

  // Compile Unified Master Events Map for Month / Week view
  const masterEvents = useMemo(() => {
    const list: MasterEventItem[] = [];

    // 1. Tasks
    if (filterTasks) {
      tasks.forEach(t => {
        if (!t.dueDate) return;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'pending' && !t.completed) ||
          (statusFilter === 'completed' && t.completed);
        const matchesSearch =
          searchQuery === '' ||
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesStatus || !matchesSearch) return;

        list.push({
          id: `task-${t.id}`,
          type: 'task',
          title: t.title,
          date: t.dueDate,
          time: t.dueTime,
          completed: t.completed,
          color: '#06b6d4',
          badgeBg: 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-200 dark:border-cyan-800',
          badgeText: 'text-cyan-950 dark:text-cyan-200 font-semibold',
          icon: <CheckSquare className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />,
          subtitle: `${t.priority} • ${t.project || 'General'}`,
          rawItem: t,
        });
      });
    }

    // 2. Habits
    if (filterHabits) {
      habits.forEach(h => {
        Object.entries(h.completionHistory).forEach(([dateStr, isDone]) => {
          if (!isDone) return;
          const matchesStatus = statusFilter === 'all' || (statusFilter === 'completed' && isDone);
          const matchesSearch = searchQuery === '' || h.name.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchesStatus || !matchesSearch) return;

          list.push({
            id: `habit-${h.id}-${dateStr}`,
            type: 'habit',
            title: h.name,
            date: dateStr,
            completed: true,
            color: '#10b981',
            badgeBg: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800',
            badgeText: 'text-emerald-950 dark:text-emerald-200 font-semibold',
            icon: <Flame className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />,
            subtitle: `${h.currentStreak} day streak`,
            rawItem: h,
          });
        });
      });
    }

    // 3. Goals & Milestones
    if (filterGoals) {
      goals.forEach(g => {
        if (g.targetDate) {
          const isDone = g.status === 'completed' || g.progress >= 100;
          const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'pending' && !isDone) ||
            (statusFilter === 'completed' && isDone);
          const matchesSearch = searchQuery === '' || g.title.toLowerCase().includes(searchQuery.toLowerCase());
          if (matchesStatus && matchesSearch) {
            list.push({
              id: `goal-${g.id}`,
              type: 'goal',
              title: `Goal: ${g.title}`,
              date: g.targetDate,
              completed: isDone,
              color: '#8b5cf6',
              badgeBg: 'bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800',
              badgeText: 'text-purple-950 dark:text-purple-200 font-semibold',
              icon: <Target className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />,
              subtitle: `${g.progress}% completed`,
              rawItem: g,
            });
          }
        }

        g.milestones.forEach(m => {
          if (!m.dueDate) return;
          const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'pending' && !m.completed) ||
            (statusFilter === 'completed' && m.completed);
          const matchesSearch = searchQuery === '' || m.title.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchesStatus || !matchesSearch) return;

          list.push({
            id: `milestone-${g.id}-${m.id}`,
            type: 'goal',
            title: `Milestone: ${m.title}`,
            date: m.dueDate,
            completed: m.completed,
            color: '#a855f7',
            badgeBg: 'bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800',
            badgeText: 'text-purple-950 dark:text-purple-200 font-semibold',
            icon: <Target className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />,
            subtitle: `For ${g.title}`,
            rawItem: { goal: g, milestone: m },
          });
        });
      });
    }

    // 4. Bills
    if (filterBills) {
      bills.forEach(b => {
        if (!b.dueDate) return;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'pending' && !b.isPaid) ||
          (statusFilter === 'completed' && b.isPaid);
        const matchesSearch = searchQuery === '' || b.title.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesStatus || !matchesSearch) return;

        list.push({
          id: `bill-${b.id}`,
          type: 'bill',
          title: `Bill: ${b.title}`,
          date: b.dueDate,
          completed: b.isPaid,
          color: '#f43f5e',
          badgeBg: 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800',
          badgeText: 'text-rose-950 dark:text-rose-200 font-semibold',
          icon: <CreditCard className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />,
          subtitle: `${formatCurrency(b.amount)} • ${b.isPaid ? 'Paid' : 'Due'}`,
          rawItem: b,
        });
      });
    }

    // 5. Schedule Items
    if (filterSchedule) {
      scheduleItems.forEach(s => {
        if (!s.date) return;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'pending' && !s.completed) ||
          (statusFilter === 'completed' && s.completed);
        const matchesSearch =
          searchQuery === '' ||
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesStatus || !matchesSearch) return;

        list.push({
          id: `schedule-${s.id}`,
          type: 'schedule',
          title: s.title,
          date: s.date,
          time: `${s.startTime} - ${s.endTime}`,
          completed: s.completed,
          color: '#f59e0b',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800',
          badgeText: 'text-amber-950 dark:text-amber-200 font-semibold',
          icon: <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
          subtitle: `${s.category || 'General'}`,
          rawItem: s,
        });
      });
    }

    // 6. Journal Entries
    if (filterJournal) {
      journalEntries.forEach(j => {
        const matchesSearch =
          searchQuery === '' ||
          j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.content.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return;

        list.push({
          id: `journal-${j.id}`,
          type: 'journal',
          title: `Reflected: ${j.title || 'Journal Entry'}`,
          date: j.date,
          completed: true,
          color: '#6366f1',
          badgeBg: 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800',
          badgeText: 'text-indigo-950 dark:text-indigo-200 font-semibold',
          icon: <BookLock className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />,
          subtitle: `${j.mood || 'Reflection'}`,
          rawItem: j,
        });
      });
    }

    return list;
  }, [
    tasks,
    habits,
    goals,
    bills,
    scheduleItems,
    journalEntries,
    filterTasks,
    filterHabits,
    filterGoals,
    filterBills,
    filterSchedule,
    filterJournal,
    statusFilter,
    searchQuery,
    formatCurrency,
  ]);

  // Calendar Month Grid Generator
  const monthGridDays = useMemo(() => {
    const firstDayIndex = new Date(monthYear, monthNum, 1).getDay();
    const daysInMonth = new Date(monthYear, monthNum + 1, 0).getDate();
    const daysInPrevMonth = new Date(monthYear, monthNum, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month tail days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = monthNum === 0 ? 11 : monthNum - 1;
      const prevYear = monthNum === 0 ? monthYear - 1 : monthYear;
      const dateStr = toDateString(prevYear, prevMonth, d);
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateString(monthYear, monthNum, d);
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month starting days to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = monthNum === 11 ? 0 : monthNum + 1;
      const nextYear = monthNum === 11 ? monthYear + 1 : monthYear;
      const dateStr = toDateString(nextYear, nextMonth, d);
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [monthYear, monthNum]);

  // Week View Days (7 days centered around selectedDate)
  const weekDays = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const startOfWeek = new Date(y, m - 1, d - dayOfWeek);
    const days: { dateStr: string; dayNum: number; dayName: string }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const iterDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
      const dateStr = formatLocalDate(iterDate);
      days.push({
        dateStr,
        dayNum: iterDate.getDate(),
        dayName: dayNames[i],
      });
    }
    return days;
  }, [selectedDate]);

  // Index events by date string (including recurring schedule events across visible grid)
  const eventsByDate = useMemo(() => {
    const map: Record<string, MasterEventItem[]> = {};

    masterEvents.forEach(item => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });

    if (filterSchedule) {
      const allDates = new Set<string>([
        selectedDate,
        todayStr,
        ...monthGridDays.map(d => d.dateStr),
        ...weekDays.map(d => d.dateStr),
      ]);

      const recurringItems = scheduleItems.filter(s => s.repeatType && s.repeatType !== 'none');

      allDates.forEach(dateStr => {
        recurringItems.forEach(s => {
          if (dateStr === s.date) return; // already added in masterEvents for initial date
          if (isScheduleItemOnDate(s, dateStr)) {
            const matchesStatus =
              statusFilter === 'all' ||
              (statusFilter === 'pending' && !s.completed) ||
              (statusFilter === 'completed' && s.completed);
            const matchesSearch =
              searchQuery === '' ||
              s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));

            if (matchesStatus && matchesSearch) {
              if (!map[dateStr]) map[dateStr] = [];
              map[dateStr].push({
                id: `schedule-rec-${s.id}-${dateStr}`,
                type: 'schedule',
                title: s.title,
                date: dateStr,
                time: `${s.startTime} - ${s.endTime}`,
                completed: s.completed,
                color: '#f59e0b',
                badgeBg: 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800',
                badgeText: 'text-amber-950 dark:text-amber-200 font-semibold',
                icon: <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
                subtitle: `${s.category || 'General'} (Repeats)`,
                rawItem: s,
              });
            }
          }
        });
      });
    }

    return map;
  }, [masterEvents, filterSchedule, scheduleItems, monthGridDays, weekDays, selectedDate, todayStr, statusFilter, searchQuery]);

  // Schedule items for selectedDate (including recurrence)
  const scheduleDateItems = useMemo(() => {
    return scheduleItems.filter(item => {
      const matchesDate = isScheduleItemOnDate(item, selectedDate);
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesDate && matchesSearch;
    });
  }, [scheduleItems, selectedDate, searchQuery]);

  // Formatted date title
  const formattedDateTitle = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      const full = d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return `${day}/${month}/${year} • ${full}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Chronological unified items for Timeline view
  const timelineItems = useMemo(() => {
    const list: TimelineUnifiedItem[] = [];

    // 1. Tasks due on this day
    if (filterTasks) {
      tasks
        .filter(t => t.dueDate === selectedDate)
        .forEach(t => {
          list.push({
            id: `task-${t.id}`,
            sourceType: 'task',
            title: t.title,
            startTime: t.dueTime || undefined,
            completed: t.completed,
            category: t.project || 'Personal',
            priority: t.priority,
            notes: t.notes,
            subtasks: t.subtasks,
            reminderType: t.reminderType,
            rawTask: t,
          });
        });
    }

    // 2. Schedule events on this day
    if (filterSchedule) {
      scheduleItems
        .filter(s => isScheduleItemOnDate(s, selectedDate))
        .forEach(s => {
          list.push({
            id: `event-${s.id}`,
            sourceType: 'event',
            title: s.title,
            startTime: s.startTime,
            endTime: s.endTime,
            completed: s.completed,
            category: s.category || 'General',
            priority: s.priority,
            notes: s.notes,
            reminderType: s.reminderType,
            rawSchedule: s,
          });
        });
    }

    // 3. Habits scheduled or completed for today
    if (filterHabits) {
      habits.forEach(h => {
        const isDoneToday = !!h.completionHistory[selectedDate];
        list.push({
          id: `habit-${h.id}`,
          sourceType: 'habit',
          title: h.name,
          startTime: h.reminderTime || (h.targetTimeOfDay === 'morning' ? '08:00' : h.targetTimeOfDay === 'afternoon' ? '13:00' : '19:00'),
          completed: isDoneToday,
          category: h.category || 'Habit',
          rawHabit: h,
        });
      });
    }

    // Sort by startTime or fallback
    return list.sort((a, b) => {
      const timeA = a.startTime || '99:99';
      const timeB = b.startTime || '99:99';
      return timeA.localeCompare(timeB);
    });
  }, [tasks, scheduleItems, habits, selectedDate, filterTasks, filterSchedule, filterHabits]);

  // Unplanned backlog tasks
  const unplannedTasks = useMemo(() => {
    return tasks.filter(t => !t.completed && (!t.dueDate || t.isSomeday));
  }, [tasks]);

  // Handlers
  const handleAutoSchedule = () => {
    autoScheduleTasksForDate(selectedDate);
    soundEngine?.playSuccessChime?.();
  };

  const handleEditScheduleItem = (item: ScheduleItem) => {
    setEditingScheduleItem(item);
    setInitialHourForAdd(undefined);
    setIsEventModalOpen(true);
  };

  const handleOpenAddAtHour = (hour: string) => {
    setEditingScheduleItem(null);
    setInitialHourForAdd(hour);
    setIsEventModalOpen(true);
  };

  const handleStartScheduleFocus = (item: ScheduleItem) => {
    if (item.taskId) {
      setPomodoroTask(item.taskId);
    }
    startPomodoro();
  };

  // Quick task submit from timeline input
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    addTask({
      title: quickAddText.trim(),
      dueDate: selectedDate,
      priority: 'medium',
      status: 'todo',
      quadrant: 'urgent_important',
      project: 'Personal',
      completed: false,
      subtasks: [],
      estimatedPomodoros: 1,
      recurring: 'none',
    });

    setQuickAddText('');
    soundEngine?.playSuccessChime?.();
  };

  // Export iCal (.ics) file
  const handleExportICal = () => {
    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//OmniLifeOS//Planner//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n`;

    masterEvents.forEach(ev => {
      const dtStart = ev.date.replace(/-/g, '') + 'T090000Z';
      const dtEnd = ev.date.replace(/-/g, '') + 'T100000Z';
      icsContent += `BEGIN:VEVENT\nUID:${ev.id}@omnilifeos.local\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:${ev.title}\nDESCRIPTION:${ev.subtitle || ''}\nSTATUS:${ev.completed ? 'COMPLETED' : 'CONFIRMED'}\nEND:VEVENT\n`;
    });

    icsContent += `END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `omnilifeos_planner_${selectedDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    pushNotification('Planner Exported', 'Downloaded .ics file ready for Google Calendar or Apple Calendar.', 'system');
  };

  const isSelectedDateToday = selectedDate === todayStr;

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-full">
      {/* Shifted Master Planner Title Banner */}
      <div className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <CalendarClock className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>Planner</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                Unified
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Synchronized Calendar, Timeline & Time-blocking
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleAutoSchedule}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[11px] font-semibold transition shadow-2xs cursor-pointer"
            title="Auto-fill open slots from backlog tasks"
          >
            <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Auto-Schedule</span>
          </button>

          <button
            type="button"
            onClick={handleExportICal}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
            title="Export .ics for Google or Apple Calendar"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingScheduleItem(null);
              setInitialHourForAdd(undefined);
              setIsEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>+ Block</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-[11px] font-semibold transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>+ Task</span>
          </button>
        </div>
      </div>

      {/* Daily Wisdom Widget */}
      <QuoteBanner />

      {/* Scrollable Compact Date Strip */}
      <ScrollableCompactDateStrip selectedDateStr={selectedDate} onSelectDate={setSelectedDate} className="my-1.5" />

      {/* Master View Switcher & Date Synchronizer Ribbon - Super Productivity Clean 2-Row Layout */}
      <div className="p-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Unified Planner Mode Switcher - Week & Day (Timeline & Hourly) Merged */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs shrink-0 overflow-x-auto max-w-full">
            <button
              type="button"
              id="btn-nav-week-day-unified"
              onClick={() => setActiveView('day')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
                activeView === 'day' || activeView === 'week' || activeView === 'timeline' || activeView === 'hourly'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Day & Week</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('month')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
                activeView === 'month'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3 h-3" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('priority')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
                activeView === 'priority'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>Priority</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('deadlines')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
                activeView === 'deadlines'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Deadlines</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('printable')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-xs transition cursor-pointer ${
                activeView === 'printable'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3 h-3" />
              <span>Print</span>
            </button>
          </div>

          {/* Quick Date Stepper & Today Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={activeView === 'month' ? handlePrevMonth : handlePrevDay}
                className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title={activeView === 'month' ? 'Previous Month' : 'Previous Day'}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-0.5 text-[11px] font-semibold rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={activeView === 'month' ? handleNextMonth : handleNextDay}
                className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title={activeView === 'month' ? 'Next Month' : 'Next Day'}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Date Input / Current Label */}
            {activeView === 'month' ? (
              <span className="text-xs font-bold text-slate-900 dark:text-white px-2">
                {monthNames[monthNum]} {monthYear}
              </span>
            ) : (
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setCurrentMonthDate(new Date(e.target.value + 'T00:00:00'));
                  }}
                  className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs h-7"
                />
              </div>
            )}
          </div>
        </div>

        {/* Multi-System Entity Filter Chips + Search/Status Bar on Row 2 */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 mr-0.5 flex items-center gap-1 shrink-0 text-[11px]">
              <Filter className="w-2.5 h-2.5" /> Systems:
            </span>

            <button
              onClick={() => setFilterTasks(!filterTasks)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium leading-none transition whitespace-nowrap shrink-0 cursor-pointer ${
                filterTasks
                  ? 'border-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <CheckSquare className="w-2.5 h-2.5" />
              <span>Tasks</span>
              <span className="text-[10px] font-bold">({tasks.filter(t => t.dueDate).length})</span>
            </button>

            <button
              onClick={() => setFilterHabits(!filterHabits)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium leading-none transition whitespace-nowrap shrink-0 cursor-pointer ${
                filterHabits
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <Flame className="w-2.5 h-2.5" />
              <span>Habits</span>
              <span className="text-[10px] font-bold">({habits.length})</span>
            </button>

            <button
              onClick={() => setFilterSchedule(!filterSchedule)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium leading-none transition whitespace-nowrap shrink-0 cursor-pointer ${
                filterSchedule
                  ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Schedule</span>
              <span className="text-[10px] font-bold">({scheduleItems.length})</span>
            </button>

            <button
              onClick={() => setFilterBills(!filterBills)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium leading-none transition whitespace-nowrap shrink-0 cursor-pointer ${
                filterBills
                  ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <CreditCard className="w-2.5 h-2.5" />
              <span>Bills</span>
              <span className="text-[10px] font-bold">({bills.length})</span>
            </button>

            <button
              onClick={() => setFilterGoals(!filterGoals)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium leading-none transition whitespace-nowrap shrink-0 cursor-pointer ${
                filterGoals
                  ? 'border-purple-300 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <Target className="w-2.5 h-2.5" />
              <span>Goals</span>
              <span className="text-[10px] font-bold">({goals.length})</span>
            </button>

            <button
              onClick={() => setFilterJournal(!filterJournal)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium leading-none transition whitespace-nowrap shrink-0 cursor-pointer ${
                filterJournal
                  ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
              }`}
            >
              <BookLock className="w-2.5 h-2.5" />
              <span>Journal</span>
            </button>
          </div>

          {/* Search bar & Status filter */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap w-full sm:w-auto justify-between sm:justify-start">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search planner..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-0.5 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 w-full sm:w-40 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2 py-0.5 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium shrink-0 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Only</option>
              <option value="completed">Completed Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: MASTER MONTH CALENDAR */}
      {activeView === 'month' && (
        <div className="space-y-4">
          {/* Legend of Colorful Points (Consistent across Mobile & Web) */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Day Points:</span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-2xs" />
                <span>Tasks</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" />
                <span>Habits</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-2xs" />
                <span>Schedule</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-2xs" />
                <span>Bills</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-2xs" />
                <span>Goals</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Click any day to inspect & time-block</span>
          </div>

          {/* Month Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-center py-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {monthGridDays.map(({ dateStr, dayNum, isCurrentMonth }, idx) => {
                const dayEvents = eventsByDate[dateStr] || [];
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={`planner-grid-${dateStr}-${idx}`}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[58px] sm:min-h-[68px] md:min-h-[76px] p-1.5 sm:p-2 transition flex flex-col group cursor-pointer ${
                      !isCurrentMonth
                        ? 'bg-slate-50/40 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    } ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/40 dark:bg-indigo-950/40'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-semibold ${
                          isToday
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedDate(dateStr);
                          setActiveView('day');
                          setDayViewMode('timeline');
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-600 transition"
                        title="Open in Timeline"
                      >
                        <Clock className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Compact Colored Points */}
                    <div className="flex items-center justify-center gap-1 mt-auto pt-1 flex-wrap">
                      {dayEvents.slice(0, 5).map((ev, dIdx) => {
                        const dotColor =
                          ev.type === 'task'
                            ? 'bg-cyan-500'
                            : ev.type === 'schedule'
                            ? 'bg-amber-500'
                            : ev.type === 'bill'
                            ? 'bg-rose-500'
                            : ev.type === 'habit'
                            ? 'bg-emerald-500'
                            : ev.type === 'goal'
                            ? 'bg-purple-500'
                            : 'bg-indigo-500';
                        return (
                          <span
                            key={dIdx}
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotColor} ${
                              ev.completed ? 'opacity-40 ring-1 ring-white/50' : 'shadow-2xs'
                            }`}
                            title={`${ev.title} (${ev.type})`}
                          />
                        );
                      })}
                      {dayEvents.length > 5 && (
                        <span className="w-full text-center text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                          +{dayEvents.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Summary Card with Quick Switch to Timeline */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Day Agenda for {formattedDateTitle}</span>
                  {isSelectedDateToday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                      Today
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {eventsByDate[selectedDate]?.length || 0} items planned for this date
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('day');
                    setDayViewMode('timeline');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                >
                  <Clock className="w-3 h-3" />
                  <span>Open Timeline</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('day');
                    setDayViewMode('hourly');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  <CalendarClock className="w-3 h-3" />
                  <span>Time-block Day</span>
                </button>
              </div>
            </div>

            {/* List of items on this selected day */}
            <div className="space-y-2 pt-1">
              {(eventsByDate[selectedDate] || []).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No items scheduled for this day. Click "+ Task" or "+ Block" above to add one.
                </div>
              ) : (
                (eventsByDate[selectedDate] || []).map(ev => (
                  <div
                    key={ev.id}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ev.icon}
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-bold block truncate ${
                            ev.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {ev.title}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          {ev.time ? `${ev.time} • ` : ''}
                          {ev.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ev.type === 'task' && (
                        <div className="relative flex items-center justify-center">
                          <CheckmarkCelebration
                            activeKey={celebratingPlannerId === ev.rawItem.id ? plannerCelebrationKey : null}
                            badgeText={plannerBadgeText}
                            ringColor="border-emerald-500"
                            align="right"
                          />
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            animate={celebratingPlannerId === ev.rawItem.id ? { scale: [1, 1.22, 0.94, 1] } : {}}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            onClick={() => handleToggleWithCelebration(ev.rawItem.id, 'task')}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center"
                            title={ev.completed ? 'Mark task incomplete' : 'Mark task complete'}
                          >
                            {ev.completed ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                                <AnimatedCheckIcon
                                  className="w-2.5 h-2.5 text-white"
                                  strokeWidth={3}
                                  animate={celebratingPlannerId === ev.rawItem.id}
                                />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-400 dark:border-slate-500 hover:border-emerald-500 transition" />
                            )}
                          </motion.button>
                        </div>
                      )}
                      {ev.type === 'schedule' && (
                        <div className="relative flex items-center justify-center">
                          <CheckmarkCelebration
                            activeKey={celebratingPlannerId === ev.rawItem.id ? plannerCelebrationKey : null}
                            badgeText={plannerBadgeText}
                            ringColor="border-blue-500"
                            align="right"
                          />
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            animate={celebratingPlannerId === ev.rawItem.id ? { scale: [1, 1.22, 0.94, 1] } : {}}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            onClick={() => handleToggleWithCelebration(ev.rawItem.id, 'schedule')}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center"
                            title={ev.completed ? 'Mark event incomplete' : 'Mark event complete'}
                          >
                            {ev.completed ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                                <AnimatedCheckIcon
                                  className="w-2.5 h-2.5 text-white"
                                  strokeWidth={3}
                                  animate={celebratingPlannerId === ev.rawItem.id}
                                />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-400 dark:border-slate-500 hover:border-emerald-500 transition" />
                            )}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED VIEW: WEEK & DAY (TIMELINE & HOURLY MERGED) */}
      {(activeView === 'day' || activeView === 'week' || activeView === 'timeline' || activeView === 'hourly') && (
        <div className="space-y-2.5 sm:space-y-3">
          {/* Unified Week & Day Control Card */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between gap-2.5 flex-wrap pb-1.5 border-b border-slate-100 dark:border-slate-800">
              {/* Left: Week & Day Stepper with Active Date Title */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    id="btn-planner-prev-week"
                    onClick={dayViewMode === 'week' ? handlePrevWeek : handlePrevDay}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title={dayViewMode === 'week' ? "Previous Week" : "Previous Day"}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    id="btn-planner-next-week"
                    onClick={dayViewMode === 'week' ? handleNextWeek : handleNextDay}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title={dayViewMode === 'week' ? "Next Week" : "Next Day"}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{formattedDateTitle}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Week of {weekDays[0]?.dayName}, {weekDays[0]?.dateStr} • {weekDays.reduce((acc, curr) => acc + (eventsByDate[curr.dateStr]?.length || 0), 0)} scheduled items
                  </p>
                </div>
              </div>

              {/* Right: Clean 3-Way Sub-mode Switcher + Backlog Drawer Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    id="btn-submode-timeline"
                    onClick={() => setDayViewMode('timeline')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
                      dayViewMode === 'timeline'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Chronological stream of tasks, schedule and habits"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Timeline</span>
                  </button>
                  <button
                    type="button"
                    id="btn-submode-hourly"
                    onClick={() => setDayViewMode('hourly')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
                      dayViewMode === 'hourly'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="24-hour visual time blocking"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Hourly</span>
                  </button>
                  <button
                    type="button"
                    id="btn-submode-week"
                    onClick={() => setDayViewMode('week')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
                      dayViewMode === 'week'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="7-Day multi-column week timeline overview"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>7-Day Week</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUnplannedOpen(!isUnplannedOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs font-semibold hover:bg-amber-100 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Backlog ({unplannedTasks.length})</span>
                  {isUnplannedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>


          </div>

          {/* Unplanned Tasks Expandable Drawer */}
          {isUnplannedOpen && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Unscheduled Tasks Backlog
                </h4>
                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                  Click 'Plan for Today' to schedule directly
                </span>
              </div>

              {unplannedTasks.length === 0 ? (
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 italic">
                  All caught up! No unplanned tasks in your backlog.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unplannedTasks.slice(0, 8).map(task => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                          {task.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {task.project || 'Inbox'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          updateTask({
                            ...task,
                            dueDate: selectedDate,
                            dueTime: '10:00',
                            isSomeday: false,
                          });
                          soundEngine?.playSuccessChime?.();
                        }}
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition shrink-0 cursor-pointer"
                      >
                        Plan for {isSelectedDateToday ? 'Today' : selectedDate}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conditional Layout: Hourly only, Timeline only, or Split View */}
          <motion.div
            key={`day-view-submode-${selectedDate}-${dayViewMode}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            {dayViewMode === 'hourly' && (
              <HourlyScheduleView
                selectedDate={selectedDate}
                items={scheduleDateItems}
                onAddAtHour={handleOpenAddAtHour}
                onEditItem={handleEditScheduleItem}
              />
            )}

            {dayViewMode === 'timeline' && (
              <div className="space-y-2.5 sm:space-y-3">
              {/* Chronological Vertical Timeline */}
              <div className="p-2.5 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs min-h-[220px]">
                {timelineItems.length === 0 ? (
                  <div className="py-12 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 mx-auto flex items-center justify-center">
                      <Clock className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No timeline items for this date
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Add a task, time-block a schedule slot, or click 'Auto-Schedule' to populate your day automatically.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAutoSchedule}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                      >
                        Auto-Schedule Tasks
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewTaskModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                      >
                        + Add Task
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative pl-6 sm:pl-7 space-y-2.5 sm:space-y-3 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100 dark:before:bg-indigo-950">
                    {timelineItems.map(item => (
                      <div key={item.id} className="relative group">
                        <div
                          className={`absolute -left-[27px] sm:-left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 transition flex items-center justify-center ${
                            item.completed
                              ? 'border-emerald-500 text-emerald-500'
                              : item.sourceType === 'task'
                              ? 'border-cyan-500 text-cyan-500'
                              : item.sourceType === 'event'
                              ? 'border-amber-500 text-amber-500'
                              : 'border-indigo-500 text-indigo-500'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.completed ? 'bg-emerald-500' : 'bg-current'
                            }`}
                          />
                        </div>

                        <div className="p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/70 transition shadow-2xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {item.startTime && (
                                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                    {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                  {item.sourceType}
                                </span>
                                {item.priority && (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    {item.priority}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5
                                  onClick={() => {
                                    if (item.rawTask) setEditingTask(item.rawTask);
                                    else if (item.rawSchedule) handleEditScheduleItem(item.rawSchedule);
                                  }}
                                  className={`text-sm font-bold cursor-pointer hover:text-indigo-600 transition truncate ${
                                    item.completed
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {item.title}
                                </h5>
                                {(item.sourceType === 'task' || item.sourceType === 'habit') && (
                                  <AnimatedStreakBadge
                                    streak={
                                      item.sourceType === 'task'
                                        ? (item.rawTask?.streak ?? 0)
                                        : (item.rawHabit?.currentStreak ?? 0)
                                    }
                                    isCompleted={item.completed}
                                    isAnimating={
                                      celebratingPlannerId ===
                                      (item.sourceType === 'task'
                                        ? item.rawTask?.id
                                        : item.id.replace('habit-', ''))
                                    }
                                    size="xs"
                                    showZero={item.sourceType === 'habit'}
                                  />
                                )}
                              </div>

                              {item.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                  {item.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.sourceType === 'task' && item.rawTask && (
                                <button
                                  type="button"
                                  onClick={() => startPomodoro(item.rawTask!.id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/60 transition cursor-pointer"
                                  title="Start Pomodoro focus"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}

                              <div className="relative flex items-center justify-center">
                                <CheckmarkCelebration
                                  activeKey={
                                    celebratingPlannerId ===
                                    (item.sourceType === 'task'
                                      ? item.rawTask?.id
                                      : item.sourceType === 'event'
                                      ? item.rawSchedule?.id
                                      : item.id.replace('habit-', ''))
                                      ? plannerCelebrationKey
                                      : null
                                  }
                                  badgeText={plannerBadgeText}
                                  ringColor={item.sourceType === 'habit' ? 'border-[#4c6ef5]' : item.sourceType === 'event' ? 'border-blue-500' : 'border-emerald-500'}
                                  align="right"
                                />
                                <motion.button
                                  type="button"
                                  whileTap={{ scale: 0.85 }}
                                  animate={
                                    celebratingPlannerId ===
                                    (item.sourceType === 'task'
                                      ? item.rawTask?.id
                                      : item.sourceType === 'event'
                                      ? item.rawSchedule?.id
                                      : item.id.replace('habit-', ''))
                                      ? { scale: [1, 1.22, 0.94, 1] }
                                      : {}
                                  }
                                  transition={{ duration: 0.35, ease: 'easeOut' }}
                                  onClick={() => {
                                    if (item.sourceType === 'task' && item.rawTask) {
                                      handleToggleWithCelebration(item.rawTask.id, 'task');
                                    } else if (item.sourceType === 'event' && item.rawSchedule) {
                                      handleToggleWithCelebration(item.rawSchedule.id, 'schedule');
                                    } else if (item.sourceType === 'habit') {
                                      const habitId = item.id.replace('habit-', '');
                                      handleToggleWithCelebration(habitId, 'habit');
                                    }
                                  }}
                                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center"
                                  title={item.completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                  {item.completed ? (
                                    <div className={`w-4 h-4 rounded-full ${item.sourceType === 'habit' ? 'bg-[#4c6ef5]' : 'bg-emerald-500'} text-white flex items-center justify-center shadow-2xs`}>
                                      <AnimatedCheckIcon
                                        className="w-2.5 h-2.5 text-white"
                                        strokeWidth={3}
                                        animate={
                                          celebratingPlannerId ===
                                          (item.sourceType === 'task'
                                            ? item.rawTask?.id
                                            : item.sourceType === 'event'
                                            ? item.rawSchedule?.id
                                            : item.id.replace('habit-', ''))
                                        }
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-slate-400 dark:border-slate-500 hover:border-emerald-500 transition" />
                                  )}
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick inline task capture */}
              <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Quick add task for ${isSelectedDateToday ? 'today' : selectedDate}...`}
                  value={quickAddText}
                  onChange={e => setQuickAddText(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>
          )}

          {dayViewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Hourly Time-blocking Grid on Left */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-3">
                <HourlyScheduleView
                  selectedDate={selectedDate}
                  items={scheduleDateItems}
                  onAddAtHour={handleOpenAddAtHour}
                  onEditItem={handleEditScheduleItem}
                />
              </div>

              {/* Timeline Stream & Quick Add on Right */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs min-h-[350px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Timeline Agenda ({timelineItems.length})</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">Chronological</span>
                  </div>

                  {timelineItems.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs text-slate-400">No items for this date.</p>
                      <button
                        type="button"
                        onClick={handleAutoSchedule}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                      >
                        Auto-Schedule
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                      {timelineItems.map(item => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 transition flex items-center justify-between gap-2.5 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {item.startTime && (
                                <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">
                                  {item.startTime}
                                </span>
                              )}
                              <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                {item.sourceType}
                              </span>
                            </div>
                            <span
                              onClick={() => {
                                if (item.rawTask) setEditingTask(item.rawTask);
                                else if (item.rawSchedule) handleEditScheduleItem(item.rawSchedule);
                              }}
                              className={`text-xs font-bold block truncate cursor-pointer hover:text-indigo-600 ${
                                item.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.sourceType === 'task' && item.rawTask && (
                              <button
                                type="button"
                                onClick={() => startPomodoro(item.rawTask!.id)}
                                className="p-1 rounded hover:bg-rose-50 text-rose-500 dark:hover:bg-rose-950 transition"
                                title="Pomodoro"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (item.sourceType === 'task' && item.rawTask) {
                                  toggleTask(item.rawTask.id);
                                } else if (item.sourceType === 'event' && item.rawSchedule) {
                                  toggleScheduleItem(item.rawSchedule.id);
                                } else if (item.sourceType === 'habit') {
                                  const habitId = item.id.replace('habit-', '');
                                  toggleHabitDay(habitId, selectedDate);
                                }
                              }}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                            >
                              {item.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick inline task capture */}
                <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Quick add for ${isSelectedDateToday ? 'today' : selectedDate}...`}
                    value={quickAddText}
                    onChange={e => setQuickAddText(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Sub-mode 4: 7-Day Multi-Column Week Grid */}
          {dayViewMode === 'week' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-end gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingScheduleItem(null);
                    setInitialHourForAdd(undefined);
                    setIsEventModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Block</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDayViewMode('split')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>Day Split View</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
                {weekDays.map(({ dateStr, dayNum, dayName }) => {
                  const dayEvents = eventsByDate[dateStr] || [];
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-xs ring-1 ring-indigo-500/40'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/60'
                      }`}
                    >
                      <div>
                        {/* Day Column Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60 mb-2">
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                            {dayName}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              isToday
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : isSelected
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>

                        {/* Event / Task List */}
                        <div className="space-y-1.5 flex-1 min-h-[160px]">
                          {dayEvents.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic block text-center pt-8">
                              No items
                            </span>
                          ) : (
                            dayEvents.slice(0, 6).map(ev => (
                              <div
                                key={ev.id}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (ev.type === 'task' && ev.rawItem) {
                                    setEditingTask(ev.rawItem);
                                  } else if (ev.type === 'schedule' && ev.rawItem) {
                                    handleEditScheduleItem(ev.rawItem);
                                  }
                                }}
                                className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between gap-1 shadow-2xs hover:border-indigo-400 transition"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className={`truncate font-semibold block ${ev.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {ev.title}
                                  </span>
                                  {ev.time && (
                                    <span className="text-[9px] text-slate-400 font-mono block">
                                      {ev.time}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: ev.color }}
                                />
                              </div>
                            ))
                          )}
                          {dayEvents.length > 6 && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block text-center pt-0.5">
                              +{dayEvents.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Column Footer: Quick Jump to Day Focus */}
                      <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDate(dateStr);
                            setDayViewMode('hourly');
                          }}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>Hourly</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDate(dateStr);
                            setDayViewMode('split');
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          Day View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </motion.div>
        </div>
      )}

      {/* VIEW 5: PRIORITY MATRIX */}
      {activeView === 'priority' && (
        <PriorityScheduleView
          items={scheduleDateItems}
          onAddNew={() => {
            setEditingScheduleItem(null);
            setInitialHourForAdd(undefined);
            setIsEventModalOpen(true);
          }}
          onEditItem={handleEditScheduleItem}
        />
      )}

      {/* VIEW 6: DEADLINES COUNTDOWN */}
      {activeView === 'deadlines' && (
        <DeadlineScheduleView
          selectedDate={selectedDate}
          items={scheduleItems}
          onAddNew={() => {
            setEditingScheduleItem(null);
            setInitialHourForAdd(undefined);
            setIsEventModalOpen(true);
          }}
          onEditItem={handleEditScheduleItem}
        />
      )}

      {/* VIEW 7: PRINTABLE AGENDA */}
      {activeView === 'printable' && (
        <PrintableScheduleView
          selectedDate={selectedDate}
          items={scheduleDateItems}
          onToggleItem={toggleScheduleItem}
        />
      )}

      {/* Modals */}
      {editingTask && (
        <TaskDetailModal
          isOpen={!!editingTask}
          task={editingTask}
          onClose={() => {
            stopPomodoro();
            setEditingTask(null);
          }}
          onEdit={() => {}}
          onUpdateTask={updateTask}
          onDelete={id => {
            deleteTask(id);
            setEditingTask(null);
          }}
          onToggleComplete={toggleTask}
          onToggleStar={toggleStarTask}
        />
      )}

      {isNewTaskModalOpen && (
        <TaskFormModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          defaultDate={selectedDate}
        />
      )}

      {isEventModalOpen && (
        <ScheduleEventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          initialDate={selectedDate}
          editingItem={editingScheduleItem}
          initialHour={initialHourForAdd}
        />
      )}
    </div>
  );
};

export default PlannerPage;
