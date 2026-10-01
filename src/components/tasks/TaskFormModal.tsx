import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckSquare,
  Clock,
  Calendar,
  AlertCircle,
  Flag,
  Bell,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  MapPin,
  RotateCw,
  Sliders,
  Volume2,
  Flame,
  Equal,
  ArrowDown,
  Users,
  Ban,
  FolderKanban,
  Target,
  Sparkles,
  Loader2,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HighPriorityIcon, MediumPriorityIcon, LowPriorityIcon } from '../common/PriorityIcon';
import {
  Priority,
  TaskItem,
  TaskStatus,
  EisenhowerQuadrant,
  Subtask,
  TaskAlert,
  TaskAlertType,
  DEFAULT_TASK_CATEGORIES,
  TaskCategory,
  ReminderType,
} from '../../types';
import { notificationService } from '../../utils/notifications';
import { formatOSDate } from '../../utils/date';
import { UnifiedReminderConfig } from '../common/UnifiedReminderConfig';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskItem | null;
  defaultDate?: string;
  defaultStatus?: string;
  defaultProjectId?: string;
  defaultProject?: string;
  defaultGoalId?: string;
  defaultListId?: string;
  defaultCategory?: string;
  defaultPriority?: Priority;
}

const ALERT_PRESETS: { type: TaskAlertType; label: string }[] = [
  { type: 'on_time', label: 'At time of event (On time)' },
  { type: '5m', label: '5 minutes before' },
  { type: '10m', label: '10 minutes before' },
  { type: '15m', label: '15 minutes before' },
  { type: '30m', label: '30 minutes before' },
  { type: '1h', label: '1 hour before' },
  { type: '2h', label: '2 hours before' },
  { type: '1d', label: '1 day before' },
];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultDate,
  defaultStatus,
  defaultProjectId,
  defaultProject,
  defaultGoalId,
  defaultListId,
  defaultCategory,
  defaultPriority,
}) => {
  const {
    addTask,
    updateTask,
    deleteTask,
    tasks,
    projects,
    goals,
    workflowStages,
    selectedListId,
    soundEngine,
    pushNotification,
  } = useApp();

  const isEditing = Boolean(taskToEdit);

  // Core Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('work');
  const [listId, setListId] = useState<string>(defaultListId || 'list_inbox');
  const [projectId, setProjectId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>('none');
  const [reminderTiming, setReminderTiming] = useState<string>('none');
  const [repeatType, setRepeatType] = useState<string>('none');
  const [repeatUntil, setRepeatUntil] = useState<string>('forever');
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [isStarred, setIsStarred] = useState<boolean>(false);
  const [taskType, setTaskType] = useState<'goal' | 'project'>(taskToEdit?.taskType || (taskToEdit?.goalId ? 'goal' : 'project'));

  // Smart Suggest AI state (Gemini API Powered)
  interface SmartSuggestResult {
    suggestedSubtasks: string[];
    deadlineAdjustment: {
      recommendedDate: string;
      recommendedTime?: string;
      reason: string;
    };
    suggestedProject?: string;
    suggestedProjectId?: string;
    suggestedGoalId?: string;
    suggestedGoalTitle?: string;
    suggestedQuadrant?: EisenhowerQuadrant;
    suggestedPriority?: Priority;
    insights?: string;
    modelUsed?: string;
  }

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestResult, setSuggestResult] = useState<SmartSuggestResult | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [appliedSubtasks, setAppliedSubtasks] = useState<Set<string>>(new Set());
  const [isDateApplied, setIsDateApplied] = useState(false);
  const [isProjectApplied, setIsProjectApplied] = useState(false);
  const [isGoalApplied, setIsGoalApplied] = useState(false);

  // Alerts & Notifications
  const [alerts, setAlerts] = useState<TaskAlert[]>([]);
  const [showAddAlertMenu, setShowAddAlertMenu] = useState(false);
  const [customAlertDateTime, setCustomAlertDateTime] = useState('');
  const [testAlertFeedback, setTestAlertFeedback] = useState<string | null>(null);

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Progressive Disclosure for Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<string>('todo');
  const [recurring, setRecurring] = useState<TaskItem['recurring']>('none');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>('urgent_important');
  const [location, setLocation] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const defaultHours = String(now.getHours()).padStart(2, '0');
    const defaultMins = String(now.getMinutes()).padStart(2, '0');

    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      // Match category from task
      const rawCat = (taskToEdit.category || 'work').toLowerCase();
      setCategory(rawCat);
      setProjectId(taskToEdit.projectId || '');
      setProjectName(taskToEdit.project || '');
      setGoalId(taskToEdit.goalId || '');
      setTaskType(taskToEdit.taskType || (taskToEdit.goalId ? 'goal' : 'project'));
      setNotes(taskToEdit.notes || '');
      setPriority(taskToEdit.priority || 'medium');
      setDueDate(taskToEdit.dueDate || todayStr);
      setDueTime(taskToEdit.dueTime || `${defaultHours}:${defaultMins}`);
      setIsAllDay(Boolean(taskToEdit.isAllDay));
      setReminderType(taskToEdit.reminderType || 'notification');
      setReminderTiming(taskToEdit.reminderTiming || (taskToEdit.alerts?.length ? taskToEdit.alerts[0].type : 'on_time'));
      setRepeatType(taskToEdit.repeatType || taskToEdit.recurring || 'none');
      setRepeatUntil(taskToEdit.repeatUntil || 'forever');
      setDurationMinutes(taskToEdit.durationMinutes ?? 0);
      setIsStarred(Boolean(taskToEdit.isStarred));
      setAlerts(taskToEdit.alerts ? [...taskToEdit.alerts] : []);
      setSubtasks(taskToEdit.subtasks ? [...taskToEdit.subtasks] : []);
      setStatus(taskToEdit.status || (taskToEdit.completed ? 'done' : 'todo'));
      setRecurring(taskToEdit.recurring || 'none');
      setQuadrant(taskToEdit.quadrant || 'urgent_important');
      setLocation(taskToEdit.location || '');
      setTags(taskToEdit.tags ? [...taskToEdit.tags] : []);
      setListId(taskToEdit.listId || 'list_inbox');
    } else {
      setTitle('');
      setCategory(defaultCategory && defaultCategory !== 'all' ? defaultCategory : 'work');
      setProjectId(defaultProjectId || '');
      setProjectName(defaultProject || '');
      setGoalId(defaultGoalId || '');
      setNotes('');
      setPriority(defaultPriority || 'medium');
      setDueDate(defaultDate || todayStr);
      setListId(defaultListId || (selectedListId && !selectedListId.startsWith('smart-') && selectedListId !== 'all' ? selectedListId : 'list_inbox'));
      setDueTime(`${defaultHours}:${defaultMins}`);
      setIsAllDay(false);
      setReminderType('none');
      setReminderTiming('none');
      setRepeatType('none');
      setRepeatUntil('forever');
      setDurationMinutes(0); // 0 min default as user requested!
      setIsStarred(false);
      // Explicitly set to 'No Alarm' by default (empty alerts)
      setAlerts([]);
      setSubtasks([]);
      setStatus(defaultStatus || (workflowStages[0]?.id ?? 'todo'));
      setRecurring('none');
      setQuadrant('urgent_important');
      setLocation('');
      setTags([]);
    }

    setShowDeleteConfirm(false);
    setShowAddAlertMenu(false);
    setShowAdvanced(false);
    setNewSubtaskInput('');
    setTestAlertFeedback(null);
    setSuggestResult(null);
    setSuggestError(null);
    setAppliedSubtasks(new Set());
    setIsDateApplied(false);
    setIsProjectApplied(false);
    setIsGoalApplied(false);
  }, [isOpen, taskToEdit, defaultDate, defaultStatus, defaultProject, workflowStages]);

  if (!isOpen) return null;

  // Smart Suggest Handler (Powered by Gemini API)
  const handleFetchSmartSuggestions = async () => {
    if (!title.trim()) {
      setSuggestError('Please enter a task title first so Gemini can analyze goals & projects.');
      return;
    }
    setIsSuggesting(true);
    setSuggestError(null);
    setSuggestResult(null);
    setAppliedSubtasks(new Set());
    setIsDateApplied(false);
    setIsProjectApplied(false);
    setIsGoalApplied(false);

    try {
      const aiProvider = localStorage.getItem('omni_ai_provider') || 'gemini';
      const selectedModel = localStorage.getItem('omni_ai_model') || 'gemini-3.8-flash';
      const baseUrl = localStorage.getItem('omni_ai_base_url') || '';
      const customApiKey = localStorage.getItem(`omni_custom_${aiProvider}_api_key`) || '';

      const res = await fetch('/api/ai/smart-suggest-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: title,
          taskNotes: notes,
          category,
          dueDate,
          dueTime,
          priority,
          existingProjects: (projects || []).map(p => ({ id: p.id, name: p.name, goalId: p.goalId, description: p.description })),
          existingGoals: (goals || []).map(g => ({ id: g.id, title: g.title, category: g.category, targetDate: g.targetDate, milestones: g.milestones })),
          recentTasks: (tasks || []).slice(0, 10).map(t => ({ title: t.title, project: t.project, dueDate: t.dueDate, priority: t.priority })),
          aiProvider,
          selectedModel,
          baseUrl,
          customApiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuggestResult(data);
      } else {
        setSuggestError(data.error || 'Could not fetch smart suggestions.');
      }
    } catch (err: any) {
      setSuggestError(err?.message || 'Failed to reach AI service.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const applyRecommendedDeadline = () => {
    if (!suggestResult?.deadlineAdjustment?.recommendedDate) return;
    setDueDate(suggestResult.deadlineAdjustment.recommendedDate);
    if (suggestResult.deadlineAdjustment.recommendedTime) {
      setDueTime(suggestResult.deadlineAdjustment.recommendedTime);
    }
    setIsDateApplied(true);
  };

  const addOneSubtask = (stTitle: string) => {
    if (!stTitle.trim()) return;
    const newSub: Subtask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: stTitle.trim(),
      completed: false,
    };
    setSubtasks(prev => [...prev, newSub]);
    setAppliedSubtasks(prev => new Set(prev).add(stTitle));
  };

  const applyAllSuggestedSubtasks = () => {
    if (!suggestResult?.suggestedSubtasks) return;
    const newItems: Subtask[] = [];
    const newSet = new Set(appliedSubtasks);
    for (const st of suggestResult.suggestedSubtasks) {
      if (!subtasks.some(s => s.title.toLowerCase() === st.toLowerCase())) {
        newItems.push({
          id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: st.trim(),
          completed: false,
        });
        newSet.add(st);
      }
    }
    if (newItems.length > 0) {
      setSubtasks(prev => [...prev, ...newItems]);
      setAppliedSubtasks(newSet);
    }
  };

  const applySuggestedProject = () => {
    if (!suggestResult?.suggestedProject) return;
    const match = projects.find(
      p => p.name.toLowerCase() === suggestResult.suggestedProject?.toLowerCase() || p.id === suggestResult.suggestedProjectId
    );
    if (match) {
      setProjectId(match.id);
      setProjectName(match.name);
    } else {
      setProjectId('');
      setProjectName(suggestResult.suggestedProject);
    }
    setIsProjectApplied(true);
  };

  const applySuggestedGoal = () => {
    if (suggestResult?.suggestedGoalId) {
      const match = goals.find(g => g.id === suggestResult.suggestedGoalId);
      if (match) {
        setGoalId(match.id);
      }
    } else if (suggestResult?.suggestedGoalTitle) {
      const match = goals.find(g => g.title.toLowerCase().includes(suggestResult.suggestedGoalTitle!.toLowerCase()));
      if (match) {
        setGoalId(match.id);
      }
    }
    setIsGoalApplied(true);
  };

  // Alerts Management
  const handleAddAlert = (preset: { type: TaskAlertType; label: string }) => {
    let customDt = '';
    if (preset.type === 'custom') {
      if (!customAlertDateTime) return;
      customDt = customAlertDateTime;
    }

    const newAlert: TaskAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: preset.type,
      label: preset.label,
      customDateTime: customDt || undefined,
    };

    setAlerts(prev => [...prev.filter(a => a.type !== preset.type || preset.type === 'custom'), newAlert]);
    setShowAddAlertMenu(false);
    setCustomAlertDateTime('');
  };

  const handleRemoveAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // Test notification helper
  const handleTestAlert = async () => {
    setTestAlertFeedback('Sending test alert...');
    try {
      soundEngine?.resume();
      if (notificationService.isSupported()) {
        await notificationService.requestPermission();
      }

      const alertTimeDisplay = dueTime || 'now';
      const catObj = DEFAULT_TASK_CATEGORIES.find(c => c.id === category) || DEFAULT_TASK_CATEGORIES[0];

      if (reminderType === 'alarm') {
        window.dispatchEvent(
          new CustomEvent('omnilifeos_trigger_alarm', {
            detail: {
              id: `test-task-${Date.now()}`,
              source: 'task',
              title: `⏰ Alert Test: ${title.trim() || 'Task Reminder'}`,
              subtitle: `Due at ${alertTimeDisplay} • ${catObj.name}`,
              dueTime: alertTimeDisplay,
              reminderType: 'alarm',
            },
          })
        );
      } else {
        pushNotification(
          `⏰ Alert Test: ${title.trim() || 'Task Reminder'}`,
          `Due at ${alertTimeDisplay} • ${catObj.name}`,
          'task',
          { sound: 'task' }
        );
      }

      setTestAlertFeedback('✓ Dual chime played & alert banner triggered!');
      setTimeout(() => setTestAlertFeedback(null), 3500);
    } catch {
      setTestAlertFeedback('Alert triggered in-app.');
      setTimeout(() => setTestAlertFeedback(null), 3000);
    }
  };

  // Subtasks Handlers
  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    const newSt: Subtask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: newSubtaskInput.trim(),
      completed: false,
    };
    setSubtasks(prev => [...prev, newSt]);
    setNewSubtaskInput('');
  };

  const handleToggleSubtask = (subId: string) => {
    setSubtasks(prev =>
      prev.map(s => (s.id === subId ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteSubtask = (subId: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== subId));
  };

  // Tags Handlers
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (!clean || tags.includes(clean)) return;
    setTags(prev => [...prev, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // Quick Date presets
  const setQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'nextWeek') {
      d.setDate(d.getDate() + 7);
    }
    const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDueDate(yStr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const isCompleted = status === 'done';
    const boundProjectName = projects.find(p => p.id === projectId)?.name || projectName.trim() || undefined;

    // Ensure all configured alerts have triggered reset to false for the scheduled time (only if reminderType is not none)
    const finalAlerts = reminderType === 'none'
      ? []
      : alerts.length > 0
        ? alerts.map(a => ({ ...a, triggered: false }))
        : dueTime
          ? [{ id: `al_ontime_${Date.now()}`, type: 'on_time' as TaskAlertType, label: 'At time of event (On time)', triggered: false }]
          : [];

    if (isEditing && taskToEdit) {
      updateTask({
        ...taskToEdit,
        title: title.trim(),
        category,
        project: boundProjectName,
        projectId: projectId || undefined,
        goalId: goalId || undefined,
        taskType,
        notes: notes.trim() || undefined,
        priority,
        status: status as TaskStatus,
        completed: isCompleted,
        completedAt: isCompleted && !taskToEdit.completed ? new Date().toISOString() : taskToEdit.completedAt,
        dueDate,
        dueTime: isAllDay ? undefined : dueTime || undefined,
        isAllDay,
        reminderType,
        reminderTiming: reminderTiming as any,
        repeatType: repeatType as any,
        repeatUntil,
        durationMinutes,
        recurring: (repeatType === 'custom' || repeatType === 'none' ? 'none' : repeatType) as any,
        quadrant,
        isStarred,
        location: location.trim() || undefined,
        alerts: finalAlerts.length > 0 ? finalAlerts : undefined,
        tags,
        subtasks,
        listId: listId || taskToEdit.listId || 'list_inbox',
      });
      soundEngine?.playSuccessChime();
      pushNotification(
        'Task Updated',
        `Saved changes for "${title.trim()}".${dueTime ? ` Scheduled alert active for ${dueTime}.` : ''}`,
        'task',
        { sound: 'drop' }
      );
    } else {
      addTask({
        title: title.trim(),
        category,
        project: boundProjectName,
        projectId: projectId || undefined,
        goalId: goalId || undefined,
        taskType,
        listId: listId || defaultListId || (selectedListId && !selectedListId.startsWith('smart-') && selectedListId !== 'all' ? selectedListId : 'list_inbox'),
        notes: notes.trim() || undefined,
        priority,
        status: status as TaskStatus,
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : undefined,
        dueDate: dueDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
        dueTime: isAllDay ? undefined : dueTime || undefined,
        isAllDay,
        reminderType,
        reminderTiming: reminderTiming as any,
        repeatType: repeatType as any,
        repeatUntil,
        durationMinutes,
        estimatedPomodoros: 1,
        recurring: (repeatType === 'custom' || repeatType === 'none' ? 'none' : repeatType) as any,
        quadrant,
        isStarred,
        location: location.trim() || undefined,
        alerts: finalAlerts.length > 0 ? finalAlerts : undefined,
        tags,
        subtasks,
      });
    }

    onClose();
  };

  const handleDeleteTask = () => {
    if (!taskToEdit) return;
    deleteTask(taskToEdit.id);
    onClose();
  };

  const activeCategory = DEFAULT_TASK_CATEGORIES.find(c => c.id === category) || DEFAULT_TASK_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 h-[100svh] bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 flex flex-col overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg m-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: activeCategory.color }}
            />
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {isEditing ? 'Edit Task' : 'New Task'}
            </h3>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${activeCategory.bgColor} ${activeCategory.textColor} ${activeCategory.borderColor}`}
            >
              {activeCategory.icon} {activeCategory.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Star toggle */}
            <button
              type="button"
              id="btn-modal-star"
              onClick={() => setIsStarred(!isStarred)}
              className={`p-2 rounded-xl border transition ${
                isStarred
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500'
              }`}
              title={isStarred ? 'Starred item (click to unstar)' : 'Star this item'}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>

            {/* Close button */}
            <button
              type="button"
              id="btn-close-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs [scrollbar-width:thin]">
            {/* 1. Title Input (Large, modern Google Tasks style) with AI Smart Suggest trigger */}
            <div className="space-y-2">
              <input
                type="text"
                id="task-title-input"
                required
                placeholder="What needs to be done?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition"
                autoFocus
              />

              {/* Smart Suggest Toolbar: Analyze Goals & Projects via Gemini API */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  id="btn-smart-suggest"
                  onClick={handleFetchSmartSuggestions}
                  disabled={isSuggesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-pink-500/20 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-2xs transition cursor-pointer disabled:opacity-50"
                  title="Use Gemini AI to analyze active goals & projects to suggest subtasks and optimal deadlines"
                >
                  {isSuggesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <span>Analyzing Goals, Projects & Deadlines...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400 animate-pulse" />
                      <span>✨ Smart Suggest (Gemini AI)</span>
                    </>
                  )}
                </button>

                {suggestResult && (
                  <button
                    type="button"
                    onClick={() => setSuggestResult(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Hide Suggestions
                  </button>
                )}
              </div>

              {/* Error feedback */}
              {suggestError && (
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
                  <span className="flex-1">{suggestError}</span>
                  <button
                    type="button"
                    onClick={() => setSuggestError(null)}
                    className="p-1 hover:text-rose-900 dark:hover:text-rose-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Smart Suggestion Panel */}
              {suggestResult && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200/90 dark:border-indigo-800/80 shadow-xs space-y-3 animate-in fade-in">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>AI Smart Suggestions</span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            {suggestResult.modelUsed || 'Gemini 3.8 Flash'}
                          </span>
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Grounded in your active goals, projects & schedule
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSuggestResult(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Strategic Insights */}
                  {suggestResult.insights && (
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{suggestResult.insights}</span>
                    </div>
                  )}

                  {/* Recommended Deadline Adjustment */}
                  {suggestResult.deadlineAdjustment && (
                    <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Recommended Deadline</span>
                        </span>
                        <button
                          type="button"
                          onClick={applyRecommendedDeadline}
                          disabled={isDateApplied}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                            isDateApplied
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isDateApplied ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Applied</span>
                            </>
                          ) : (
                            <>
                              <span>Apply Deadline</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex items-baseline gap-2 text-xs flex-wrap">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                          {suggestResult.deadlineAdjustment.recommendedDate}
                          {suggestResult.deadlineAdjustment.recommendedTime ? ` · ${suggestResult.deadlineAdjustment.recommendedTime}` : ''}
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 italic flex-1 min-w-[200px]">
                          "{suggestResult.deadlineAdjustment.reason}"
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Suggested Subtasks / Checklist Items */}
                  {suggestResult.suggestedSubtasks && suggestResult.suggestedSubtasks.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Relevant Sub-tasks ({suggestResult.suggestedSubtasks.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={applyAllSuggestedSubtasks}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + Add All ({suggestResult.suggestedSubtasks.length})
                        </button>
                      </div>

                      <div className="space-y-1">
                        {suggestResult.suggestedSubtasks.map((stText, idx) => {
                          const isAdded = appliedSubtasks.has(stText) || subtasks.some(s => s.title.toLowerCase() === stText.toLowerCase());
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                            >
                              <span className={`text-[11px] flex-1 min-w-0 ${isAdded ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                {stText}
                              </span>
                              <button
                                type="button"
                                onClick={() => addOneSubtask(stText)}
                                disabled={isAdded}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded transition shrink-0 cursor-pointer ${
                                  isAdded
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60'
                                }`}
                              >
                                {isAdded ? '✓ Added' : '+ Add'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Project & Goal Quick Alignment */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {suggestResult.suggestedProject && (
                      <button
                        type="button"
                        onClick={applySuggestedProject}
                        disabled={isProjectApplied}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                          isProjectApplied
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        <FolderKanban className="w-3 h-3 text-indigo-500" />
                        <span>Project: {suggestResult.suggestedProject}</span>
                        {isProjectApplied && <Check className="w-3 h-3" />}
                      </button>
                    )}

                    {suggestResult.suggestedGoalTitle && (
                      <button
                        type="button"
                        onClick={applySuggestedGoal}
                        disabled={isGoalApplied}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                          isGoalApplied
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                        }`}
                      >
                        <Target className="w-3 h-3 text-purple-500" />
                        <span>Goal: {suggestResult.suggestedGoalTitle}</span>
                        {isGoalApplied && <Check className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Segmented Control for Task Type ('Goal' vs 'Project') */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Task Classification Type
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setTaskType('project');
                    setGoalId('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    taskType === 'project'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📁 Project Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTaskType('goal');
                    setProjectId('');
                    setProjectName('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    taskType === 'goal'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🎯 Goal Task</span>
                </button>
              </div>
            </div>

            {/* 2. Colour-coded Categories Selection (Minimal, beautiful horizontal chips) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Category
                </span>
                <span className="text-[10px] text-slate-400">Color-coded list filter</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {DEFAULT_TASK_CATEGORIES.map(cat => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      id={`btn-select-cat-${cat.id}`}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl font-semibold text-xs border transition truncate ${
                        isSelected
                          ? `${cat.bgColor} ${cat.textColor} ${cat.borderColor} ring-2 ring-indigo-500/20 shadow-2xs font-bold`
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm shrink-0">{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project & Goal Binding Row */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Project OR Goal Alignment (Choose One)</span>
                </span>
                <span className="text-[10px] text-slate-400">Mutually exclusive</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Project Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Project {goalId ? '(Disabled - Goal selected)' : ''}
                  </label>
                  <select
                    id="task-project-select"
                    value={projectId || (projectName ? `custom:${projectName}` : '')}
                    disabled={Boolean(goalId)}
                    onChange={e => {
                      const val = e.target.value;
                      if (val) {
                        setGoalId('');
                      }
                      if (val.startsWith('custom:')) {
                        setProjectId('');
                        setProjectName(val.replace('custom:', ''));
                      } else if (val) {
                        setProjectId(val);
                        const proj = projects.find(p => p.id === val);
                        setProjectName(proj?.name || '');
                      } else {
                        setProjectId('');
                        setProjectName('');
                      }
                    }}
                    className="w-full px-2.5 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium cursor-pointer disabled:opacity-50"
                  >
                    <option value="">No Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        📁 {p.name}
                      </option>
                    ))}
                    {projectName && !projects.some(p => p.id === projectId) && (
                      <option value={`custom:${projectName}`}>
                        📁 {projectName} (Custom)
                      </option>
                    )}
                  </select>
                </div>

                {/* Goal Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Life Goal {projectId || projectName ? '(Disabled - Project selected)' : ''}
                  </label>
                  <select
                    id="task-goal-select"
                    value={goalId}
                    disabled={Boolean(projectId || projectName)}
                    onChange={e => {
                      const val = e.target.value;
                      if (val) {
                        setProjectId('');
                        setProjectName('');
                      }
                      setGoalId(val);
                    }}
                    className="w-full px-2.5 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium cursor-pointer disabled:opacity-50"
                  >
                    <option value="">No Linked Goal</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>
                        🎯 {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Description / Details (Google Tasks style notes) */}
            <div>
              <textarea
                rows={2}
                id="task-notes-input"
                placeholder="Add details, notes, links, or sub-items..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 resize-none transition"
              />
            </div>

            {/* 4. Unified Due Date, Time, Reminders, Alarms & Repeat Section */}
            <div>
              <UnifiedReminderConfig
                dueDate={dueDate}
                dueTime={dueTime}
                isAllDay={isAllDay}
                reminderTiming={reminderTiming}
                reminderType={reminderType}
                repeatType={repeatType}
                repeatUntil={repeatUntil}
                titleForTest={title.trim() || 'Task Reminder'}
                sourceType="task"
                onChange={updates => {
                  if (updates.dueDate !== undefined) setDueDate(updates.dueDate);
                  if (updates.dueTime !== undefined) setDueTime(updates.dueTime);
                  if (updates.isAllDay !== undefined) setIsAllDay(updates.isAllDay);
                  if (updates.reminderTiming !== undefined) setReminderTiming(updates.reminderTiming);
                  if (updates.reminderType !== undefined) setReminderType(updates.reminderType);
                  if (updates.repeatType !== undefined) {
                    setRepeatType(updates.repeatType);
                    setRecurring(updates.repeatType as any);
                  }
                  if (updates.repeatUntil !== undefined) setRepeatUntil(updates.repeatUntil);
                }}
              />

              {/* Duration selector */}
              <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Estimated Duration
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Allocated focus time block
                  </span>
                </div>

                <select
                  id="task-duration-select"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={0}>0 min (Instant / None)</option>
                  <option value={5}>5 mins</option>
                  <option value={10}>10 mins</option>
                  <option value={15}>15 mins</option>
                  <option value={30}>30 mins</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            {/* 5. Priority Selector (High, Medium, Low) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Task Priority
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Globally Recognized Standard
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    {
                      id: 'high' as Priority,
                      quadrant: 'urgent_important' as EisenhowerQuadrant,
                      label: 'High (I)',
                      formula: 'Urgent & Important',
                      icon: HighPriorityIcon,
                      selClass: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20 shadow-2xs font-bold',
                      iconColor: 'text-rose-500',
                    },
                    {
                      id: 'medium' as Priority,
                      quadrant: 'not_urgent_important' as EisenhowerQuadrant,
                      label: 'Medium (II)',
                      formula: 'Important Work',
                      icon: MediumPriorityIcon,
                      selClass: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-2xs font-bold',
                      iconColor: 'text-amber-500',
                    },
                    {
                      id: 'low' as Priority,
                      quadrant: 'urgent_not_important' as EisenhowerQuadrant,
                      label: 'Low (III)',
                      formula: 'Routine / Flexible',
                      icon: LowPriorityIcon,
                      selClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs font-bold',
                      iconColor: 'text-emerald-500',
                    },
                  ]
                ).map(p => {
                  const isSel = priority === p.id;
                  const IconComp = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      id={`btn-eisenhower-${p.id}`}
                      onClick={() => {
                        setPriority(p.id);
                        setQuadrant(p.quadrant);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-left flex flex-col gap-1 cursor-pointer ${
                        isSel
                          ? p.selClass
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                      title={`${p.label}: ${p.formula}`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <IconComp className={`w-3.5 h-3.5 shrink-0 ${p.iconColor}`} />
                        <span>{p.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-tight">
                        {p.formula}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Notifications & Reminders (Streamlined with Instant Test Button) */}
            <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Reminders & Alerts</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                    {alerts.length} Active
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Test notification button */}
                  <button
                    type="button"
                    id="btn-test-notification-alert"
                    onClick={handleTestAlert}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition shadow-2xs"
                    title="Test audio chime & notification immediately"
                  >
                    <Volume2 className="w-3 h-3 text-indigo-500" />
                    <span>Test Alert</span>
                  </button>

                  {/* Add Alert native select (works reliably on mobile and desktop without clipping) */}
                  <div className="relative">
                    <select
                      id="select-add-alert"
                      value=""
                      onChange={e => {
                        const val = e.target.value;
                        if (!val) return;
                        const preset = ALERT_PRESETS.find(p => p.type === val);
                        if (preset) handleAddAlert(preset);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold shadow-xs transition cursor-pointer appearance-none pr-6"
                      aria-label="Add reminder alert"
                    >
                      <option value="" disabled className="text-slate-800 bg-white dark:bg-slate-800">
                        + Add Alert
                      </option>
                      {ALERT_PRESETS.map(preset => (
                        <option
                          key={preset.type}
                          value={preset.type}
                          disabled={alerts.some(a => a.type === preset.type)}
                          className="text-slate-800 bg-white dark:bg-slate-800"
                        >
                          {preset.label} {alerts.some(a => a.type === preset.type) ? '✓' : ''}
                        </option>
                      ))}
                    </select>
                    <Plus className="w-3 h-3 text-white absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Quick toggle chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[
                  { type: 'on_time' as TaskAlertType, label: 'At due time' },
                  { type: '5m' as TaskAlertType, label: '5m before' },
                  { type: '10m' as TaskAlertType, label: '10m before' },
                  { type: '15m' as TaskAlertType, label: '15m before' },
                  { type: '30m' as TaskAlertType, label: '30m before' },
                  { type: '1h' as TaskAlertType, label: '1h before' },
                ].map(preset => {
                  const isActive = alerts.some(a => a.type === preset.type);
                  return (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          const existing = alerts.find(a => a.type === preset.type);
                          if (existing) handleRemoveAlert(existing.id);
                        } else {
                          const fullPreset = ALERT_PRESETS.find(p => p.type === preset.type) || preset;
                          handleAddAlert(fullPreset);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition border ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <Bell className={`w-2.5 h-2.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{preset.label}</span>
                      {isActive ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>

              {testAlertFeedback && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-1 py-0.5 animate-in fade-in">
                  {testAlertFeedback}
                </div>
              )}

              {/* Scheduled info or Active Alerts Pills */}
              {dueTime && (
                <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-lg px-2 py-1 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Reminder active: Dual chime will sound at <strong>{dueTime}</strong> {dueDate ? `on ${formatOSDate(dueDate, 'DDMMYYYY')}` : 'today'}.
                  </span>
                </div>
              )}

              {alerts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {alerts.map(al => (
                    <span
                      key={al.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-2xs"
                    >
                      <Bell className="w-2.5 h-2.5 text-indigo-500" />
                      <span>{al.label || al.type}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAlert(al.id)}
                        className="p-0.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition"
                        title="Remove alert"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Checklist / Subtasks Option */}
            <div className="space-y-2 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Checklist {subtasks.length > 0 && `(${subtasks.filter(s => s.completed).length}/${subtasks.length})`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFetchSmartSuggestions}
                    disabled={isSuggesting}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
                    title="Suggest subtasks using Gemini AI"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                    <span>AI Suggest Steps</span>
                  </button>
                </div>
              </div>

              {subtasks.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {subtasks.map(st => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition cursor-pointer ${
                            st.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {st.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </button>
                        <span
                          className={`text-xs truncate ${
                            st.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200 font-medium'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                        title="Delete checklist item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5 pt-0.5">
                <input
                  type="text"
                  placeholder="+ Add checklist step (press Enter)..."
                  value={newSubtaskInput}
                  onChange={e => setNewSubtaskInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition shrink-0 cursor-pointer"
                >
                  Add Step
                </button>
              </div>
            </div>

            {/* 8. Progressive Disclosure Accordion: Advanced Options */}
            <div className="pt-1">
              <button
                type="button"
                id="btn-toggle-advanced-task-options"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-100 text-slate-600 dark:text-slate-400 text-xs font-semibold transition"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  <span>More Options (Repeat, Matrix Quadrant, Location, Tags)</span>
                </span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 animate-in fade-in">
                  {/* Recurrence & Workflow */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-blue-500" />
                        <span>Repeat Cycle</span>
                      </label>
                      <select
                        value={recurring}
                        onChange={e => setRecurring(e.target.value as TaskItem['recurring'])}
                        className="w-full px-2.5 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="none">None (One-time)</option>
                        <option value="daily">Daily</option>
                        <option value="weekdays">Weekdays (Mon - Fri)</option>
                        <option value="weekly">Weekly (Every 7 days)</option>
                        <option value="biweekly">Bi-weekly (Every 14 days)</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly / Anniversary</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Workflow Status
                      </label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        className="w-full px-2.5 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
                      >
                        {workflowStages.map(stage => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Eisenhower Quadrant */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Eisenhower Decision Matrix
                    </label>
                    <select
                      value={quadrant}
                      onChange={e => {
                        const q = e.target.value as EisenhowerQuadrant;
                        setQuadrant(q);
                        if (q === 'urgent_important') setPriority('high');
                        else if (q === 'not_urgent_important') setPriority('medium');
                        else if (q === 'urgent_not_important') setPriority('low');
                        else if (q === 'not_urgent_not_important') setPriority('low');
                      }}
                      className="w-full px-2.5 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
                    >
                      <option value="urgent_important">🔥 High · Urgent + Important</option>
                      <option value="not_urgent_important">📅 Medium · Important</option>
                      <option value="urgent_not_important">👥 Low · Urgent + Non-Important</option>
                      <option value="not_urgent_not_important">🚫 Low · Non-Urgent + Non-Important</option>
                    </select>
                  </div>

                  {/* Location & Tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>Location (Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Office, Supermarket, Home"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-amber-500" />
                        <span>Tags</span>
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="e.g. finance, review (Enter)"
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-2 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                        >
                          Add
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tags.map(t => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-medium"
                            >
                              <span>#{t}</span>
                              <button type="button" onClick={() => handleRemoveTag(t)}>
                                <X className="w-2.5 h-2.5 text-slate-400 hover:text-rose-500" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 space-y-2 animate-in fade-in">
                <p className="text-xs text-rose-600 dark:text-rose-300 font-semibold">
                  Are you sure you want to delete this task?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-xs">
            {isEditing ? (
              <button
                type="button"
                id="btn-delete-task"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-cancel-task-form"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-task-form"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition bg-indigo-600 hover:bg-indigo-700"
              >
                {isEditing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
