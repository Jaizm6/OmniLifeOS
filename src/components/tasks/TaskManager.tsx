import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Play,
  Check,
  Calendar,
  Flag,
  Trash2,
  ListTodo,
  Tag,
  Clock,
  RotateCw,
  RotateCcw,
  Pause,
  Timer,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Columns3,
  Grid2X2,
  List,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Equal,
  Flame,
  Sparkles,
  BarChart3,
  Edit2,
  Sliders,
  Target,
  Star,
  Bell,
  MapPin,
  Folder,
  FolderPlus,
  Layers,
  Sparkle,
  MoreHorizontal,
  LayoutList,
  AlignJustify,
  Search,
  Download,
  Upload,
  Database,
  FileText,
  MessageSquare,
  Pencil,
  Workflow,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Priority, TaskItem, TaskStatus, EisenhowerQuadrant, DEFAULT_TASK_CATEGORIES, TaskCategory } from '../../types';
import { TaskReportSection } from './TaskReportSection';
import { TaskFormModal } from './TaskFormModal';
import { TaskDetailModal } from './TaskDetailModal';
import { WorkflowCustomizerModal } from './WorkflowCustomizerModal';
import { KanbanGoogleBoard } from './KanbanGoogleBoard';
import { UniformTaskCard } from './UniformTaskCard';
import { EisenhowerGoogleBoard } from './EisenhowerGoogleBoard';
import { QuoteBanner } from '../common/QuoteBanner';
import { OverdueIcon } from '../common/OverdueIcon';
import { useTaskDragAndDrop, TouchDragGhost } from '../../hooks/useTaskDragAndDrop';
import { formatOSDate, formatLocalDate } from '../../utils/date';
import { getEisenhowerMeta } from '../../utils/eisenhower';
import { QuickAddBatchModal } from './QuickAddBatchModal';
import { TaskExportImportModal } from './TaskExportImportModal';
import { ScrollableCompactDateStrip } from '../common/ScrollableCompactDateStrip';
import { motion } from 'framer-motion';
import { CheckmarkCelebration, AnimatedCheckIcon } from '../common/CheckmarkCelebration';
import { AnimatedStreakBadge } from '../common/AnimatedStreakBadge';
import { PriorityIcon } from '../common/PriorityIcon';
import { SubtaskBranchIcon } from '../common/SubtaskBranchIcon';
import { haptics } from '../../utils/haptics';

export const EisenhowerIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Eisenhower Matrix"
  >
    <rect x="3" y="3" width="18" height="18" rx="2.5" strokeWidth="2" />
    <line x1="12" y1="3" x2="12" y2="21" strokeWidth="1.75" />
    <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1.75" />
    <rect x="4.5" y="4.5" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" />
    <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" fillOpacity="0.7" />
    <circle cx="7.5" cy="16.5" r="1.2" fill="currentColor" fillOpacity="0.7" />
    <circle cx="16.5" cy="16.5" r="1.2" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

export const TaskManager: React.FC = () => {
  const {
    tasks,
    setTasks,
    listGroups,
    todoLists,
    selectedListId,
    setSelectedListId,
    addTask,
    batchAddTasks,
    updateTask,
    deleteTask,
    toggleTask,
    toggleStarTask,
    toggleSubtask,
    setTaskStatus,
    setTaskQuadrant,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    completePomodoroSession,
    incrementTaskPomodoro,
    decrementTaskPomodoro,
    pomodoro,
    stopPomodoro,
    projects,
    goals,
    addProject,
    taskTimers,
    workflowStages,
    setActiveTab,
    soundEngine,
    openEntitiesModal,
    pushNotification,
  } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'matrix' | 'reports'>('list');
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [taskCelebrationKey, setTaskCelebrationKey] = useState<number>(0);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [fadingTaskIds, setFadingTaskIds] = useState<Set<string>>(new Set());
  const activeAnimTimeoutsRef = useRef<Record<string, NodeJS.Timeout[]>>({});

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(activeAnimTimeoutsRef.current).forEach((timeouts: NodeJS.Timeout[]) => {
        timeouts.forEach(t => clearTimeout(t));
      });
    };
  }, []);

  const handleToggleTaskWithAnim = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const wasCompleted = task.completed || task.status === 'done';

    // If unchecking an already completed task
    if (wasCompleted) {
      if (activeAnimTimeoutsRef.current[taskId]) {
        activeAnimTimeoutsRef.current[taskId].forEach(t => clearTimeout(t));
        delete activeAnimTimeoutsRef.current[taskId];
      }
      setCompletingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setFadingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setAnimatingTaskId(prev => prev === taskId ? null : prev);
      setCelebratingTaskId(prev => prev === taskId ? null : prev);
      toggleTask(taskId);
      haptics.toggle();
      return;
    }

    // Clear any previous timers for this task
    if (activeAnimTimeoutsRef.current[taskId]) {
      activeAnimTimeoutsRef.current[taskId].forEach(t => clearTimeout(t));
      delete activeAnimTimeoutsRef.current[taskId];
    }

    // Completing task:
    // 1. Play signature single water drip notification sound (<1s) & haptic feedback
    try {
      soundEngine.playWaterDripNotification();
      haptics.complete();
    } catch {}

    // 2. STEP 1: Checkmark ticks FIRST! (Turns emerald green & draws SVG checkmark stroke)
    setAnimatingTaskId(taskId);
    setCompletingTaskIds(prev => new Set(prev).add(taskId));

    const timeouts: NodeJS.Timeout[] = [];

    // 3. STEP 2: ONLY after checkmark stroke completes (240ms), trigger Done✅ celebration badge!
    timeouts.push(
      setTimeout(() => {
        setCelebratingTaskId(taskId);
        setTaskCelebrationKey(prev => prev + 1);
      }, 240)
    );

    // 4. STEP 3: Keep the task rock-solid in place so the user clearly sees both tick & Done animation, then begin smooth slide out (950ms)
    timeouts.push(
      setTimeout(() => {
        setFadingTaskIds(prev => new Set(prev).add(taskId));
      }, 950)
    );

    // 5. STEP 4: After slide-out transition completes (1350ms), commit completion to global state and clean up
    timeouts.push(
      setTimeout(() => {
        toggleTask(taskId, { skipSound: true });
        setCompletingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setFadingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setAnimatingTaskId(prev => prev === taskId ? null : prev);
        setCelebratingTaskId(prev => prev === taskId ? null : prev);
        delete activeAnimTimeoutsRef.current[taskId];
      }, 1350)
    );

    activeAnimTimeoutsRef.current[taskId] = timeouts;
  };

  const sortedStages = [...(workflowStages || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  const handleReorderTasks = useCallback((draggedId: string, targetTaskId: string, position: 'before' | 'after') => {
    setTasks(prev => {
      const draggedIdx = prev.findIndex(t => t.id === draggedId);
      if (draggedIdx === -1) return prev;

      const newTasks = [...prev];
      const [removed] = newTasks.splice(draggedIdx, 1);

      let targetIdx = newTasks.findIndex(t => t.id === targetTaskId);
      if (targetIdx === -1) {
        newTasks.push(removed);
      } else {
        if (position === 'after') {
          targetIdx += 1;
        }
        newTasks.splice(targetIdx, 0, removed);
      }

      return newTasks.map((t, idx) => ({ ...t, order: idx }));
    });

    setIsSmartSort(false);
    try {
      localStorage.setItem('omnilifeos_task_smart_sort', 'false');
    } catch {}
  }, []);

  const dnd = useTaskDragAndDrop({
    tasks,
    onReorderTasks: handleReorderTasks,
    onDropOnStage: (draggedId, stageId) => {
      setTaskStatus(draggedId, stageId as TaskStatus);
    },
    onDropOnQuadrant: (draggedId, quadId) => {
      setTaskQuadrant(draggedId, quadId as EisenhowerQuadrant);
    },
    onDropOnCategory: (draggedId, categoryId) => {
      const t = tasks.find(item => item.id === draggedId);
      if (t) updateTask({ ...t, category: categoryId });
    },
    onDropOnProject: (draggedId, projId) => {
      const t = tasks.find(item => item.id === draggedId);
      const p = projects.find(proj => proj.id === projId);
      if (t) {
        updateTask({
          ...t,
          projectId: projId || undefined,
          project: p?.name || 'General',
          goalId: p?.goalId || t.goalId,
        });
      }
    },
    onDropOnGoal: (draggedId, gId) => {
      const t = tasks.find(item => item.id === draggedId);
      if (t) updateTask({ ...t, goalId: gId || undefined });
    },
  });

  const {
    draggedTaskId,
    dragOverTaskId,
    dropPosition,
    dragOverStageId,
    dragOverQuadrantId,
    dragOverCategory,
    dragOverProjectId,
    dragOverGoalId,
    touchGhostPos,
    draggedTaskTitle,
    wasDraggingRef,
    getTaskItemProps,
    getGripHandleProps,
    getStageDropProps,
    getQuadrantDropProps,
    getCategoryDropProps,
    getProjectDropProps,
    getGoalDropProps,
  } = dnd;

  const moveTaskOrder = (taskId: string, direction: 'up' | 'down') => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === taskId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const newTasks = [...prev];
      const [moved] = newTasks.splice(idx, 1);
      newTasks.splice(targetIdx, 0, moved);
      return newTasks.map((t, i) => ({ ...t, order: i }));
    });
    setIsSmartSort(false);
    try {
      localStorage.setItem('omnilifeos_task_smart_sort', 'false');
    } catch {}
    soundEngine?.playClick?.();
  };
  const [listDensity, setListDensity] = useState<'compact' | 'expanded'>(() => {
    try {
      const saved = localStorage.getItem('omnilifeos_task_density');
      return (saved === 'compact' || saved === 'expanded') ? saved : 'expanded';
    } catch {
      return 'expanded';
    }
  });

  const changeListDensity = (d: 'compact' | 'expanded') => {
    setListDensity(d);
    try {
      localStorage.setItem('omnilifeos_task_density', d);
    } catch {
      // ignore
    }
  };

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed' | 'date'>('today');
  const [selectedTaskDate, setSelectedTaskDate] = useState<string>(formatLocalDate());
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'goal' | 'project'>('all');

  // Smart Sort state: Pin high-priority overdue, sort by priority and due date proximity
  const [isSmartSort, setIsSmartSort] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('omnilifeos_task_smart_sort');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleSmartSort = () => {
    const nextVal = !isSmartSort;
    setIsSmartSort(nextVal);
    try {
      localStorage.setItem('omnilifeos_task_smart_sort', String(nextVal));
    } catch {}
    if (nextVal) {
      soundEngine?.playSuccessChime?.();
      pushNotification('Smart Sort Enabled', 'Tasks are prioritized by High/Med/Low & urgency with overdue items pinned to the top.', 'task');
    } else {
      soundEngine?.playPill?.();
      pushNotification('Standard Sort', 'Tasks sorted by priority and creation date.', 'task');
    }
  };
  
  // Custom Lists Dropdown state
  const [isListsDropdownOpen, setIsListsDropdownOpen] = useState(false);
  const [isHeaderMoreOpen, setIsHeaderMoreOpen] = useState(false);
  
  // Quick Task & Batch Add Bar state
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isBatchQuickAddOpen, setIsBatchQuickAddOpen] = useState(false);
  const [quickBatchText, setQuickBatchText] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');
  const [quickListId, setQuickListId] = useState<string>('inbox');
  const [quickDueDate, setQuickDueDate] = useState<string>(formatLocalDate(new Date()));
  const [quickIsStarred, setQuickIsStarred] = useState(false);
  const [quickCategory, setQuickCategory] = useState<string>('');
  const [quickProjectId, setQuickProjectId] = useState<string>('');
  const [quickGoalId, setQuickGoalId] = useState<string>('');
  const [recentlyCreatedTaskId, setRecentlyCreatedTaskId] = useState<string | null>(null);

  // Task Modal (Add and Edit)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState<string | undefined>(undefined);

  // Workflow Customizer Modal
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(false);

  // Task Detail Modal (Optimized Pop-up Card)
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Hover Peek
  const [notePeek, setNotePeek] = useState<{ taskId: string; text: string } | null>(null);

  // Global Search state (Super Productivity instant title or tag filter)
  const [searchQuery, setSearchQuery] = useState('');

  // Global keyboard shortcut ('/' focuses search bar, Escape clears)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        const el = document.getElementById('input-task-global-search') as HTMLInputElement | null;
        el?.focus();
        el?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openDetailTask = (task: TaskItem) => {
    if (wasDraggingRef.current || draggedTaskId) return;
    setDetailTask(task);
    setIsDetailModalOpen(true);
  };

  const openAddTask = (defaultSt?: string) => {
    setTaskToEdit(null);
    setTaskModalDefaultStatus(defaultSt);
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: TaskItem) => {
    setTaskToEdit(task);
    setTaskModalDefaultStatus(undefined);
    setIsTaskModalOpen(true);
  };

  const handleCycleEisenhower = (task: TaskItem) => {
    const nextPriorityMap: Record<Priority, Priority> = {
      high: 'medium',
      medium: 'low',
      low: 'high',
    };
    const nextP = nextPriorityMap[task.priority] || 'high';
    const quadMap: Record<Priority, EisenhowerQuadrant> = {
      high: 'urgent_important',
      medium: 'not_urgent_important',
      low: 'urgent_not_important',
    };
    soundEngine?.playPill();
    updateTask({
      ...task,
      priority: nextP,
      quadrant: quadMap[nextP],
    });
  };

  // Helper to format MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const todayStr = formatLocalDate(new Date());

  // Auto-reveal newly created tasks: whenever tasks count increases, ensure no active filter hides the new task!
  const prevTasksCountRef = useRef(tasks.length);
  useEffect(() => {
    if (tasks.length > prevTasksCountRef.current) {
      const newest = tasks[0];
      if (newest) {
        setRecentlyCreatedTaskId(newest.id);
        // Clear any filters that would hide this newly created task
        if (searchQuery) setSearchQuery('');
        if (taskTypeFilter !== 'all') setTaskTypeFilter('all');
        if (filter === 'completed') setFilter('today');
        if (selectedPriority !== 'all' && newest.priority !== selectedPriority) setSelectedPriority('all');
        if (selectedCategory !== 'all' && newest.category && newest.category.toLowerCase() !== selectedCategory.toLowerCase()) setSelectedCategory('all');
        if (selectedProject !== 'all' && newest.project && newest.project !== selectedProject) setSelectedProject('all');
        if (selectedGoal !== 'all' && newest.goalId && newest.goalId !== selectedGoal) setSelectedGoal('all');
        if (newest.dueDate && newest.dueDate > todayStr && filter === 'today') {
          setFilter('all');
        }
        const timer = setTimeout(() => {
          setRecentlyCreatedTaskId(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
    prevTasksCountRef.current = tasks.length;
  }, [tasks, searchQuery, taskTypeFilter, filter, selectedPriority, selectedCategory, selectedProject, selectedGoal, todayStr]);

  const toggleSubtasksView = (taskId: string) => {
    setExpandedSubtasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const priorityOrder: Record<Priority, number> = { high: 1, medium: 2, low: 3 };

  const priorityMeta: Record<Priority, { text: string; bg: string; badge: string; bar: string }> = {
    high: { 
      text: 'text-rose-950 dark:text-rose-200 font-semibold', 
      bg: 'bg-rose-50 dark:bg-rose-950/40', 
      badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-bold',
      bar: 'bg-rose-500'
    },
    medium: { 
      text: 'text-amber-950 dark:text-amber-200 font-semibold', 
      bg: 'bg-amber-50 dark:bg-amber-950/40', 
      badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold',
      bar: 'bg-amber-500'
    },
    low: { 
      text: 'text-emerald-950 dark:text-emerald-200 font-semibold', 
      bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
      badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold',
      bar: 'bg-emerald-500'
    },
  };

  const getPriorityMeta = (taskPriority?: string, taskQuadrant?: string) => {
    const p = (taskPriority || taskQuadrant || 'low').toString().toLowerCase().trim();
    if (p === 'high' || p === 'p1' || p === 'urgent_important' || p === 'urgent-important') {
      return priorityMeta.high;
    }
    if (p === 'medium' || p === 'p2' || p === 'not_urgent_important' || p === 'not-urgent-important') {
      return priorityMeta.medium;
    }
    return priorityMeta.low;
  };

  const getTaskPriorityBarClass = (task?: { priority?: string; quadrant?: string } | null) => {
    if (!task) return 'bg-emerald-500';
    const p = (task.priority || task.quadrant || 'low').toString().toLowerCase().trim();
    if (p === 'high' || p === 'p1' || p === 'urgent_important' || p === 'urgent-important') {
      return 'bg-rose-500';
    }
    if (p === 'medium' || p === 'p2' || p === 'not_urgent_important' || p === 'not-urgent-important') {
      return 'bg-amber-500';
    }
    return 'bg-emerald-500';
  };

  const getTaskCheckboxPriorityClass = (task?: { priority?: string; quadrant?: string; completed?: boolean } | null, isVisuallyDone?: boolean) => {
    if (!task) return 'border-2 border-emerald-500 dark:border-emerald-400';
    if (isVisuallyDone || task.completed) return 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-2xs';
    const p = (task.priority || task.quadrant || 'low').toString().toLowerCase().trim();
    if (p === 'high' || p === 'p1' || p === 'urgent_important' || p === 'urgent-important') {
      return 'border-2 border-rose-500 dark:border-rose-400 bg-white dark:bg-slate-800 hover:scale-105';
    }
    if (p === 'medium' || p === 'p2' || p === 'not_urgent_important' || p === 'not-urgent-important') {
      return 'border-2 border-amber-500 dark:border-amber-400 bg-white dark:bg-slate-800 hover:scale-105';
    }
    return 'border-2 border-emerald-500 dark:border-emerald-400 bg-white dark:bg-slate-800 hover:scale-105';
  };

  // Distinct projects and tags
  const allProjects = Array.from(new Set([...tasks.map(t => t.project), ...projects.map(p => p.name)]));
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags || [])));

  // Helper to check if task matches active custom list and tags
  const matchesListAndTags = (task: TaskItem) => {
    if (selectedTag !== 'all') {
      if (!task.tags || !task.tags.includes(selectedTag)) return false;
    }

    if (selectedListId === 'all') {
      // In "All", respect excludeFromAll (unless completed or specifically marked)
      if (task.isSomeday) return false;
      const taskList = todoLists.find(l => l.id === task.listId);
      if (taskList?.excludeFromAll) return false;
      return true;
    }

    if (selectedListId === 'smart-starred') {
      return !!task.isStarred;
    }
    if (selectedListId === 'smart-today') {
      return task.dueDate <= todayStr && !task.completed;
    }
    if (selectedListId === 'smart-alerts') {
      return Array.isArray(task.alerts) && task.alerts.length > 0;
    }
    if (selectedListId === 'smart-someday') {
      return !!task.isSomeday || task.listId === 'someday';
    }
    if (selectedListId === 'smart-next') {
      return task.listId === 'next' || task.priority === 'high';
    }

    if (selectedListId === 'inbox' || selectedListId === 'list_inbox') {
      return !task.listId || task.listId === 'inbox' || task.listId === 'list_inbox';
    }

    return task.listId === selectedListId || (!task.listId && selectedListId === 'inbox');
  };

  // Category helpers
  const getCategoryForTask = (task: TaskItem): TaskCategory => {
    const raw = (task.category || task.project || 'personal').toLowerCase();
    const found = DEFAULT_TASK_CATEGORIES.find(c => c.id === raw || c.name.toLowerCase() === raw);
    if (found) return found;
    return {
      id: raw,
      name: task.category || task.project || 'Personal',
      color: '#64748b',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      textColor: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-300 dark:border-slate-700',
      dotColor: 'bg-slate-500',
      icon: '🏷️',
    };
  };

  const countForCategory = (catId: string) => {
    return tasks.filter(t => {
      const isDone = t.completed || t.status === 'done';
      if (isDone) return false;
      const raw = (t.category || t.project || 'personal').toLowerCase();
      return raw === catId.toLowerCase();
    }).length;
  };

  // Global search matcher: filters tasks by title or tag instantly (matching Super Productivity efficiency)
  const matchesSearch = (task: TaskItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const cleanTag = q.startsWith('#') ? q.slice(1) : q;

    const titleMatches = task.title.toLowerCase().includes(q);
    const tagMatches = !!task.tags?.some(tag => tag.toLowerCase().includes(cleanTag));
    const projectMatches = (task.project || '').toLowerCase().includes(q);
    const subtaskMatches = !!task.subtasks?.some(sub => sub.title.toLowerCase().includes(q));

    return titleMatches || tagMatches || projectMatches || subtaskMatches;
  };

  // Helper to check if task matches selected priority, project, category, goal, and global search query
  const matchesPriorityAndProject = (task: TaskItem) => {
    if (!matchesSearch(task)) return false;
    if (selectedCategory !== 'all') {
      const raw = (task.category || task.project || 'personal').toLowerCase();
      if (raw !== selectedCategory.toLowerCase()) return false;
    }
    if (selectedPriority !== 'all') {
      const p = (task.priority || '').toLowerCase();
      const sp = selectedPriority.toLowerCase();
      const matches = p === sp || (sp === 'high' && p === 'p1') || (sp === 'medium' && p === 'p2') || (sp === 'low' && (p === 'p3' || p === 'p4'));
      if (!matches) return false;
    }
    if (selectedProject !== 'all' && task.project !== selectedProject) return false;
    if (selectedGoal !== 'all' && task.goalId !== selectedGoal) return false;
    if (taskTypeFilter !== 'all') {
      const isGoal = task.taskType === 'goal' || !!task.goalId;
      const isProject = task.taskType === 'project' || !!task.projectId || !!task.project;
      if (taskTypeFilter === 'goal' && !isGoal) return false;
      if (taskTypeFilter === 'project' && !isProject) return false;
    }
    if (!matchesListAndTags(task)) return false;
    return true;
  };

  // Helper to check if task matches active time/status filter tab across List, Kanban, and Eisenhower views
  const matchesFilterTab = (task: TaskItem, options?: { forKanbanColId?: TaskStatus }) => {
    // If task was just created, ALWAYS keep it visible so user immediately sees their created task!
    if (recentlyCreatedTaskId === task.id) return true;

    if (!matchesPriorityAndProject(task)) return false;

    if (selectedStageFilter !== 'all' && !options?.forKanbanColId) {
      const taskStage = task.status || (task.completed ? 'done' : 'todo');
      if (taskStage !== selectedStageFilter) return false;
    }

    // If currently playing completion animation, keep task in active list until fade-out finishes
    const isCompletingNow = completingTaskIds.has(task.id);
    const isTaskCompleted = (task.completed || task.status === 'done') && !isCompletingNow;

    // 1. Archive tab: only show completed / archived tasks
    if (filter === 'completed') {
      return (task.completed || task.status === 'done') && !isCompletingNow;
    }

    // 2. Today tab
    if (filter === 'today') {
      if (options?.forKanbanColId === 'done') {
        return (
          isTaskCompleted &&
          ((task.completedAt && (task.completedAt.startsWith(todayStr) || formatLocalDate(new Date(task.completedAt)) === todayStr)) || task.dueDate === todayStr)
        );
      }
      const isCreatedToday = task.createdAt
        ? (task.createdAt.startsWith(todayStr) || formatLocalDate(new Date(task.createdAt)) === todayStr)
        : false;
      return (
        !isTaskCompleted &&
        (!task.dueDate || task.dueDate <= todayStr || isCreatedToday)
      );
    }

    // 3. Upcoming tab
    if (filter === 'upcoming') {
      if (options?.forKanbanColId === 'done') {
        return false;
      }
      return !isTaskCompleted && task.dueDate > todayStr;
    }

    // 4. Specific Date tab ('date')
    if (filter === 'date') {
      if (options?.forKanbanColId === 'done') {
        return (
          isTaskCompleted &&
          ((task.completedAt && (task.completedAt.startsWith(selectedTaskDate) || formatLocalDate(new Date(task.completedAt)) === selectedTaskDate)) || task.dueDate === selectedTaskDate)
        );
      }
      return !isTaskCompleted && task.dueDate === selectedTaskDate;
    }

    // 5. All Active tab ('all')
    if (options?.forKanbanColId === 'done') {
      return (
        isTaskCompleted &&
        ((task.completedAt && task.completedAt.startsWith(todayStr)) || task.dueDate === todayStr)
      );
    }

    return !isTaskCompleted;
  };

  // Helper to calculate counts for filter buttons respecting current priority, project, category, goal & custom list filters
  const countForFilter = (tab: 'today' | 'upcoming' | 'all' | 'completed' | 'date') => {
    return tasks.filter(t => {
      if (!matchesSearch(t)) return false;
      if (selectedCategory !== 'all') {
        const raw = (t.category || t.project || 'personal').toLowerCase();
        if (raw !== selectedCategory.toLowerCase()) return false;
      }
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      if (selectedProject !== 'all' && t.project !== selectedProject) return false;
      if (selectedGoal !== 'all' && t.goalId !== selectedGoal) return false;
      if (selectedStageFilter !== 'all') {
        const taskStage = t.status || (t.completed ? 'done' : 'todo');
        if (taskStage !== selectedStageFilter) return false;
      }
      if (!matchesListAndTags(t)) return false;
      const isDone = t.completed || t.status === 'done';
      if (tab === 'completed') return isDone;
      if (tab === 'today') return !isDone && (!t.dueDate || t.dueDate <= todayStr);
      if (tab === 'upcoming') return !isDone && !!t.dueDate && t.dueDate > todayStr;
      if (tab === 'date') return !isDone && t.dueDate === selectedTaskDate;
      return !isDone;
    }).length;
  };

  // Count active tasks for a specific list or smart list
  const countForList = (listId: string) => {
    return tasks.filter(t => {
      const isDone = t.completed || t.status === 'done';
      if (isDone) return false;
      if (listId === 'all') {
        if (t.isSomeday) return false;
        const l = todoLists.find(item => item.id === t.listId);
        return !l?.excludeFromAll;
      }
      if (listId === 'smart-starred') return !!t.isStarred;
      if (listId === 'smart-today') return t.dueDate <= todayStr;
      if (listId === 'smart-alerts') return Array.isArray(t.alerts) && t.alerts.length > 0;
      if (listId === 'smart-someday') return !!t.isSomeday || t.listId === 'someday';
      if (listId === 'smart-next') return t.listId === 'next' || t.priority === 'high';
      return t.listId === listId || (!t.listId && listId === 'inbox');
    }).length;
  };

  // Quick task creation
  const handleQuickAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const targetList =
      selectedListId && !selectedListId.startsWith('smart-') && selectedListId !== 'all'
        ? selectedListId
        : quickListId || 'inbox';

    const quadrantMap: Record<Priority, EisenhowerQuadrant> = {
      high: 'urgent_important',
      medium: 'not_urgent_important',
      low: 'urgent_not_important',
    };

    const taskCategory = quickCategory || (selectedCategory !== 'all' ? selectedCategory : 'work');
    const boundProj = projects.find(p => p.id === quickProjectId);
    const categoryName = DEFAULT_TASK_CATEGORIES.find(c => c.id === taskCategory)?.name || 'Work';

    addTask({
      title: quickTaskTitle.trim(),
      completed: false,
      priority: quickPriority,
      quadrant: quadrantMap[quickPriority] || 'urgent_important',
      dueDate: quickDueDate || todayStr,
      project: boundProj ? boundProj.name : categoryName,
      projectId: quickProjectId || undefined,
      goalId: quickGoalId || boundProj?.goalId || undefined,
      category: taskCategory,
      listId: targetList,
      isStarred: quickIsStarred,
      isSomeday: selectedListId === 'smart-someday',
      estimatedPomodoros: 1,
      subtasks: [],
      status: 'todo',
      recurring: 'none',
    });

    setQuickTaskTitle('');
    setQuickIsStarred(false);
    if (searchQuery) setSearchQuery('');
    if (taskTypeFilter !== 'all') setTaskTypeFilter('all');
    if (filter === 'completed') setFilter('today');
    if (selectedPriority !== 'all' && quickPriority !== selectedPriority) setSelectedPriority('all');
    if (selectedCategory !== 'all' && taskCategory.toLowerCase() !== selectedCategory.toLowerCase()) setSelectedCategory('all');
    if (quickDueDate && quickDueDate > todayStr && filter === 'today') setFilter('all');
  };

  // Batch task creation (one per line)
  const handleBatchAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = quickBatchText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const targetList =
      selectedListId && !selectedListId.startsWith('smart-') && selectedListId !== 'all'
        ? selectedListId
        : quickListId || 'inbox';

    const quadrantMap: Record<Priority, EisenhowerQuadrant> = {
      high: 'urgent_important',
      medium: 'not_urgent_important',
      low: 'urgent_not_important',
    };

    const taskCategory = quickCategory || (selectedCategory !== 'all' ? selectedCategory : 'work');
    const boundProj = projects.find(p => p.id === quickProjectId);
    const categoryName = DEFAULT_TASK_CATEGORIES.find(c => c.id === taskCategory)?.name || 'Work';

    const newTasks = lines.map(line => ({
      title: line,
      completed: false,
      priority: quickPriority,
      quadrant: quadrantMap[quickPriority] || 'urgent_important',
      dueDate: quickDueDate || todayStr,
      project: boundProj ? boundProj.name : categoryName,
      projectId: quickProjectId || undefined,
      goalId: quickGoalId || boundProj?.goalId || undefined,
      category: taskCategory,
      listId: targetList,
      isStarred: quickIsStarred,
      isSomeday: selectedListId === 'smart-someday',
      estimatedPomodoros: 1,
      subtasks: [],
      status: 'todo' as TaskStatus,
      recurring: 'none' as const,
    }));

    batchAddTasks(newTasks);
    setQuickBatchText('');
    setIsBatchQuickAddOpen(false);
    if (searchQuery) setSearchQuery('');
    if (taskTypeFilter !== 'all') setTaskTypeFilter('all');
    if (filter === 'completed') setFilter('today');
    if (selectedPriority !== 'all' && quickPriority !== selectedPriority) setSelectedPriority('all');
    if (selectedCategory !== 'all' && taskCategory.toLowerCase() !== selectedCategory.toLowerCase()) setSelectedCategory('all');
    if (quickDueDate && quickDueDate > todayStr && filter === 'today') setFilter('all');
  };

  // Filter tasks for list view with Smart Sort & Standard Sort modes
  const filteredTasks = isSmartSort
    ? tasks
        .filter(t => matchesFilterTab(t))
        .sort((a, b) => {
          if (recentlyCreatedTaskId) {
            if (a.id === recentlyCreatedTaskId) return -1;
            if (b.id === recentlyCreatedTaskId) return 1;
          }

          // SMART SORT:
          // 1. High-priority overdue items PINNED at the absolute top (most urgent)
          // 2. Other overdue items (medium/low priority)
          // 3. Due today items (High -> Medium -> Low, then due time)
          // 4. Upcoming items (nearest due date first, then High -> Medium -> Low)
          // 5. No due date items (High -> Medium -> Low, then newest created)
          const isOverdueA = !!a.dueDate && a.dueDate < todayStr && !a.completed;
          const isOverdueB = !!b.dueDate && b.dueDate < todayStr && !b.completed;
          const isHighOverdueA = isOverdueA && a.priority === 'high';
          const isHighOverdueB = isOverdueB && b.priority === 'high';

          // Pin high-priority overdue items to the absolute top
          if (isHighOverdueA && !isHighOverdueB) return -1;
          if (!isHighOverdueA && isHighOverdueB) return 1;
          if (isHighOverdueA && isHighOverdueB) {
            const dateDiff = (a.dueDate || '').localeCompare(b.dueDate || '');
            if (dateDiff !== 0) return dateDiff;
            return (a.dueTime || '').localeCompare(b.dueTime || '');
          }

          // Group 1: Other overdue items (medium/low)
          if (isOverdueA && !isOverdueB) return -1;
          if (!isOverdueA && isOverdueB) return 1;
          if (isOverdueA && isOverdueB) {
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            return (a.dueDate || '').localeCompare(b.dueDate || '');
          }

          const isTodayA = a.dueDate === todayStr;
          const isTodayB = b.dueDate === todayStr;

          // Group 2: Due today
          if (isTodayA && !isTodayB) return -1;
          if (!isTodayA && isTodayB) return 1;
          if (isTodayA && isTodayB) {
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
            if (a.dueTime && !b.dueTime) return -1;
            if (!a.dueTime && b.dueTime) return 1;
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          }

          const hasUpcomingA = !!a.dueDate && a.dueDate > todayStr;
          const hasUpcomingB = !!b.dueDate && b.dueDate > todayStr;

          // Group 3: Upcoming (nearest due date first, then priority)
          if (hasUpcomingA && !hasUpcomingB) return -1;
          if (!hasUpcomingA && hasUpcomingB) return 1;
          if (hasUpcomingA && hasUpcomingB) {
            const dateDiff = (a.dueDate || '').localeCompare(b.dueDate || '');
            if (dateDiff !== 0) return dateDiff;
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            return (a.dueTime || '').localeCompare(b.dueTime || '');
          }

          // Group 4: No due date (priority first, then newest created)
          const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (pDiff !== 0) return pDiff;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        })
    : [...tasks]
        .filter(t => matchesFilterTab(t))
        .sort((a, b) => {
          if (typeof a.order === 'number' && typeof b.order === 'number') {
            return a.order - b.order;
          }
          if (typeof a.order === 'number') return -1;
          if (typeof b.order === 'number') return 1;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

  // Completed tasks matching current context filters (for Super Productivity completed drawer)
  const completedTasks = tasks
    .filter(t => (t.completed || t.status === 'done') && matchesPriorityAndProject(t))
    .sort((a, b) => ((b.completedAt || b.dueDate) || '').localeCompare((a.completedAt || a.dueDate) || ''));

  return (
    <div className={`w-full min-w-0 max-w-full ${viewMode === 'matrix' ? 'h-[calc(100dvh-120px)] sm:h-[calc(100vh-80px)] flex flex-col overflow-hidden space-y-1' : 'space-y-2.5 sm:space-y-3'}`}>
      {/* Shifted Tasks Title Bar (Consistent with Master LifeOS Calendar Pattern) */}
      {viewMode !== 'matrix' && (
        <div className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <CheckSquare className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Tasks & To-Do Engine
                </h2>
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                  {countForFilter('all')} active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High-performance task management with Kanban, Eisenhower, Timeline & Master Calendar
              </p>
            </div>
          </div>

          {/* Right: Quick Add + Batch Add + Options Menu + New Task */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-quick-add-batch"
              onClick={() => setIsBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-2xs hover:shadow-xs transition cursor-pointer shrink-0"
              title="Super Productivity Batch Quick-Add: Type multiple tasks separated by newlines"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Batch Add</span>
            </button>

            <button
              onClick={() => setIsBatchQuickAddOpen(!isBatchQuickAddOpen)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border transition cursor-pointer ${
                isBatchQuickAddOpen
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              title="Toggle Quick Inline Task Entry"
            >
              <Plus className="w-3 h-3 text-indigo-500" />
              <span className="hidden sm:inline">{isBatchQuickAddOpen ? 'Close Inline' : 'Quick Single'}</span>
            </button>

            <button
              id="btn-export-import-tasks"
              onClick={() => setIsExportImportModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition cursor-pointer shadow-2xs"
              title="Export tasks to JSON/CSV or import from files"
            >
              <Download className="w-3 h-3 text-indigo-500" />
              <span className="hidden sm:inline">Export / Import</span>
            </button>

            {/* Consolidated More Menu */}
            <div className="relative">
              <button
                id="btn-tasks-more-options"
                onClick={() => setIsHeaderMoreOpen(!isHeaderMoreOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-2xs"
                title="More task options and organizers"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Options</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isHeaderMoreOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsHeaderMoreOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setIsExportImportModalOpen(true);
                          setIsHeaderMoreOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                      >
                        <Database className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Export / Import (JSON, CSV)</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('planner');
                          setIsHeaderMoreOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>View in Planner</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              id="btn-open-add-task"
              onClick={() => openAddTask()}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-2xs transition shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>New Task</span>
            </button>
          </div>
        </div>
      )}

      {/* Super Productivity Global Task Search Bar: Instant filter by title or tag */}
      {viewMode !== 'matrix' && (
        <div className="relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 sm:p-2 shadow-2xs flex items-center gap-2 transition-all">
          {/* Task Type Filter Dropdown */}
          <select
            value={taskTypeFilter}
            onChange={e => setTaskTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs shrink-0"
            title="Filter by Task Type (All, Goals, Projects)"
          >
            <option value="all">Type: All</option>
            <option value="goal">🎯 Goals Only</option>
            <option value="project">📁 Projects Only</option>
          </select>

          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              id="input-task-global-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              placeholder="Search tasks by title or #tag instantly... (e.g. #urgent, redesign, launch)"
              className="w-full pl-9.5 pr-16 sm:pr-20 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Clear search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 select-none">
                /
              </span>
            )}
          </div>

          {/* Dynamic Match Badge or Quick Tag Chips */}
          {searchQuery ? (
            <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>{filteredTasks.length} found</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 ml-0.5 text-xs font-bold cursor-pointer"
                title="Clear search"
              >
                ×
              </button>
            </div>
          ) : (
            allTags.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 shrink-0 overflow-x-auto max-w-[340px] text-xs">
                <span className="text-[11px] font-medium text-slate-400 shrink-0">Tags:</span>
                {allTags.slice(0, 4).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(`#${tag}`)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition cursor-pointer shrink-0 border border-slate-200/50 dark:border-slate-700/50"
                    title={`Filter by #${tag}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )
          )}

          {/* Projects, Goals & Tags Central Hub Trigger */}
          <button
            type="button"
            onClick={() => openEntitiesModal('projects')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
            title="Central Hub: Modify & manage Projects, Life Goals, and Tags"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Projects, Goals & Tags</span>
            <span className="sm:hidden">Hub</span>
          </button>
        </div>
      )}

      {/* Daily Wisdom Widget (Positioned under the top Tasks header) */}
      {viewMode !== 'matrix' && <QuoteBanner />}

      {/* Unified Tasks Controls, Smart Lists & Filter Panel - High-density Super Productivity 2-Row Toolbar */}
      <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 ${viewMode === 'matrix' ? 'px-2 py-0.5' : 'p-1.5 sm:px-2.5 sm:py-2 space-y-1.5'} shadow-2xs w-full min-w-0 max-w-full shrink-0`}>
        {/* Row 1: View Modes Switcher + List Density Toggle + Pending/Completed Counter */}
        <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
          {/* View Mode Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs shrink-0 gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`flex items-center gap-1.5 py-0.5 px-2 sm:px-2.5 rounded-md font-semibold text-xs transition shrink-0 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5 shrink-0" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              title="Eisenhower Priority Matrix"
              className={`flex items-center gap-1.5 py-0.5 px-2 sm:px-2.5 rounded-md font-semibold text-xs transition shrink-0 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <EisenhowerIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Eisenhower</span>
            </button>
            <button
              onClick={() => setViewMode('reports')}
              title="Task Analytics & Velocity Reports"
              className={`flex items-center gap-1.5 py-0.5 px-2 sm:px-2.5 rounded-md font-semibold text-xs transition shrink-0 cursor-pointer ${
                viewMode === 'reports'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Reports</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {viewMode === 'list' && (
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => changeListDensity('compact')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    listDensity === 'compact'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Compact List View"
                >
                  <AlignJustify className="w-3 h-3" />
                  <span>Compact</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeListDensity('expanded')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    listDensity === 'expanded'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Detailed Cards View"
                >
                  <LayoutList className="w-3 h-3" />
                  <span>Detailed</span>
                </button>
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <span>{tasks.filter(t => !t.completed).length} pending</span>
              <span>·</span>
              <span>{tasks.filter(t => t.completed).length} done</span>
            </div>
          </div>
        </div>

        {viewMode !== 'matrix' && (
          <>
            {/* Row 2: Inline Smart Lists + Timing Filters (Today, Upcoming, All, Archive) merged onto one seamless strip */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 w-full min-w-0 max-w-full">
          {/* Smart Lists Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsListsDropdownOpen(!isListsDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-2xs hover:bg-indigo-100 transition cursor-pointer"
            >
              <span>📋 Filter: {selectedListId === 'all' ? 'All Focus' : selectedListId === 'smart-starred' ? 'Starred' : selectedListId === 'smart-alerts' ? 'With Alerts' : selectedListId === 'smart-next' ? 'Next' : selectedListId === 'smart-someday' ? 'Someday' : 'Custom List'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isListsDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsListsDropdownOpen(false)} />
                <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-40 py-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => { setSelectedListId('all'); setIsListsDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${selectedListId === 'all' ? 'font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2"><span>📋</span> All Focus</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800">{countForList('all')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedListId('smart-starred'); setIsListsDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${selectedListId === 'smart-starred' ? 'font-bold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Starred</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800">{countForList('smart-starred')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedListId('smart-alerts'); setIsListsDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${selectedListId === 'smart-alerts' ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2"><Bell className="w-3.5 h-3.5 text-blue-500" /> With Alerts</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800">{countForList('smart-alerts')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedListId('smart-next'); setIsListsDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${selectedListId === 'smart-next' ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2"><span>⚡</span> Next</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800">{countForList('smart-next')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedListId('smart-someday'); setIsListsDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${selectedListId === 'smart-someday' ? 'font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/40' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span className="flex items-center gap-2"><span>💭</span> Someday</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800">{countForList('smart-someday')}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Status Timing Filters segmented control inline */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs shrink-0 overflow-x-auto max-w-full">
            <button
              onClick={() => setFilter('today')}
              className={`px-2 py-0.5 rounded-md transition text-[11px] whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'today'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Today ({countForFilter('today')})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-2 py-0.5 rounded-md transition text-[11px] whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'upcoming'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Upcoming ({countForFilter('upcoming')})
            </button>
            <button
              onClick={() => setFilter('date')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition text-[11px] whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'date'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3 h-3 text-rose-500" />
              <span>By Date</span>
              <span className="text-[10px]">({countForFilter('date')})</span>
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-md transition text-[11px] whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All ({countForFilter('all')})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-2 py-0.5 rounded-md transition text-[11px] whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Archive ({countForFilter('completed')})
            </button>
          </div>
        </div>

        {/* Row 3: Compact Filter Dropdowns strip (Category, Priority, Project, Goal) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 w-full min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs flex-1 min-w-0">
            {/* Category Filter Dropdown */}
            <select
              id="select-task-category-filter"
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedListId('all');
              }}
              className="px-2 py-0.5 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] cursor-pointer max-w-[140px] truncate shrink-0"
              title="Filter by Category"
            >
              <option value="all">📁 All Categories</option>
              {DEFAULT_TASK_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name} ({countForCategory(cat.id)})
                </option>
              ))}
            </select>

            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value as Priority | 'all')}
              className="px-2 py-0.5 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] cursor-pointer max-w-[135px] truncate"
              title="Filter by Priority"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 I · High</option>
              <option value="medium">🟡 II · Medium</option>
              <option value="low">🟢 III · Low</option>
            </select>

            {viewMode !== 'kanban' && (
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="px-2 py-0.5 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] cursor-pointer max-w-[115px] truncate"
              >
                <option value="all">All Projects</option>
                {allProjects.map(proj => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            )}

            {viewMode !== 'kanban' && goals.length > 0 && (
              <select
                value={selectedGoal}
                onChange={e => setSelectedGoal(e.target.value)}
                className="px-2 py-0.5 h-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] cursor-pointer max-w-[115px] truncate"
              >
                <option value="all">All Goals</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>
                    🎯 {g.title}
                  </option>
                ))}
              </select>
            )}

            {/* Smart Sort Button */}
            <button
              id="btn-task-smart-sort"
              type="button"
              onClick={toggleSmartSort}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer shrink-0 shadow-2xs ${
                isSmartSort
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
              title="Smart Sort: Automatically reorders tasks based on Priority (High, Med, Low) and proximity to due dates, pinning high-priority overdue items to the top."
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSmartSort ? 'text-amber-200' : 'text-amber-500'}`} />
              <span>Smart Sort</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-black uppercase ${
                isSmartSort ? 'bg-black/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>
                {isSmartSort ? 'ON' : 'OFF'}
              </span>
            </button>

            {(selectedCategory !== 'all' || selectedListId !== 'all' || selectedPriority !== 'all' || (viewMode !== 'kanban' && (selectedProject !== 'all' || selectedGoal !== 'all'))) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedListId('all');
                  setSelectedPriority('all');
                  setSelectedProject('all');
                  setSelectedGoal('all');
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] transition font-medium shrink-0 cursor-pointer"
                title="Reset all filters"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {/* Active Filter Context Banner if non-default filter applied */}
      {viewMode !== 'matrix' && (filter === 'completed' || filter === 'upcoming' || selectedCategory !== 'all' || selectedListId !== 'all' || selectedPriority !== 'all' || selectedProject !== 'all' || selectedGoal !== 'all') && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              Active Filter:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
              {filter === 'today' ? 'Today' : filter === 'upcoming' ? 'Upcoming' : filter === 'all' ? 'All Active' : 'Archive (Completed)'}
            </span>
            {selectedCategory !== 'all' && (() => {
              const catObj = DEFAULT_TASK_CATEGORIES.find(c => c.id === selectedCategory);
              return catObj ? (
                <span className={`px-2 py-0.5 rounded-md border font-bold text-[11px] flex items-center gap-1 ${catObj.bgColor} ${catObj.textColor} ${catObj.borderColor}`}>
                  <span>{catObj.icon}</span>
                  <span>Category: {catObj.name}</span>
                  <button type="button" onClick={() => setSelectedCategory('all')} className="ml-0.5 hover:opacity-75">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ) : null;
            })()}
            {selectedListId !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1">
                <span>📁</span>
                <span>List: {todoLists.find(l => l.id === selectedListId)?.name || selectedListId}</span>
              </span>
            )}
            {selectedPriority !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                Priority: {selectedPriority}
              </span>
            )}
            {selectedProject !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                Project: {selectedProject}
              </span>
            )}
            {selectedGoal !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center gap-1">
                🎯 Goal: {goals.find(g => g.id === selectedGoal)?.title || selectedGoal}
              </span>
            )}
          </div>
          {(selectedCategory !== 'all' || selectedListId !== 'all' || selectedPriority !== 'all' || selectedProject !== 'all' || selectedGoal !== 'all' || filter !== 'today') && (
            <button
              onClick={() => {
                setFilter('today');
                setSelectedCategory('all');
                setSelectedListId('all');
                setSelectedPriority('all');
                setSelectedProject('all');
                setSelectedGoal('all');
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline transition ml-2 shrink-0"
            >
              Reset to Today
            </button>
          )}
        </div>
      )}

      {/* Date Carousel Strip when By Date filter is active */}
      {filter === 'date' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <ScrollableCompactDateStrip
            selectedDateStr={selectedTaskDate}
            onSelectDate={setSelectedTaskDate}
            className="my-1.5"
          />
        </motion.div>
      )}

      {/* Tasks View: List | Kanban | Matrix */}
      {viewMode === 'list' && (
        <motion.div
          key={`tasks-list-${filter}-${selectedTaskDate}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        >
          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-slate-400 bg-white dark:bg-slate-900">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {searchQuery
                  ? `No tasks found matching "${searchQuery}".`
                  : 'No tasks found matching this filter.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/50 dark:border-indigo-800/50 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              )}
            </div>
          ) : listDensity === 'compact' ? (
            /* COMPACT LIST VIEW: Clean, ultra-dense modern task list (fits 20+ tasks in 1 view) */
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTasks.map(task => {
                const pMeta = getPriorityMeta(task.priority, task.quadrant);
                const isExpanded = !!expandedSubtasks[task.id];
                const taskSubtasks = (Array.isArray(task.subtasks) && task.subtasks.length > 0)
                  ? task.subtasks
                  : (Array.isArray(task.checklist) && task.checklist.length > 0)
                  ? task.checklist
                  : [];
                const completedSubs = taskSubtasks.filter(s => s.completed).length;
                const isPomActive = pomodoro.taskId === task.id;
                const hasSubtasks = taskSubtasks.length > 0;
                const customList = task.listId ? todoLists.find(item => item.id === task.listId) : null;
                const linkedGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;

                const isFading = fadingTaskIds.has(task.id);
                const isVisuallyDone = task.completed || completingTaskIds.has(task.id);

                return (
                  <div
                    key={task.id}
                    {...getTaskItemProps(task.id, task.title)}
                    className={`group relative transition-all duration-150 select-none ${
                      isFading
                        ? 'opacity-0 translate-x-6 max-h-0 overflow-hidden py-0 my-0 border-transparent pointer-events-none'
                        : ''
                    } ${
                      draggedTaskId === task.id
                        ? 'opacity-30 scale-[0.98] border-2 border-dashed border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-none'
                        : dragOverTaskId === task.id
                        ? dropPosition === 'before'
                          ? 'border-t-2 border-t-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                          : 'border-b-2 border-b-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : isVisuallyDone
                        ? 'bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                        : recentlyCreatedTaskId === task.id
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 ring-1 ring-emerald-500/60'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Visual insertion indicator lines */}
                    {dragOverTaskId === task.id && dropPosition === 'before' && (
                      <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-indigo-600 z-30 pointer-events-none shadow-xs" />
                    )}
                    {dragOverTaskId === task.id && dropPosition === 'after' && (
                      <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-indigo-600 z-30 pointer-events-none shadow-xs" />
                    )}

                    {/* Vertical Grey Line Drag Handle at the Left Border (yellow highlighted location) */}
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        wasDraggingRef.current = true;
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.setData('text', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      {...getGripHandleProps(task.id, task.title)}
                      className="absolute left-0 top-1.5 bottom-1.5 w-2 -ml-0.5 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 group/handle touch-none select-none"
                      title="Hold grey border handle to drag & drop / reorder"
                    >
                      <div className="w-1 h-full max-h-4.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/handle:bg-slate-400 dark:group-hover/handle:bg-slate-500 group-active/handle:bg-indigo-600 transition-colors shadow-2xs" />
                    </div>

                    {/* Primary Compact Row */}
                    <div
                      onClick={() => {
                        if (wasDraggingRef.current) return;
                        openDetailTask(task);
                      }}
                      className="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 min-h-[34px] cursor-pointer"
                    >
                      {/* Checkbox - Instant toggle with celebration micro-animation & outer bold priority border */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <CheckmarkCelebration
                          activeKey={celebratingTaskId === task.id ? taskCelebrationKey : null}
                          badgeText="Done✅"
                          ringColor="border-emerald-500"
                          align="left"
                        />
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.85 }}
                          animate={animatingTaskId === task.id ? { scale: [1, 1.22, 0.94, 1] } : {}}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskWithAnim(task.id);
                          }}
                          className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all shrink-0 cursor-pointer ${getTaskCheckboxPriorityClass(task, isVisuallyDone)}`}
                          title={`Priority: ${task.priority || task.quadrant || 'low'} — Click to toggle completion`}
                        >
                          {isVisuallyDone ? (
                            <AnimatedCheckIcon
                              className="w-3.5 h-3.5 text-white"
                              strokeWidth={3}
                              animate={animatingTaskId === task.id}
                            />
                          ) : null}
                        </motion.button>
                      </div>

                      {/* Prominent Task Title - Truncated with ellipsis */}
                      <span
                        className={`flex-1 text-[13px] font-semibold truncate transition ${
                          isVisuallyDone
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </span>

                      {/* Right-aligned meta & actions - Strictly aligned */}
                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                        {/* Due Date - Overdue Badge */}
                        {task.dueDate && (
                          <span
                            className={`text-[11px] font-mono shrink-0 flex items-center gap-1 ${
                              !task.completed && task.dueDate < todayStr
                                ? 'text-rose-500 font-semibold'
                                : 'text-slate-400'
                            }`}
                            title={`Due: ${formatOSDate(task.dueDate, 'DDMonthYYYY', task.dueTime)}${!task.completed && task.dueDate < todayStr ? ' (Overdue)' : ''}`}
                          >
                            <span className={!task.completed && task.dueDate < todayStr ? 'px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold text-[10px]' : ''}>
                              {formatOSDate(task.dueDate, 'DDMM')}
                            </span>
                            {!task.completed && task.dueDate < todayStr && (
                              <span className="inline-flex items-center justify-center p-1 rounded-md bg-rose-500 text-white dark:bg-rose-600 shadow-2xs shrink-0" title="Overdue">
                                <OverdueIcon className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </span>
                        )}

                        {/* Note Tiny Icon Badge in Compact View */}
                        {task.notes && task.notes.trim().length > 0 && (
                          <div
                            className="relative inline-flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotePeek(prev => prev?.taskId === task.id ? null : { taskId: task.id, text: task.notes || '' });
                            }}
                            onMouseEnter={() => setNotePeek({ taskId: task.id, text: task.notes || '' })}
                            onMouseLeave={() => setNotePeek(null)}
                          >
                            <span
                              className="group/note inline-flex items-center justify-center p-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 shrink-0 shadow-2xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
                              title="Has notes (hover to preview)"
                            >
                              <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                            </span>

                            {/* Responsive note preview: Screen-bounded on mobile, sleek tooltip on desktop */}
                            {notePeek?.taskId === task.id && (
                              <>
                                {/* Mobile Screen-Anchored Floating Preview Card (Never goes out of screen) */}
                                <div
                                  className="sm:hidden fixed inset-x-4 bottom-20 z-50 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                      <MessageSquare className="w-3 h-3 shrink-0" />
                                      <span>Note Preview</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNotePeek(null);
                                      }}
                                      className="p-1 -mr-1 text-slate-400 hover:text-white"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <p className="text-slate-200 text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-normal font-normal">
                                    {notePeek.text}
                                  </p>
                                </div>

                                {/* Desktop Hover Tooltip */}
                                <div
                                  className="hidden sm:block absolute right-0 bottom-full mb-2 z-50 w-60 max-w-xs p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[11px] leading-relaxed shadow-xl border border-slate-700/80 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                                >
                                  <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-slate-800 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                    <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                    <span>Note Preview</span>
                                  </div>
                                  <p className="text-slate-200 text-[10.5px] leading-normal line-clamp-4 break-words whitespace-normal font-normal">
                                    {notePeek.text.slice(0, 120)}{notePeek.text.length > 120 ? '...' : ''}
                                  </p>
                                  <div className="absolute top-full right-2.5 -mt-px border-4 border-transparent border-t-slate-900/95" />
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Subtasks Count Accordion Badge */}
                        {hasSubtasks && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubtasksView(task.id);
                            }}
                            className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer"
                            title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                          >
                            <SubtaskBranchIcon className="w-2.5 h-2.5 text-indigo-500" />
                            <span>{completedSubs}/{taskSubtasks.length}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Subtasks Container with Smooth Height & Opacity Transition */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[600px] opacity-100 bg-slate-50/70 dark:bg-slate-800/40 px-3 sm:px-4 py-1.5 pl-7 sm:pl-8 space-y-0.5 border-t border-slate-100/80 dark:border-slate-800/60' : 'max-h-0 opacity-0'}`} onClick={e => e.stopPropagation()}>
                      {hasSubtasks && taskSubtasks.map(sub => (
                        <div
                          key={sub.id}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[10px] text-slate-700 dark:text-slate-300 py-0.2"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubtask(task.id, sub.id);
                            }}
                            className={`w-3 h-3 rounded-xs border flex items-center justify-center transition shrink-0 cursor-pointer ${
                              sub.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-500'
                            }`}
                            title={sub.completed ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {sub.completed && <AnimatedCheckIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} animate={true} />}
                          </button>
                          <span
                            className={`truncate transition select-none ${
                              sub.completed
                                ? 'line-through text-slate-400 dark:text-slate-500 opacity-60'
                                : 'text-slate-700 dark:text-slate-300 font-medium'
                            }`}
                          >
                            {sub.title}
                          </span>
                        </div>
                      ))}

                      {taskSubtasks.length > 3 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailTask(task);
                          }}
                          className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 pt-0.5"
                        >
                          <span>+{taskSubtasks.length - 3} more items</span>
                          <span className="text-slate-400 font-normal">• Click for full checklist</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DETAILED CARDS VIEW: Super Productivity inspired compact card layout */
            <div className="space-y-1.5">
              {filteredTasks.map(task => {
                const pMeta = getPriorityMeta(task.priority, task.quadrant);
                const cat = getCategoryForTask(task);
                const isExpanded = !!expandedSubtasks[task.id];
                const taskSubtasks = (Array.isArray(task.subtasks) && task.subtasks.length > 0)
                  ? task.subtasks
                  : (Array.isArray(task.checklist) && task.checklist.length > 0)
                  ? task.checklist
                  : [];
                const completedSubs = taskSubtasks.filter(s => s.completed).length;
                const hasChecklist = taskSubtasks.length > 0;

                const isFading = fadingTaskIds.has(task.id);
                const isVisuallyDone = task.completed || completingTaskIds.has(task.id);

                return (
                  <div
                    key={task.id}
                    {...getTaskItemProps(task.id, task.title)}
                    onClick={() => {
                      if (wasDraggingRef.current) return;
                      openDetailTask(task);
                    }}
                    className={`group rounded-xl border relative p-1.5 sm:px-2.5 sm:py-1.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer select-none space-y-1 ${
                      isFading
                        ? 'opacity-0 translate-x-6 max-h-0 overflow-hidden py-0 my-0 border-transparent pointer-events-none'
                        : ''
                    } ${
                      draggedTaskId === task.id
                        ? 'opacity-30 scale-[0.98] border-2 border-dashed border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-none'
                        : dragOverTaskId === task.id
                        ? dropPosition === 'before'
                          ? 'border-t-2 border-t-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                          : 'border-b-2 border-b-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : isVisuallyDone
                        ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                        : recentlyCreatedTaskId === task.id
                        ? 'border-emerald-500/70 dark:border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/40'
                        : 'border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Visual insertion indicator lines */}
                    {dragOverTaskId === task.id && dropPosition === 'before' && (
                      <div className="absolute -top-1 left-0 right-0 h-1 bg-indigo-600 rounded-full z-30 pointer-events-none shadow-sm animate-pulse" />
                    )}
                    {dragOverTaskId === task.id && dropPosition === 'after' && (
                      <div className="absolute -bottom-1 left-0 right-0 h-1 bg-indigo-600 rounded-full z-30 pointer-events-none shadow-sm animate-pulse" />
                    )}

                    {/* Vertical Grey Line Drag Handle at the Left Border (yellow highlighted location) */}
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        wasDraggingRef.current = true;
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.setData('text', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      {...getGripHandleProps(task.id, task.title)}
                      className="absolute left-0 top-2 bottom-2 w-2 -ml-0.5 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 group/handle touch-none select-none"
                      title="Hold grey border handle to drag & drop / reorder"
                    >
                      <div className="w-1 h-5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/handle:bg-slate-400 dark:group-hover/handle:bg-slate-500 group-active/handle:bg-indigo-600 transition-colors shadow-2xs" />
                    </div>

                    {/* Primary Row: Checkbox with Priority Border, Star, Prominent Title, Due Date & Note Badge */}
                    <div className="flex items-start gap-1.5 min-w-0 pl-1.5">
                      {/* Checkbox - Instant toggle with celebration micro-animation & outer bold priority border */}
                      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                        <CheckmarkCelebration
                          activeKey={celebratingTaskId === task.id ? taskCelebrationKey : null}
                          badgeText="Done✅"
                          ringColor="border-emerald-500"
                          align="left"
                        />
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.85 }}
                          animate={animatingTaskId === task.id ? { scale: [1, 1.22, 0.94, 1] } : {}}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskWithAnim(task.id);
                          }}
                          className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all shrink-0 cursor-pointer ${getTaskCheckboxPriorityClass(task, isVisuallyDone)}`}
                          title={`Priority: ${task.priority || task.quadrant || 'low'} — Click to toggle completion`}
                        >
                          {isVisuallyDone ? (
                            <AnimatedCheckIcon
                              className="w-3.5 h-3.5 text-white"
                              strokeWidth={3}
                              animate={animatingTaskId === task.id}
                            />
                          ) : null}
                        </motion.button>
                      </div>

                      {/* Star Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarTask(task.id);
                        }}
                        className="p-0.5 text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400 transition shrink-0 cursor-pointer mt-0.5"
                        title={task.isStarred ? 'Starred (click to unstar)' : 'Star this task'}
                      >
                        <Star className={`w-3.5 h-3.5 ${task.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Prominent Task Title & Subtasks Badge below title (Habit view reference) */}
                      <div className="flex-1 min-w-0 pr-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            className={`text-xs sm:text-[13px] font-bold tracking-tight leading-snug transition-all duration-200 ${
                              isVisuallyDone
                                ? 'line-through text-slate-400 dark:text-slate-500 opacity-75'
                                : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>

                        {/* Due Date & Note Badge below title */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {task.dueDate && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg border shrink-0 ${
                                !task.completed && task.dueDate < todayStr
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-2xs font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                              title={`Due: ${formatOSDate(task.dueDate, 'DDMonthYYYY', task.dueTime)}${!task.completed && task.dueDate < todayStr ? ' (Overdue)' : ''}`}
                            >
                              <span>{formatOSDate(task.dueDate, 'DDMM')}</span>
                              {!task.completed && task.dueDate < todayStr && (
                                <span className="inline-flex items-center justify-center p-1 rounded-md bg-rose-500 text-white dark:bg-rose-600 shadow-2xs shrink-0" title="Overdue">
                                  <OverdueIcon className="w-2.5 h-2.5 text-white" />
                                </span>
                              )}
                            </span>
                          )}

                          {/* Tiny Note Icon Badge in Detailed View */}
                          {task.notes && task.notes.trim().length > 0 && (
                            <div
                              className="relative inline-flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotePeek(prev => prev?.taskId === task.id ? null : { taskId: task.id, text: task.notes || '' });
                              }}
                              onMouseEnter={() => setNotePeek({ taskId: task.id, text: task.notes || '' })}
                              onMouseLeave={() => setNotePeek(null)}
                            >
                              <span
                                className="group/note inline-flex items-center justify-center p-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 shrink-0 shadow-2xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
                                title="Has notes (hover to preview)"
                              >
                                <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                              </span>

                              {/* Responsive note preview: Screen-bounded on mobile, sleek tooltip on desktop */}
                              {notePeek?.taskId === task.id && (
                                <>
                                  {/* Mobile Screen-Anchored Floating Preview Card (Never goes out of screen) */}
                                  <div
                                    className="sm:hidden fixed inset-x-4 bottom-20 z-50 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                      <div className="flex items-center gap-1.5">
                                        <MessageSquare className="w-3 h-3 shrink-0" />
                                        <span>Note Preview</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setNotePeek(null);
                                        }}
                                        className="p-1 -mr-1 text-slate-400 hover:text-white"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-slate-200 text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-normal font-normal">
                                      {notePeek.text}
                                    </p>
                                  </div>

                                  {/* Desktop Hover Tooltip */}
                                  <div
                                    className="hidden sm:block absolute left-0 bottom-full mb-2 z-50 w-60 max-w-xs p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[11px] leading-relaxed shadow-xl border border-slate-700/80 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                                  >
                                    <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-slate-800 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                      <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                      <span>Note Preview</span>
                                    </div>
                                    <p className="text-slate-200 text-[10.5px] leading-normal line-clamp-4 break-words whitespace-normal font-normal">
                                      {notePeek.text.slice(0, 120)}{notePeek.text.length > 120 ? '...' : ''}
                                    </p>
                                    <div className="absolute top-full left-2.5 -mt-px border-4 border-transparent border-t-slate-900/95" />
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right-aligned Subtasks Count Accordion Badge (matching compact list) or Subtle Chevron Toggle Button */}
                      {hasChecklist ? (
                        <div className="shrink-0 flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubtasksView(task.id);
                            }}
                            className="inline-flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer"
                            title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                          >
                            <SubtaskBranchIcon className="w-2.5 h-2.5 text-indigo-500" />
                            <span>{completedSubs}/{taskSubtasks.length}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      ) : (task.notes || task.dueDate || task.category) ? (
                        <div className="shrink-0 flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubtasksView(task.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                            title={isExpanded ? 'Collapse details' : 'Expand sub-steps & details'}
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Expandable Details Container with Smooth Height & Opacity Transition */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[600px] opacity-100 pt-1.5 space-y-1.5' : 'max-h-0 opacity-0'}`} onClick={e => e.stopPropagation()}>
                      {/* Subtasks visible when expanded */}
                      {hasChecklist && (
                        <div className="pl-6 sm:pl-7 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          {taskSubtasks.map(sub => (
                            <div
                              key={sub.id}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-[10px] py-0.2 leading-tight"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSubtask(task.id, sub.id);
                                }}
                                className={`w-3 h-3 rounded-xs border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                  sub.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-500'
                                }`}
                                title={sub.completed ? 'Mark incomplete' : 'Mark complete'}
                              >
                                {sub.completed && <AnimatedCheckIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} animate={true} />}
                              </button>
                              <span
                                className={`truncate transition select-none ${
                                  sub.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500 opacity-60'
                                    : 'text-slate-700 dark:text-slate-300 font-medium'
                                }`}
                              >
                                {sub.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes Preview with proper padding */}
                      {task.notes && (
                        <div className="pl-6 sm:pl-7 py-1 px-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 w-full">
                          <MessageSquare className="w-3 h-3 shrink-0 text-amber-500" />
                          <span className="truncate flex-1 min-w-0 font-normal">{task.notes}</span>
                        </div>
                      )}

                      {/* Metadata Row: Category, Checklist, Due Date, Tags, Project, Goal */}
                      <div className="pl-6 sm:pl-7 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        {/* LifeOS Category Badge (Click to filter) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id);
                          }}
                          className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 transition hover:opacity-85 cursor-pointer ${cat.bgColor} ${cat.textColor} ${cat.borderColor}`}
                          title={`LifeOS Category: ${cat.name} (click to filter)`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>

                      {/* Checklist Micro Badge */}
                      {hasChecklist && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 shrink-0"
                          title={`Checklist: ${completedSubs} of ${taskSubtasks.length} steps completed`}
                        >
                          <SubtaskBranchIcon className="w-2.5 h-2.5" />
                          <span>{completedSubs}/{taskSubtasks.length}</span>
                        </span>
                      )}

                      {/* Due Date (Formatted to strict OS format) */}
                      {task.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono shrink-0 ${
                            !task.completed && task.dueDate < todayStr
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span className="flex items-center gap-1" title={`Due: ${formatOSDate(task.dueDate, 'DDMonthYYYY:HH:MM', task.dueTime)}`}>
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>
                              {task.dueTime
                                ? formatOSDate(task.dueDate, 'DDMMYYYY:HH:MM', task.dueTime)
                                : formatOSDate(task.dueDate, 'DDMMYYYY')}
                            </span>
                          </span>
                        </span>
                      )}

                      {/* Alerts Icon */}
                      {task.alerts && task.alerts.length > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-amber-500 shrink-0"
                          title={`${task.alerts.length} reminder alert(s)`}
                        >
                          <Bell className="w-3 h-3" />
                          <span className="text-[10px] font-semibold">{task.alerts.length}</span>
                        </span>
                      )}

                      {/* Recurring Icon */}
                      {task.recurring && task.recurring !== 'none' && (
                        <span className="text-[11px] text-indigo-500 flex items-center gap-0.5 shrink-0" title={`Repeats: ${task.recurring}`}>
                          <RotateCw className="w-3 h-3" />
                          <span className="capitalize text-[10px]">{task.recurring}</span>
                        </span>
                      )}

                      {/* Tags (Super Productivity style - click to filter/search) */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap shrink-0">
                          {task.tags.map(t => (
                            <button
                              type="button"
                              key={t}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery(prev => prev === `#${t}` ? '' : `#${t}`);
                              }}
                              className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 transition cursor-pointer"
                              title={`Filter by tag #${t}`}
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Interactive Project Binder Dropdown */}
                      <select
                        value={task.projectId || (task.project && task.project !== 'General' ? `custom:${task.project}` : '')}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          const val = e.target.value;
                          if (val.startsWith('custom:')) {
                            updateTask({ ...task, project: val.replace('custom:', ''), projectId: undefined });
                          } else if (val) {
                            const p = projects.find(proj => proj.id === val);
                            updateTask({ ...task, projectId: val, project: p?.name || 'General', goalId: p?.goalId || task.goalId });
                          } else {
                            updateTask({ ...task, projectId: undefined, project: 'General' });
                          }
                          soundEngine?.playClick?.();
                        }}
                        className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded px-1.5 py-0.5 cursor-pointer max-w-[110px] truncate hover:border-indigo-400 transition shrink-0"
                        title="Bind to project"
                      >
                        <option value="">📁 No Project</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            📁 {p.name}
                          </option>
                        ))}
                        {task.project && task.project !== 'General' && !projects.some(p => p.id === task.projectId) && (
                          <option value={`custom:${task.project}`}>
                            📁 {task.project}
                          </option>
                        )}
                      </select>

                      {/* Interactive Life Goal Binder Dropdown */}
                      <select
                        value={task.goalId || ''}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          const val = e.target.value;
                          updateTask({ ...task, goalId: val || undefined });
                          soundEngine?.playClick?.();
                        }}
                        className="text-[10.5px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/60 rounded px-1.5 py-0.5 cursor-pointer max-w-[110px] truncate hover:border-rose-400 transition shrink-0"
                        title="Bind to life goal"
                      >
                        <option value="">🎯 No Goal</option>
                        {goals.map(g => (
                          <option key={g.id} value={g.id}>
                            🎯 {g.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Super Productivity Completed Tasks Section (View & Modify / Make Uncomplete) */}
          {filter !== 'completed' && completedTasks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  id="btn-toggle-completed-tasks"
                  onClick={() => setIsCompletedSectionOpen(!isCompletedSectionOpen)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer select-none"
                >
                  {isCompletedSectionOpen ? (
                    <ChevronDown className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span>Completed Tasks ({completedTasks.length})</span>
                </button>

                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Click checkbox to restore / make uncomplete
                </span>
              </div>

              {isCompletedSectionOpen && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                  {completedTasks.map(cTask => (
                    <div
                      key={cTask.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white dark:hover:bg-slate-800/70 transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Checkbox - Clicking immediately uncompletes the task */}
                        <button
                          type="button"
                          onClick={() => toggleTask(cTask.id)}
                          title="Click to make task uncomplete again"
                          className="w-4 h-4 rounded-md bg-emerald-600 border border-emerald-600 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-2xs hover:bg-emerald-700 transition"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>

                        <span
                          onClick={() => openDetailTask(cTask)}
                          className="text-xs line-through text-slate-400 dark:text-slate-500 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition flex-1"
                          title={`${cTask.title} (Click to open and modify)`}
                        >
                          {cTask.title}
                        </span>

                        {/* Tag / Category */}
                        {cTask.tags && cTask.tags.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                            #{cTask.tags[0]}
                          </span>
                        )}

                        {cTask.completedAt && (
                          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                            {formatOSDate(cTask.completedAt, 'DDMM')}
                          </span>
                        )}
                      </div>

                      {/* Quick Actions: Uncomplete button & Edit button */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleTask(cTask.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[10px] font-semibold transition cursor-pointer"
                          title="Restore task / make uncomplete"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Uncomplete</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditTask(cTask)}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Modify task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTask(cTask.id)}
                          className="p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Eisenhower Priority Matrix (2x2 Grid & Board) */}
      {viewMode === 'matrix' && (
        <EisenhowerGoogleBoard
          tasks={tasks}
          onToggleTask={toggleTask}
          onToggleStar={toggleStarTask}
          onOpenEditTask={openEditTask}
          onOpenDetailTask={openDetailTask}
          onAddTask={quad => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
          onUpdateTaskQuadrant={(taskId, quad) => setTaskQuadrant(taskId, quad)}
          matchesFilterTab={matchesFilterTab}
          onToggleSubtask={toggleSubtask}
          onCycleEisenhower={handleCycleEisenhower}
          onFilterCategory={catId => setSelectedCategory(prev => prev === catId ? 'all' : catId)}
          onFilterTag={tag => setSelectedTag(prev => prev === tag ? 'all' : tag)}
          onFilterProject={proj => setSelectedProject(prev => prev === proj ? 'all' : proj)}
          dndProps={dnd}
        />
      )}

      {/* Reports & Velocity Analytics View */}
      {viewMode === 'reports' && (
        <TaskReportSection tasks={tasks} taskTimers={taskTimers} />
      )}

      {/* Modern Unified Add/Edit Task Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
          // If filter was set to completed archive, reset to Today/All so the user sees their created task!
          if (filter === 'completed') {
            setFilter('today');
          }
          if (searchQuery) {
            setSearchQuery('');
          }
          if (taskTypeFilter !== 'all') {
            setTaskTypeFilter('all');
          }
        }}
        taskToEdit={taskToEdit}
        defaultDate={todayStr}
        defaultStatus={taskModalDefaultStatus}
        defaultCategory={selectedCategory !== 'all' ? selectedCategory : undefined}
        defaultPriority={selectedPriority !== 'all' ? selectedPriority : undefined}
        defaultProjectId={quickProjectId || (selectedProject !== 'all' ? projects.find(p => p.name === selectedProject)?.id : undefined)}
        defaultProject={quickProjectId ? projects.find(p => p.id === quickProjectId)?.name : (selectedProject !== 'all' ? selectedProject : undefined)}
        defaultGoalId={quickGoalId || (selectedGoal !== 'all' ? selectedGoal : undefined)}
        defaultListId={selectedListId && !selectedListId.startsWith('smart-') && selectedListId !== 'all' ? selectedListId : quickListId || 'list_inbox'}
      />

      {/* Task Detail Modal - Optimized Pop-up Card */}
      <TaskDetailModal
        task={detailTask ? tasks.find(t => t.id === detailTask.id) || detailTask : null}
        isOpen={isDetailModalOpen}
        onClose={() => {
          stopPomodoro(detailTask?.id);
          setIsDetailModalOpen(false);
          setDetailTask(null);
        }}
        onEdit={task => {
          setIsDetailModalOpen(false);
          openEditTask(task);
        }}
        onDelete={taskId => {
          deleteTask(taskId);
          setIsDetailModalOpen(false);
          setDetailTask(null);
        }}
        onToggleComplete={taskId => toggleTask(taskId)}
        onToggleStar={taskId => toggleStarTask(taskId)}
        onUpdateTask={updated => updateTask(updated)}
        onStartPomodoro={taskId => startPomodoro(taskId)}
        onPausePomodoro={() => pausePomodoro()}
        isPomodoroRunning={pomodoro.isRunning}
        activePomodoroTaskId={pomodoro.taskId}
        soundEngine={soundEngine}
      />

      {/* Super Productivity Quick-Add Batching Modal */}
      <QuickAddBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        defaultCategory={selectedCategory !== 'all' ? selectedCategory : 'work'}
        defaultPriority={selectedPriority !== 'all' ? selectedPriority : 'medium'}
        defaultListId={selectedListId !== 'all' ? selectedListId : 'inbox'}
      />

      {/* Task Backup, Export & Import Modal (JSON / CSV) */}
      <TaskExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
      />
    </div>
  );
};
