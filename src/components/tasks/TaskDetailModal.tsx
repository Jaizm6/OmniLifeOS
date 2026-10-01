import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Bell,
  Star,
  Check,
  RotateCw,
  Folder,
  Tag,
  CheckSquare,
  Plus,
  Play,
  Pause,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListTodo,
  Timer,
  CheckCheck,
  MinusCircle,
  FolderKanban,
  Target,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { TaskItem, Priority, Subtask, DEFAULT_TASK_CATEGORIES } from '../../types';
import { formatOSDate } from '../../utils/date';
import { getEisenhowerMeta } from '../../utils/eisenhower';

interface TaskDetailModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onUpdateTask: (task: TaskItem) => void;
  onStartPomodoro?: (taskId: string) => void;
  onPausePomodoro?: () => void;
  isPomodoroRunning?: boolean;
  activePomodoroTaskId?: string | null;
  soundEngine?: any;
}

const PRIORITY_META: Record<string, { label: string; badge: string; color: string; dot: string }> = {
  high: {
    label: 'HIGH PRIORITY',
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    color: '#f43f5e',
    dot: 'bg-rose-500',
  },
  medium: {
    label: 'MEDIUM PRIORITY',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    color: '#f59e0b',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'LOW PRIORITY',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    color: '#10b981',
    dot: 'bg-emerald-500',
  },
  P1: {
    label: 'HIGH PRIORITY',
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    color: '#f43f5e',
    dot: 'bg-rose-500',
  },
  P2: {
    label: 'MEDIUM PRIORITY',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    color: '#f59e0b',
    dot: 'bg-amber-500',
  },
  P3: {
    label: 'LOW PRIORITY',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    color: '#10b981',
    dot: 'bg-emerald-500',
  },
  P4: {
    label: 'LOW PRIORITY',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    color: '#10b981',
    dot: 'bg-emerald-500',
  },
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleComplete,
  onToggleStar,
  onUpdateTask,
  onStartPomodoro,
  onPausePomodoro,
  isPomodoroRunning = false,
  activePomodoroTaskId,
  soundEngine,
}) => {
  const {
    projects,
    goals,
    pomodoro,
    startPomodoro: appStartPomodoro,
    pausePomodoro: appPausePomodoro,
    resetPomodoro: appResetPomodoro,
    stopPomodoro: appStopPomodoro,
    completePomodoroSession: appCompletePomodoro,
    switchPomodoroMode: appSwitchPomodoroMode,
    openEntitiesModal,
  } = useApp();

  const { startSession, stopSession: stopActiveSession } = useActiveSession();

  const [timerTab, setTimerTab] = useState<'pomo' | 'stopwatch'>('pomo');
  const [isTimerCardOpen, setIsTimerCardOpen] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  useEffect(() => {
    if (!isStopwatchRunning) return;
    const interval = setInterval(() => {
      setStopwatchSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editCategory, setEditCategory] = useState('work');
  const [editProject, setEditProject] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editGoalId, setEditGoalId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRecurring, setEditRecurring] = useState<TaskItem['recurring']>('none');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);

  useEffect(() => {
    if (task) {
      setEditTitle(task.title || '');
      setEditDueDate(task.dueDate || '');
      setEditDueTime(task.dueTime || '');
      setEditPriority(task.priority || 'medium');
      setEditCategory(task.category || 'work');
      setEditProject(task.project || 'General');
      setEditProjectId(task.projectId || '');
      setEditGoalId(task.goalId || '');
      setEditNotes(task.notes || '');
      setEditRecurring(task.recurring || 'none');
      setEditTags(task.tags || []);
      setIsEditing(false);
    }
  }, [task?.id, isOpen]);

  const handleCloseModal = () => {
    appStopPomodoro(task?.id);
    setIsStopwatchRunning(false);
    setStopwatchSeconds(0);
    setIsTimerCardOpen(false);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pomodoro.isRunning, pomodoro.taskId, task?.id]);

  if (!isOpen || !task) return null;

  const pMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const categoryObj = DEFAULT_TASK_CATEGORIES.find(c => c.id === task.category);
  const subtaskList = (Array.isArray(task.subtasks) && task.subtasks.length > 0)
    ? task.subtasks
    : (Array.isArray((task as any).checklist) && (task as any).checklist.length > 0)
    ? (task as any).checklist
    : [];
  const completedSubtasksCount = subtaskList.filter(s => s.completed).length;

  const handleSaveEdits = () => {
    if (!editTitle.trim()) return;
    const boundProjectName = projects.find(p => p.id === editProjectId)?.name || editProject.trim() || 'General';
    const updated: TaskItem = {
      ...task,
      title: editTitle.trim(),
      dueDate: editDueDate,
      dueTime: editDueTime || undefined,
      priority: editPriority,
      category: editCategory,
      project: boundProjectName,
      projectId: editProjectId || undefined,
      goalId: editGoalId || undefined,
      notes: editNotes.trim() || undefined,
      recurring: editRecurring,
      tags: editTags,
    };
    onUpdateTask(updated);
    setIsEditing(false);
    soundEngine?.playSuccessChime?.();
  };

  const handleCancelEdits = () => {
    if (task) {
      setEditTitle(task.title || '');
      setEditDueDate(task.dueDate || '');
      setEditDueTime(task.dueTime || '');
      setEditPriority(task.priority || 'medium');
      setEditCategory(task.category || 'work');
      setEditProject(task.project || 'General');
      setEditProjectId(task.projectId || '');
      setEditGoalId(task.goalId || '');
      setEditNotes(task.notes || '');
      setEditRecurring(task.recurring || 'none');
      setEditTags(task.tags || []);
    }
    setIsEditing(false);
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubs = subtaskList.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onUpdateTask({ ...task, subtasks: updatedSubs, checklist: updatedSubs });
    soundEngine?.playClick?.();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    onUpdateTask({ ...task, subtasks: [...subtaskList, newSub] });
    setNewSubtaskTitle('');
    soundEngine?.playClick?.();
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubs = subtaskList.filter(s => s.id !== subtaskId);
    onUpdateTask({ ...task, subtasks: updatedSubs });
  };

  const handleCheckAllSubtasks = (completed: boolean) => {
    const updatedSubs = subtaskList.map(s => ({ ...s, completed }));
    onUpdateTask({ ...task, subtasks: updatedSubs });
    soundEngine?.playSuccessChime?.();
  };

  const handleClearCompletedSubtasks = () => {
    const updatedSubs = subtaskList.filter(s => !s.completed);
    onUpdateTask({ ...task, subtasks: updatedSubs });
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tagClean = newTagInput.trim().replace(/^#/, '');
    if (!editTags.includes(tagClean)) {
      const nextTags = [...editTags, tagClean];
      setEditTags(nextTags);
      if (!isEditing) {
        onUpdateTask({ ...task, tags: nextTags });
      }
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = (task.tags || []).filter(t => t !== tagToRemove);
    setEditTags(nextTags);
    if (!isEditing) {
      onUpdateTask({ ...task, tags: nextTags });
    }
  };

  const handleAdjustPomodoro = (delta: number) => {
    const currentEst = task.estimatedPomodoros || 1;
    const nextEst = Math.max(1, currentEst + delta);
    onUpdateTask({ ...task, estimatedPomodoros: nextEst });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={handleCloseModal}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {(() => {
              const eMeta = getEisenhowerMeta(task.priority || task.quadrant);
              const EIcon = eMeta.Icon;
              return (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${eMeta.badgeClass}`}
                  title={`${eMeta.label}: ${eMeta.formula}`}
                >
                  <EIcon className="w-3 h-3 shrink-0" />
                  <span>{eMeta.label}</span>
                  <span className="text-[9px] opacity-75 font-normal hidden sm:inline">
                    · {eMeta.formula}
                  </span>
                </span>
              );
            })()}
            {categoryObj && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${categoryObj.bgColor} ${categoryObj.textColor} ${categoryObj.borderColor}`}
              >
                <span>{categoryObj.icon}</span>
                <span>{categoryObj.name}</span>
              </span>
            )}
            {task.recurring && task.recurring !== 'none' && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <RotateCw className="w-3 h-3" />
                <span className="capitalize">{task.recurring}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!task.completed && (
              <button
                type="button"
                id="btn-header-focus-timer"
                onClick={() => {
                  setTimerTab('pomo');
                  setIsTimerCardOpen(true);
                  if (pomodoro.taskId !== task.id || !pomodoro.isRunning) {
                    appStartPomodoro(task.id);
                    startSession(task.id, 'task', task.title, 'focus', pomodoro.initialDuration || 25 * 60);
                  }
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                  pomodoro.taskId === task.id && pomodoro.isRunning
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title="Open Focus Pomodoro Timer"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{pomodoro.taskId === task.id && pomodoro.isRunning ? 'Focusing...' : 'Focus'}</span>
              </button>
            )}
            {!task.completed && (
              <button
                type="button"
                id="btn-header-stopwatch-timer"
                onClick={() => {
                  setTimerTab('stopwatch');
                  setIsTimerCardOpen(true);
                  if (!isStopwatchRunning) {
                    setIsStopwatchRunning(true);
                    startSession(task.id, 'task', task.title, 'stopwatch');
                  }
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                  isStopwatchRunning
                    ? 'bg-cyan-500 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title="Open Stopwatch Timer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isStopwatchRunning ? `${Math.floor(stopwatchSeconds / 60).toString().padStart(2, '0')}:${(stopwatchSeconds % 60).toString().padStart(2, '0')}` : 'Stopwatch'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleStar(task.id)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                task.isStarred
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={task.isStarred ? 'Starred' : 'Star this task'}
            >
              <Star className={`w-4 h-4 ${task.isStarred ? 'fill-current' : ''}`} />
            </button>
            {!isEditing ? (
              <button
                type="button"
                id="btn-unlock-edit-task"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                title="Edit task fields"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCancelEdits}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-save-task-edits"
                  onClick={handleSaveEdits}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            )}
            <button
              type="button"
              id="btn-close-task-modal-x"
              onClick={handleCloseModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ml-1"
              title="Close Task and Stop Active Timer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {(isTimerCardOpen || pomodoro.taskId === task.id || isStopwatchRunning) && (() => {
          const circumference = 2 * Math.PI * 62;
          const pomoProgress =
            pomodoro.initialDuration > 0
              ? Math.min(100, Math.max(0, ((pomodoro.initialDuration - pomodoro.timeRemaining) / pomodoro.initialDuration) * 100))
              : 0;
          const stopwatchProgress = ((stopwatchSeconds % 60) / 60) * 100;
          const activeProgress = timerTab === 'pomo' ? pomoProgress : stopwatchProgress;
          const strokeOffset = circumference - (activeProgress / 100) * circumference;

          return (
            <div className="bg-gradient-to-b from-slate-50 to-slate-100/70 dark:from-slate-850 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 shrink-0 transition-all flex flex-col items-center justify-center gap-3 select-none">
              <div className="w-full flex items-center justify-between gap-2">
                <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setTimerTab('pomo');
                      if (pomodoro.mode !== 'work') appSwitchPomodoroMode('work');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      timerTab === 'pomo' && pomodoro.mode === 'work'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>Focus (25m)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerTab('pomo');
                      if (pomodoro.mode !== 'break') appSwitchPomodoroMode('break');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      timerTab === 'pomo' && pomodoro.mode === 'break'
                        ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Break (5m)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerTab('stopwatch')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      timerTab === 'stopwatch'
                        ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Stopwatch</span>
                  </button>
                </div>
                <button
                  type="button"
                  id="btn-timer-card-dismiss-x"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  title="Stop Timer & Close Dial"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative flex items-center justify-center my-1">
                <svg className="w-44 h-44 sm:w-48 sm:h-48 transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="62"
                    strokeWidth="8"
                    className="stroke-slate-200 dark:stroke-slate-800 fill-none"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="62"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    className={`fill-none transition-all duration-300 ${
                      timerTab === 'stopwatch'
                        ? 'stroke-cyan-500'
                        : pomodoro.mode === 'work'
                          ? 'stroke-emerald-500'
                          : 'stroke-amber-500'
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${
                      timerTab === 'stopwatch'
                        ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                        : pomodoro.mode === 'work'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {timerTab === 'stopwatch'
                      ? (isStopwatchRunning ? 'TRACKING' : 'STOPWATCH')
                      : (pomodoro.isRunning ? (pomodoro.mode === 'work' ? 'FOCUS' : 'BREAK') : 'READY')}
                  </span>
                  <div className="text-3xl sm:text-4xl font-mono font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {timerTab === 'pomo' ? (
                      `${Math.floor(pomodoro.timeRemaining / 60).toString().padStart(2, '0')}:${(pomodoro.timeRemaining % 60).toString().padStart(2, '0')}`
                    ) : (
                      Math.floor(stopwatchSeconds / 3600) > 0
                        ? `${Math.floor(stopwatchSeconds / 3600)}:${Math.floor((stopwatchSeconds % 3600) / 60).toString().padStart(2, '0')}:${(stopwatchSeconds % 60).toString().padStart(2, '0')}`
                        : `${Math.floor(stopwatchSeconds / 60).toString().padStart(2, '0')}:${(stopwatchSeconds % 60).toString().padStart(2, '0')}`
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    {timerTab === 'stopwatch' && `Logged: ${task.timeSpentMinutes || 0}m total`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {timerTab === 'pomo' ? (
                  <>
                    <button
                      type="button"
                      id="btn-clock-toggle-run"
                      onClick={() => {
                        if (pomodoro.isRunning) {
                          appPausePomodoro();
                        } else {
                          appStartPomodoro(task.id);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-xs cursor-pointer ${
                        pomodoro.isRunning
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {pomodoro.isRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{pomodoro.timeRemaining < pomodoro.initialDuration ? 'Resume' : 'Start Focus'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => appResetPomodoro({ restart: false })}
                      className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Restart Sprint (25:00)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        appStopPomodoro(task.id);
                        stopActiveSession();
                        setIsTimerCardOpen(false);
                      }}
                      className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                      title="Stop Timer & Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-xs cursor-pointer ${
                        isStopwatchRunning
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-cyan-600 hover:bg-cyan-700'
                      }`}
                    >
                      {isStopwatchRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{stopwatchSeconds > 0 ? 'Resume' : 'Start'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const minutes = Math.max(1, Math.round(stopwatchSeconds / 60));
                        const newTotal = (task.timeSpentMinutes || 0) + minutes;
                        onUpdateTask({ ...task, timeSpentMinutes: newTotal });
                        soundEngine?.playSuccessChime?.();
                        setStopwatchSeconds(0);
                        setIsStopwatchRunning(false);
                      }}
                      disabled={stopwatchSeconds < 5}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                      title="Log time spent to task"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Log Time</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStopwatchSeconds(0);
                        setIsStopwatchRunning(false);
                      }}
                      className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Reset Stopwatch"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                      title="Stop Stopwatch & Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => {
                onToggleComplete(task.id);
                soundEngine?.playWaterDropNotification?.();
              }}
              className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer border ${
                task.completed
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                  : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-slate-800'
              }`}
              title={task.completed ? 'Mark uncompleted' : 'Mark completed'}
            >
              {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
            </button>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full text-base font-bold px-3 py-1.5 rounded-xl border border-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              ) : (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-base sm:text-lg font-bold leading-snug break-words ${
                        task.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h3>
                    {/* Streak badge removed for tasks */}
                  </div>
                  {!isEditing && task.dueDate && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Due: {formatOSDate(task.dueDate, 'DDMonthYYYY', task.dueTime)}
                        {task.dueTime ? ` at ${task.dueTime}` : ''}
                      </span>
                    </div>
                  )}
                  {task.completed && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {isEditing && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 space-y-3 animate-in fade-in-50">
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Task Parameters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Planned Date (DD/MM/YYYY)
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={editDueTime}
                    onChange={e => setEditDueTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Priority / Matrix
                  </label>
                  <select
                    value={editPriority?.toLowerCase() === 'p1' || editPriority === 'high' ? 'high' : editPriority?.toLowerCase() === 'p2' || editPriority === 'medium' ? 'medium' : 'low'}
                    onChange={e => setEditPriority(e.target.value as Priority)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs"
                  >
                    <option value="high">🔴 I · High Priority</option>
                    <option value="medium">🟡 II · Medium Priority</option>
                    <option value="low">🟢 III · Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {DEFAULT_TASK_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Project
                    </label>
                    <button
                      type="button"
                      onClick={() => openEntitiesModal('projects')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                      title="Open Central Hub to modify Projects"
                    >
                      Modify
                    </button>
                  </div>
                  <select
                    value={editProjectId || (editProject ? `custom:${editProject}` : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val.startsWith('custom:')) {
                        setEditProjectId('');
                        setEditProject(val.replace('custom:', ''));
                      } else if (val) {
                        setEditProjectId(val);
                        const proj = projects.find(p => p.id === val);
                        setEditProject(proj?.name || '');
                      } else {
                        setEditProjectId('');
                        setEditProject('General');
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs"
                  >
                    <option value="">General</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        📁 {p.name}
                      </option>
                    ))}
                    {editProject && editProject !== 'General' && !projects.some(p => p.id === editProjectId) && (
                      <option value={`custom:${editProject}`}>
                        📁 {editProject} (Custom)
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Life Goal
                    </label>
                    <button
                      type="button"
                      onClick={() => openEntitiesModal('goals')}
                      className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      title="Open Central Hub to modify Goals"
                    >
                      Modify
                    </button>
                  </div>
                  <select
                    value={editGoalId}
                    onChange={e => setEditGoalId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs"
                  >
                    <option value="">No Linked Goal</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>
                        🎯 {g.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Repeat
                  </label>
                  <select
                    value={editRecurring}
                    onChange={e => setEditRecurring(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="none">No repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Task notes, links, or context..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                />
              </div>
            </div>
          )}
          {subtaskList.length > 0 && (
            <div className="pl-7 sm:pl-8 space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
              {subtaskList.map(sub => (
                <div
                  key={sub.id}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-2 text-xs py-0.5"
                >
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleToggleSubtask(sub.id);
                    }}
                    className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center transition shrink-0 cursor-pointer ${
                      sub.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-500'
                    }`}
                    title={sub.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {sub.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                  <span
                    className={`text-xs transition select-none truncate ${
                      sub.completed
                        ? 'line-through text-slate-400 dark:text-slate-500 opacity-60'
                        : 'text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                    title={sub.title}
                  >
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!isEditing && task.notes && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-100/60 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider cursor-pointer"
              >
                <span>Notes</span>
                {isNotesOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
              {isNotesOpen && (
                <div className="p-3 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {task.notes}
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tags
              </span>
              <button
                type="button"
                onClick={() => openEntitiesModal('tags')}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                title="Open Central Hub to manage and create Tags"
              >
                Manage All Tags
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {((isEditing ? editTags : task.tags) || []).map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-500 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add Tag..."
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="px-2 py-0.5 text-[11px] rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden max-w-[110px]"
                />
                {newTagInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-[10px] font-bold"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
          {task.createdAt && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                Created: {formatOSDate(task.createdAt, 'DDMMYYYY:HH:MM')}
              </span>
              {task.completedAt && (
                <span>
                  Done: {formatOSDate(task.completedAt, 'DDMMYYYY:HH:MM')}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
                onDelete(task.id);
                onClose();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleComplete(task.id);
                soundEngine?.playWaterDropNotification?.();
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                task.completed
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{task.completed ? 'Mark Incomplete' : 'Complete Task'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
