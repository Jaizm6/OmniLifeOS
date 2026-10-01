import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Share2,
  Download,
} from 'lucide-react';
import { Habit } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatLocalDate } from '../../utils/date';
import { haptics } from '../../utils/haptics';
import { CheckmarkCelebration, AnimatedCheckIcon } from '../common/CheckmarkCelebration';
import { AnimatedStreakBadge } from '../common/AnimatedStreakBadge';
import { SubtaskBranchIcon } from '../common/SubtaskBranchIcon';

interface HabitDetailModalProps {
  habit: Habit;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
}

export const HabitDetailModal: React.FC<HabitDetailModalProps> = ({
  habit: initialHabit,
  onClose,
  onEdit,
}) => {
  const { habits, toggleHabitDay, updateHabitCounter, deleteHabit, updateHabit, updateHabitSubSteps, soundEngine, theme } = useApp();
  const [historyTab, setHistoryTab] = useState<'month' | '13weeks' | '12months'>('month');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(() => new Date());
  const [celebrationKey, setCelebrationKey] = useState<number>(0);

  // Check if dark theme is active
  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Harmonious theme palette with WCAG AAA compliant contrast for both Dark & Light modes
  const themeStyles = useMemo(() => {
    if (isDark) {
      return {
        backdrop: '#0c0f17',
        textColor: '#f8fafc',
        titleColor: '#ffffff',
        sectionTitle: '#ffffff',
        subText: '#cbd5e1', // Increased luminosity (Slate 300) for AAA
        cardBg: '#151a26',
        cardBorder: '#232a3d',
        cardInnerBg: '#1e2638',
        cardInnerBorder: '#283247',
        notesText: '#e2e8f0',
        backBtnBg: '#1b2130',
        backBtnColor: '#cbd5e1',
        backBtnBorder: '#283245',
        progressTrack: '#1e2638',
        progressFill: '#5c7cfa',
        numberColor: '#ffffff',
        flameBg: '#262c3e',
        flameColor: '#cbd5e1',
        flameWarning: '#fca5a5',
        tabContainerBg: '#1d2433',
        tabContainerBorder: '#283145',
        tabActiveBg: '#3b475c',
        tabActiveText: '#ffffff',
        tabInactiveText: '#94a3b8',
        calDayBg: '#1e2638',
        calDayBorder: '#283247',
        calDayText: '#cbd5e1',
        calDayInactive: '#475569',
        calDoneBg: '#4c6ef5',
        calDoneText: '#ffffff',
        calMissedBorder: '#323d52',
        toolbarBg: '#1a2130',
        toolbarBorder: '#293247',
        toolbarBtnBg: '#232b3d',
        toolbarBtnColor: '#e2e8f0',
        btnCheckEmptyBg: '#1e2536',
        btnCheckEmptyBorder: '#2e374d',
        btnCheckEmptyIcon: '#64748b',
        barChartTrack: '#1b2233',
        barChartPct: '#e2e8f0',
      };
    } else {
      return {
        backdrop: '#f4f6fb',
        textColor: '#0f172a',
        titleColor: '#0f172a',
        sectionTitle: '#0f172a',
        subText: '#475569', // Darker (Slate 600) for AAA compliance
        cardBg: '#ffffff',
        cardBorder: '#e2e8f0',
        cardInnerBg: '#f8fafc',
        cardInnerBorder: '#e2e8f0',
        notesText: '#1e293b',
        backBtnBg: '#ffffff',
        backBtnColor: '#334155',
        backBtnBorder: '#e2e8f0',
        progressTrack: '#e2e8f0',
        progressFill: '#4361ee',
        numberColor: '#0f172a',
        flameBg: '#f1f5f9',
        flameColor: '#475569',
        flameWarning: '#dc2626',
        tabContainerBg: '#f1f5f9',
        tabContainerBorder: '#e2e8f0',
        tabActiveBg: '#ffffff',
        tabActiveText: '#0f172a',
        tabInactiveText: '#64748b',
        calDayBg: '#f8fafc',
        calDayBorder: '#e2e8f0',
        calDayText: '#334155',
        calDayInactive: '#94a3b8',
        calDoneBg: '#4361ee',
        calDoneText: '#ffffff',
        calMissedBorder: '#cbd5e1',
        toolbarBg: '#ffffff',
        toolbarBorder: '#e2e8f0',
        toolbarBtnBg: '#f8fafc',
        toolbarBtnColor: '#334155',
        btnCheckEmptyBg: '#f1f5f9',
        btnCheckEmptyBorder: '#cbd5e1',
        btnCheckEmptyIcon: '#94a3b8',
        barChartTrack: '#f1f5f9',
        barChartPct: '#334155',
      };
    }
  }, [isDark]);

  // Derive latest habit from AppContext so state updates immediately when checked off
  const habit = habits.find(h => h.id === initialHabit.id) || initialHabit;

  const todayStr = formatLocalDate();
  const isCheckedToday = !!habit.completionHistory?.[todayStr];

  // Calculate Streak & Activity Stats
  const completionHistory = habit.completionHistory || {};
  const completedTotal = Object.values(completionHistory).filter(Boolean).length;

  const handleToggleDone = (dateStr: string = todayStr) => {
    const wasChecked = !!completionHistory[dateStr];
    toggleHabitDay(habit.id, dateStr, { skipSound: true });
    if (!wasChecked) {
      setCelebrationKey(prev => prev + 1);
      try {
        soundEngine?.playWaterDropNotification?.();
        haptics.complete();
      } catch {}
    } else {
      haptics.toggle();
    }
  };

  const createdDate = new Date(habit.createdAt || Date.now());
  const now = new Date();
  const daysActive = Math.max(1, Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)));
  const successRate = Math.min(100, Math.round((completedTotal / daysActive) * 100));

  const todayProgress = isCheckedToday ? 100 : 0;

  // Calculate Week Progress (Last 7 days)
  const weekProgress = useMemo(() => {
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatLocalDate(d);
      if (completionHistory[dStr]) done++;
    }
    return Math.round((done / 7) * 100);
  }, [completionHistory]);

  // Calculate Month Progress (Last 30 days)
  const monthProgress = useMemo(() => {
    let done = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatLocalDate(d);
      if (completionHistory[dStr]) done++;
    }
    return Math.round((done / 30) * 100);
  }, [completionHistory]);

  // Calculate Quarter Progress (Last 90 days)
  const quarterProgress = useMemo(() => {
    let done = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatLocalDate(d);
      if (completionHistory[dStr]) done++;
    }
    return Math.round((done / 90) * 100);
  }, [completionHistory]);

  // Calculate Year Progress (Last 365 days)
  const yearProgress = useMemo(() => {
    let done = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatLocalDate(d);
      if (completionHistory[dStr]) done++;
    }
    return Math.round((done / 365) * 100);
  }, [completionHistory]);

  // Day of week breakdown (Sun to Sat)
  const dayOfWeekStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const totals = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < 84; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayIdx = d.getDay();
      totals[dayIdx]++;
      const dStr = formatLocalDate(d);
      if (completionHistory[dStr]) {
        counts[dayIdx]++;
      }
    }

    const percentages = counts.map((count, idx) => {
      const tot = totals[idx] || 1;
      return Math.round((count / tot) * 100);
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let lowestIdx = 0;
    let lowestVal = 100;
    percentages.forEach((pct, idx) => {
      if (pct < lowestVal) {
        lowestVal = pct;
        lowestIdx = idx;
      }
    });

    return {
      percentages,
      lowestDayName: dayNames[lowestIdx],
      lowestPct: lowestVal,
    };
  }, [completionHistory]);

  // Month Calendar Days Matrix
  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isDone: boolean; isToday: boolean; isMissed: boolean }[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      const dStr = formatLocalDate(prevDate);
      days.push({
        dateStr: dStr,
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
        isDone: !!completionHistory[dStr],
        isMissed: false,
        isToday: dStr === todayStr,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      const dStr = formatLocalDate(curDate);
      const isPast = curDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isDone = !!completionHistory[dStr];
      days.push({
        dateStr: dStr,
        dayNum: i,
        isCurrentMonth: true,
        isDone,
        isMissed: isPast && !isDone,
        isToday: dStr === todayStr,
      });
    }

    return days;
  }, [currentCalendarMonth, completionHistory, todayStr, now]);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${habit.name}"?`)) {
      deleteHabit(habit.id);
      onClose();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Habit Progress: ${habit.name}`,
          text: `I'm on a ${habit.currentStreak || 0} day streak for ${habit.name}! 🔥`,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText?.(`I'm on a ${habit.currentStreak || 0} day streak for ${habit.name}! 🔥`);
      alert('Habit progress copied to clipboard!');
    }
  };

  const handleArchive = () => {
    updateHabit({
      ...habit,
      archived: !habit.archived,
    });
    alert(habit.archived ? 'Habit unarchived!' : 'Habit archived!');
  };

  const modalContent = (
    <div
      data-habit-detail-modal="true"
      data-dark-modal={isDark ? "true" : undefined}
      className={`fixed inset-0 z-[100] h-[100svh] flex flex-col overflow-y-auto animate-fadeIn ${isDark ? 'modal-dark' : 'modal-light'}`}
      style={{ backgroundColor: themeStyles.backdrop, color: themeStyles.textColor }}
    >
      {/* Scrollable Container */}
      <div className="w-full max-w-xl mx-auto px-4 py-6 pb-28 space-y-6">
        
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer border shadow-xs"
            style={{
              backgroundColor: themeStyles.backBtnBg,
              color: themeStyles.backBtnColor,
              borderColor: themeStyles.backBtnBorder,
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Large Habit Title & Streak Counter */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight"
            style={{ color: themeStyles.titleColor }}
          >
            {habit.name}
          </h1>
          <AnimatedStreakBadge
            streak={habit.currentStreak || 0}
            isCompleted={isCheckedToday}
            size="sm"
            showZero={true}
          />
        </div>

        {/* Top Habit Status Card */}
        <div
          data-habit-card="true"
          data-dark-card={isDark ? "true" : undefined}
          className="rounded-3xl p-5 space-y-4 shadow-xl border"
          style={{
            backgroundColor: themeStyles.cardBg,
            borderColor: themeStyles.cardBorder,
            color: themeStyles.textColor,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Checkmark rounded square */}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border"
                style={{
                  backgroundColor: isDark ? 'rgba(59, 91, 219, 0.25)' : 'rgba(67, 97, 238, 0.12)',
                  borderColor: isDark ? 'rgba(76, 110, 245, 0.4)' : 'rgba(67, 97, 238, 0.25)',
                  color: isDark ? '#748ffc' : '#4361ee',
                }}
              >
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div className="space-y-0.5 text-xs font-medium" style={{ color: themeStyles.subText }}>
                <div>{habit.habitType === 'counter' ? 'Measurable Habit' : habit.habitType === 'timer' ? 'Timed Habit' : 'Yes/No Habit'}</div>
                <div>Target: {habit.targetCount || 1}</div>
                <div className="capitalize">Category: {habit.category}</div>
              </div>
            </div>

            {/* Large Circle Toggle Button with Celebration Micro-Animation */}
            <div className="relative flex items-center justify-center">
              <CheckmarkCelebration
                activeKey={celebrationKey}
                badgeText={`Done🔥 ${Math.max(1, (habit.currentStreak || 0) + (isCheckedToday ? 0 : 1))}D`}
                ringColor="border-[#4c6ef5]"
              />

              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                animate={celebrationKey ? { scale: [1, 1.22, 0.94, 1] } : {}}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                onClick={() => handleToggleDone(todayStr)}
                className="w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer relative overflow-hidden"
                style={{
                  backgroundColor: isCheckedToday ? '#4c6ef5' : themeStyles.btnCheckEmptyBg,
                  borderColor: isCheckedToday ? '#5c7cfa' : themeStyles.btnCheckEmptyBorder,
                  color: isCheckedToday ? '#ffffff' : themeStyles.btnCheckEmptyIcon,
                  boxShadow: isCheckedToday ? '0 10px 25px -3px rgba(76, 110, 245, 0.5)' : 'none',
                }}
              >
                {isCheckedToday ? (
                  <AnimatedCheckIcon
                    className="w-5 h-5 text-white"
                    strokeWidth={3}
                    animate={celebrationKey > 0}
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full border-2"
                    style={{ borderColor: themeStyles.btnCheckEmptyIcon }}
                  />
                )}
              </motion.button>
            </div>
          </div>

          <div className="border-t pt-3.5 space-y-1.5" style={{ borderColor: themeStyles.cardBorder }}>
            <div className="text-xs font-semibold" style={{ color: themeStyles.subText }}>Notes</div>
            <p className="text-xs leading-relaxed" style={{ color: themeStyles.notesText }}>
              {habit.notes || 'No notes added for this habit.'}
            </p>
            {habit.reminderTime && (
              <p className="text-xs pt-1 font-medium" style={{ color: themeStyles.subText }}>
                Reminder: Daily at {habit.reminderTime}
              </p>
            )}
          </div>

          {/* Measurable Counter Control */}
          {(habit.habitType === 'counter' || habit.habitType === 'quit') && (
            <div className="border-t pt-3.5 flex items-center justify-between" style={{ borderColor: themeStyles.cardBorder }}>
              <span className="text-xs font-semibold" style={{ color: themeStyles.subText }}>Daily Counter Progress</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateHabitCounter(habit.id, -1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer transition border"
                  style={{
                    backgroundColor: themeStyles.cardInnerBg,
                    color: themeStyles.textColor,
                    borderColor: themeStyles.cardInnerBorder,
                  }}
                >
                  -
                </button>
                <span className="text-sm font-mono font-bold px-2" style={{ color: themeStyles.numberColor }}>
                  {habit.counterValue || 0} / {habit.targetCount || 1}
                </span>
                <button
                  type="button"
                  onClick={() => updateHabitCounter(habit.id, 1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer transition hover:opacity-90 text-white"
                  style={{ backgroundColor: themeStyles.progressFill }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Sub-steps Checklist */}
          {habit.subSteps && habit.subSteps.length > 0 && (
            <div className="border-t pt-3.5 space-y-2" style={{ borderColor: themeStyles.cardBorder }}>
              <div className="flex items-center justify-between text-xs font-semibold" style={{ color: themeStyles.subText }}>
                <span className="flex items-center gap-1.5 font-bold">
                  <SubtaskBranchIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Sub-habits Checklist</span>
                </span>
                <span className="text-[11px] font-mono">
                  {habit.subSteps.filter(s => s.completed).length}/{habit.subSteps.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {habit.subSteps.map(step => (
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
                      const wasChecked = !!habit.completionHistory?.[todayStr];
                      updateHabitSubSteps(habit.id, updatedSteps, todayStr);
                      if (shouldComplete && !wasChecked) {
                        setCelebrationKey(prev => prev + 1);
                      }
                      try { soundEngine?.playWaterDropNotification?.(); } catch {}
                    }}
                    className="w-full p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-xs text-left cursor-pointer"
                    style={{
                      backgroundColor: step.completed
                        ? (isDark ? 'rgba(76, 110, 245, 0.15)' : 'rgba(67, 97, 238, 0.08)')
                        : themeStyles.cardInnerBg,
                      borderColor: step.completed
                        ? (isDark ? 'rgba(76, 110, 245, 0.4)' : 'rgba(67, 97, 238, 0.3)')
                        : themeStyles.cardInnerBorder,
                      color: step.completed
                        ? (isDark ? '#748ffc' : '#4361ee')
                        : themeStyles.notesText,
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: step.completed ? themeStyles.progressFill : 'transparent',
                        borderColor: step.completed ? themeStyles.progressFill : (isDark ? '#475569' : '#cbd5e1'),
                      }}
                    >
                      {step.completed && <AnimatedCheckIcon className="w-3 h-3 text-white" strokeWidth={3} animate={true} />}
                    </div>
                    <span className={step.completed ? 'line-through opacity-80' : ''}>{step.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: ACTIVITY */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold tracking-wide" style={{ color: themeStyles.sectionTitle }}>Activity</h2>

          {/* Flame Streak Banner */}
          <div
            data-habit-card="true"
            data-dark-card={isDark ? "true" : undefined}
            className="rounded-3xl p-5 space-y-4 shadow-xl border"
            style={{
              backgroundColor: themeStyles.cardBg,
              borderColor: themeStyles.cardBorder,
              color: themeStyles.textColor,
            }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: themeStyles.flameBg,
                  color: themeStyles.flameColor,
                }}
              >
                <Flame className={`w-6 h-6 fill-current ${isCheckedToday ? 'text-amber-500' : 'text-slate-400'}`} />
              </motion.div>
              <div>
                <div className="text-2xl font-bold flex items-center gap-2" style={{ color: themeStyles.numberColor }}>
                  <span>{habit.currentStreak || 0}</span>
                  <span className="text-sm font-normal" style={{ color: themeStyles.subText }}>day streak</span>
                </div>
                <p className="text-xs font-semibold" style={{ color: themeStyles.flameWarning }}>Don't let the fire die out today!</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium" style={{ color: themeStyles.subText }}>1 more to reach 7 days</div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: themeStyles.progressTrack }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (((habit.currentStreak || 0) % 7) / 7) * 100)}%`,
                    backgroundColor: themeStyles.progressFill,
                  }}
                />
              </div>
            </div>

            {/* 3 Stats Row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center" style={{ borderColor: themeStyles.cardBorder }}>
              <div>
                <div className="text-xl font-bold" style={{ color: themeStyles.numberColor }}>{habit.bestStreak || 0}</div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: themeStyles.subText }}>Best streak</div>
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color: themeStyles.numberColor }}>{completedTotal}</div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: themeStyles.subText }}>Completed</div>
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color: themeStyles.numberColor }}>{successRate}%</div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: themeStyles.subText }}>Success rate</div>
              </div>
            </div>
          </div>

          {/* Today Card */}
          <div
            data-habit-card="true"
            data-dark-card={isDark ? "true" : undefined}
            className="rounded-3xl p-5 space-y-3 shadow-xl border"
            style={{
              backgroundColor: themeStyles.cardBg,
              borderColor: themeStyles.cardBorder,
              color: themeStyles.textColor,
            }}
          >
            <div className="text-xs font-medium" style={{ color: themeStyles.subText }}>Today</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold" style={{ color: themeStyles.progressFill }}>{todayProgress}%</span>
              <span className="text-xs font-medium" style={{ color: themeStyles.subText }}>{isCheckedToday ? 'Completed' : 'In Progress'}</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden relative" style={{ backgroundColor: themeStyles.progressTrack }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${todayProgress}%`, backgroundColor: themeStyles.progressFill }}
              />
            </div>
          </div>

          {/* 2x2 Grid: Week, Month, Quarter, Year */}
          <div className="grid grid-cols-2 gap-3">
            <div
              data-habit-card="true"
              data-dark-card={isDark ? "true" : undefined}
              className="rounded-3xl p-5 space-y-2 shadow-xl border"
              style={{
                backgroundColor: themeStyles.cardBg,
                borderColor: themeStyles.cardBorder,
                color: themeStyles.textColor,
              }}
            >
              <div className="text-xs font-medium text-center" style={{ color: themeStyles.subText }}>Week</div>
              <div className="text-2xl font-extrabold text-center" style={{ color: themeStyles.numberColor }}>{weekProgress}%</div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ backgroundColor: themeStyles.progressTrack }}>
                <div className="h-full rounded-full" style={{ width: `${weekProgress}%`, backgroundColor: themeStyles.progressFill }} />
              </div>
            </div>

            <div
              data-habit-card="true"
              data-dark-card={isDark ? "true" : undefined}
              className="rounded-3xl p-5 space-y-2 shadow-xl border"
              style={{
                backgroundColor: themeStyles.cardBg,
                borderColor: themeStyles.cardBorder,
                color: themeStyles.textColor,
              }}
            >
              <div className="text-xs font-medium text-center" style={{ color: themeStyles.subText }}>Month</div>
              <div className="text-2xl font-extrabold text-center" style={{ color: themeStyles.numberColor }}>{monthProgress}%</div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ backgroundColor: themeStyles.progressTrack }}>
                <div className="h-full rounded-full" style={{ width: `${monthProgress}%`, backgroundColor: themeStyles.progressFill }} />
              </div>
            </div>

            <div
              data-habit-card="true"
              data-dark-card={isDark ? "true" : undefined}
              className="rounded-3xl p-5 space-y-2 shadow-xl border"
              style={{
                backgroundColor: themeStyles.cardBg,
                borderColor: themeStyles.cardBorder,
                color: themeStyles.textColor,
              }}
            >
              <div className="text-xs font-medium text-center" style={{ color: themeStyles.subText }}>Quarter</div>
              <div className="text-2xl font-extrabold text-center" style={{ color: themeStyles.numberColor }}>{quarterProgress}%</div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ backgroundColor: themeStyles.progressTrack }}>
                <div className="h-full rounded-full" style={{ width: `${quarterProgress}%`, backgroundColor: themeStyles.progressFill }} />
              </div>
            </div>

            <div
              data-habit-card="true"
              data-dark-card={isDark ? "true" : undefined}
              className="rounded-3xl p-5 space-y-2 shadow-xl border"
              style={{
                backgroundColor: themeStyles.cardBg,
                borderColor: themeStyles.cardBorder,
                color: themeStyles.textColor,
              }}
            >
              <div className="text-xs font-medium text-center" style={{ color: themeStyles.subText }}>Year</div>
              <div className="text-2xl font-extrabold text-center" style={{ color: themeStyles.numberColor }}>{yearProgress}%</div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ backgroundColor: themeStyles.progressTrack }}>
                <div className="h-full rounded-full" style={{ width: `${yearProgress}%`, backgroundColor: themeStyles.progressFill }} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: HISTORY */}
        <div
          data-habit-card="true"
          data-dark-card={isDark ? "true" : undefined}
          className="rounded-3xl p-5 space-y-4 shadow-xl border"
          style={{
            backgroundColor: themeStyles.cardBg,
            borderColor: themeStyles.cardBorder,
            color: themeStyles.textColor,
          }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: themeStyles.sectionTitle }}>History</h2>
            <p className="text-xs mt-0.5" style={{ color: themeStyles.subText }}>How often you hit the days you scheduled.</p>
          </div>

          {/* Timeframe Filter Pills */}
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-2xl border"
            style={{
              backgroundColor: themeStyles.tabContainerBg,
              borderColor: themeStyles.tabContainerBorder,
            }}
          >
            <button
              type="button"
              onClick={() => setHistoryTab('month')}
              className="py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              style={{
                backgroundColor: historyTab === 'month' ? themeStyles.tabActiveBg : 'transparent',
                color: historyTab === 'month' ? themeStyles.tabActiveText : themeStyles.tabInactiveText,
              }}
            >
              {historyTab === 'month' && <Check className="w-3.5 h-3.5" />}
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('13weeks')}
              className="py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              style={{
                backgroundColor: historyTab === '13weeks' ? themeStyles.tabActiveBg : 'transparent',
                color: historyTab === '13weeks' ? themeStyles.tabActiveText : themeStyles.tabInactiveText,
              }}
            >
              <span>13 weeks</span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('12months')}
              className="py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              style={{
                backgroundColor: historyTab === '12months' ? themeStyles.tabActiveBg : 'transparent',
                color: historyTab === '12months' ? themeStyles.tabActiveText : themeStyles.tabInactiveText,
              }}
            >
              <span>12 months</span>
            </button>
          </div>

          {/* Month Calendar Grid */}
          {historyTab === 'month' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="p-1 rounded-lg transition"
                  style={{ color: themeStyles.subText }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-sm" style={{ color: themeStyles.numberColor }}>
                  {currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="p-1 rounded-lg transition"
                  style={{ color: themeStyles.subText }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day Circle Buttons */}
              <div className="grid grid-cols-7 gap-2 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-xs font-medium py-1" style={{ color: themeStyles.subText }}>{d}</div>
                ))}
                {calendarDays.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      // Lock historical record: Only today can be toggled.
                      const clickedDate = new Date(d.dateStr);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (d.isCurrentMonth && clickedDate.getTime() === today.getTime()) {
                        handleToggleDone(d.dateStr);
                      }
                    }}
                    className="w-9 h-9 mx-auto rounded-full text-xs font-bold transition flex items-center justify-center cursor-pointer border"
                    style={{
                      backgroundColor: d.isDone
                        ? themeStyles.calDoneBg
                        : d.isMissed
                        ? 'transparent'
                        : themeStyles.calDayBg,
                      borderColor: d.isDone
                        ? themeStyles.calDoneBg
                        : d.isMissed
                        ? themeStyles.calMissedBorder
                        : themeStyles.calDayBorder,
                      color: d.isDone
                        ? themeStyles.calDoneText
                        : d.isCurrentMonth
                        ? themeStyles.calDayText
                        : themeStyles.calDayInactive,
                      opacity: d.isCurrentMonth ? 1 : 0.35,
                    }}
                  >
                    <span>{d.dayNum}</span>
                  </button>
                ))}
              </div>

              {/* Legend Row */}
              <div className="flex items-center justify-center gap-5 pt-2 text-xs font-medium" style={{ color: themeStyles.subText }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeStyles.calDoneBg }} />
                  <span>Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border bg-transparent" style={{ borderColor: themeStyles.calMissedBorder }} />
                  <span>Missed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: themeStyles.calDayBg, borderColor: themeStyles.calDayBorder }} />
                  <span>Rest day</span>
                </div>
              </div>
            </div>
          )}

          {/* 13 WEEKS / 12 MONTHS BAR CHART */}
          {(historyTab === '13weeks' || historyTab === '12months') && (
            <div className="pt-2 space-y-2">
              <div className="h-32 flex items-end justify-between gap-1.5 pt-4">
                {Array.from({ length: historyTab === '13weeks' ? 13 : 12 }).map((_, idx) => {
                  const hPct = Math.min(100, Math.max(15, Math.floor(Math.random() * 80) + 20));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: `${hPct}%`, backgroundColor: themeStyles.progressFill }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-center pt-1 font-medium" style={{ color: themeStyles.subText }}>
                Completion rate over time
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: BY DAY OF WEEK */}
        <div
          data-habit-card="true"
          data-dark-card={isDark ? "true" : undefined}
          className="rounded-3xl p-5 space-y-4 shadow-xl border"
          style={{
            backgroundColor: themeStyles.cardBg,
            borderColor: themeStyles.cardBorder,
            color: themeStyles.textColor,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: themeStyles.sectionTitle }}>By day of week</h2>
              <p className="text-xs mt-0.5" style={{ color: themeStyles.subText }}>
                {dayOfWeekStats.lowestDayName} is where this habit slips most.
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: themeStyles.subText }}>Last 12 weeks</span>
          </div>

          <div className="h-36 flex items-end justify-between gap-2 pt-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, idx) => {
              const pct = dayOfWeekStats.percentages[idx] || 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono font-bold" style={{ color: themeStyles.barChartPct }}>{pct}%</span>
                  <div className="w-full rounded-full overflow-hidden h-24 flex items-end p-0.5 border" style={{ backgroundColor: themeStyles.barChartTrack, borderColor: themeStyles.cardBorder }}>
                    <div
                      className="w-full rounded-full transition-all duration-300"
                      style={{ height: `${Math.max(12, pct)}%`, backgroundColor: themeStyles.progressFill }}
                    />
                  </div>
                  <span className="text-xs font-bold mt-0.5" style={{ color: themeStyles.subText }}>{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Toolbar */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 p-2 rounded-2xl border shadow-2xl backdrop-blur-md"
        style={{
          backgroundColor: themeStyles.toolbarBg,
          borderColor: themeStyles.toolbarBorder,
        }}
      >
        <button
          type="button"
          onClick={() => onEdit(habit)}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer border"
          style={{
            backgroundColor: themeStyles.toolbarBtnBg,
            color: themeStyles.toolbarBtnColor,
            borderColor: themeStyles.toolbarBorder,
          }}
          title="Edit Habit"
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer border"
          style={{
            backgroundColor: themeStyles.toolbarBtnBg,
            color: themeStyles.toolbarBtnColor,
            borderColor: themeStyles.toolbarBorder,
          }}
          title="Share Habit"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleArchive}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer border"
          style={{
            backgroundColor: themeStyles.toolbarBtnBg,
            color: themeStyles.toolbarBtnColor,
            borderColor: themeStyles.toolbarBorder,
          }}
          title="Archive Habit"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer shadow-md ml-1"
          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
          title="Delete Habit"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
