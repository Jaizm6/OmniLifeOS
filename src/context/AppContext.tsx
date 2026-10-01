import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import {
  AccentTone,
  ActionableItem,
  ActiveTab,
  AIMessage,
  AlarmHistoryItem,
  AppLockConfig,
  AppNotification,
  AppTag,
  AppTheme,
  Bill,
  CloudBackupProvider,
  DashboardWidgetConfig,
  DoseLog,
  EisenhowerQuadrant,
  Goal,
  Habit,
  HabitStep,
  HydrationState,
  InboxItem,
  JournalEntry,
  ListGroup,
  Medication,
  OpenSourceCloudConfig,
  PomodoroSession,
  Priority,
  Project,
  Routine,
  RoutineItem,
  ScheduleItem,
  TaskItem,
  TaskStatus,
  ThemeStyle,
  TodoList,
  UserProfile,
  WorkflowStage,
} from '../types';
import { CURATED_QUOTES, QuoteItem } from '../data/quotes';
import {
  defaultWidgets,
  initialAppLock,
  initialBills,
  initialGoals,
  initialHabits,
  initialHydration,
  initialInboxItems,
  initialJournalEntries,
  initialListGroups,
  initialMedications,
  initialProfile,
  initialProjects,
  initialRoutines,
  initialScheduleItems,
  initialTasks,
  initialTodoLists,
} from '../utils/initialData';
import { notificationService } from '../utils/notifications';
import { soundEngine } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { isScheduleItemOnDate } from '../utils/scheduleRecurrence';
import {
  auth,
  signInWithGoogle,
  firebaseSignOut,
  onAuthStateChanged,
  saveUserDataToFirestore,
  getUserDataFromFirestore,
  FirebaseUser,
} from '../lib/firebase';

export interface GlobalTimerState {
  activeId: string | null;
  type: 'task' | 'habit' | 'event' | null;
  mode: 'focus' | 'stopwatch' | 'break' | null;
  isRunning: boolean;
  timeElapsed: number; // For stopwatch
  timeRemaining: number; // For focus/break
  startedAt: number | null; // For accurate elapsed time
}

interface PomodoroState {
  taskId: string | null;
  timeRemaining: number;
  isRunning: boolean;
  mode: 'work' | 'break';
  initialDuration: number;
}

interface AppContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  themeStyle: ThemeStyle;
  setThemeStyle: (s: ThemeStyle) => void;
  accentTone: AccentTone;
  setAccentTone: (tone: AccentTone) => void;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  selectedDate: string;
  setSelectedDate: (dateStr: string) => void;

  // Inbox & Universal Capture
  inboxItems: InboxItem[];
  addInboxItem: (item: Omit<InboxItem, 'id' | 'createdAt'>) => void;
  updateInboxItem: (id: string, updates: Partial<InboxItem>) => void;
  deleteInboxItem: (id: string) => void;
  toggleInboxItemComplete: (id: string) => void;
  convertInboxItemToTask: (id: string, taskUpdates?: Partial<TaskItem>) => void;

  // Profile & Auth
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  isLoggedIn: boolean;
  firebaseUser: FirebaseUser | null;
  login: (identifier: string, isPhone: boolean, require2FA?: boolean) => Promise<{ need2FA: boolean; devCode?: string }>;
  loginWithGoogle: () => Promise<boolean>;
  verify2FA: (code: string) => Promise<boolean>;
  logout: () => void;

  // Medications
  medications: Medication[];
  doseLogs: DoseLog[];
  addMedication: (med: Omit<Medication, 'id'>) => void;
  updateMedication: (med: Medication) => void;
  deleteMedication: (id: string) => void;
  logDose: (medicationId: string, scheduledTime: string, status: 'taken' | 'skipped' | 'snoozed') => void;
  refillPills: (medicationId: string, quantity: number) => void;

  // Hydration
  hydration: HydrationState;
  addWater: (amount: number, unit?: string) => void;
  setHydrationTarget: (targetMl: number) => void;
  toggleWaterReminder: (enabled: boolean, intervalHours?: number) => void;

  // Tasks (List, Kanban Workflow, Lists & Eisenhower Matrix modes)
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  listGroups: ListGroup[];
  todoLists: TodoList[];
  selectedListId: string;
  setSelectedListId: (id: string) => void;
  addListGroup: (group: Omit<ListGroup, 'id'>) => void;
  updateListGroup: (group: ListGroup) => void;
  deleteListGroup: (id: string) => void;
  addTodoList: (list: Omit<TodoList, 'id'>) => void;
  updateTodoList: (list: TodoList) => void;
  deleteTodoList: (id: string) => void;
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'completedPomodoros'>) => void;
  batchAddTasks: (tasks: Omit<TaskItem, 'id' | 'createdAt' | 'completedPomodoros'>[]) => void;
  updateTask: (task: TaskItem) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, options?: { skipUndoSnackbar?: boolean; skipSound?: boolean }) => void;
  toggleStarTask: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  setTaskQuadrant: (taskId: string, quadrant: EisenhowerQuadrant) => void;

  // Schedule & Time-Blocking
  scheduleItems: ScheduleItem[];
  scheduleStartHour: number;
  setScheduleStartHour: (hour: number) => void;
  scheduleEndHour: number;
  setScheduleEndHour: (hour: number) => void;
  addEarlierScheduleHour: () => void;
  removeEarlierScheduleHour: () => void;
  addLaterScheduleHour: () => void;
  removeLaterScheduleHour: () => void;
  setScheduleTimingPreset: (preset: 'standard' | 'workday' | 'early' | 'night' | 'full' | '24h') => void;
  addScheduleItem: (item: Omit<ScheduleItem, 'id' | 'createdAt'>) => void;
  updateScheduleItem: (item: ScheduleItem) => void;
  deleteScheduleItem: (id: string) => void;
  toggleScheduleItem: (id: string) => void;
  autoScheduleTasksForDate: (date: string) => void;

  // Projects & Goals
  projects: Project[];
  addProject: (proj: Omit<Project, 'id'>) => void;
  updateProject: (proj: Project) => void;
  deleteProject: (id: string) => void;
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  linkTaskToGoal: (taskId: string, goalId?: string) => void;
  linkTaskToProject: (taskId: string, projectId?: string) => void;

  // Tags Repository & Management
  tags: AppTag[];
  addTag: (name: string, color?: string, description?: string) => void;
  updateTag: (oldName: string, newName: string, color?: string, description?: string) => void;
  deleteTag: (name: string) => void;

  // Central Management Hub for Projects, Goals & Tags
  isEntitiesModalOpen: boolean;
  setIsEntitiesModalOpen: (open: boolean) => void;
  entitiesModalDefaultTab: 'projects' | 'goals' | 'tags';
  openEntitiesModal: (tab?: 'projects' | 'goals' | 'tags') => void;

  // Bills & Subscriptions
  bills: Bill[];
  currency: string;
  currencySymbol: string;
  setCurrency: (c: string) => void;
  formatCurrency: (amount: number) => string;
  resetBillsToIndianDefaults: () => void;
  addBill: (bill: Omit<Bill, 'id' | 'paymentHistory'>) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string, amount?: number) => void;

  // Habits (HabitTick inspired)
  habits: Habit[];
  toggleHabitDay: (habitId: string, dateStr: string, options?: { skipUndoSnackbar?: boolean; skipSound?: boolean }) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'currentStreak' | 'bestStreak' | 'completionHistory' | 'createdAt'>) => void;
  updateHabit: (habit: Habit) => void;
  deleteHabit: (id: string) => void;
  updateHabitCounter: (habitId: string, delta: number) => void;
  updateHabitSubSteps: (habitId: string, subSteps: HabitStep[], dateStr: string) => void;

  // Routines (Morning, Evening, Self-Care)
  routines: Routine[];
  toggleRoutineItem: (routineId: string, itemId: string) => void;
  addRoutineItem: (routineId: string, item: Omit<RoutineItem, 'id'>) => void;
  updateRoutineItem: (routineId: string, item: RoutineItem) => void;
  deleteRoutineItem: (routineId: string, itemId: string) => void;

  // Quotes Repository
  quotes: QuoteItem[];
  addQuote: (quote: Omit<QuoteItem, 'id'>) => void;
  updateQuote: (quote: QuoteItem) => void;
  deleteQuote: (id: string) => void;
  resetQuotesToDefault: () => void;
  favoriteQuoteIds: string[];
  toggleFavoriteQuote: (id: string) => void;
  isQuoteFavorited: (id: string) => boolean;

  // Task Workflow Stages (Customizable Kanban columns)
  workflowStages: WorkflowStage[];
  setWorkflowStages: React.Dispatch<React.SetStateAction<WorkflowStage[]>>;
  addWorkflowStage: (stage: Omit<WorkflowStage, 'id'> & { id?: string }) => void;
  updateWorkflowStage: (stage: WorkflowStage) => void;
  deleteWorkflowStage: (id: string) => void;

  // Pomodoro Focus Timer
  pomodoro: PomodoroState;
  taskTimers: Record<string, { timeRemaining: number; mode: 'work' | 'break'; initialDuration: number }>;
  pomodoroLogs: PomodoroSession[];
  deletePomodoroLog: (id: string) => void;
  resetPomodoroLogs: () => void;
  startPomodoro: (taskId?: string, minutes?: number) => void;
  pausePomodoro: () => void;
  resetPomodoro: (options?: { restart?: boolean; clearTask?: boolean }) => void;
  stopPomodoro: (taskId?: string) => void;
  clearTaskTimer: (taskId: string) => void;
  switchPomodoroMode: (mode: 'work' | 'break') => void;
  completePomodoroSession: () => void;
  setPomodoroTask: (taskId: string | null) => void;
  incrementTaskPomodoro: (taskId: string) => void;
  decrementTaskPomodoro: (taskId: string) => void;
  getTaskTimerRemaining: (taskId: string) => number | null;

  // Journal & E2E Encryption
  journalEntries: JournalEntry[];
  masterPassphrase: string | null;
  setMasterPassphrase: (pass: string | null) => void;
  isJournalLocked: boolean;
  setIsJournalLocked: (locked: boolean) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateJournalEntry: (entry: JournalEntry) => void;
  deleteJournalEntry: (id: string) => void;
  toggleFavoriteJournal: (id: string) => void;

  // Full App Lock & Biometrics
  appLock: AppLockConfig;
  updateAppLock: (cfg: Partial<AppLockConfig>) => void;
  lockAppNow: () => void;
  unlockApp: (passcode?: string, isBiometric?: boolean) => boolean;

  // AI Assistant Chat & Item Generation
  isAIChatOpen: boolean;
  setIsAIChatOpen: (open: boolean) => void;
  aiMessages: AIMessage[];
  isAILoading: boolean;
  sendAIMessage: (text: string) => Promise<void>;
  applyActionableItem: (action: ActionableItem) => void;

  // Dashboard Widgets
  widgets: DashboardWidgetConfig[];
  toggleWidget: (id: string) => void;
  reorderWidgets: (newWidgets: DashboardWidgetConfig[]) => void;
  resetWidgets: () => void;

  // Notifications
  notifications: AppNotification[];
  notificationHistory: AppNotification[];
  alarmHistory: AlarmHistoryItem[];
  unreadNotificationsCount: number;
  pushNotification: (
    title: string,
    body: string,
    category: AppNotification['category'],
    options?: {
      sound?: 'pill' | 'water' | 'task' | 'alarm' | 'drop' | 'drip';
      taskId?: string;
      vibrate?: boolean;
      silent?: boolean;
    }
  ) => void;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  clearNotificationHistory: () => void;
  recordAlarmHistory: (item: Omit<AlarmHistoryItem, 'id' | 'triggeredAt'>) => void;
  clearAlarmHistory: () => void;

  // Sync & Cloud Backup
  syncEmail: string;
  savedSyncEmails: string[];
  setSyncEmail: (email: string) => void;
  addSyncEmail: (email: string) => void;
  removeSyncEmail: (email: string) => void;
  openSourceCloudConfig: OpenSourceCloudConfig;
  updateOpenSourceCloudConfig: (cfg: Partial<OpenSourceCloudConfig>) => void;
  testOpenSourceCloudConnection: () => Promise<{ success: boolean; message?: string; error?: string }>;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  lastSyncTime: string | null;
  syncWithCloud: () => Promise<void>;
  createCloudBackup: (provider?: CloudBackupProvider, source?: 'manual' | 'auto') => Promise<boolean>;
  restoreCloudBackup: (version?: number) => Promise<boolean>;
  exportEncryptedJSON: () => string;
  downloadLocalBackupFile: () => void;
  importBackupJSON: (jsonStr: string) => boolean;

  // Modals UI
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (o: boolean) => void;
  isBackupModalOpen: boolean;
  setIsBackupModalOpen: (o: boolean) => void;
  isWidgetModalOpen: boolean;
  setIsWidgetModalOpen: (o: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (o: boolean) => void;

  // Sidebar Layout State
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Audio Engine & Legacy Aliases
  soundEngine: typeof soundEngine;
  haptics: typeof haptics;
  lockApp: () => void;
  syncState: {
    status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
    lastSyncTime: string;
    pendingChanges: number;
  };
  triggerManualSync: () => Promise<void>;
  userProfile: UserProfile;
  updateUserProfile: (p: Partial<UserProfile>) => void;
  configureAppLock: (cfg: Partial<AppLockConfig>) => void;

  // Global Undo Snackbar
  undoSnackbar: UndoSnackbarData | null;
  showUndoSnackbar: (data: Omit<UndoSnackbarData, 'id' | 'timestamp'>) => void;
  hideUndoSnackbar: () => void;
  triggerUndo: () => void;
}

export interface UndoSnackbarData {
  id: string;
  type: 'task' | 'habit' | 'schedule';
  targetId: string;
  title: string;
  subtitle?: string;
  dateStr?: string;
  timestamp: number;
  onUndo: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'omniplan_state_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const lastNotifRef = useRef<Record<string, number>>({});
  // Theme state
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omniplan_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omniplan_theme_style');
      if (saved === 'glass') return 'glass';
    }
    return 'bento';
  });

  const [accentTone, setAccentToneState] = useState<AccentTone>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omniplan_accent_tone') as AccentTone;
      if (['indigo', 'emerald', 'violet', 'rose', 'amber', 'cyan'].includes(saved)) return saved;
    }
    return 'indigo';
  });

  const applyThemeMode = (currentTheme: AppTheme) => {
    if (typeof document === 'undefined') return;
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-theme', 'light');
    }
  };

  const applyThemeStyle = (currentStyle: ThemeStyle) => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('theme-glass', 'theme-pastel', 'theme-bento', 'theme-neumorphic', 'theme-claymorphic', 'theme-standard');
    document.body.classList.remove('theme-glass', 'theme-pastel', 'theme-bento', 'theme-neumorphic', 'theme-claymorphic', 'theme-standard');
    document.documentElement.classList.add(`theme-${currentStyle}`);
    document.body.classList.add(`theme-${currentStyle}`);
  };

  const applyAccentTone = (tone: AccentTone) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-accent', tone);
    document.body.setAttribute('data-accent', tone);
  };

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('omniplan_theme', newTheme);
    applyThemeMode(newTheme);
  };

  const setThemeStyle = (newStyle: ThemeStyle) => {
    setThemeStyleState(newStyle);
    localStorage.setItem('omniplan_theme_style', newStyle);
    applyThemeStyle(newStyle);
  };

  const setAccentTone = (tone: AccentTone) => {
    setAccentToneState(tone);
    localStorage.setItem('omniplan_accent_tone', tone);
    applyAccentTone(tone);
  };

  useEffect(() => {
    applyThemeMode(theme);
  }, [theme]);

  useEffect(() => {
    applyThemeStyle(themeStyle);
  }, [themeStyle]);

  useEffect(() => {
    applyAccentTone(accentTone);
  }, [accentTone]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Online / Offline tracking
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      pushNotification('Connection Restored', 'App is back online. Auto-sync is resuming.', 'system');
    };
    const handleOffline = () => {
      setIsOnline(false);
      pushNotification('Offline Mode Active', 'All tasks, logs, and notes are cached locally.', 'system');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Core Data States with LocalStorage Persistence
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_profile`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialProfile,
          ...parsed,
          name: parsed.name && parsed.name !== 'Alex Rivera' && parsed.name !== 'Alex' ? parsed.name : 'Jaiprakash',
          nickname: parsed.nickname || 'Jaiz',
          identifier: parsed.identifier && parsed.identifier !== 'alex@example.com' ? parsed.identifier : 'jaiprakashog@gmail.com',
          dateOfBirth: parsed.dateOfBirth || '1998-05-15',
          heightCm: parsed.heightCm || 175,
          weightKg: parsed.weightKg || 68,
          gender: parsed.gender || 'male',
          preferredCurrency: parsed.preferredCurrency || 'INR',
          avatarPhoto: parsed.avatarPhoto || initialProfile.avatarPhoto || '',
          bio: parsed.bio || '',
        };
      }
      return initialProfile;
    } catch {
      return initialProfile;
    }
  });

  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_currency`);
      return saved || profile.preferredCurrency || 'INR';
    } catch {
      return 'INR';
    }
  });

  const currencySymbol =
    currency === 'USD' ? '$' :
    currency === 'EUR' ? '€' :
    currency === 'GBP' ? '£' :
    currency === 'AED' ? 'AED ' :
    currency === 'CAD' ? 'C$' :
    currency === 'AUD' ? 'A$' :
    currency === 'JPY' ? '¥' : '₹';

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_currency`, c);
    setProfile(p => ({ ...p, preferredCurrency: c as any }));
  };

  const formatCurrency = (amt: number) => {
    try {
      if (currency === 'INR') {
        return `₹${Number(amt).toLocaleString('en-IN')}`;
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
      }).format(amt);
    } catch {
      return `${currencySymbol}${Number(amt).toLocaleString()}`;
    }
  };

  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_meds`);
      return saved ? JSON.parse(saved) : initialMedications;
    } catch {
      return initialMedications;
    }
  });

  const [doseLogs, setDoseLogs] = useState<DoseLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_doselogs`);
      return saved ? JSON.parse(saved) : [
        {
          id: 'log_init_1',
          medicationId: 'med_1',
          medicationName: 'Vitamin D3 & K2',
          scheduledTime: '08:30',
          loggedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          status: 'taken',
        },
      ];
    } catch {
      return [];
    }
  });

  const [hydration, setHydration] = useState<HydrationState>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_hydration`);
      return saved ? JSON.parse(saved) : initialHydration;
    } catch {
      return initialHydration;
    }
  });

  const [inboxItems, setInboxItems] = useState<InboxItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_inbox`);
      return saved ? JSON.parse(saved) : initialInboxItems;
    } catch {
      return initialInboxItems;
    }
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tasks`);
      if (saved) {
        const parsed: TaskItem[] = JSON.parse(saved);
        return parsed.map(t => {
          const init = initialTasks.find(it => it.id === t.id);
          const subtasks =
            Array.isArray(t.subtasks) && t.subtasks.length > 0
              ? t.subtasks
              : Array.isArray((t as any).checklist) && (t as any).checklist.length > 0
              ? (t as any).checklist
              : init?.subtasks || [];
          return {
            ...t,
            subtasks,
            checklist: subtasks,
          };
        });
      }
      return initialTasks;
    } catch {
      return initialTasks;
    }
  });

  const [listGroups, setListGroups] = useState<ListGroup[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_list_groups`);
      return saved ? JSON.parse(saved) : initialListGroups;
    } catch {
      return initialListGroups;
    }
  });

  const [todoLists, setTodoLists] = useState<TodoList[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_todo_lists`);
      return saved ? JSON.parse(saved) : initialTodoLists;
    } catch {
      return initialTodoLists;
    }
  });

  const [selectedListId, setSelectedListId] = useState<string>('all');

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_schedule`);
      return saved ? JSON.parse(saved) : initialScheduleItems;
    } catch {
      return initialScheduleItems;
    }
  });

  const [scheduleStartHour, setScheduleStartHourState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_schedule_start_hour`);
      if (saved !== null) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num >= 0 && num <= 23) return num;
      }
    } catch {}
    return 6; // default 06:00 AM
  });

  const [scheduleEndHour, setScheduleEndHourState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_schedule_end_hour`);
      if (saved !== null) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num >= 0 && num <= 23) return num;
      }
    } catch {}
    return 22; // default 10:00 PM (22:00)
  });

  const setScheduleStartHour = (hour: number) => {
    const clamped = Math.max(0, Math.min(hour, scheduleEndHour - 1));
    setScheduleStartHourState(clamped);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_schedule_start_hour`, String(clamped));
  };

  const setScheduleEndHour = (hour: number) => {
    const clamped = Math.min(23, Math.max(hour, scheduleStartHour + 1));
    setScheduleEndHourState(clamped);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_schedule_end_hour`, String(clamped));
  };

  const addEarlierScheduleHour = () => {
    if (scheduleStartHour > 0) {
      setScheduleStartHour(scheduleStartHour - 1);
      soundEngine.playSuccessChime();
    }
  };

  const removeEarlierScheduleHour = () => {
    if (scheduleStartHour < scheduleEndHour - 1) {
      setScheduleStartHour(scheduleStartHour + 1);
    }
  };

  const addLaterScheduleHour = () => {
    if (scheduleEndHour < 23) {
      setScheduleEndHour(scheduleEndHour + 1);
      soundEngine.playSuccessChime();
    }
  };

  const removeLaterScheduleHour = () => {
    if (scheduleEndHour > scheduleStartHour + 1) {
      setScheduleEndHour(scheduleEndHour - 1);
    }
  };

  const setScheduleTimingPreset = (preset: 'standard' | 'workday' | 'early' | 'night' | 'full' | '24h') => {
    let start = 6;
    let end = 22;
    if (preset === 'workday') {
      start = 8;
      end = 20;
    } else if (preset === 'early') {
      start = 5;
      end = 21;
    } else if (preset === 'night') {
      start = 9;
      end = 23;
    } else if (preset === 'full') {
      start = 5;
      end = 23;
    } else if (preset === '24h') {
      start = 0;
      end = 23;
    }
    setScheduleStartHourState(start);
    setScheduleEndHourState(end);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_schedule_start_hour`, String(start));
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_schedule_end_hour`, String(end));
    soundEngine.playSuccessChime();
  };

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_schedule`, JSON.stringify(scheduleItems));
    } catch (e) {
      console.warn('Failed to persist schedule items', e);
    }
  }, [scheduleItems]);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_projects`);
      return saved ? JSON.parse(saved) : initialProjects;
    } catch {
      return initialProjects;
    }
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_goals`);
      return saved ? JSON.parse(saved) : initialGoals;
    } catch {
      return initialGoals;
    }
  });

  const [tags, setTags] = useState<AppTag[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tags`);
      if (saved) return JSON.parse(saved);
      return [
        { id: 'tag-deepwork', name: 'deepwork', color: '#6366f1', description: 'Uninterrupted deep work sprint' },
        { id: 'tag-engineering', name: 'engineering', color: '#0ea5e9', description: 'Technical development & systems' },
        { id: 'tag-finance', name: 'finance', color: '#10b981', description: 'Investments, bills & tracking' },
        { id: 'tag-health', name: 'health', color: '#ef4444', description: 'Wellness, meds & hydration' },
        { id: 'tag-learning', name: 'learning', color: '#8b5cf6', description: 'Reading, skills & research' },
        { id: 'tag-mindset', name: 'mindset', color: '#f59e0b', description: 'Journaling, CBT & reflection' },
        { id: 'tag-productivity', name: 'productivity', color: '#ec4899', description: 'Habits, systems & routines' },
        { id: 'tag-sync', name: 'sync', color: '#14b8a6', description: 'Collaboration & alignment' },
      ];
    } catch {
      return [
        { id: 'tag-deepwork', name: 'deepwork', color: '#6366f1' },
        { id: 'tag-engineering', name: 'engineering', color: '#0ea5e9' },
        { id: 'tag-finance', name: 'finance', color: '#10b981' },
        { id: 'tag-health', name: 'health', color: '#ef4444' },
      ];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_tags`, JSON.stringify(tags));
    } catch (e) {
      console.warn('Failed to save tags', e);
    }
  }, [tags]);

  const [isEntitiesModalOpen, setIsEntitiesModalOpen] = useState(false);
  const [entitiesModalDefaultTab, setEntitiesModalDefaultTab] = useState<'projects' | 'goals' | 'tags'>('projects');

  const openEntitiesModal = useCallback((tab?: 'projects' | 'goals' | 'tags') => {
    haptics.modal();
    if (tab) setEntitiesModalDefaultTab(tab);
    setIsEntitiesModalOpen(true);
  }, []);

  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_bills`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If all saved bills are old US Dollar bills, auto-migrate to initialBills with Rupee
          const isAllOldDollar = parsed.every((b: Bill) => b.currency === '$' || !b.currency);
          if (isAllOldDollar) {
            return initialBills;
          }
          return parsed.map((b: Bill) => ({
            ...b,
            currency: b.currency === '$' || !b.currency ? '₹' : b.currency,
          }));
        }
      }
      return initialBills;
    } catch {
      return initialBills;
    }
  });

  const resetBillsToIndianDefaults = () => {
    setBills(initialBills);
    setCurrency('INR');
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_bills`, JSON.stringify(initialBills));
    soundEngine.playSuccessChime();
    pushNotification('Bills Reset', 'Bills have been updated to Indian Rupee (₹) defaults.', 'bills');
  };

  const [appLock, setAppLock] = useState<AppLockConfig>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_applock`);
      return saved ? JSON.parse(saved) : initialAppLock;
    } catch {
      return initialAppLock;
    }
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_habits`);
      return saved ? JSON.parse(saved) : initialHabits;
    } catch {
      return initialHabits;
    }
  });

  const [routines, setRoutines] = useState<Routine[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_routines`);
      return saved ? JSON.parse(saved) : initialRoutines;
    } catch {
      return initialRoutines;
    }
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_journal`);
      return saved ? JSON.parse(saved) : initialJournalEntries;
    } catch {
      return initialJournalEntries;
    }
  });

  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_widgets`);
      return saved ? JSON.parse(saved) : defaultWidgets;
    } catch {
      return defaultWidgets;
    }
  });

  // Notifications: Welcome notification only shown once during initial setup, not every time!
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const hasSeen = localStorage.getItem('omniplan_welcome_shown');
      if (!hasSeen) {
        localStorage.setItem('omniplan_welcome_shown', 'true');
        return [
          {
            id: 'notif_welcome',
            title: 'Welcome to OmniLifeOS',
            body: 'Unified personal log: habits, tasks, medications, and bill reminders are ready.',
            category: 'system',
            timestamp: new Date().toISOString(),
            read: false,
          },
        ];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [notificationHistory, setNotificationHistory] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notif_history`);
      return saved ? JSON.parse(saved) : [
        {
          id: 'notif_hist_welcome',
          title: 'Welcome to OmniLifeOS',
          body: 'System initialized with local encryption and full offline capabilities.',
          category: 'system',
          timestamp: new Date().toISOString(),
          read: true,
        },
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_notif_history`, JSON.stringify(notificationHistory));
  }, [notificationHistory]);

  const [alarmHistory, setAlarmHistory] = useState<AlarmHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_alarm_history`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_alarm_history`, JSON.stringify(alarmHistory));
  }, [alarmHistory]);

  // AI Assistant Chat State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    {
      id: 'ai_msg_intro',
      sender: 'assistant',
      text: "Hello! I am your **OmniLifeOS AI Companion**. You can ask me to quickly create and schedule tasks, HabitTick habits, bill reminders, or milestones with natural language!",
      timestamp: new Date().toISOString(),
    },
  ]);

  // E2E Encryption state
  const [masterPassphrase, setMasterPassphrase] = useState<string | null>(null);
  const [isJournalLocked, setIsJournalLocked] = useState<boolean>(true);

  // Sync state & Selected Account Email
  const [syncEmail, setSyncEmailState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_sync_email`);
      return saved || profile?.identifier || 'jaiprakashog@gmail.com';
    } catch {
      return 'jaiprakashog@gmail.com';
    }
  });

  const [savedSyncEmails, setSavedSyncEmails] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_saved_sync_emails`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['jaiprakashog@gmail.com'];
  });

  // Open Source Cloud Configuration (Nextcloud / WebDAV / MinIO S3)
  const [openSourceCloudConfig, setOpenSourceCloudConfig] = useState<OpenSourceCloudConfig>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_opensource_cloud`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      provider: 'nextcloud',
      enabled: false,
      serverUrl: 'https://cloud.nextcloud.example/remote.php/dav/files/user/',
      username: 'jaiprakashog@gmail.com',
      authSecret: '',
      remotePath: '/OmniLifeOS_Backups',
      s3Bucket: 'omnilife-backups',
      s3Region: 'us-east-1',
    };
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(new Date().toISOString());

  // Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        const emailLower = user.email.toLowerCase();
        setSyncEmailState(emailLower);
        setSavedSyncEmails(prev => (prev.includes(emailLower) ? prev : [...prev, emailLower]));
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_sync_email`, emailLower);

        // Update profile
        setProfile(prev => ({
          ...prev,
          id: user.uid,
          identifier: emailLower,
          name: user.displayName || prev.name || 'Jaiprakash',
          avatarPhoto: user.photoURL || prev.avatarPhoto,
          type: 'email',
        }));

        // Try restoring latest remote cloud state from Firestore
        try {
          const remoteData = await getUserDataFromFirestore(user.uid);
          if (remoteData && remoteData.payload) {
            importBackupJSON(remoteData.payload);
          }
        } catch (e) {
          console.warn('Initial Firestore pull info:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Global Undo Snackbar State (3-second revertable notification)
  const [undoSnackbar, setUndoSnackbar] = useState<UndoSnackbarData | null>(null);

  const showUndoSnackbar = useCallback((data: Omit<UndoSnackbarData, 'id' | 'timestamp'>) => {
    setUndoSnackbar({
      ...data,
      id: `undo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    });
  }, []);

  const hideUndoSnackbar = useCallback(() => {
    setUndoSnackbar(null);
  }, []);

  const triggerUndo = useCallback(() => {
    if (undoSnackbar) {
      try {
        soundEngine.playSuccessChime();
        haptics.toggle();
      } catch {}
      const undoAction = undoSnackbar.onUndo;
      setUndoSnackbar(null);
      if (typeof undoAction === 'function') {
        undoAction();
      }
    }
  }, [undoSnackbar]);

  // Sidebar Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_sidebar_collapsed`);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_sidebar_collapsed`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Global Active Timer State (Task, Habit, or Event)
  const [activeTimer, setActiveTimer] = useState<GlobalTimerState>({
    activeId: null,
    type: null,
    mode: null,
    isRunning: false,
    timeElapsed: 0,
    timeRemaining: 25 * 60,
    startedAt: null,
  });

  // Pomodoro Focus Timer State
  const [pomodoro, setPomodoro] = useState<PomodoroState>({
    taskId: null,
    timeRemaining: 25 * 60,
    isRunning: false,
    mode: 'work',
    initialDuration: 25 * 60,
  });

  // Pomodoro Session Logs (deletable and resettable)
  const [pomodoroLogs, setPomodoroLogs] = useState<PomodoroSession[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_pomodoro_logs`);
      return saved ? JSON.parse(saved) : [
        {
          id: 'pomo_init_1',
          taskTitle: 'Engineering Sprint & Architecture',
          durationMinutes: 25,
          mode: 'work',
          completedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'pomo_init_2',
          taskTitle: 'Health & Hydration Review',
          durationMinutes: 25,
          mode: 'work',
          completedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_pomodoro_logs`, JSON.stringify(pomodoroLogs));
  }, [pomodoroLogs]);

  const deletePomodoroLog = (id: string) => {
    setPomodoroLogs(prev => prev.filter(l => l.id !== id));
  };

  const resetPomodoroLogs = () => {
    setPomodoroLogs([]);
    setTasks(prev => prev.map(t => ({ ...t, completedPomodoros: 0 })));
    soundEngine.playSuccessChime();
    pushNotification('Pomodoro Logs Reset', 'All Pomodoro session logs have been cleared.', 'task');
  };

  // Per-task timer memory (preserves paused time and configuration per task)
  const [taskTimers, setTaskTimers] = useState<
    Record<string, { timeRemaining: number; mode: 'work' | 'break'; initialDuration: number }>
  >(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_task_timers`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_task_timers`, JSON.stringify(taskTimers));
  }, [taskTimers]);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_profile`, JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_meds`, JSON.stringify(medications));
  }, [medications]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_doselogs`, JSON.stringify(doseLogs));
  }, [doseLogs]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_hydration`, JSON.stringify(hydration));
  }, [hydration]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_inbox`, JSON.stringify(inboxItems));
  }, [inboxItems]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_tasks`, JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_list_groups`, JSON.stringify(listGroups));
  }, [listGroups]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_todo_lists`, JSON.stringify(todoLists));
  }, [todoLists]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_projects`, JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_goals`, JSON.stringify(goals));
  }, [goals]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_bills`, JSON.stringify(bills));
  }, [bills]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_applock`, JSON.stringify(appLock));
  }, [appLock]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_habits`, JSON.stringify(habits));
  }, [habits]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_routines`, JSON.stringify(routines));
  }, [routines]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_journal`, JSON.stringify(journalEntries));
  }, [journalEntries]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_widgets`, JSON.stringify(widgets));
  }, [widgets]);

  // Push in-app notification helper
  const pushNotification = useCallback(
    (
      title: string,
      body: string,
      category: AppNotification['category'],
      options?: {
        sound?: 'pill' | 'water' | 'task' | 'alarm' | 'drop' | 'drip';
        taskId?: string;
        vibrate?: boolean;
        silent?: boolean;
      }
    ) => {
      // Rapid deduplication check: ignore duplicate toast within 2 seconds
      const now = Date.now();
      const dedupKey = `${title}__${body}`;
      if (lastNotifRef.current[dedupKey] && now - lastNotifRef.current[dedupKey] < 2000) {
        return;
      }
      lastNotifRef.current[dedupKey] = now;

      const newNotif: AppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title,
        body,
        category,
        timestamp: new Date().toISOString(),
        read: false,
        taskId: options?.taskId,
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 40)]);
      setNotificationHistory(prev => [newNotif, ...prev.slice(0, 100)]);

      if (options?.silent) return;

      // Trigger sound and native alert (default to gentle task chime, never alarm!)
      const soundType =
        options?.sound ||
        (category === 'medication' ? 'pill' : category === 'water' ? 'water' : 'task');
      notificationService.notify(title, {
        body,
        sound: soundType,
        taskId: options?.taskId,
        tag: options?.taskId ? `task_${options.taskId}` : undefined,
        vibrate: options?.vibrate,
      });
    },
    []
  );

  // Pomodoro Timer Interval - Clean single-interval countdown
  useEffect(() => {
    if (!pomodoro.isRunning) return;

    const timer = setInterval(() => {
      setPomodoro(prev => {
        if (prev.timeRemaining <= 1) {
          return {
            ...prev,
            timeRemaining: 0,
            isRunning: false,
          };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pomodoro.isRunning]);

  // Handle Pomodoro session completion when time reaches 0
  useEffect(() => {
    if (!pomodoro.isRunning && pomodoro.timeRemaining === 0) {
      soundEngine.playSuccessChime();
      const completedMode = pomodoro.mode;
      const nextMode = completedMode === 'work' ? 'break' : 'work';
      const nextDuration = nextMode === 'work' ? 25 * 60 : 5 * 60;

      if (pomodoro.taskId && completedMode === 'work') {
        const targetTaskId = pomodoro.taskId;
        setTasks(currTasks =>
          currTasks.map(t =>
            t.id === targetTaskId
              ? { ...t, completedPomodoros: (t.completedPomodoros || 0) + 1 }
              : t
          )
        );
      }

      pushNotification(
        completedMode === 'work' ? 'Focus Session Complete!' : 'Break Over!',
        completedMode === 'work' ? 'Great focus block logged! Take a 5-minute restorative break.' : 'Break completed! Ready to resume your next sprint?',
        'task'
      );

      setPomodoro(prev => ({
        ...prev,
        mode: nextMode,
        timeRemaining: nextDuration,
        initialDuration: nextDuration,
      }));
    }
  }, [pomodoro.isRunning, pomodoro.timeRemaining, pomodoro.mode, pomodoro.taskId, pushNotification]);

  // Helper to parse any date format (YYYY-MM-DD, DD/MM/YYYY, ISO) and HH:mm to milliseconds
  const parseDateTimeToTimestamp = (dateStr?: string, timeStr: string = '00:00'): number | null => {
    if (!dateStr) return null;
    let year = 0;
    let month = 0;
    let day = 0;

    const trimmed = dateStr.trim();
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(trimmed)) {
      // DD/MM/YYYY
      const parts = trimmed.split(/[\/\-\.]/).map(Number);
      day = parts[0];
      month = parts[1];
      year = parts[2];
    } else if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/.test(trimmed)) {
      // YYYY-MM-DD
      const parts = trimmed.split(/[\/\-\.T]/).map(Number);
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      } else {
        return null;
      }
    }

    const [hStr, mStr] = (timeStr || '00:00').split(':');
    const hours = parseInt(hStr, 10) || 0;
    const minutes = parseInt(mStr, 10) || 0;

    const target = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const ts = target.getTime();
    return isNaN(ts) ? null : ts;
  };

  const remindedScheduleKeysRef = useRef<Set<string>>(new Set());
  const remindedTaskKeysRef = useRef<Set<string>>(new Set());

  // Periodic Reminder / Scheduler Engine (Runs every 5 seconds for precision real-time alerting)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const localTodayStr = `${year}-${month}-${day}`;
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const nowTs = now.getTime();

      // 1. Check medication schedules
      medications.forEach(med => {
        if (!med.active) return;
        med.schedules.forEach(sched => {
          if (sched.time === currentTimeStr) {
            // Check if already logged today
            const alreadyLogged = doseLogs.some(
              log =>
                log.medicationId === med.id &&
                log.scheduledTime === sched.time &&
                log.loggedAt.startsWith(localTodayStr)
            );
            if (!alreadyLogged) {
              if (med.reminderType === 'none') return;
              const medReminderKey = `med_${med.id}_${localTodayStr}_${sched.time}`;
              if (remindedScheduleKeysRef.current.has(medReminderKey)) return;
              remindedScheduleKeysRef.current.add(medReminderKey);
              
              if (med.reminderType === 'alarm') {
                window.dispatchEvent(
                  new CustomEvent('omnilifeos_trigger_alarm', {
                    detail: {
                      id: `alarm-med-${med.id}-${Date.now()}`,
                      source: 'medication',
                      title: `🚨 Medication Due: ${med.name}`,
                      subtitle: `Scheduled for ${sched.label || sched.time} (${med.dosage}). ${med.instructions}`,
                      dueTime: sched.time,
                      reminderType: 'alarm',
                      rawId: med.id,
                    },
                  })
                );
              } else {
                pushNotification(
                  `Medication Due: ${med.name}`,
                  `Scheduled for ${sched.label || sched.time} (${med.dosage}). ${med.instructions}`,
                  'medication',
                  { sound: 'pill' }
                );
              }
            }
          }
        });
      });

      // 2. Check task reminders and multi-alert triggers (Opt-in only!)
      tasks.forEach(task => {
        if (task.completed) return;
        if (!task.reminderType || task.reminderType === 'none') return;

        // Check if task has an explicit 'on_time' alert in alerts array to prevent duplicate triggers
        const hasOnTimeAlert = Boolean(task.alerts && task.alerts.some(a => a.type === 'on_time'));

        // Exact due time reminder (fires only if not already handled by on_time multi-alert)
        if (!hasOnTimeAlert && task.dueDate && task.dueTime) {
          const taskDueTs = parseDateTimeToTimestamp(task.dueDate, task.dueTime);
          if (taskDueTs !== null) {
            const reminderKey = `task_due_${task.id}_${task.dueDate}_${task.dueTime}`;
            const diffMs = nowTs - taskDueTs;

            if (
              diffMs >= 0 &&
              diffMs <= 30 * 60 * 1000 &&
              !remindedTaskKeysRef.current.has(reminderKey)
            ) {
              remindedTaskKeysRef.current.add(reminderKey);

              if (task.reminderType === 'alarm') {
                window.dispatchEvent(
                  new CustomEvent('omnilifeos_trigger_alarm', {
                    detail: {
                      id: `alarm-task-${task.id}-${Date.now()}`,
                      source: 'task',
                      title: `🚨 Task Alert: ${task.title}`,
                      subtitle: `Due at ${task.dueTime} • Category: ${task.category || task.project || 'Personal'}${task.location ? ` @ ${task.location}` : ''}`,
                      dueTime: task.dueTime,
                      reminderType: 'alarm',
                      rawId: task.id,
                    },
                  })
                );
              } else {
                pushNotification(
                  `⏰ Task Due: ${task.title}`,
                  `Due at ${task.dueTime} • Category: ${task.category || task.project || 'Personal'}${task.location ? ` @ ${task.location}` : ''}`,
                  'task',
                  { sound: 'drop', taskId: task.id }
                );
              }
            }
          }
        }

        // Multi-alert checks (on_time, 5m, 10m, 15m, 30m, 1h, 2h, 1d, custom)
        if (task.alerts && task.alerts.length > 0 && task.dueDate) {
          const baseTime = task.dueTime || '09:00';
          const taskDueTs = parseDateTimeToTimestamp(task.dueDate, baseTime);

          if (taskDueTs !== null) {
            task.alerts.forEach(alert => {
              const alertKey = `task_alert_${task.id}_${alert.id || alert.type}_${task.dueDate}`;
              if (alert.triggered || remindedTaskKeysRef.current.has(alertKey)) return;

              let alertTargetTs = taskDueTs;
              if (alert.type === 'on_time') alertTargetTs = taskDueTs;
              else if (alert.type === '5m') alertTargetTs = taskDueTs - 5 * 60 * 1000;
              else if (alert.type === '10m') alertTargetTs = taskDueTs - 10 * 60 * 1000;
              else if (alert.type === '15m') alertTargetTs = taskDueTs - 15 * 60 * 1000;
              else if (alert.type === '30m') alertTargetTs = taskDueTs - 30 * 60 * 1000;
              else if (alert.type === '1h') alertTargetTs = taskDueTs - 60 * 60 * 1000;
              else if (alert.type === '2h') alertTargetTs = taskDueTs - 2 * 60 * 60 * 1000;
              else if (alert.type === '1d') alertTargetTs = taskDueTs - 24 * 60 * 60 * 1000;
              else if (alert.type === 'custom' && alert.customDateTime) {
                const customTs = new Date(alert.customDateTime).getTime();
                if (!isNaN(customTs)) alertTargetTs = customTs;
              }

              // Fire if alert time has arrived and is within last 30 minutes
              const alertDiffMs = nowTs - alertTargetTs;
              if (alertDiffMs >= 0 && alertDiffMs <= 30 * 60 * 1000) {
                remindedTaskKeysRef.current.add(alertKey);

                if (task.reminderType === 'alarm') {
                  window.dispatchEvent(
                    new CustomEvent('omnilifeos_trigger_alarm', {
                      detail: {
                        id: `alarm-task-alert-${task.id}-${alert.id || alert.type}-${Date.now()}`,
                        source: 'task',
                        title: `🚨 Task Alert: ${task.title}`,
                        subtitle: `${alert.label || 'Task reminder'} • Due at ${task.dueTime || 'today'}${task.location ? ` @ ${task.location}` : ''}`,
                        dueTime: task.dueTime,
                        reminderType: 'alarm',
                        rawId: task.id,
                      },
                    })
                  );
                } else {
                  pushNotification(
                    `🔔 Reminder: ${task.title}`,
                    `${alert.label || 'Task reminder'} • Due at ${task.dueTime || 'today'}${task.location ? ` @ ${task.location}` : ''}`,
                    'task',
                    { sound: 'drop', taskId: task.id }
                  );
                }
              }
            });
          }
        }
      });

      // 3. Check Schedule Events Reminders & Alarms (supporting one-time & recurrence)
      scheduleItems.forEach(item => {
        if (item.completed) return;
        if (!isScheduleItemOnDate(item, localTodayStr)) return;

        const baseTime = item.startTime || '09:00';
        const itemTs = parseDateTimeToTimestamp(localTodayStr, baseTime);
        if (itemTs === null) return;

        let targetTs = itemTs;
        const timing = item.reminderTiming || 'on_time';
        if (timing === 'none') return;
        if (!item.reminderType || item.reminderType === 'none') return;

        if (timing === 'on_time') targetTs = itemTs;
        else if (timing === '5m') targetTs = itemTs - 5 * 60 * 1000;
        else if (timing === '10m') targetTs = itemTs - 10 * 60 * 1000;
        else if (timing === '15m') targetTs = itemTs - 15 * 60 * 1000;
        else if (timing === '30m') targetTs = itemTs - 30 * 60 * 1000;
        else if (timing === '1h') targetTs = itemTs - 60 * 60 * 1000;
        else if (timing === '1d') targetTs = itemTs - 24 * 60 * 60 * 1000;

        const reminderKey = `sched_${item.id}_${localTodayStr}_${item.startTime}_${timing}`;
        const diffMs = nowTs - targetTs;

        if (diffMs >= 0 && diffMs <= 30 * 60 * 1000 && !remindedScheduleKeysRef.current.has(reminderKey)) {
          remindedScheduleKeysRef.current.add(reminderKey);

          if (item.reminderType === 'alarm') {
            window.dispatchEvent(
              new CustomEvent('omnilifeos_trigger_alarm', {
                detail: {
                  id: `alarm-${item.id}-${Date.now()}`,
                  source: 'schedule',
                  title: `⏰ Event Alert: ${item.title}`,
                  subtitle: `${item.startTime} - ${item.endTime} • ${item.category || 'Schedule'}${item.location ? ` @ ${item.location}` : ''}`,
                  dueTime: item.startTime,
                  reminderType: 'alarm',
                  rawId: item.id,
                },
              })
            );
          } else {
            pushNotification(
              `🔔 Event Reminder: ${item.title}`,
              `${item.startTime} - ${item.endTime} • ${item.category || 'Schedule'}${item.location ? ` @ ${item.location}` : ''}`,
              'task',
              { sound: 'task' }
            );
          }
        }
      });

      // 4. Check Habits Reminders (Daily checks)
      habits.forEach(habit => {
        if (!habit.reminderTime) return;
        if (!habit.reminderType || habit.reminderType === 'none') return;

        const habitReminderKey = `habit_${habit.id}_${localTodayStr}_${habit.reminderTime}`;
        if (currentTimeStr === habit.reminderTime && !remindedScheduleKeysRef.current.has(habitReminderKey)) {
          remindedScheduleKeysRef.current.add(habitReminderKey);

          if (habit.reminderType === 'alarm') {
            window.dispatchEvent(
              new CustomEvent('omnilifeos_trigger_alarm', {
                detail: {
                  id: `alarm-habit-${habit.id}-${Date.now()}`,
                  source: 'habit',
                  title: `⏰ Habit Reminder: ${habit.name}`,
                  subtitle: `Time to perform your habit!`,
                  dueTime: habit.reminderTime,
                  reminderType: 'alarm',
                  rawId: habit.id,
                },
              })
            );
          } else {
            pushNotification(
              `🔔 Habit Reminder: ${habit.name}`,
              `Time to perform your habit!`,
              'habit',
              { sound: 'water' }
            );
          }
        }
      });

      // 5. Check Bill reminders
      bills.forEach(bill => {
        if (bill.status === 'paid') return;
        if (!bill.reminderType || bill.reminderType === 'none') return;
        const dueDateObj = new Date(bill.dueDate);
        if (isNaN(dueDateObj.getTime())) return;

        // Calculate reminder date
        const reminderDateObj = new Date(dueDateObj);
        reminderDateObj.setDate(dueDateObj.getDate() - (bill.reminderDaysBefore || 0));
        const reminderDateStr = `${reminderDateObj.getFullYear()}-${String(reminderDateObj.getMonth() + 1).padStart(2, '0')}-${String(reminderDateObj.getDate()).padStart(2, '0')}`;

        if (localTodayStr === reminderDateStr && currentTimeStr === '09:00') {
          const billReminderKey = `bill_${bill.id}_${localTodayStr}`;
          if (!remindedScheduleKeysRef.current.has(billReminderKey)) {
            remindedScheduleKeysRef.current.add(billReminderKey);

            if (bill.reminderType === 'alarm') {
              window.dispatchEvent(
                new CustomEvent('omnilifeos_trigger_alarm', {
                  detail: {
                    id: `alarm-bill-${bill.id}-${Date.now()}`,
                    source: 'bill',
                    title: `🚨 Bill Alert: ${bill.title}`,
                    subtitle: `Due in ${bill.reminderDaysBefore} days • Amount: ₹${bill.amount}`,
                    dueTime: '09:00',
                    reminderType: 'alarm',
                    rawId: bill.id,
                  },
                })
              );
            } else {
              pushNotification(
                `🔔 Bill Reminder: ${bill.title}`,
                `Due on ${bill.dueDate} (Amount: ₹${bill.amount})`,
                'bill',
                { sound: 'task' }
              );
            }
          }
        }
      });
    };

    // Listen for custom in-app push notifications (e.g. from Test button)
    const handlePushToast = (e: Event) => {
      const ce = e as CustomEvent<{ title: string; body: string; category?: AppNotification['category']; sound?: any }>;
      if (ce.detail) {
        pushNotification(ce.detail.title, ce.detail.body, ce.detail.category || 'task', { sound: ce.detail.sound || 'task' });
      }
    };
    window.addEventListener('omnilifeos_push_toast', handlePushToast);

    // Run check immediately on mount/update
    checkReminders();

    // High precision Web Worker ticker (runs unthrottled even in background tabs)
    const unsubscribeWorker = notificationService.subscribeTick(checkReminders);

    // Fallback interval check every 2 seconds
    const reminderInterval = setInterval(checkReminders, 2000);

    // Also re-check immediately when tab gains focus or screen turns on
    const handleVisibilityOrFocus = () => {
      soundEngine.resume();
      checkReminders();
    };
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      unsubscribeWorker();
      clearInterval(reminderInterval);
      window.removeEventListener('omnilifeos_push_toast', handlePushToast);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [medications, doseLogs, tasks, scheduleItems, pushNotification]);

  // Handle Action button clicks from Service Worker system notifications
  useEffect(() => {
    const handleSnooze = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: string }>;
      const tId = customEvent.detail?.taskId;
      if (!tId) return;
      const nowPlus5 = new Date(Date.now() + 5 * 60 * 1000);
      const hh = String(nowPlus5.getHours()).padStart(2, '0');
      const mm = String(nowPlus5.getMinutes()).padStart(2, '0');
      setTasks(prev =>
        prev.map(t =>
          t.id === tId
            ? {
                ...t,
                dueTime: `${hh}:${mm}`,
                lastDueRemindedAt: undefined,
                alerts: (t.alerts || []).map(a => ({ ...a, triggered: false })),
              }
            : t
        )
      );
      pushNotification('Snoozed 5 Minutes', 'Task reminder rescheduled for 5 minutes from now.', 'task');
    };

    const handleComplete = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: string }>;
      const tId = customEvent.detail?.taskId;
      if (!tId) return;
      setTasks(prev =>
        prev.map(t => {
          if (t.id !== tId) return t;
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            status: nextCompleted ? 'done' : 'todo',
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        })
      );
      // pushNotification('Task Completed', 'Marked task as done from notification.', 'task');
    };

    window.addEventListener('omnilifeos_snooze_task', handleSnooze);
    window.addEventListener('omnilifeos_complete_task', handleComplete);
    return () => {
      window.removeEventListener('omnilifeos_snooze_task', handleSnooze);
      window.removeEventListener('omnilifeos_complete_task', handleComplete);
    };
  }, [pushNotification]);

  // Auth Methods
  const login = async (identifier: string, isPhone: boolean, require2FA: boolean = true) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, type: isPhone ? 'phone' : 'email', require2FA }),
      });
      const data = await res.json();
      if (data.status === '2fa_required') {
        return { need2FA: true, devCode: data.devHintCode };
      }
      if (data.user) {
        setProfile(prev => ({
          ...prev,
          id: data.user.id,
          identifier: data.user.identifier,
          name: data.user.name,
          type: data.user.type,
          twoFactorEnabled: false,
        }));
      }
      return { need2FA: false };
    } catch {
      // Offline fallback
      setProfile(prev => ({
        ...prev,
        identifier,
        name: isPhone ? `User ${identifier.slice(-4)}` : identifier.split('@')[0],
        type: isPhone ? 'phone' : 'email',
      }));
      return { need2FA: false };
    }
  };

  const verify2FA = async (code: string) => {
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: profile.identifier, code }),
      });
      const data = await res.json();
      if (data.status === 'authenticated') {
        setProfile(prev => ({
          ...prev,
          twoFactorEnabled: true,
        }));
        pushNotification('2FA Verified', 'Two-Factor Authentication successfully confirmed.', 'system');
        return true;
      }
      return false;
    } catch {
      return true;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        pushNotification(
          'Google Account Connected',
          `Signed in as ${user.displayName || user.email}. Cloud sync active.`,
          'system'
        );
        soundEngine.playSuccessChime();
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Google login error:', e);
      pushNotification('Sign-In Notice', e?.message || 'Google sign-in could not be completed.', 'system');
      return false;
    }
  };

  const logout = () => {
    try {
      firebaseSignOut(auth).catch(() => {});
    } catch {}
    setFirebaseUser(null);
    setProfile(initialProfile);
    pushNotification('Logged Out', 'You have signed out of your account.', 'system');
  };

  // Medication handlers
  const addMedication = (med: Omit<Medication, 'id'>) => {
    const newMed: Medication = {
      ...med,
      id: `med_${Date.now()}`,
    };
    setMedications(prev => [newMed, ...prev]);
    pushNotification(`Medication Added`, `${newMed.name} added to schedule.`, 'medication');
  };

  const updateMedication = (med: Medication) => {
    setMedications(prev => prev.map(m => (m.id === med.id ? med : m)));
  };

  const deleteMedication = (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  const logDose = (medicationId: string, scheduledTime: string, status: 'taken' | 'skipped' | 'snoozed') => {
    const targetMed = medications.find(m => m.id === medicationId);
    if (!targetMed) return;

    const newLog: DoseLog = {
      id: `log_${Date.now()}`,
      medicationId,
      medicationName: targetMed.name,
      scheduledTime,
      loggedAt: new Date().toISOString(),
      status,
    };
    setDoseLogs(prev => [newLog, ...prev]);

    if (status === 'taken') {
      // Reduce pill count
      setMedications(prev =>
        prev.map(m =>
          m.id === medicationId
            ? { ...m, remainingPills: Math.max(0, m.remainingPills - 1) }
            : m
        )
      );
      soundEngine.playSuccessChime();
      pushNotification(
        'Dose Logged',
        `Logged ${targetMed.name} as taken. (${Math.max(0, targetMed.remainingPills - 1)} pills remaining)`,
        'medication'
      );
    }
  };

  const refillPills = (medicationId: string, quantity: number) => {
    setMedications(prev =>
      prev.map(m =>
        m.id === medicationId
          ? {
              ...m,
              remainingPills: m.remainingPills + quantity,
              totalPills: m.totalPills + quantity,
            }
          : m
      )
    );
    soundEngine.playSuccessChime();
    pushNotification('Pill Stock Refilled', `Added ${quantity} units to inventory.`, 'medication');
  };

  // Hydration Handlers
  const addWater = (amount: number, unit: string = 'ml') => {
    const u = unit.toLowerCase().trim();
    let amountMl = amount;
    if (u === 'litre' || u === 'litres' || u === 'l') {
      amountMl = amount * 1000;
    } else if (u === 'kg' || u === 'kilogram' || u === 'kilograms') {
      amountMl = amount * 1000;
    } else if (u === 'oz' || u === 'ounce' || u === 'ounces' || u === 'fl oz') {
      amountMl = amount * 29.5735;
    } else if (u === 'cup' || u === 'cups') {
      amountMl = amount * 240;
    } else {
      amountMl = amount; // ml
    }
    amountMl = Math.round(amountMl);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog = {
      id: `hyd_${Date.now()}`,
      amount,
      unit,
      amountMl,
      timestamp: timeStr,
    };
    setHydration(prev => ({
      ...prev,
      todayLogs: [...prev.todayLogs, newLog],
    }));
    soundEngine.playWaterChime();
    const totalToday = hydration.todayLogs.reduce((acc, curr) => acc + curr.amountMl, 0) + amountMl;
    if (totalToday >= hydration.targetMl && totalToday - amountMl < hydration.targetMl) {
      pushNotification('Daily Goal Reached! 🎉', `You reached your ${hydration.targetMl}ml hydration target!`, 'water');
    }
  };

  const setHydrationTarget = (targetMl: number) => {
    setHydration(prev => ({ ...prev, targetMl }));
  };

  const toggleWaterReminder = (enabled: boolean, intervalHours: number = 2) => {
    setHydration(prev => ({
      ...prev,
      reminderEnabled: enabled,
      reminderIntervalHours: intervalHours,
    }));
  };

  // List Groups & Todo Lists Handlers
  const addListGroup = (group: Omit<ListGroup, 'id'>) => {
    const newG: ListGroup = {
      ...group,
      id: `group_${Date.now()}`,
    };
    setListGroups(prev => [...prev, newG]);
    soundEngine.playSuccessChime();
    pushNotification('Group Created', `"${newG.name}" list group created.`, 'task');
  };

  const updateListGroup = (group: ListGroup) => {
    setListGroups(prev => prev.map(g => (g.id === group.id ? group : g)));
  };

  const deleteListGroup = (id: string) => {
    setListGroups(prev => prev.filter(g => g.id !== id));
  };

  const addTodoList = (list: Omit<TodoList, 'id'>) => {
    const newL: TodoList = {
      ...list,
      id: `list_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTodoLists(prev => [...prev, newL]);
    soundEngine.playSuccessChime();
    pushNotification('List Created', `"${newL.name}" created.`, 'task');
  };

  const updateTodoList = (list: TodoList) => {
    setTodoLists(prev => prev.map(l => (l.id === list.id ? list : l)));
  };

  const deleteTodoList = (id: string) => {
    setTodoLists(prev => prev.filter(l => l.id !== id));
    if (selectedListId === id) setSelectedListId('all');
  };

  // Helper for next recurring date
  const computeNextRecurringDate = (
    currentDateStr: string,
    recurring: TaskItem['recurring']
  ): string => {
    const base = currentDateStr ? new Date(currentDateStr) : new Date();
    const d = isNaN(base.getTime()) ? new Date() : new Date(base);

    if (recurring === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (recurring === 'weekdays') {
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() === 0 || d.getDay() === 6);
    } else if (recurring === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (recurring === 'biweekly') {
      d.setDate(d.getDate() + 14);
    } else if (recurring === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (recurring === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  // Inbox Handlers
  const addInboxItem = (item: Omit<InboxItem, 'id' | 'createdAt'>) => {
    const newItem: InboxItem = {
      ...item,
      id: `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setInboxItems(prev => [newItem, ...prev]);
    soundEngine.playSuccessChime();
    pushNotification('Captured to Inbox', `"${newItem.title}" added to your inbox.`, 'system');
  };

  const updateInboxItem = (id: string, updates: Partial<InboxItem>) => {
    setInboxItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteInboxItem = (id: string) => {
    setInboxItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleInboxItemComplete = (id: string) => {
    setInboxItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const willComplete = !item.isCompleted;
          if (willComplete) soundEngine.playWaterDropNotification();
          return { ...item, isCompleted: willComplete };
        }
        return item;
      })
    );
  };

  const convertInboxItemToTask = (id: string, taskUpdates?: Partial<TaskItem>) => {
    const item = inboxItems.find(i => i.id === id);
    if (!item) return;

    addTask({
      title: item.title,
      notes: item.details || '',
      priority: item.priority === 'high' || (item.priority as string) === 'p1' ? 'high' : item.priority === 'medium' || (item.priority as string) === 'p2' ? 'medium' : 'low',
      dueDate: item.dueDate || new Date().toISOString().split('T')[0],
      dueTime: '12:00',
      project: 'Inbox Captures',
      projectId: 'proj_personal',
      listId: 'list_inbox',
      quadrant: item.priority === 'high' || (item.priority as string) === 'p1' ? 'urgent_important' : item.priority === 'medium' || (item.priority as string) === 'p2' ? 'not_urgent_important' : 'urgent_not_important',
      status: 'todo',
      completed: false,
      estimatedPomodoros: 1,
      recurring: 'none',
      subtasks: [],
      tags: item.contextTag ? [item.contextTag] : ['inbox'],
      ...taskUpdates,
    });

    updateInboxItem(id, { isCompleted: true, convertedTo: 'task' });
    pushNotification('Converted to Task', `"${item.title}" triaged into your Task list.`, 'task');
  };

  // Task Handlers
  const addTask = (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'completedPomodoros'>) => {
    const defaultCat = taskData.category || (taskData.project ? taskData.project.toLowerCase() : 'personal');
    const newTask: TaskItem = {
      ...taskData,
      category: defaultCat,
      status: taskData.status || 'todo',
      quadrant: taskData.quadrant || 'urgent_important',
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      completedPomodoros: 0,
      listId: taskData.listId || (selectedListId !== 'all' && selectedListId !== 'inbox' && !['today', 'upcoming', 'starred', 'recurring', 'someday', 'completed'].includes(selectedListId) ? selectedListId : 'list_inbox'),
      recurring: taskData.recurring || 'none',
      reminderType: taskData.reminderType || 'none',
    };
    setTasks(prev => [newTask, ...prev]);
    soundEngine.playSuccessChime();
    pushNotification('Task Created', `"${newTask.title}" added to ${newTask.category || newTask.project || 'Tasks'}.`, 'task', { sound: 'drop' });
  };

  const batchAddTasks = (newTasks: Omit<TaskItem, 'id' | 'createdAt' | 'completedPomodoros'>[]) => {
    const created: TaskItem[] = newTasks.map((t, idx) => ({
      ...t,
      category: t.category || (t.project ? t.project.toLowerCase() : 'personal'),
      id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      completedPomodoros: 0,
      status: t.status || 'todo',
      quadrant: t.quadrant || 'urgent_important',
      listId: t.listId || (selectedListId !== 'all' && !['today', 'upcoming', 'starred', 'recurring', 'someday', 'completed'].includes(selectedListId) ? selectedListId : 'list_inbox'),
      recurring: t.recurring || 'none',
      reminderType: t.reminderType || 'none',
    }));
    setTasks(prev => [...created, ...prev]);
    soundEngine.playSuccessChime();
    pushNotification('Tasks Added', `Added ${created.length} new tasks to your schedule.`, 'task', { sound: 'drop' });
  };

  const updateTask = (task: TaskItem) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== task.id) return t;
        const timeOrDateChanged = t.dueTime !== task.dueTime || t.dueDate !== task.dueDate;
        return {
          ...task,
          lastDueRemindedAt: timeOrDateChanged ? undefined : task.lastDueRemindedAt,
          alerts: task.alerts
            ? task.alerts.map(a => (timeOrDateChanged ? { ...a, triggered: false } : a))
            : undefined,
        };
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleStarTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, isStarred: !t.isStarred } : t))
    );
  };

  const toggleTask = (id: string, options?: { skipUndoSnackbar?: boolean; skipSound?: boolean }) => {
    let completedTaskSnapshot: TaskItem | null = null;
    let wasCompleting = false;

    setTasks(prev => {
      const found = prev.find(t => t.id === id);
      if (found && !found.completed && found.status !== 'done') {
        wasCompleting = true;
        completedTaskSnapshot = { ...found };
      }
      return prev.map(t => {
        if (t.id === id) {
          const willComplete = !t.completed;
          if (willComplete && !options?.skipSound) {
            soundEngine.playWaterDropNotification();
          }

          const nextStreak = willComplete ? (t.streak || 0) + 1 : Math.max(0, (t.streak || 1) - 1);

          // If completing a recurring task, schedule its next recurrence and reset alerts!
          if (willComplete && t.recurring && t.recurring !== 'none') {
            const nextDate = computeNextRecurringDate(t.dueDate || new Date().toISOString().split('T')[0], t.recurring);
            const resetAlerts = (t.alerts || []).map(a => ({ ...a, triggered: false }));
            
            // Only notify if not already notified for this task in the last second
            if (Date.now() - (lastNotifRef.current[t.id] || 0) > 1000) {
              lastNotifRef.current[t.id] = Date.now();
              pushNotification(
                'Recurring Task Advanced',
                `"${t.title}" completed! Next reminder scheduled for ${nextDate}.`,
                'task',
                { vibrate: false }
              );
            }
            return {
              ...t,
              dueDate: nextDate,
              completed: false,
              status: 'todo',
              alerts: resetAlerts,
              streak: nextStreak,
            };
          }

          return {
            ...t,
            completed: willComplete,
            status: willComplete ? 'done' : 'todo',
            completedAt: willComplete ? new Date().toISOString() : undefined,
            streak: nextStreak,
          };
        }
        return t;
      });
    });

    if (wasCompleting && completedTaskSnapshot && !options?.skipUndoSnackbar) {
      const snapshot: TaskItem = completedTaskSnapshot;
      showUndoSnackbar({
        type: 'task',
        targetId: id,
        title: snapshot.title,
        onUndo: () => {
          setTasks(prev =>
            prev.map(t =>
              t.id === id
                ? {
                    ...t,
                    completed: false,
                    status: 'todo',
                    completedAt: undefined,
                    dueDate: snapshot.dueDate,
                    alerts: snapshot.alerts,
                    streak: snapshot.streak,
                  }
                : t
            )
          );
        },
      });
    }
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: t.subtasks.map(s =>
              s.id === subtaskId ? { ...s, completed: !s.completed } : s
            ),
          };
        }
        return t;
      })
    );
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    let completedTaskSnapshot: TaskItem | null = null;
    let wasCompleting = false;

    setTasks(prev => {
      const found = prev.find(t => t.id === taskId);
      if (found && !found.completed && found.status !== 'done' && status === 'done') {
        wasCompleting = true;
        completedTaskSnapshot = { ...found };
      }
      return prev.map(t => {
        if (t.id === taskId) {
          const isDone = status === 'done';
          if (isDone && !t.completed) soundEngine.playWaterDropNotification();
          const nextStreak = isDone ? (t.streak || 0) + 1 : (t.completed ? Math.max(0, (t.streak || 1) - 1) : t.streak);
          return {
            ...t,
            status,
            completed: isDone,
            completedAt: isDone ? new Date().toISOString() : undefined,
            streak: nextStreak,
          };
        }
        return t;
      });
    });

    if (wasCompleting && completedTaskSnapshot) {
      const snapshot: TaskItem = completedTaskSnapshot;
      showUndoSnackbar({
        type: 'task',
        targetId: taskId,
        title: snapshot.title,
        onUndo: () => {
          setTasks(prev =>
            prev.map(t =>
              t.id === taskId
                ? {
                    ...t,
                    completed: false,
                    status: 'todo',
                    completedAt: undefined,
                    dueDate: snapshot.dueDate,
                    alerts: snapshot.alerts,
                    streak: snapshot.streak,
                  }
                : t
            )
          );
        },
      });
    }
  };

  const setTaskQuadrant = (taskId: string, quadrant: EisenhowerQuadrant) => {
    const quadPriorityMap: Record<string, Priority> = {
      urgent_important: 'high',
      not_urgent_important: 'medium',
      urgent_not_important: 'low',
      not_urgent_not_important: 'low',
      neither: 'low',
    };
    const nextPriority = quadPriorityMap[quadrant] || 'medium';
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, quadrant, priority: nextPriority } : t))
    );
  };

  // Schedule & Time-Blocking Handlers
  const addScheduleItem = (itemData: Omit<ScheduleItem, 'id' | 'createdAt'>) => {
    const newItem: ScheduleItem = {
      ...itemData,
      id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setScheduleItems(prev =>
      [...prev, newItem].sort((a, b) => a.startTime.localeCompare(b.startTime))
    );
    soundEngine.playSuccessChime();
    pushNotification('Event Scheduled', `"${newItem.title}" set for ${newItem.startTime}.`, 'calendar');
  };

  const updateScheduleItem = (item: ScheduleItem) => {
    setScheduleItems(prev =>
      prev.map(s => (s.id === item.id ? item : s)).sort((a, b) => a.startTime.localeCompare(b.startTime))
    );
  };

  const deleteScheduleItem = (id: string) => {
    setScheduleItems(prev => prev.filter(s => s.id !== id));
  };

  const toggleScheduleItem = (id: string) => {
    setScheduleItems(prev =>
      prev.map(s => {
        if (s.id === id) {
          const willComplete = !s.completed;
          if (willComplete) soundEngine.playWaterDropNotification();
          // If linked to a task, keep task status in sync
          if (s.taskId) {
            setTasks(taskPrev =>
              taskPrev.map(t =>
                t.id === s.taskId
                  ? {
                      ...t,
                      completed: willComplete,
                      status: willComplete ? 'done' : 'todo',
                      completedAt: willComplete ? new Date().toISOString() : undefined,
                    }
                  : t
              )
            );
          }
          return { ...s, completed: willComplete };
        }
        return s;
      })
    );
  };

  const autoScheduleTasksForDate = (date: string) => {
    const existingSchedTaskIds = new Set(
      scheduleItems.filter(s => s.date === date && s.taskId).map(s => s.taskId)
    );
    const unscheduledTasks = tasks.filter(
      t => !t.completed && (!t.dueDate || t.dueDate <= date) && !existingSchedTaskIds.has(t.id)
    );

    if (unscheduledTasks.length === 0) {
      pushNotification('Schedule Current', 'All pending tasks for this date are already scheduled.', 'calendar');
      return;
    }

    const occupiedHours = new Set(
      scheduleItems.filter(s => s.date === date).map(s => s.startTime.split(':')[0])
    );
    const candidateHours = ['09', '10', '11', '13', '14', '15', '16', '17', '18', '19', '20'];
    const availableHours = candidateHours.filter(h => !occupiedHours.has(h));

    if (availableHours.length === 0) {
      pushNotification('Schedule Full', 'No open 1-hour slots left on this date.', 'calendar');
      return;
    }

    const newBlocks: ScheduleItem[] = [];
    unscheduledTasks.slice(0, availableHours.length).forEach((task, idx) => {
      const startH = availableHours[idx];
      const endH = String(Number(startH) + 1).padStart(2, '0');
      newBlocks.push({
        id: `sched_auto_${Date.now()}_${idx}`,
        title: task.title,
        date: date,
        startTime: `${startH}:00`,
        endTime: `${endH}:00`,
        category: 'work',
        priority: task.priority || 'medium',
        completed: false,
        taskId: task.id,
        notes: task.notes || `Mapped from ${task.project}`,
        createdAt: new Date().toISOString(),
      });
    });

    if (newBlocks.length > 0) {
      setScheduleItems(prev =>
        [...prev, ...newBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime))
      );
      soundEngine.playSuccessChime();
      pushNotification(
        'Auto-Schedule Complete',
        `Successfully mapped ${newBlocks.length} task(s) into open time slots!`,
        'calendar'
      );
    }
  };

  // Projects & Goals Handlers
  const addProject = (proj: Omit<Project, 'id'>) => {
    const newProj: Project = {
      ...proj,
      id: `proj_${Date.now()}`,
    };
    setProjects(prev => [...prev, newProj]);
    soundEngine.playSuccessChime();
    pushNotification('Project Created', `Project "${newProj.name}" created.`, 'task');
  };

  const updateProject = (proj: Project) => {
    setProjects(prev => {
      const oldProj = prev.find(p => p.id === proj.id);
      if (oldProj && oldProj.name !== proj.name) {
        setTasks(tPrev =>
          tPrev.map(t =>
            t.projectId === proj.id || t.project === oldProj.name
              ? { ...t, project: proj.name, projectId: proj.id }
              : t
          )
        );
      }
      return prev.map(p => (p.id === proj.id ? proj : p));
    });
    soundEngine.playSuccessChime();
    pushNotification('Project Updated', `Project "${proj.name}" updated successfully.`, 'task');
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    // Clear project binding from affected tasks
    setTasks(prev =>
      prev.map(t => (t.projectId === id ? { ...t, projectId: undefined, project: 'General' } : t))
    );
    soundEngine.playClick();
    pushNotification('Project Deleted', 'Project was removed.', 'task');
  };

  const addGoal = (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setGoals(prev => [newGoal, ...prev]);
    soundEngine.playSuccessChime();
    pushNotification('Goal Created', `Goal "${newGoal.title}" is now active.`, 'system');
  };

  const updateGoal = (goal: Goal) => {
    const completedCount = goal.milestones.filter(m => m.completed).length;
    const totalCount = goal.milestones.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : goal.progress;
    const updated = {
      ...goal,
      progress,
      status: progress === 100 ? ('completed' as const) : goal.status,
    };
    setGoals(prev => prev.map(g => (g.id === goal.id ? updated : g)));
    soundEngine.playSuccessChime();
    pushNotification('Goal Updated', `Goal "${goal.title}" updated successfully.`, 'system');
  };

  const linkTaskToGoal = (taskId: string, goalId?: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, goalId: goalId || undefined } : t))
    );
    const targetGoal = goals.find(g => g.id === goalId);
    if (targetGoal) {
      pushNotification('Task Linked', `Task linked to goal "${targetGoal.title}".`, 'task');
    }
  };

  const linkTaskToProject = (taskId: string, projectId?: string) => {
    const targetProj = projects.find(p => p.id === projectId);
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            projectId: projectId || undefined,
            project: targetProj ? targetProj.name : t.project,
            goalId: targetProj?.goalId || t.goalId,
          };
        }
        return t;
      })
    );
    if (targetProj) {
      pushNotification('Task Linked', `Task linked to project "${targetProj.name}".`, 'task');
    }
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    // Clear goal binding from affected tasks and projects
    setTasks(prev =>
      prev.map(t => (t.goalId === id ? { ...t, goalId: undefined } : t))
    );
    setProjects(prev =>
      prev.map(p => (p.goalId === id ? { ...p, goalId: undefined } : p))
    );
    soundEngine.playClick();
    pushNotification('Goal Deleted', 'Life goal was removed.', 'system');
  };

  // Tags Handlers (Central Registry with task propagation)
  const addTag = useCallback((name: string, color?: string, description?: string) => {
    const trimmed = name.trim().toLowerCase().replace(/^#/, '');
    if (!trimmed) return;
    setTags(prev => {
      if (prev.some(t => t.name.toLowerCase() === trimmed)) return prev;
      return [
        ...prev,
        {
          id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: trimmed,
          color: color || '#6366f1',
          description,
          createdAt: new Date().toISOString(),
        },
      ];
    });
    soundEngine.playSuccessChime();
    pushNotification('Tag Created', `Tag #${trimmed} added to tag registry.`, 'task');
  }, [pushNotification]);

  const updateTag = useCallback((oldName: string, newName: string, color?: string, description?: string) => {
    const oldTrimmed = oldName.trim().toLowerCase().replace(/^#/, '');
    const newTrimmed = newName.trim().toLowerCase().replace(/^#/, '');
    if (!oldTrimmed || !newTrimmed) return;

    setTags(prev =>
      prev.map(t =>
        t.name.toLowerCase() === oldTrimmed
          ? {
              ...t,
              name: newTrimmed,
              color: color || t.color,
              description: description !== undefined ? description : t.description,
            }
          : t
      )
    );

    // Synchronize renamed tag across all tasks
    setTasks(prev =>
      prev.map(task => {
        if (!task.tags || !task.tags.some(t => t.toLowerCase() === oldTrimmed)) return task;
        return {
          ...task,
          tags: task.tags.map(t => (t.toLowerCase() === oldTrimmed ? newTrimmed : t)),
        };
      })
    );

    soundEngine.playSuccessChime();
    pushNotification('Tag Updated', `Tag #${oldTrimmed} updated to #${newTrimmed} across all tasks.`, 'task');
  }, [pushNotification]);

  const deleteTag = useCallback((name: string) => {
    const trimmed = name.trim().toLowerCase().replace(/^#/, '');
    if (!trimmed) return;

    setTags(prev => prev.filter(t => t.name.toLowerCase() !== trimmed));

    // Remove deleted tag from all tasks
    setTasks(prev =>
      prev.map(task => {
        if (!task.tags || !task.tags.some(t => t.toLowerCase() === trimmed)) return task;
        return {
          ...task,
          tags: task.tags.filter(t => t.toLowerCase() !== trimmed),
        };
      })
    );

    soundEngine.playClick();
    pushNotification('Tag Deleted', `Tag #${trimmed} removed from registry and tasks.`, 'task');
  }, [pushNotification]);

  const toggleGoalMilestone = (goalId: string, milestoneId: string) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === goalId) {
          const updatedMilestones = g.milestones.map(m =>
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          );
          const completedCount = updatedMilestones.filter(m => m.completed).length;
          const totalCount = updatedMilestones.length;
          const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : g.progress;
          soundEngine.playSuccessChime();
          return {
            ...g,
            milestones: updatedMilestones,
            progress: newProgress,
            status: newProgress === 100 ? 'completed' : g.status,
          };
        }
        return g;
      })
    );
  };

  // Bills & Subscriptions Handlers
  const addBill = (bill: Omit<Bill, 'id' | 'paymentHistory'>) => {
    const newBill: Bill = {
      ...bill,
      id: `bill_${Date.now()}`,
      paymentHistory: [],
    };
    setBills(prev => [newBill, ...prev]);
    soundEngine.playSuccessChime();
    pushNotification('Bill Reminder Added', `${newBill.title} due on ${newBill.dueDate}.`, 'bills');
  };

  const updateBill = (bill: Bill) => {
    setBills(prev => prev.map(b => (b.id === bill.id ? bill : b)));
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const markBillPaid = (id: string, amount?: number) => {
    setBills(prev =>
      prev.map(b => {
        if (b.id === id) {
          const paidAmount = amount !== undefined ? amount : b.amount;
          const historyEntry = {
            id: `pay_${Date.now()}`,
            amount: paidAmount,
            paidAt: new Date().toISOString().split('T')[0],
            note: 'Paid via OmniLifeOS Bill Tracker',
          };
          soundEngine.playSuccessChime();
          pushNotification('Bill Paid', `Recorded payment of $${paidAmount.toFixed(2)} for ${b.title}.`, 'bills');
          return {
            ...b,
            isPaid: true,
            paidDate: new Date().toISOString().split('T')[0],
            paymentHistory: [historyEntry, ...(b.paymentHistory || [])],
          };
        }
        return b;
      })
    );
  };

  // Pomodoro Handlers
  const startPomodoro = (taskId?: string, minutes: number = 25) => {
    // 1. Resuming without a taskId or for the same task that's currently loaded
    if (!taskId) {
      if (!pomodoro.isRunning && pomodoro.timeRemaining > 0) {
        setPomodoro(prev => ({ ...prev, isRunning: true }));
        soundEngine.playSuccessChime();
        return;
      }
      const duration = minutes * 60;
      setPomodoro({
        taskId: null,
        timeRemaining: duration,
        isRunning: true,
        mode: 'work',
        initialDuration: duration,
      });
      soundEngine.playSuccessChime();
      return;
    }

    // 2. Clicked the SAME task that is currently loaded
    if (pomodoro.taskId === taskId) {
      if (!pomodoro.isRunning) {
        setPomodoro(prev => ({ ...prev, isRunning: true }));
        soundEngine.playSuccessChime();
        const taskObj = tasks.find(t => t.id === taskId);
        pushNotification('Focus Resumed', `Resumed timer for "${taskObj?.title || 'task'}"`, 'task');
      }
      return;
    }

    // 3. Switching from another task: save current timer progress for that previous task!
    if (pomodoro.taskId && pomodoro.taskId !== taskId) {
      setTaskTimers(prev => ({
        ...prev,
        [pomodoro.taskId!]: {
          timeRemaining: pomodoro.timeRemaining,
          mode: pomodoro.mode,
          initialDuration: pomodoro.initialDuration,
        },
      }));
    }

    // 4. Check if the newly selected task already has a saved timer state
    const saved = taskTimers[taskId];
    const duration = saved ? saved.initialDuration : minutes * 60;
    const remaining = saved ? saved.timeRemaining : duration;
    const mode = saved ? saved.mode : 'work';

    setPomodoro({
      taskId,
      timeRemaining: remaining,
      isRunning: true,
      mode,
      initialDuration: duration,
    });

    soundEngine.playSuccessChime();
    const taskObj = tasks.find(t => t.id === taskId);
    pushNotification(
      'Focus Started',
      `Focus timer (${Math.ceil(remaining / 60)}m) started for "${taskObj?.title || 'task'}"`,
      'task'
    );
  };

  const setPomodoroTask = (taskId: string | null) => {
    if (taskId && taskId !== pomodoro.taskId) {
      startPomodoro(taskId);
    } else {
      setPomodoro(prev => ({
        ...prev,
        taskId,
      }));
    }
  };

  const pausePomodoro = () => {
    setPomodoro(prev => {
      const willRun = !prev.isRunning;
      // When pausing an active task, save its state into per-task cache
      if (!willRun && prev.taskId) {
        setTaskTimers(t => ({
          ...t,
          [prev.taskId!]: {
            timeRemaining: prev.timeRemaining,
            mode: prev.mode,
            initialDuration: prev.initialDuration,
          },
        }));
      }
      return { ...prev, isRunning: willRun };
    });
  };

  const resetPomodoro = (options?: { restart?: boolean; clearTask?: boolean }) => {
    setPomodoro(prev => {
      if (prev.taskId && options?.clearTask) {
        setTaskTimers(t => {
          const copy = { ...t };
          delete copy[prev.taskId!];
          return copy;
        });
      }
      const standardDuration = prev.mode === 'work' ? 25 * 60 : 5 * 60;
      // If clearTask is requested without explicitly specifying restart: true, timer should stop running
      const willRun = options?.restart !== undefined ? options.restart : (options?.clearTask ? false : prev.isRunning);
      return {
        ...prev,
        taskId: options?.clearTask ? null : prev.taskId,
        isRunning: willRun,
        timeRemaining: standardDuration,
        initialDuration: standardDuration,
      };
    });
    soundEngine?.playClick?.();
  };

  const clearTaskTimer = useCallback((taskId: string) => {
    setTaskTimers(t => {
      const copy = { ...t };
      delete copy[taskId];
      return copy;
    });
    setPomodoro(prev => {
      if (prev.taskId === taskId) {
        const standardDuration = prev.mode === 'work' ? 25 * 60 : 5 * 60;
        return {
          ...prev,
          taskId: null,
          isRunning: false,
          timeRemaining: standardDuration,
          initialDuration: standardDuration,
        };
      }
      return prev;
    });
  }, []);

  const stopPomodoro = useCallback((taskId?: string) => {
    setPomodoro(prev => {
      const targetId = taskId || prev.taskId;
      if (targetId) {
        setTaskTimers(t => {
          const copy = { ...t };
          delete copy[targetId];
          return copy;
        });
      }
      const standardDuration = prev.mode === 'work' ? 25 * 60 : 5 * 60;
      return {
        ...prev,
        taskId: null,
        isRunning: false,
        timeRemaining: standardDuration,
        initialDuration: standardDuration,
      };
    });
    soundEngine?.playClick?.();
  }, []);

  const switchPomodoroMode = (mode: 'work' | 'break') => {
    const duration = mode === 'work' ? 25 * 60 : 5 * 60;
    setPomodoro(prev => ({
      ...prev,
      mode,
      isRunning: false,
      timeRemaining: duration,
      initialDuration: duration,
    }));
  };

  const completePomodoroSession = () => {
    soundEngine.playSuccessChime();

    const activeTaskId = pomodoro.taskId;
    const activeTask = tasks.find(t => t.id === activeTaskId);

    // Record completed session in logs
    const newSession: PomodoroSession = {
      id: `pomo_${Date.now()}`,
      taskId: activeTaskId || undefined,
      taskTitle: activeTask ? activeTask.title : 'Free Focus Block',
      durationMinutes: Math.round(pomodoro.initialDuration / 60) || 25,
      mode: pomodoro.mode,
      completedAt: new Date().toISOString(),
    };
    setPomodoroLogs(prev => [newSession, ...prev]);

    if (activeTaskId) {
      setTasks(currTasks =>
        currTasks.map(t =>
          t.id === activeTaskId
            ? { ...t, completedPomodoros: (t.completedPomodoros || 0) + 1 }
            : t
        )
      );

      // Clean up saved timer so next session starts fresh
      setTaskTimers(prev => {
        const copy = { ...prev };
        delete copy[activeTaskId];
        return copy;
      });
    }

    const completedMode = pomodoro.mode;
    const nextMode = completedMode === 'work' ? 'break' : 'work';
    const nextDuration = nextMode === 'work' ? 25 * 60 : 5 * 60;

    pushNotification(
      'Focus Block Recorded!',
      pomodoro.mode === 'work'
        ? 'Great focus session logged! Take a 5-minute break.'
        : 'Break concluded. Ready for your next focus session?',
      'task'
    );

    setPomodoro(prev => ({
      ...prev,
      isRunning: false,
      mode: nextMode,
      timeRemaining: nextDuration,
      initialDuration: nextDuration,
    }));
  };

  const getTaskTimerRemaining = (taskId: string): number | null => {
    if (pomodoro.taskId === taskId) {
      return pomodoro.timeRemaining;
    }
    if (taskTimers[taskId]) {
      return taskTimers[taskId].timeRemaining;
    }
    return null;
  };

  const incrementTaskPomodoro = (taskId: string) => {
    setTasks(curr =>
      curr.map(t => (t.id === taskId ? { ...t, completedPomodoros: (t.completedPomodoros || 0) + 1 } : t))
    );
    soundEngine.playSuccessChime();
  };

  const decrementTaskPomodoro = (taskId: string) => {
    setTasks(curr =>
      curr.map(t =>
        t.id === taskId ? { ...t, completedPomodoros: Math.max(0, (t.completedPomodoros || 0) - 1) } : t
      )
    );
  };

  // Habit Handlers
  const toggleHabitDay = (habitId: string, dateStr: string, options?: { skipUndoSnackbar?: boolean; skipSound?: boolean }) => {
    let completedHabitName: string | null = null;
    let wasCompleting = false;

    setHabits(prev => {
      const found = prev.find(h => h.id === habitId);
      if (found && !found.completionHistory[dateStr]) {
        wasCompleting = true;
        completedHabitName = found.name;
      }
      return prev.map(h => {
        if (h.id === habitId) {
          const currentVal = !!h.completionHistory[dateStr];
          const willComplete = !currentVal;

          // Prevent completion if target not met for counter/measurement habits
          if (willComplete && h.targetCount && h.targetCount > (h.counterValue || 0)) {
            return h;
          }

          if (willComplete && !options?.skipSound) {
            soundEngine.playWaterDropNotification();
          }
          const newHistory = { ...h.completionHistory, [dateStr]: willComplete };
          const newStreak = willComplete ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1);
          return {
            ...h,
            completionHistory: newHistory,
            currentStreak: newStreak,
            bestStreak: Math.max(h.bestStreak, newStreak),
          };
        }
        return h;
      });
    });

    if (wasCompleting && completedHabitName && !options?.skipUndoSnackbar) {
      const hName = completedHabitName;
      showUndoSnackbar({
        type: 'habit',
        targetId: habitId,
        title: hName,
        dateStr,
        onUndo: () => {
          setHabits(prev =>
            prev.map(h => {
              if (h.id === habitId) {
                const currentHistory = { ...h.completionHistory };
                delete currentHistory[dateStr];
                const newStreak = Math.max(0, h.currentStreak - 1);
                return {
                  ...h,
                  completionHistory: currentHistory,
                  currentStreak: newStreak,
                };
              }
              return h;
            })
          );
        },
      });
    }
  };

  const addHabit = (habitData: Omit<Habit, 'id' | 'currentStreak' | 'bestStreak' | 'completionHistory' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: `hab_${Date.now()}`,
      currentStreak: 0,
      bestStreak: 0,
      completionHistory: {},
      createdAt: new Date().toISOString().split('T')[0],
    };
    setHabits(prev => [...prev, newHabit]);
    soundEngine.playSuccessChime();
    pushNotification('Habit Added', `"${newHabit.name}" added to HabitTick streaks.`, 'habit');
  };

  const updateHabit = (habit: Habit) => {
    setHabits(prev => prev.map(h => (h.id === habit.id ? habit : h)));
  };

  const updateHabitCounter = (habitId: string, delta: number) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          const stepValue = h.incrementStep && h.incrementStep > 0 ? h.incrementStep : 1;
          const change = delta > 0 ? stepValue : -stepValue;
          const newVal = Math.max(0, Math.round(((h.counterValue || 0) + change) * 100) / 100);
          
          // Auto sync with main hydration tracker if enabled or liquid unit
          if (delta > 0) {
            const isLiquid = h.syncHydration || (h.unit && ['ml', 'l', 'litre', 'litres', 'glasses', 'water'].some(u => h.unit?.toLowerCase().includes(u)));
            if (isLiquid) {
              const unitLower = (h.unit || 'ml').toLowerCase();
              const addedAmount = (unitLower === 'l' || unitLower === 'litre' || unitLower === 'litres')
                ? Math.round(stepValue * 1000)
                : (unitLower === 'glasses' || unitLower === 'glass')
                  ? Math.round(stepValue * 250)
                  : Math.round(stepValue);
              if (addedAmount > 0) {
                addWater(addedAmount);
              }
            }
          }

          soundEngine.playSuccessChime();

          // Mark as complete for today if target reached
          const isDone = h.targetCount && h.targetCount > 0 ? newVal >= h.targetCount : false;
          const todayKey = new Date().toISOString().split('T')[0];
          const wasDone = !!h.completionHistory?.[todayKey];
          const updatedHistory = { ...h.completionHistory };

          let newStreak = h.currentStreak || 0;
          if (isDone && !wasDone) {
            updatedHistory[todayKey] = true;
            newStreak += 1;
          } else if (!isDone && wasDone) {
            updatedHistory[todayKey] = false;
            newStreak = Math.max(0, newStreak - 1);
          } else {
            updatedHistory[todayKey] = isDone;
          }

          return {
            ...h,
            counterValue: newVal,
            completionHistory: updatedHistory,
            currentStreak: newStreak,
            bestStreak: Math.max(h.bestStreak || 0, newStreak),
          };
        }
        return h;
      })
    );
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const updateHabitSubSteps = (habitId: string, subSteps: { id: string; text: string; completed: boolean }[], dateStr: string) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          let shouldComplete = false;
          if (h.doneWhen === 'any') {
            shouldComplete = subSteps.some(s => s.completed);
          } else {
            shouldComplete = subSteps.length > 0 && subSteps.every(s => s.completed);
          }
          const wasChecked = !!h.completionHistory?.[dateStr];
          const newHistory = { ...(h.completionHistory || {}), [dateStr]: shouldComplete };
          
          let newStreak = h.currentStreak || 0;
          if (shouldComplete && !wasChecked) {
            newStreak += 1;
          } else if (!shouldComplete && wasChecked) {
            newStreak = Math.max(0, newStreak - 1);
          }

          return {
            ...h,
            subSteps,
            completionHistory: newHistory,
            currentStreak: newStreak,
            bestStreak: Math.max(h.bestStreak || 0, newStreak),
          };
        }
        return h;
      })
    );
  };

  // Routine Handlers
  const toggleRoutineItem = (routineId: string, itemId: string) => {
    setRoutines(prev =>
      prev.map(r => {
        if (r.id === routineId) {
          const updatedItems = r.items.map(item => {
            if (item.id === itemId) {
              const newStatus = !item.completed;
              if (newStatus) soundEngine.playWaterDropNotification();
              return { ...item, completed: newStatus };
            }
            return item;
          });
          return { ...r, items: updatedItems };
        }
        return r;
      })
    );
  };

  const addRoutineItem = (routineId: string, itemData: Omit<RoutineItem, 'id'>) => {
    setRoutines(prev =>
      prev.map(r => {
        if (r.id === routineId) {
          const newItem: RoutineItem = {
            ...itemData,
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            completed: false,
          };
          soundEngine.playSuccessChime();
          return { ...r, items: [...r.items, newItem] };
        }
        return r;
      })
    );
  };

  const updateRoutineItem = (routineId: string, item: RoutineItem) => {
    setRoutines(prev =>
      prev.map(r => {
        if (r.id === routineId) {
          const updatedItems = r.items.map(i => (i.id === item.id ? item : i));
          return { ...r, items: updatedItems };
        }
        return r;
      })
    );
  };

  const deleteRoutineItem = (routineId: string, itemId: string) => {
    setRoutines(prev =>
      prev.map(r => {
        if (r.id === routineId) {
          return { ...r, items: r.items.filter(i => i.id !== itemId) };
        }
        return r;
      })
    );
  };

  // Helper to ensure prohibited authors or religious terms never slip in through old caches
  const isProhibitedQuote = (q: QuoteItem): boolean => {
    const author = (q.author || '').toLowerCase().trim();
    const text = (q.text || '').toLowerCase();
    const source = (q.source || '').toLowerCase();
    if (/abdul\s*kalam/i.test(author)) return false;
    if (/\b(ali\s+ibn|ali\s+bin|imam\s+ali|hazrat\s+ali|abi\s+talib|nahj|abu\s+bakr|umar\s+ibn|uthman|rumi|kahlil\s+gibran|khalil\s+gibran|saleh|ahmed\s+yassin|muhammad\s+iqbal|omar\s+khayyam|avicenna|ibn\s+sina|al-ghazali|ghazali)\b/i.test(author)) {
      return true;
    }
    if (/\b(nahj\s+al-balagha|nahjul\s+balagha|quran|hadith|sunnah)\b/i.test(source) || /\b(nahj\s+al-balagha|nahjul\s+balagha|quran|hadith)\b/i.test(text)) {
      return true;
    }
    return false;
  };

  // Quotes Repository State & Handlers
  const [quotes, setQuotes] = useState<QuoteItem[]>(() => {
    try {
      // Purge old stale keys so old cached quotes (with Ali ibn Abi Talib) are removed from the browser
      try {
        localStorage.removeItem('omnilife_quotes_v3');
        localStorage.removeItem('omnilife_quotes_v2');
        localStorage.removeItem('omnilife_quotes');
      } catch {
        // ignore
      }

      // Check for user-created custom quotes
      let userCustomQuotes: QuoteItem[] = [];
      const savedCustom = localStorage.getItem('omnilife_user_custom_quotes_v5');
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          if (Array.isArray(parsed)) {
            userCustomQuotes = parsed.filter(q => !isProhibitedQuote(q));
          }
        } catch {
          // ignore
        }
      }

      // Check for deleted quote IDs
      const deletedQuoteIds = new Set<string>();
      const savedDeleted = localStorage.getItem('omnilife_deleted_quote_ids_v5');
      if (savedDeleted) {
        try {
          const parsedDel = JSON.parse(savedDeleted);
          if (Array.isArray(parsedDel)) {
            parsedDel.forEach(id => deletedQuoteIds.add(id));
          }
        } catch {
          // ignore
        }
      }

      const activeCurated = CURATED_QUOTES.filter(
        q => !isProhibitedQuote(q) && !deletedQuoteIds.has(q.id)
      );

      return [...userCustomQuotes, ...activeCurated];
    } catch (e) {
      console.error(e);
      return CURATED_QUOTES;
    }
  });

  // Favorite / Liked Quotes State
  const [favoriteQuoteIds, setFavoriteQuoteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('omnilife_favorite_quotes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const toggleFavoriteQuote = (id: string) => {
    setFavoriteQuoteIds(prev => {
      const isFav = prev.includes(id);
      const updated = isFav ? prev.filter(item => item !== id) : [id, ...prev];
      try {
        localStorage.setItem('omnilife_favorite_quotes', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      soundEngine.playSuccessChime();
      return updated;
    });
  };

  const isQuoteFavorited = (id: string) => favoriteQuoteIds.includes(id);

  // Sync user custom quotes to storage
  useEffect(() => {
    try {
      const customOnes = quotes.filter(q => q.isCustom || q.id.startsWith('q_custom_'));
      localStorage.setItem('omnilife_user_custom_quotes_v5', JSON.stringify(customOnes));
    } catch (e) {
      console.error(e);
    }
  }, [quotes]);

  const addQuote = (quoteData: Omit<QuoteItem, 'id'>) => {
    const newQuote: QuoteItem = {
      ...quoteData,
      id: `q_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    setQuotes(prev => [newQuote, ...prev]);
    soundEngine.playSuccessChime();
    pushNotification('Quote Added', `Added quote by "${newQuote.author}" to your personal library.`, 'system');
  };

  const updateQuote = (quote: QuoteItem) => {
    setQuotes(prev => prev.map(q => (q.id === quote.id ? quote : q)));
  };

  const deleteQuote = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
    try {
      const savedDeleted = localStorage.getItem('omnilife_deleted_quote_ids_v5');
      const arr = savedDeleted ? JSON.parse(savedDeleted) : [];
      if (Array.isArray(arr) && !arr.includes(id)) {
        arr.push(id);
        localStorage.setItem('omnilife_deleted_quote_ids_v5', JSON.stringify(arr));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetQuotesToDefault = () => {
    try {
      localStorage.removeItem('omnilife_deleted_quote_ids_v5');
    } catch {
      // ignore
    }
    setQuotes(CURATED_QUOTES.filter(q => !isProhibitedQuote(q)));
  };

  // Task Workflow Stages (Customizable Kanban columns)
  const defaultWorkflowStages: WorkflowStage[] = [
    { id: 'todo', label: 'To Do', color: '#64748b' },
    { id: 'in_progress', label: 'In Progress', color: '#6366f1' },
    { id: 'review', label: 'In Review', color: '#f59e0b' },
    { id: 'done', label: 'Done', color: '#10b981' },
  ];

  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>(() => {
    try {
      const saved = localStorage.getItem('omnilife_task_workflow_stages');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return defaultWorkflowStages;
  });

  useEffect(() => {
    try {
      localStorage.setItem('omnilife_task_workflow_stages', JSON.stringify(workflowStages));
    } catch (e) {
      console.error(e);
    }
  }, [workflowStages]);

  const addWorkflowStage = (stageData: Omit<WorkflowStage, 'id'> & { id?: string }) => {
    const newStage: WorkflowStage = {
      id: stageData.id || `stage_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: stageData.label,
      color: stageData.color || '#6366f1',
    };
    setWorkflowStages(prev => [...prev, newStage]);
    soundEngine.playSuccessChime();
  };

  const updateWorkflowStage = (stage: WorkflowStage) => {
    setWorkflowStages(prev => prev.map(s => (s.id === stage.id ? stage : s)));
  };

  const deleteWorkflowStage = (id: string) => {
    setWorkflowStages(prev => prev.filter(s => s.id !== id));
  };

  // App-Wide Lock & Security Handlers
  const updateAppLock = (cfg: Partial<AppLockConfig>) => {
    setAppLock(prev => ({ ...prev, ...cfg }));
    pushNotification('Security Config Updated', 'App encryption & lock preferences saved.', 'system');
  };

  const lockAppNow = () => {
    setAppLock(prev => ({ ...prev, isLocked: true }));
    soundEngine.playLockSound();
    pushNotification('App Locked', 'Passcode or biometric scan required to access OmniLifeOS.', 'system');
  };

  const unlockApp = (passcode?: string, isBiometric?: boolean): boolean => {
    if (!appLock.isEnabled) {
      setAppLock(prev => ({ ...prev, isLocked: false }));
      return true;
    }
    if (isBiometric && (appLock.lockType === 'biometric' || appLock.lockType === 'both')) {
      setAppLock(prev => ({ ...prev, isLocked: false }));
      soundEngine.playSuccessChime();
      return true;
    }
    if (passcode && passcode === appLock.passcode) {
      setAppLock(prev => ({ ...prev, isLocked: false }));
      soundEngine.playSuccessChime();
      return true;
    }
    return false;
  };

  // AI Assistant Chat & Action Execution
  const applyActionableItem = (action: ActionableItem) => {
    switch (action.type) {
      case 'task': {
        addTask({
          title: action.title,
          priority: action.priority || 'medium',
          dueDate: action.dueDate || new Date().toISOString().split('T')[0],
          project: action.project || 'Work & Engineering',
          notes: action.notes,
          subtasks: (action.subtasks || []).map(st => ({
            id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            title: st,
            completed: false,
          })),
          quadrant: action.quadrant || 'urgent_important',
          status: 'todo',
          completed: false,
          estimatedPomodoros: 2,
          recurring: 'none',
        });
        break;
      }
      case 'habit': {
        addHabit({
          name: action.name,
          category: action.category || 'health',
          frequency: action.frequency || 'daily',
          targetDaysPerWeek: action.targetDaysPerWeek || 7,
          timerMinutes: action.timerMinutes,
          color: action.color || '#10b981',
          notes: action.notes,
        });
        break;
      }
      case 'bill': {
        addBill({
          title: action.title,
          category: action.category || 'other',
          amount: action.amount || 50,
          currency: action.currency || '$',
          dueDate: action.dueDate || new Date().toISOString().split('T')[0],
          recurring: action.recurring || 'monthly',
          autoPay: action.autoPay || false,
          isPaid: false,
          reminderDaysBefore: 3,
          color: '#2563eb',
          notes: action.notes,
        });
        break;
      }
      case 'goal': {
        addGoal({
          title: action.title,
          category: action.category || 'personal',
          targetDate: action.targetDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          progress: 0,
          status: 'on_track',
          color: '#6366f1',
          milestones: (action.milestones || []).map(m => ({
            id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            title: m,
            completed: false,
          })),
        });
        break;
      }
    }
  };

  const sendAIMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: AIMessage = {
      id: `usr_msg_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setAiMessages(prev => [...prev, userMsg]);
    setIsAILoading(true);

    try {
      const aiProvider = localStorage.getItem('omni_ai_provider') || 'gemini';
      const selectedModel = localStorage.getItem('omni_ai_model') || 'gemini-3.8-flash';
      const baseUrl = localStorage.getItem('omni_ai_base_url') || '';
      const customApiKey = localStorage.getItem(`omni_custom_${aiProvider}_api_key`) || '';

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversationHistory: aiMessages.slice(-6),
          userContext: {
            name: profile.name,
            tasksCount: tasks.length,
            habitsCount: habits.length,
            billsCount: bills.length,
          },
          aiProvider,
          selectedModel,
          baseUrl,
          customApiKey,
        }),
      });

      const data = await res.json();
      const rawReply = data.reply || "I've reviewed your request.";

      // Parse <omni_action>...</omni_action>
      let actionableItem: ActionableItem | undefined;
      const match = rawReply.match(/<omni_action>([\s\S]*?)<\/omni_action>/);
      let cleanText = rawReply;

      if (match && match[1]) {
        try {
          actionableItem = JSON.parse(match[1].trim());
          cleanText = rawReply.replace(/<omni_action>[\s\S]*?<\/omni_action>/, '').trim();
        } catch (e) {
          console.error('Failed to parse AI action JSON', e);
        }
      }

      const botMsg: AIMessage = {
        id: `bot_msg_${Date.now()}`,
        sender: 'assistant',
        text: cleanText,
        timestamp: new Date().toISOString(),
        actionableItem,
      };

      setAiMessages(prev => [...prev, botMsg]);
      soundEngine.playSuccessChime();
    } catch (err: any) {
      console.warn('Network request failed, executing client-side smart assistant fallback:', err);
      const lower = text.toLowerCase();
      let fallbackText = "I've processed your request.";
      let fallbackItem: ActionableItem | undefined;

      const todayStr = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      if (
        lower.includes('habit') ||
        lower.includes('workout') ||
        lower.includes('gym') ||
        lower.includes('fitness') ||
        lower.includes('water') ||
        lower.includes('meditat') ||
        lower.includes('stretch') ||
        lower.includes('run') ||
        lower.includes('read')
      ) {
        const isFitness = lower.includes('fitness') || lower.includes('gym') || lower.includes('workout') || lower.includes('run');
        const isMind = lower.includes('meditat') || lower.includes('mind');
        const isLearning = lower.includes('read') || lower.includes('study');
        const cat = isFitness ? 'fitness' : isMind ? 'mind' : isLearning ? 'learning' : 'health';
        const rawName = text.replace(/(add|create|new|set up|habit|to|for|in|section|please|my)/gi, '').replace(/:/g, '').trim();
        const habitName = rawName || (isFitness ? 'Daily Fitness Workout' : 'Healthy Routine');
        fallbackItem = {
          type: 'habit',
          name: habitName.charAt(0).toUpperCase() + habitName.slice(1),
          category: cat,
          frequency: 'daily',
          targetDaysPerWeek: 7,
          timerMinutes: 20,
          color: isFitness ? '#f43f5e' : isMind ? '#8b5cf6' : '#10b981',
        };
        fallbackText = `I've prepared your new habit: **${fallbackItem.name}** in the **${cat}** category. Tap below to confirm and add!`;
      } else if (
        lower.includes('bill') ||
        lower.includes('electric') ||
        lower.includes('credit card') ||
        lower.includes('rent') ||
        lower.includes('internet') ||
        lower.includes('subscription')
      ) {
        const amountMatch = text.match(/\$?(\d+(\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 85.0;
        const rawTitle = text.replace(/(add|create|remind|pay|bill|due|for|please|\$\d+(\.\d+)?)/gi, '').replace(/:/g, '').trim();
        const title = rawTitle || 'Upcoming Bill';
        fallbackItem = {
          type: 'bill',
          title: title.charAt(0).toUpperCase() + title.slice(1),
          amount,
          dueDate: nextWeek,
          recurring: 'monthly',
          autoPay: false,
        };
        fallbackText = `I've prepared a bill reminder for **${fallbackItem.title}** ($${amount.toFixed(2)}) due on ${nextWeek}. Tap below to save!`;
      } else if (lower.includes('goal') || lower.includes('target') || lower.includes('save $')) {
        const rawGoal = text.replace(/(add|create|goal|target|set|please|my)/gi, '').replace(/:/g, '').trim() || 'Key Milestone Goal';
        fallbackItem = {
          type: 'goal',
          title: rawGoal.charAt(0).toUpperCase() + rawGoal.slice(1),
          category: 'personal',
          targetDate: nextWeek,
          milestones: ['Define key objectives', 'Track weekly milestones', 'Celebrate completion'],
        };
        fallbackText = `Here is your structured goal: **${fallbackItem.title}**. Tap below to add it to your active goals!`;
      } else {
        const cleanTask = text.replace(/(add|create|task|todo|to|please|remind me to)/gi, '').replace(/:/g, '').trim() || 'Action Item';
        const taskTitle = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);
        fallbackItem = {
          type: 'task',
          title: taskTitle,
          priority: lower.includes('urgent') || lower.includes('high') || lower.includes('p1') ? 'high' : 'medium',
          dueDate: todayStr,
          project: 'Work & Engineering',
          quadrant: 'urgent_important',
        };
        fallbackText = `I've organized this task for you: **${taskTitle}**. Tap below to save it!`;
      }

      const botMsg: AIMessage = {
        id: `bot_local_${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toISOString(),
        actionableItem: fallbackItem,
      };
      setAiMessages(prev => [...prev, botMsg]);
      soundEngine.playSuccessChime();
    } finally {
      setIsAILoading(false);
    }
  };

  // Journal Handlers
  const addJournalEntry = (entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: JournalEntry = {
      ...entryData,
      id: `entry_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    soundEngine.playSuccessChime();
    pushNotification('Journal Saved', `"${newEntry.title}" recorded.`, 'journal');
  };

  const updateJournalEntry = (entry: JournalEntry) => {
    setJournalEntries(prev =>
      prev.map(e =>
        e.id === entry.id ? { ...entry, updatedAt: new Date().toISOString() } : e
      )
    );
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
  };

  const toggleFavoriteJournal = (id: string) => {
    setJournalEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e))
    );
  };

  // Widget Handlers
  const toggleWidget = (id: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const reorderWidgets = (newWidgets: DashboardWidgetConfig[]) => {
    setWidgets(newWidgets);
  };

  const resetWidgets = () => {
    setWidgets(defaultWidgets);
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  const recordAlarmHistory = (item: Omit<AlarmHistoryItem, 'id' | 'triggeredAt'>) => {
    const newItem: AlarmHistoryItem = {
      ...item,
      id: `alarm_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      triggeredAt: new Date().toISOString(),
    };
    setAlarmHistory(prev => [newItem, ...prev].slice(0, 100));
  };

  const clearAlarmHistory = () => {
    setAlarmHistory([]);
  };

  // Cloud Sync & Backups
  const compilePayload = () => {
    return JSON.stringify({
      version: 2,
      profile,
      medications,
      doseLogs,
      hydration,
      tasks,
      projects,
      goals,
      bills,
      appLock,
      habits,
      journalEntries,
      widgets,
      exportedAt: new Date().toISOString(),
    });
  };

  const setSyncEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setSyncEmailState(clean);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_sync_email`, clean);
    if (!savedSyncEmails.includes(clean)) {
      const updated = [...savedSyncEmails, clean];
      setSavedSyncEmails(updated);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_saved_sync_emails`, JSON.stringify(updated));
    }
    pushNotification('Sync Account Switched', `Active sync target set to ${clean}`, 'system');
  };

  const addSyncEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    if (!savedSyncEmails.includes(clean)) {
      const updated = [...savedSyncEmails, clean];
      setSavedSyncEmails(updated);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_saved_sync_emails`, JSON.stringify(updated));
    }
    setSyncEmail(clean);
  };

  const removeSyncEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    if (savedSyncEmails.length <= 1) return;
    const updated = savedSyncEmails.filter(e => e !== clean);
    setSavedSyncEmails(updated);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_saved_sync_emails`, JSON.stringify(updated));
    if (syncEmail === clean) {
      setSyncEmail(updated[0]);
    }
  };

  const updateOpenSourceCloudConfig = (cfg: Partial<OpenSourceCloudConfig>) => {
    setOpenSourceCloudConfig(prev => {
      const next = { ...prev, ...cfg };
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_opensource_cloud`, JSON.stringify(next));
      return next;
    });
  };

  const testOpenSourceCloudConnection = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/backup/test-open-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: openSourceCloudConfig.provider,
          serverUrl: openSourceCloudConfig.serverUrl,
          username: openSourceCloudConfig.username,
          authSecret: openSourceCloudConfig.authSecret,
          s3Bucket: openSourceCloudConfig.s3Bucket,
        }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Connection test failed' };
    }
  };

  const syncWithCloud = async () => {
    if (!isOnline) {
      setSyncStatus('offline');
      return;
    }
    try {
      setSyncStatus('syncing');
      const payload = compilePayload();

      // If user is authenticated with Firebase or has an email, sync directly to Firestore as primary/secondary
      if (firebaseUser?.uid) {
        await saveUserDataToFirestore(firebaseUser.uid, {
          email: syncEmail,
          payload,
          clientVersion: 1,
        });
      }

      // Also sync to local backend for REST compatibility
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: syncEmail,
          email: syncEmail,
          payload,
          clientVersion: 1,
        }),
      });
      const data = await res.json();
      if (data.success || firebaseUser?.uid) {
        setSyncStatus('synced');
        setLastSyncTime(data.syncedAt || new Date().toISOString());
        setProfile(prev => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } else {
        setSyncStatus('error');
      }
    } catch {
      // If server is unreachable but Firebase succeeded
      if (firebaseUser?.uid) {
        setSyncStatus('synced');
        setLastSyncTime(new Date().toISOString());
      } else {
        setSyncStatus('error');
      }
    }
  };

  const createCloudBackup = async (
    provider: CloudBackupProvider = 'omni_cloud',
    source: 'manual' | 'auto' = 'manual'
  ) => {
    try {
      const payload = compilePayload();
      
      if (provider === 'local') {
        downloadLocalBackupFile();
        return true;
      }

      // Handle Firebase Firestore Cloud Backup
      if (provider === 'firebase') {
        const uid = firebaseUser?.uid || syncEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const ok = await saveUserDataToFirestore(uid, {
          email: syncEmail,
          payload,
          provider: 'firebase',
          source,
          timestamp: new Date().toISOString(),
        });
        if (ok) {
          pushNotification(
            'Firebase Cloud Sync',
            `Snapshot synchronized to Firebase Firestore database for ${syncEmail}`,
            'system'
          );
          setLastSyncTime(new Date().toISOString());
          setSyncStatus('synced');
          return true;
        }
      }

      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: syncEmail,
          email: syncEmail,
          payload,
          provider,
          source,
          openSourceConfig: openSourceCloudConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const providerName =
          provider === 'firebase' ? 'Firebase Cloud' :
          provider === 'gdrive' ? 'Google Drive' :
          provider === 'onedrive' ? 'Microsoft OneDrive' :
          provider === 'mega' ? 'MEGA Cloud' :
          provider === 'proton' ? 'Proton Drive' :
          provider === 'nextcloud' ? 'Nextcloud (WebDAV)' :
          provider === 'webdav' ? 'WebDAV Storage' :
          provider === 'minio_s3' ? 'MinIO S3 Storage' :
          provider === 'omni_cloud' ? 'Omni Cloud Vault' : provider.toUpperCase();

        pushNotification(
          'Backup Created',
          `Saved encrypted snapshot to ${providerName} for ${syncEmail}`,
          'system'
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const downloadLocalBackupFile = () => {
    try {
      const payload = compilePayload();
      const dateStr = new Date().toISOString().split('T')[0];
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OmniLifeOS_Local_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushNotification('Backup Downloaded', 'Local JSON snapshot saved to your device.', 'system');
    } catch (e) {
      console.error('Failed to download local backup', e);
    }
  };

  const restoreCloudBackup = async (version?: number) => {
    try {
      // Check Firebase Firestore first if authenticated
      if (firebaseUser?.uid) {
        const remoteData = await getUserDataFromFirestore(firebaseUser.uid);
        if (remoteData && remoteData.payload) {
          const success = importBackupJSON(remoteData.payload);
          if (success) {
            pushNotification('Firebase Restore', 'Restored latest state from Firebase Firestore.', 'system');
            return true;
          }
        }
      }

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: syncEmail,
          email: syncEmail,
          version,
        }),
      });
      const data = await res.json();
      if (data.success && data.restoredPayload) {
        return importBackupJSON(data.restoredPayload);
      }
      return false;
    } catch {
      return false;
    }
  };

  const exportEncryptedJSON = () => {
    return compilePayload();
  };

  const importBackupJSON = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.medications) setMedications(data.medications);
      if (data.tasks) setTasks(data.tasks);
      if (data.projects) setProjects(data.projects);
      if (data.goals) setGoals(data.goals);
      if (data.bills) setBills(data.bills);
      if (data.appLock) setAppLock(data.appLock);
      if (data.hydration) setHydration(data.hydration);
      if (data.habits) setHabits(data.habits);
      if (data.journalEntries) setJournalEntries(data.journalEntries);
      if (data.widgets) setWidgets(data.widgets);
      if (data.doseLogs) setDoseLogs(data.doseLogs);
      // soundEngine.playSuccessChime();
      pushNotification('Data Restored', 'All categories successfully restored from backup.', 'system', { silent: true });
      return true;
    } catch {
      return false;
    }
  };

  // Auto-backup / auto-sync interval every 5 minutes when online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      syncWithCloud().catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        themeStyle,
        setThemeStyle,
        accentTone,
        setAccentTone,
        activeTab,
        setActiveTab,
        inboxItems,
        addInboxItem,
        updateInboxItem,
        deleteInboxItem,
        toggleInboxItemComplete,
        convertInboxItemToTask,
        profile,
        setProfile,
        isLoggedIn: profile.identifier !== '',
        firebaseUser,
        login,
        loginWithGoogle,
        verify2FA,
        logout,
        medications,
        doseLogs,
        addMedication,
        updateMedication,
        deleteMedication,
        logDose,
        refillPills,
        hydration,
        addWater,
        setHydrationTarget,
        toggleWaterReminder,
        tasks,
        setTasks,
        listGroups,
        todoLists,
        selectedListId,
        setSelectedListId,
        addListGroup,
        updateListGroup,
        deleteListGroup,
        addTodoList,
        updateTodoList,
        deleteTodoList,
        addTask,
        batchAddTasks,
        updateTask,
        deleteTask,
        toggleTask,
        toggleStarTask,
        toggleSubtask,
        setTaskStatus,
        setTaskQuadrant,
        scheduleItems,
        scheduleStartHour,
        setScheduleStartHour,
        scheduleEndHour,
        setScheduleEndHour,
        addEarlierScheduleHour,
        removeEarlierScheduleHour,
        addLaterScheduleHour,
        removeLaterScheduleHour,
        setScheduleTimingPreset,
        addScheduleItem,
        updateScheduleItem,
        deleteScheduleItem,
        toggleScheduleItem,
        autoScheduleTasksForDate,
        projects,
        addProject,
        updateProject,
        deleteProject,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        toggleGoalMilestone,
        linkTaskToGoal,
        linkTaskToProject,
        tags,
        addTag,
        updateTag,
        deleteTag,
        isEntitiesModalOpen,
        setIsEntitiesModalOpen,
        entitiesModalDefaultTab,
        openEntitiesModal,
        bills,
        addBill,
        updateBill,
        deleteBill,
        markBillPaid,
        pomodoro,
        taskTimers,
        pomodoroLogs,
        deletePomodoroLog,
        resetPomodoroLogs,
        startPomodoro,
        pausePomodoro,
        resetPomodoro,
        stopPomodoro,
        clearTaskTimer,
        switchPomodoroMode,
        completePomodoroSession,
        setPomodoroTask,
        incrementTaskPomodoro,
        decrementTaskPomodoro,
        getTaskTimerRemaining,
        habits,
        toggleHabitDay,
        addHabit,
        updateHabit,
        deleteHabit,
        updateHabitCounter,
        updateHabitSubSteps,
        routines,
        toggleRoutineItem,
        addRoutineItem,
        updateRoutineItem,
        deleteRoutineItem,
        quotes,
        addQuote,
        updateQuote,
        deleteQuote,
        resetQuotesToDefault,
        favoriteQuoteIds,
        toggleFavoriteQuote,
        isQuoteFavorited,
        workflowStages,
        setWorkflowStages,
        addWorkflowStage,
        updateWorkflowStage,
        deleteWorkflowStage,
        journalEntries,
        masterPassphrase,
        setMasterPassphrase,
        isJournalLocked,
        setIsJournalLocked,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        toggleFavoriteJournal,
        appLock,
        updateAppLock,
        lockAppNow,
        unlockApp,
        isAIChatOpen,
        setIsAIChatOpen,
        aiMessages,
        isAILoading,
        sendAIMessage,
        applyActionableItem,
        widgets,
        toggleWidget,
        reorderWidgets,
        resetWidgets,
        notifications,
        notificationHistory,
        alarmHistory,
        unreadNotificationsCount,
        pushNotification,
        markNotificationRead,
        dismissNotification,
        clearAllNotifications,
        clearNotificationHistory,
        recordAlarmHistory,
        clearAlarmHistory,
        isOnline,
        syncStatus,
        lastSyncTime,
        syncEmail,
        savedSyncEmails,
        setSyncEmail,
        addSyncEmail,
        removeSyncEmail,
        openSourceCloudConfig,
        updateOpenSourceCloudConfig,
        testOpenSourceCloudConnection,
        syncWithCloud,
        createCloudBackup,
        restoreCloudBackup,
        exportEncryptedJSON,
        downloadLocalBackupFile,
        importBackupJSON,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isBackupModalOpen,
        setIsBackupModalOpen,
        isWidgetModalOpen,
        setIsWidgetModalOpen,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        soundEngine,
        haptics,
        lockApp: lockAppNow,
        syncState: {
          status: syncStatus,
          lastSyncTime: lastSyncTime || new Date().toISOString(),
          pendingChanges: 0,
        },
        triggerManualSync: syncWithCloud,
        currency,
        currencySymbol,
        setCurrency,
        formatCurrency,
        resetBillsToIndianDefaults,
        userProfile: profile,
        updateUserProfile: (p: Partial<UserProfile>) => setProfile(prev => ({ ...prev, ...p })),
        configureAppLock: updateAppLock,
        undoSnackbar,
        showUndoSnackbar,
        hideUndoSnackbar,
        triggerUndo,
        selectedDate,
        setSelectedDate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
