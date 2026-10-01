import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ActiveSessionProvider } from './context/ActiveSessionContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { InboxManager } from './components/inbox/InboxManager';
import { MedicationManager } from './components/medications/MedicationManager';
import { TaskManager } from './components/tasks/TaskManager';
import { HabitTracker } from './components/habits/HabitTracker';
import { GoalsManager } from './components/goals/GoalsManager';
import { BillsManager } from './components/bills/BillsManager';
import { JournalManager } from './components/journal/JournalManager';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsManager } from './components/settings/SettingsManager';
import { QuotesManager } from './components/quotes/QuotesManager';
import { PlannerPage } from './components/planner/PlannerPage';
import { WidgetCustomizerModal } from './components/dashboard/WidgetCustomizerModal';
import { AppLockScreen } from './components/security/AppLockScreen';
import { BackupModal } from './components/common/BackupModal';
import { ProfileModal } from './components/common/ProfileModal';
import { AIChatDrawer } from './components/ai/AIChatDrawer';
import { FocusBar } from './components/focus/FocusBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { ActiveAlarmBanner } from './components/notifications/ActiveAlarmBanner';
import { EntitiesManagerModal } from './components/common/EntitiesManagerModal';
import { ActivityManager } from './components/common/ActivityManager';
import { UndoSnackbar } from './components/common/UndoSnackbar';
import { Bell, X, Sparkles, Plus, Check, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { AppNotification } from './types';

const AutoDismissToast: React.FC<{
  notif: AppNotification;
  onDismiss: (id: string) => void;
  onOpenHistory: () => void;
}> = ({
  notif,
  onDismiss,
  onOpenHistory,
}) => {
  const { soundEngine, toggleTask } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  React.useEffect(() => {
    if (isHovered || isDragging) return;
    const timer = setTimeout(() => {
      onDismiss(notif.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [notif.id, onDismiss, isHovered, isDragging]);

  const handlePointerStart = (clientX: number, clientY: number) => {
    setStartX(clientX);
    setStartY(clientY);
    setIsDragging(true);
    isDraggingRef.current = true;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handlePointerStart(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on primary mouse button
    if (e.button !== 0) return;
    handlePointerStart(e.clientX, e.clientY);
  };

  // Window-level tracking during active drag
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (startX === null || startY === null) return;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      // Allow 2D dragging with tilt
      setTranslateX(deltaX);
      setTranslateY(deltaY);
    };

    const handleMouseMoveWindow = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleTouchMoveWindow = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerEnd = () => {
      if (startX === null || startY === null) {
        setIsDragging(false);
        isDraggingRef.current = false;
        return;
      }

      const absX = Math.abs(translateX);
      const absY = Math.abs(translateY);

      if (absX >= 70) {
        if (translateX >= 70) {
          // Dragged / Swiped Right -> Complete
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(20);
          }
          handleDone();
        } else {
          // Dragged / Swiped Left -> Snooze
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(20);
          }
          handleSnooze();
        }
      } else if (absY >= 65) {
        // Dragged Up or Down -> Dismiss
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
        onDismiss(notif.id);
      } else {
        // Spring back to center
        setTranslateX(0);
        setTranslateY(0);
      }

      setStartX(null);
      setStartY(null);
      setIsDragging(false);
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 150);
    };

    window.addEventListener('mousemove', handleMouseMoveWindow);
    window.addEventListener('mouseup', handlePointerEnd);
    window.addEventListener('touchmove', handleTouchMoveWindow, { passive: false });
    window.addEventListener('touchend', handlePointerEnd);
    window.addEventListener('touchcancel', handlePointerEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveWindow);
      window.removeEventListener('mouseup', handlePointerEnd);
      window.removeEventListener('touchmove', handleTouchMoveWindow);
      window.removeEventListener('touchend', handlePointerEnd);
      window.removeEventListener('touchcancel', handlePointerEnd);
    };
  }, [isDragging, startX, startY, translateX, translateY, notif.id, onDismiss]);

  const handleDone = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundEngine.playSuccessChime();
    if (notif.taskId) {
      toggleTask(notif.taskId);
    }
    onDismiss(notif.id);
  };

  const handleSnooze = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundEngine.playSuccessChime();
    onDismiss(notif.id);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('omnilifeos_trigger_alarm', {
          detail: {
            id: `snoozed_${Date.now()}`,
            source: notif.category,
            title: `⏱ Snoozed: ${notif.title}`,
            subtitle: notif.body,
            reminderType: 'notification',
          },
        })
      );
    }, 5 * 60 * 1000);
  };

  const isTask = notif.category === 'task';
  const isMed = notif.category === 'medication';
  const isQuote = notif.category === 'quote';
  const priority = notif.priority || 'medium';

  // Check if notification's scheduled time has passed
  const scheduledTimeStr = notif.scheduledTime || notif.timestamp;
  const isScheduledTimePassed = React.useMemo(() => {
    if (!scheduledTimeStr) return false;
    const timeMs = new Date(scheduledTimeStr).getTime();
    if (isNaN(timeMs)) return false;
    return timeMs < Date.now() - 2000;
  }, [scheduledTimeStr]);

  // Format due/scheduled time string (e.g. "Due 14:30" or "Due 2:30 PM")
  const formattedDueTime = React.useMemo(() => {
    if (!scheduledTimeStr) return null;
    try {
      if (typeof scheduledTimeStr === 'string' && scheduledTimeStr.match(/^\d{1,2}:\d{2}/)) {
        return scheduledTimeStr;
      }
      const d = new Date(scheduledTimeStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  }, [scheduledTimeStr]);

  const priorityBorder = 
    priority === 'high' ? 'border-rose-500/90 ring-2 ring-rose-500/30 shadow-rose-500/10' :
    priority === 'medium' ? 'border-amber-500/80 ring-1 ring-amber-500/20' :
    'border-slate-300 dark:border-slate-700';

  const priorityBadge = (
    <div className="inline-flex items-center gap-1 shrink-0 flex-wrap">
      {priority === 'high' ? (
        <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-rose-500 text-white uppercase tracking-wider">High</span>
      ) : priority === 'medium' ? (
        <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500 text-white uppercase tracking-wider">Med</span>
      ) : (
        <span className="px-1.5 py-0.2 rounded text-[8px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider">Low</span>
      )}

      {/* '!' Badge + Due [Time] label if notification's scheduled time has passed */}
      {isScheduledTimePassed && (
        <span
          className="inline-flex items-center gap-1 px-1 py-0.2 rounded text-[8.5px] font-extrabold bg-rose-600 text-white shadow-2xs shrink-0 border border-rose-400"
          title={`Notification scheduled time has passed! ${formattedDueTime ? `(Due ${formattedDueTime})` : ''}`}
        >
          <span className="flex items-center gap-0.5 animate-pulse">
            <AlertCircle className="w-2.5 h-2.5 text-white stroke-[3]" />
            <span>!</span>
          </span>
          {formattedDueTime && (
            <span className="text-[8px] font-mono font-bold tracking-tight bg-rose-700/80 px-1 py-0.2 rounded text-white/95">
              Due {formattedDueTime}
            </span>
          )}
        </span>
      )}
    </div>
  );

  const rotateDeg = translateX * 0.04;

  return (
    <div className="relative pointer-events-auto max-w-xs w-full">
      {/* Underlying Action Backdrops (Revealed on Swipe / Drag) */}
      <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-between px-3 text-xs font-bold shadow-xs pointer-events-none bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        {/* Left Action Backdrop (Revealed on Drag Right) */}
        <div
          className={`flex items-center gap-1.5 transition-opacity duration-150 ${
            translateX > 15 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className={`p-1 rounded-full text-white ${translateX >= 70 ? 'bg-emerald-600 animate-pulse' : 'bg-emerald-500'}`}>
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            {translateX >= 70 ? 'Release to Complete ✓' : 'Drag Right to Complete →'}
          </span>
        </div>

        {/* Right Action Backdrop (Revealed on Drag Left) */}
        <div
          className={`flex items-center gap-1.5 ml-auto transition-opacity duration-150 ${
            translateX < -15 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            {translateX <= -70 ? 'Release to Snooze ⏱' : '← Drag Left to Snooze'}
          </span>
          <div className={`p-1 rounded-full text-white ${translateX <= -70 ? 'bg-amber-600 animate-pulse' : 'bg-amber-500'}`}>
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Foreground Toast Card Container */}
      <div
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', notif.id);
          e.dataTransfer.setData('application/json', JSON.stringify(notif));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          if (Math.abs(translateX) > 8 || Math.abs(translateY) > 8 || isDraggingRef.current) return;
          onOpenHistory();
        }}
        style={{
          transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotateDeg}deg)`,
          opacity: Math.max(0, 1 - Math.max(Math.abs(translateX), Math.abs(translateY)) / 200),
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease',
        }}
        className={`relative z-10 pl-3.5 pr-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border shadow-lg flex flex-col gap-1 text-xs animate-in fade-in slide-in-from-top-2 duration-150 select-none max-w-xs w-auto touch-none overflow-hidden ${
          isDragging ? 'shadow-2xl ring-2 ring-indigo-500/40 cursor-grabbing' : 'hover:shadow-xl'
        } ${priorityBorder}`}
        title="Hold the dark left border handle to drag & drop • Swipe right to complete • Swipe left to snooze"
      >
        {/* Attached Vertical Grey Line Handle at the Left Border */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="absolute left-0 top-1.5 bottom-1.5 w-2 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500 active:bg-indigo-600 transition-colors flex items-center justify-center cursor-grab active:cursor-grabbing z-20 group/handle select-none touch-none shadow-2xs"
          title="Hold left border handle to drag & drop / reposition / swipe"
        >
          <div className="w-0.5 h-4.5 rounded-full bg-slate-400/80 dark:bg-slate-500/80 group-hover/handle:opacity-100 transition-opacity" />
        </div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div
              className={`p-1 rounded-md shrink-0 ${
                isTask
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : isMed
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    : isQuote
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              <Bell className="w-3 h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h5 className="font-bold text-slate-900 dark:text-white truncate text-[10px] leading-tight">
                  {notif.title}
                </h5>
                {priorityBadge}
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[9.5px] truncate leading-none mt-0.5">
                {notif.body}
              </p>
            </div>
          </div>

          <button
            type="button"
            id={`btn-close-toast-${notif.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(notif.id);
            }}
            className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
            aria-label="Dismiss notification"
            title="Dismiss"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Quick Action Icon Buttons Row */}
        <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-100 dark:border-slate-800/80 text-[9px]">
          <button
            type="button"
            onClick={handleDone}
            className="flex-1 inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 font-bold transition active:scale-95 cursor-pointer"
            title="Mark done / complete"
          >
            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Done</span>
          </button>

          <button
            type="button"
            onClick={handleSnooze}
            className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition active:scale-95 cursor-pointer"
            title="Snooze for 5 minutes"
          >
            <Clock className="w-2.5 h-2.5" />
            <span>Snooze 5m</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory();
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
            title="Open Notification Drawer"
          >
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const {
    activeTab,
    notifications,
    dismissNotification,
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    isEntitiesModalOpen,
    setIsEntitiesModalOpen,
    entitiesModalDefaultTab,
    isAIChatOpen,
    setIsAIChatOpen,
  } = useApp();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isPlusButtonVisible, setIsPlusButtonVisible] = useState(true);

  useEffect(() => {
    const setAppHeight = () => {
      const doc = document.documentElement;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      doc.style.setProperty('--app-height', `${viewportHeight}px`);
      
      // Heuristic: If viewport is significantly smaller than window height, keyboard is likely active.
      const isKeyboardActive = window.visualViewport && (window.visualViewport.height < window.innerHeight * 0.85);
      if (isKeyboardActive) {
        doc.classList.add('keyboard-active');
      } else {
        doc.classList.remove('keyboard-active');
      }
    };

    window.visualViewport?.addEventListener('resize', setAppHeight);
    window.addEventListener('resize', setAppHeight);
    setAppHeight();

    return () => {
      window.visualViewport?.removeEventListener('resize', setAppHeight);
      window.removeEventListener('resize', setAppHeight);
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const hideButton = () => {
      timer = setTimeout(() => setIsPlusButtonVisible(false), 2000);
    };

    const showButton = () => {
      setIsPlusButtonVisible(true);
      clearTimeout(timer);
      hideButton();
    };

    hideButton();

    window.addEventListener('scroll', showButton);
    return () => {
      window.removeEventListener('scroll', showButton);
      clearTimeout(timer);
    };
  }, []);

  // Enable horizontal scrolling with mouse wheel for any horizontally-overflowing ribbons on desktop
  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If user holds Shift, native browser already scrolls horizontally
      if (e.shiftKey || e.deltaY === 0) return;

      // Find closest ancestor with horizontal scroll capability
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        const isScrollableX =
          (overflowX === 'auto' || overflowX === 'scroll') &&
          el.scrollWidth > el.clientWidth;

        if (isScrollableX) {
          // Check if this is a horizontal strip (low height compared to width)
          const isHorizontalStrip = el.scrollHeight <= el.clientHeight + 20;
          const canScrollLeft = e.deltaY < 0 && el.scrollLeft > 0;
          const canScrollRight = e.deltaY > 0 && el.scrollLeft < el.scrollWidth - el.clientWidth - 1;

          if (isHorizontalStrip && (canScrollLeft || canScrollRight)) {
            el.scrollLeft += e.deltaY;
            e.preventDefault();
            return;
          }
        }
        el = el.parentElement;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'inbox':
        return <InboxManager />;
      case 'planner':
      case 'timeline':
      case 'calendar':
      case 'schedule':
        return <PlannerPage />;
      case 'medications':
        return <MedicationManager />;
      case 'tasks':
        return <TaskManager />;
      case 'habits':
        return <HabitTracker />;
      case 'goals':
        return <GoalsManager />;
      case 'bills':
        return <BillsManager />;
      case 'quotes':
        return <QuotesManager />;
      case 'journal':
        return <JournalManager />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsManager />;
      default:
        return <InboxManager />;
    }
  };

  return (
    <div className="h-[var(--app-height)] w-full max-w-full overflow-x-clip flex flex-col transition-colors selection:bg-indigo-500 selection:text-white compact-mode">
      {/* Top Navigation */}
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0 items-stretch">
        {/* Desktop Collapsible / Persistent Sidebar */}
        <Sidebar />

        {/* Main Application Canvas */}
        <main className={`flex-1 min-w-0 w-full max-w-full overflow-x-hidden ${activeTab === 'tasks' ? 'p-1 sm:p-2.5 pb-16 md:pb-6 flex flex-col' : 'p-1.5 sm:p-3 lg:p-3.5 pb-16 md:pb-6'}`}>
          <ErrorBoundary fallbackTitle="View Loading Error">
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating Global Focus Timer Bar */}
      <FocusBar />

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Widget Layout Customizer Modal */}
      <WidgetCustomizerModal />

      {/* Cloud & Local Backup Manager Modal */}
      <BackupModal />

      {/* User Profile & Display Name / Photo Modal */}
      <ProfileModal />

      {/* AI Assistant Chat Drawer */}
      <AIChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />

      {/* App Lock & Biometrics Screen (Overlays whole app when locked) */}
      <AppLockScreen />

      {/* Notification Center Drawer (Reminders & History) */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      {/* Global Interactive Alarm & Action Banner (Audible chime, Snooze & Mark Done) */}
      <ActiveAlarmBanner />

      {/* Central Projects, Goals & Tags Management Hub */}
      <EntitiesManagerModal
        isOpen={isEntitiesModalOpen}
        onClose={() => setIsEntitiesModalOpen(false)}
        initialTab={entitiesModalDefaultTab}
      />

      {/* Floating Quick Add Button (Bottom Right) */}
      {isPlusButtonVisible && (
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title={`Quick Add ${activeTab === 'habits' ? 'Habit' : 'Task'}`}
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* Activity Manager Quick Add Modal */}
      {isQuickAddOpen && (
        <ActivityManager
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          type={activeTab === 'habits' ? 'habit' : 'task'}
        />
      )}

      {/* In-App Toast Notifications Stack (High visibility top floating banner - highest z-index) */}
      <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-1 max-w-xs w-auto pointer-events-none px-2 sm:px-0">
        {notifications.slice(0, 3).map(notif => (
          <AutoDismissToast
            key={notif.id}
            notif={notif}
            onDismiss={dismissNotification}
            onOpenHistory={() => setIsNotificationDrawerOpen(true)}
          />
        ))}
      </div>

      {/* Global Undo Completion Snackbar (Appears for 3s upon task or habit completion) */}
      <UndoSnackbar />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ActiveSessionProvider>
        <AppContent />
      </ActiveSessionProvider>
    </AppProvider>
  );
}
