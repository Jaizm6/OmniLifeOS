import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Plus,
  Check,
  Calendar as CalendarIcon,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Edit2,
  TrendingUp,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag,
  X,
  BarChart3,
  Droplets,
  Moon,
  Dumbbell,
  Heart,
  Minus,
  Quote,
  RefreshCw,
  Zap,
  Bell,
  AlarmClock,
  Target,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { Habit, HabitCategory, HabitFrequency, HabitType, ReminderType } from '../../types';
import { soundEngine } from '../../utils/audio';
import { HabitsRoutineSection } from './HabitsRoutineSection';
import { HabitsSelfCareSection } from './HabitsSelfCareSection';
import { ScrollableCompactDateStrip } from '../common/ScrollableCompactDateStrip';
import { HabitsReportSection } from './HabitsReportSection';
import { IconRenderer } from '../common/IconRenderer';
import { QuoteBanner } from '../common/QuoteBanner';
import { ActivityManager } from '../common/ActivityManager';
import { HabitDetailModal } from './HabitDetailModal';
import { formatLocalDate } from '../../utils/date';
import { haptics } from '../../utils/haptics';
import { motion } from 'framer-motion';
import { CheckmarkCelebration, AnimatedCheckIcon } from '../common/CheckmarkCelebration';
import { AnimatedStreakBadge } from '../common/AnimatedStreakBadge';
import { CircularProgress } from '../common/CircularProgress';
import { SubtaskBranchIcon } from '../common/SubtaskBranchIcon';

export const HabitTracker: React.FC = () => {
  const { habits, addHabit, updateHabit, deleteHabit, toggleHabitDay, updateHabitCounter, updateHabitSubSteps, soundEngine, selectedDate: selectedDateStr, setSelectedDate: setSelectedDateStr } = useApp();
  const { session, startSession, pauseSession, resumeSession, stopSession } = useActiveSession();

  // Navigation tab: 'habits' | 'routines' | 'selfcare' | 'reports'
  const [activeTab, setActiveTab] = useState<'habits' | 'routines' | 'selfcare' | 'reports'>('habits');

  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'all'>('all');
  const [habitSort, setHabitSort] = useState<'custom' | 'alphabetical' | 'completion' | 'recent'>('custom');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedDetailHabit, setSelectedDetailHabit] = useState<Habit | null>(null);
  const [expandedSubStepHabitId, setExpandedSubStepHabitId] = useState<string | null>(null);
  const [showQuickTypePicker, setShowQuickTypePicker] = useState(false);

  // Quick Daily Counters State
  const [waterGlasses, setWaterGlasses] = useState(() => {
    try {
      const saved = localStorage.getItem('omni_quick_water');
      return saved ? Number(saved) : 4;
    } catch {
      return 4;
    }
  });
  const [sleepHours, setSleepHours] = useState(() => {
    try {
      const saved = localStorage.getItem('omni_quick_sleep');
      return saved ? Number(saved) : 7.5;
    } catch {
      return 7.5;
    }
  });
  const [exerciseMins, setExerciseMins] = useState(() => {
    try {
      const saved = localStorage.getItem('omni_quick_exercise');
      return saved ? Number(saved) : 30;
    } catch {
      return 30;
    }
  });

  const handleWaterClick = () => {
    const next = (waterGlasses + 1) % 9;
    setWaterGlasses(next);
    localStorage.setItem('omni_quick_water', String(next));
    soundEngine.playWaterSound();
  };

  const [animatingHabitId, setAnimatingHabitId] = useState<string | null>(null);
  const [celebratingHabitId, setCelebratingHabitId] = useState<string | null>(null);
  const [celebrationKey, setCelebrationKey] = useState<number>(0);

  const handleToggleHabitWithAnimation = (habitId: string, dateStr: string) => {
    const habit = habits.find(h => h.id === habitId);
    const wasChecked = !!habit?.completionHistory?.[dateStr];

    setAnimatingHabitId(null);
    setCelebratingHabitId(null);

    toggleHabitDay(habitId, dateStr, { skipSound: true });
    if (!wasChecked) {
      setTimeout(() => {
        setAnimatingHabitId(habitId);
      }, 20);
      try {
        soundEngine.playWaterDropNotification();
        haptics.complete();
      } catch {}
      setTimeout(() => {
        setCelebratingHabitId(habitId);
        setCelebrationKey(prev => prev + 1);
      }, 280);
      setTimeout(() => setAnimatingHabitId(null), 450);
      setTimeout(() => setCelebratingHabitId(null), 1400);
    } else {
      setCelebratingHabitId(null);
      setAnimatingHabitId(null);
      haptics.toggle();
    }
  };

  // Date strip offset & selected date
  const [dateOffset, setDateOffset] = useState(0); // in weeks
  const todayStr = formatLocalDate();

  // Form State for modal
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('fitness');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(7);
  const [habitType, setHabitType] = useState<HabitType>('boolean');
  const [timerMinutes, setTimerMinutes] = useState<string>('30');
  const [unit, setUnit] = useState('min');
  const [targetCount, setTargetCount] = useState<number>(0);
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon] = useState('🎯');
  const [notes, setNotes] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('notification');

  // Weekly Date strip generation (7 days according to dateOffset)
  const weekDays = useMemo(() => {
    const days: { dateStr: string; dayName: string; dayNumber: string; isToday: boolean; isSelected: boolean }[] = [];
    const base = new Date();
    base.setDate(base.getDate() + dateOffset * 7);

    // Get Sunday of current week
    const currentDayOfWeek = base.getDay();
    const sunday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - currentDayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      const dStr = formatLocalDate(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
      const dayNumber = d.getDate().toString();
      days.push({
        dateStr: dStr,
        dayName,
        dayNumber,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
      });
    }
    return days;
  }, [dateOffset, todayStr, selectedDateStr]);

  const [customHabits, setCustomHabits] = useState<Habit[]>(habits);
  useEffect(() => {
    setCustomHabits(habits);
  }, [habits]);

  const [activeNoteHabitId, setActiveNoteHabitId] = useState<string | null>(null);
  const [habitNoteInput, setHabitNoteInput] = useState<string>('');

  const handleReorderHabits = (draggedId: string, targetId: string) => {
    const idx1 = customHabits.findIndex(h => h.id === draggedId);
    const idx2 = customHabits.findIndex(h => h.id === targetId);
    if (idx1 === -1 || idx2 === -1) return;
    const updated = [...customHabits];
    const [moved] = updated.splice(idx1, 1);
    updated.splice(idx2, 0, moved);
    setCustomHabits(updated);
    updated.forEach((h, index) => {
      if (h.order !== index) {
        updateHabit({ ...h, order: index });
      }
    });
  };

  // Filtered & Sorted habits
  const filteredHabits = useMemo(() => {
    let list = customHabits.filter(h => (selectedCategory === 'all' ? true : h.category === selectedCategory));
    if (habitSort === 'alphabetical') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (habitSort === 'completion') {
      list = [...list].sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));
    } else if (habitSort === 'recent') {
      list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (habitSort === 'custom') {
      list = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return list;
  }, [customHabits, selectedCategory, habitSort]);

  // Group habits by category for Pixel Habit Tracker grouped view
  const habitsByCategory = useMemo(() => {
    const groups: Record<string, Habit[]> = {};
    filteredHabits.forEach(h => {
      const catName = h.category ? (h.category.charAt(0).toUpperCase() + h.category.slice(1)) : 'Uncategorized';
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(h);
    });
    return groups;
  }, [filteredHabits]);

  // Today's completed habits calculation
  const completedTodayCount = habits.filter(h => !!h.completionHistory?.[selectedDateStr]).length;
  const totalHabitsCount = habits.length;
  const todayProgressPercent = totalHabitsCount > 0 ? Math.round((completedTodayCount / totalHabitsCount) * 100) : 0;
  const activeStreaksCount = habits.filter(h => (h.currentStreak || 0) > 0).length;

  // Auto log habit when active habit session hits 0
  useEffect(() => {
    if (session.type === 'habit' && session.activeId && !session.isRunning && session.timeRemaining === 0 && session.initialDuration > 0) {
      const activeHabitId = session.activeId;
      toggleHabitDay(activeHabitId, selectedDateStr);
      soundEngine.playWaterDropNotification();
      stopSession();
    }
  }, [session.type, session.activeId, session.isRunning, session.timeRemaining, session.initialDuration, toggleHabitDay, selectedDateStr, soundEngine, stopSession]);

  const handleStartTimer = (habit: Habit) => {
    const mins = habit.timerMinutes || habit.durationMinutes || 15;
    startSession(habit.id, 'habit', habit.name, 'focus', mins * 60);
  };

  const openAddModal = (presetCategory?: HabitCategory) => {
    setEditingHabit(null);
    setName('');
    const targetCat = presetCategory || (selectedCategory !== 'all' ? selectedCategory : 'fitness');
    setCategory(targetCat);
    setFrequency('daily');
    setTargetDaysPerWeek(7);
    setHabitType('boolean');
    setTimerMinutes('30');
    setUnit('min');
    setTargetCount(0);
    setIcon(targetCat === 'fitness' ? '🏃' : targetCat === 'mind' ? '🧘' : targetCat === 'learning' ? '📖' : '🎯');
    setColor(
      targetCat === 'fitness' ? '#10b981' :
      targetCat === 'mind' ? '#8b5cf6' :
      targetCat === 'productivity' ? '#6366f1' :
      targetCat === 'learning' ? '#f59e0b' : '#06b6d4'
    );
    setNotes('');
    setReminderTime('');
    setReminderType('none');
    setShowAddModal(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setCategory(habit.category);
    setFrequency(habit.frequency);
    setTargetDaysPerWeek(habit.targetDaysPerWeek);
    setHabitType(habit.habitType || 'boolean');
    setTimerMinutes(habit.timerMinutes ? String(habit.timerMinutes) : '30');
    setUnit(habit.unit || 'min');
    setTargetCount(habit.targetCount || 0);
    setIcon(habit.icon || '🎯');
    setColor(habit.color);
    setNotes(habit.notes || '');
    setReminderTime(habit.reminderTime || '');
    setReminderType(habit.reminderType || 'notification');
    setShowAddModal(true);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedMins = habitType === 'timer' && timerMinutes ? parseInt(timerMinutes, 10) : undefined;

    if (editingHabit) {
      updateHabit({
        ...editingHabit,
        name: name.trim(),
        category,
        frequency,
        targetDaysPerWeek,
        habitType,
        timerMinutes: parsedMins,
        durationMinutes: parsedMins,
        unit: habitType === 'quit' || habitType === 'counter' ? unit : undefined,
        targetCount: habitType === 'quit' || habitType === 'counter' ? targetCount : undefined,
        icon,
        color,
        notes: notes.trim() || undefined,
        reminderTime: reminderTime.trim() || undefined,
        reminderType: reminderTime.trim() ? reminderType : undefined,
      });
    } else {
      addHabit({
        name: name.trim(),
        category,
        frequency,
        targetDaysPerWeek,
        habitType,
        timerMinutes: parsedMins,
        durationMinutes: parsedMins,
        unit: habitType === 'quit' || habitType === 'counter' ? unit : undefined,
        targetCount: habitType === 'quit' || habitType === 'counter' ? targetCount : undefined,
        counterValue: 0,
        icon,
        color,
        notes: notes.trim() || undefined,
        reminderTime: reminderTime.trim() || undefined,
        reminderType: reminderTime.trim() ? reminderType : undefined,
      });
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-6xl mx-auto pb-8">
      {/* Habits Page Title Banner (Consistent with Master LifeOS Calendar Pattern) */}
      <div className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-900 shadow-2xs flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
            <Flame className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                Daily Habits & Routines
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                {activeStreaksCount} active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Build lasting discipline with daily streaks, flexible targets & smart timers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedDateStr !== todayStr && (
            <button
              onClick={() => {
                setDateOffset(0);
                setSelectedDateStr(todayStr);
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100 transition"
            >
              Today
            </button>
          )}
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Daily Wisdom Widget (Positioned under the top habits header) */}
      <QuoteBanner />

      {/* Weekly Date Strip & Controls */}
      <div className="bg-white dark:bg-black rounded-xl border border-slate-200/80 dark:border-zinc-900 p-2 sm:p-2.5 shadow-2xs space-y-2">
        {/* Date Strip Navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateOffset(prev => prev - 1)}
              className="p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300 transition"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-emerald-500" />
              {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
            <button
              onClick={() => setDateOffset(prev => prev + 1)}
              className="p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300 transition"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedDateStr !== todayStr && (
              <button
                onClick={() => {
                  setDateOffset(0);
                  setSelectedDateStr(todayStr);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100 transition"
              >
                Today
              </button>
            )}
            <button
              onClick={() => openAddModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Habit</span>
            </button>
          </div>
        </div>

        {/* Scrollable Compact Date Strip */}
        <ScrollableCompactDateStrip selectedDateStr={selectedDateStr} onSelectDate={setSelectedDateStr} className="pt-1" />

        {/* Daily Summary & Quick Counters Banner */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-900 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Daily Completion
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {completedTodayCount} of {totalHabitsCount} completed
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-64 sm:w-80 bg-slate-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${todayProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Status Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWaterClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition"
              title="Click to log a glass of water"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              <span>Water: {waterGlasses}/8</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sleep: {sleepHours}h</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
              <span>Exercise: {exerciseMins}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Segmented Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-white dark:bg-black rounded-2xl border border-slate-200/80 dark:border-zinc-900 shadow-xs">
        <button
          onClick={() => {
            haptics.toggle();
            setActiveTab('habits');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
            activeTab === 'habits'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
          }`}
        >
          <span>🎯 Habits</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'habits' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
          }`}>
            {habits.length}
          </span>
        </button>

        <button
          onClick={() => {
            haptics.toggle();
            setActiveTab('routines');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
            activeTab === 'routines'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
          }`}
        >
          <span>✨ Routines</span>
        </button>

        <button
          onClick={() => {
            haptics.toggle();
            setActiveTab('selfcare');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
            activeTab === 'selfcare'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
          }`}
        >
          <span>💚 Self-Care</span>
        </button>

        <button
          onClick={() => {
            haptics.toggle();
            setActiveTab('reports');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Reports</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. HABITS LIST TAB */}
      {activeTab === 'habits' && (
        <div className="space-y-4">
          {/* Category Filter Chips & Sorting Dropdown */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {(['all', 'fitness', 'health', 'mind', 'learning', 'productivity', 'routine'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    haptics.toggle();
                    setSelectedCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                      : 'bg-white dark:bg-black border border-slate-200/80 dark:border-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <select
              value={habitSort}
              onChange={e => {
                haptics.toggle();
                setHabitSort(e.target.value as any);
              }}
              className="px-3 py-1.5 rounded-2xl text-xs font-semibold bg-white dark:bg-black border border-slate-200/80 dark:border-zinc-900 text-slate-700 dark:text-zinc-300 focus:outline-hidden shrink-0 cursor-pointer"
            >
              <option value="custom">Sort: Default</option>
              <option value="alphabetical">Sort: Alphabetical (A-Z)</option>
              <option value="completion">Sort: Completion / Streak</option>
              <option value="recent">Sort: Recently Added</option>
            </select>
          </div>

          {/* Habits Cards Grouped by Category */}
          <div className="space-y-4">
            {filteredHabits.length === 0 ? (
              <div className="col-span-full py-12 text-center rounded-3xl bg-white dark:bg-black border border-dashed border-slate-300 dark:border-zinc-900 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 mx-auto flex items-center justify-center">
                  <Flame className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-zinc-100">No habits found</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Start tracking small daily disciplines to build effortless positive momentum.
                </p>
                <button
                  onClick={() => openAddModal()}
                  className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow-xs"
                >
                  Create Habit
                </button>
              </div>
            ) : (
              Object.entries(habitsByCategory).map(([catGroup, groupHabits]) => (
                <div key={catGroup} className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider px-1 pt-1 flex items-center justify-between">
                    <span>{catGroup}</span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {groupHabits.filter(h => !!h.completionHistory?.[selectedDateStr]).length}/{groupHabits.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {groupHabits.map(habit => {
                      const isCheckedToday = !!habit.completionHistory?.[selectedDateStr];
                      const isQuit = habit.habitType === 'quit';
                      const isCounter = habit.habitType === 'counter' || habit.habitType === 'measurement';
                      const habitColor = habit.color || '#10b981';
                      const hasSubSteps = habit.subSteps && habit.subSteps.length > 0;
                      const completedStepsCount = habit.subSteps ? habit.subSteps.filter(s => s.completed).length : 0;
                      const isSubStepsExpanded = expandedSubStepHabitId === habit.id;

                      return (
                        <div
                          key={habit.id}
                          draggable={habitSort === 'custom'}
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', habit.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('text/plain');
                            handleReorderHabits(draggedId, habit.id);
                          }}
                          onClick={() => setSelectedDetailHabit(habit)}
                          className={`relative rounded-2xl transition-all duration-200 p-2.5 sm:p-3 flex flex-col gap-2 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer ${
                            isCheckedToday ? 'opacity-95' : 'opacity-100'
                          } ${habitSort === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        >
                          {/* Vertical Grey Line Drag Handle at Left Border when custom sort is active */}
                          {habitSort === 'custom' && (
                            <div
                              className="absolute left-0 top-2 bottom-2 w-2.5 -ml-0.5 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing group/handle z-20"
                              title="Hold grey border handle to drag & reorder habit"
                            >
                              <div className="w-1 h-5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/handle:bg-slate-400 dark:group-hover/handle:bg-slate-500 group-active/handle:bg-emerald-600 transition-colors shadow-2xs" />
                            </div>
                          )}

                          <div className={`flex items-center justify-between gap-2 ${habitSort === 'custom' ? 'pl-1' : ''}`}>
                            {/* Left: Icon, Title, Streak */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 shadow-2xs"
                                style={{ backgroundColor: `${habitColor}15`, color: habitColor }}
                              >
                                <IconRenderer icon={habit.icon} className="w-4 h-4" fallback="🎯" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm tracking-tight truncate">
                                    {habit.name}
                                  </h4>
                                  {isQuit && (
                                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                      QUIT
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium pt-0.5 flex-wrap">
                                  <AnimatedStreakBadge
                                    streak={habit.currentStreak || 0}
                                    isCompleted={isCheckedToday}
                                    isAnimating={animatingHabitId === habit.id}
                                    size="xs"
                                    showZero={true}
                                  />
                                  <span>•</span>
                                  <span className="capitalize">{habit.frequency === 'custom' ? 'Specific Days' : habit.frequency}</span>
                                  {hasSubSteps && (
                                    <>
                                      <span>•</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedSubStepHabitId(isSubStepsExpanded ? null : habit.id);
                                        }}
                                        className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer"
                                        title={isSubStepsExpanded ? 'Collapse sub-habits' : 'Expand sub-habits'}
                                      >
                                        <SubtaskBranchIcon className="w-2.5 h-2.5 text-indigo-500" />
                                        <span>{completedStepsCount}/{habit.subSteps?.length}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isSubStepsExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Actions / Checkmark / Counter */}
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {habit.timerMinutes && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (session.activeId === habit.id) {
                                      if (session.isRunning) pauseSession();
                                      else resumeSession();
                                    } else {
                                      handleStartTimer(habit);
                                    }
                                  }}
                                  className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                                    session.activeId === habit.id && session.isRunning
                                      ? 'bg-amber-500 text-white animate-pulse'
                                      : session.activeId === habit.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                                  }`}
                                  title={
                                    session.activeId === habit.id
                                      ? session.isRunning
                                        ? 'Pause focus timer'
                                        : 'Resume focus timer'
                                      : `Start ${habit.timerMinutes}m focus`
                                  }
                                >
                                  {session.activeId === habit.id && session.isRunning ? (
                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  )}
                                  {session.activeId === habit.id && (
                                    <span className="text-[10px] font-mono font-bold">
                                      {Math.floor(session.timeRemaining / 60)}:{(session.timeRemaining % 60).toString().padStart(2, '0')}
                                    </span>
                                  )}
                                </button>
                              )}

                              {isQuit || isCounter ? (
                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-zinc-700">
                                  <button
                                    type="button"
                                    onClick={() => updateHabitCounter(habit.id, -1)}
                                    className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 text-slate-800 dark:text-zinc-200 flex items-center justify-center transition text-xs font-bold cursor-pointer active:scale-95"
                                    title={`Subtract ${habit.incrementStep || 1} ${habit.unit || ''}`}
                                  >
                                    -
                                  </button>
                                  <div className="relative flex items-center justify-center">
                                    <CircularProgress 
                                      value={habit.counterValue || 0} 
                                      max={habit.targetCount || 100} 
                                      size={40} 
                                      strokeWidth={4} 
                                      color="text-indigo-600" 
                                    />
                                    <div className="absolute flex flex-col items-center">
                                      <span className="text-[9px] font-mono font-black text-slate-900 dark:text-zinc-100 leading-none">
                                        {habit.counterValue || 0}
                                      </span>
                                      <span className="text-[7px] font-mono text-slate-500 leading-none mt-0.5">
                                        /{habit.targetCount || 0}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => updateHabitCounter(habit.id, 1)}
                                    className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition text-xs font-bold cursor-pointer active:scale-95 shadow-2xs gap-0.5"
                                    title={`Add ${habit.incrementStep || 1} ${habit.unit || ''}`}
                                  >
                                    <span>+</span>
                                    {habit.incrementStep && habit.incrementStep > 1 ? (
                                      <span className="text-[10px] font-mono">{habit.incrementStep}</span>
                                    ) : null}
                                  </button>
                                </div>
                              ) : (
                                <div className="relative flex items-center justify-center">
                                  <CheckmarkCelebration
                                    activeKey={celebratingHabitId === habit.id ? celebrationKey : null}
                                    badgeText={`Done🔥 ${Math.max(1, (habit.currentStreak || 0) + (isCheckedToday ? 0 : 1))}D`}
                                    ringColor="border-emerald-500"
                                    align="right"
                                  />
                                  <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.85 }}
                                    animate={animatingHabitId === habit.id ? { scale: [1, 1.22, 0.94, 1] } : {}}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                    onClick={() => handleToggleHabitWithAnimation(habit.id, selectedDateStr)}
                                    className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-2xs cursor-pointer ${
                                      isCheckedToday
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                        : 'bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700'
                                    }`}
                                    title={isCheckedToday ? 'Completed! Click to uncheck' : 'Click to check off today'}
                                  >
                                    {isCheckedToday ? (
                                      <AnimatedCheckIcon
                                        className="w-5 h-5 text-white"
                                        strokeWidth={2.75}
                                        animate={animatingHabitId === habit.id}
                                      />
                                    ) : (
                                      <AnimatedCheckIcon
                                        className="w-5 h-5 stroke-[2] opacity-35"
                                        strokeWidth={2}
                                        animate={false}
                                      />
                                    )}
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Note row shifted below */}
                          {habit.notes && habit.notes.trim().length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">{habit.notes}</span>
                            </div>
                          )}

                          {/* Expanded Sub-steps checklist with smooth height transition */}
                          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${hasSubSteps && isSubStepsExpanded ? 'max-h-[500px] opacity-100 pt-2 space-y-1' : 'max-h-0 opacity-0'}`} onClick={(e) => e.stopPropagation()}>
                            {habit.subSteps?.map(step => (
                              <button
                                key={step.id}
                                type="button"
                                onClick={() => {
                                  const updatedSteps = habit.subSteps?.map(s => s.id === step.id ? { ...s, completed: !s.completed } : s) || [];
                                  let shouldComplete = false;
                                  if (habit.doneWhen === 'any') {
                                    shouldComplete = updatedSteps.some(s => s.completed);
                                  } else {
                                    shouldComplete = updatedSteps.length > 0 && updatedSteps.every(s => s.completed);
                                  }
                                  const wasChecked = !!habit.completionHistory?.[selectedDateStr];

                                  setAnimatingHabitId(null);
                                  setCelebratingHabitId(null);

                                  updateHabitSubSteps(habit.id, updatedSteps, selectedDateStr);

                                  if (shouldComplete && !wasChecked) {
                                    setTimeout(() => {
                                      setAnimatingHabitId(habit.id);
                                    }, 20);
                                    try {
                                      soundEngine.playWaterDropNotification();
                                      haptics.complete();
                                    } catch {}
                                    setTimeout(() => {
                                      setCelebratingHabitId(habit.id);
                                      setCelebrationKey(prev => prev + 1);
                                    }, 280);
                                    setTimeout(() => setAnimatingHabitId(null), 450);
                                    setTimeout(() => setCelebratingHabitId(null), 1400);
                                  } else {
                                    haptics.toggle();
                                    try {
                                      soundEngine.playWaterDropNotification();
                                    } catch {}
                                  }
                                }}
                                className={`w-full p-2 rounded-xl border flex items-center gap-2 transition text-xs text-left cursor-pointer ${
                                  step.completed
                                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                  step.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-zinc-700'
                                }`}>
                                  {step.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={step.completed ? 'line-through opacity-75' : ''}>{step.text}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. ROUTINES TAB (Screenshots 1 & 2) */}
      {activeTab === 'routines' && <HabitsRoutineSection />}

      {/* 3. SELF-CARE TIPS & QUIZ TAB (Screenshots 3 & 4) */}
      {activeTab === 'selfcare' && <HabitsSelfCareSection />}

      {/* 4. REPORTS & ANALYTICS TAB (Screenshots 7, 8, 9, 10) */}
      {activeTab === 'reports' && <HabitsReportSection habits={habits} />}

      {/* Add / Edit Habit Modal */}
      {showAddModal && (
        <ActivityManager
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          type="habit"
          activityToEdit={editingHabit}
        />
      )}

      {/* Habit Detailed View Modal (Pixel Habit Tracker Style) */}
      {selectedDetailHabit && (
        <HabitDetailModal
          habit={selectedDetailHabit}
          onClose={() => setSelectedDetailHabit(null)}
          onEdit={(h) => {
            setSelectedDetailHabit(null);
            openEditModal(h);
          }}
        />
      )}

      {/* Floating Active Timer Overlay */}
      {session.activeId && session.type === 'habit' && (() => {
        const activeHabit = habits.find(h => h.id === session.activeId);
        const habitName = activeHabit ? activeHabit.name : session.title;
        const habitColor = activeHabit?.color || '#6366f1';

        return (
          <div className="fixed bottom-20 right-6 z-50 p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center gap-3.5 animate-in slide-in-from-bottom-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${habitColor}20`, color: habitColor }}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[150px]">
                {habitName}
              </h5>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white tabular-nums">
                {String(Math.floor(session.timeRemaining / 60)).padStart(2, '0')}:
                {String(session.timeRemaining % 60).padStart(2, '0')}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (session.isRunning) pauseSession();
                  else resumeSession();
                }}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  session.isRunning
                    ? 'bg-amber-500 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
                title={session.isRunning ? 'Pause' : 'Resume'}
              >
                {session.isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => stopSession()}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Stop Timer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
