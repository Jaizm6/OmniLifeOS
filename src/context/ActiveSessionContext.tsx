import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ActiveSessionType = 'task' | 'habit' | null;
export type ActiveTimerMode = 'focus' | 'stopwatch' | null;

export interface ActiveSessionState {
  activeId: string | null;
  type: ActiveSessionType;
  title: string;
  timerMode: ActiveTimerMode;
  isRunning: boolean;
  timeRemaining: number; // For focus (seconds)
  timeElapsed: number; // For stopwatch (seconds)
  initialDuration: number;
}

interface ActiveSessionContextType {
  session: ActiveSessionState;
  startSession: (id: string, type: ActiveSessionType, title: string, timerMode: ActiveTimerMode, duration?: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  updateTime: (updater: (prev: ActiveSessionState) => ActiveSessionState) => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextType | undefined>(undefined);

export const ActiveSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ActiveSessionState>(() => {
    try {
      const saved = localStorage.getItem('omni_active_session');
      return saved ? JSON.parse(saved) : {
        activeId: null,
        type: null,
        title: '',
        timerMode: null,
        isRunning: false,
        timeRemaining: 25 * 60,
        timeElapsed: 0,
        initialDuration: 25 * 60,
      };
    } catch {
      return {
        activeId: null,
        type: null,
        title: '',
        timerMode: null,
        isRunning: false,
        timeRemaining: 25 * 60,
        timeElapsed: 0,
        initialDuration: 25 * 60,
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('omni_active_session', JSON.stringify(session));
    } catch {}
  }, [session]);

  // Timer interval
  useEffect(() => {
    if (!session.isRunning) return;

    const interval = setInterval(() => {
      setSession(prev => {
        if (!prev.isRunning) return prev;
        if (prev.timerMode === 'focus') {
          if (prev.timeRemaining <= 1) {
            return { ...prev, timeRemaining: 0, isRunning: false };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        } else if (prev.timerMode === 'stopwatch') {
          return { ...prev, timeElapsed: prev.timeElapsed + 1 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.isRunning, session.timerMode]);

  const startSession = (id: string, type: ActiveSessionType, title: string, timerMode: ActiveTimerMode, duration: number = 25 * 60) => {
    // Cleanly terminate existing timer
    setSession({
      activeId: null,
      type: null,
      title: '',
      timerMode: null,
      isRunning: false,
      timeRemaining: 25 * 60,
      timeElapsed: 0,
      initialDuration: 25 * 60,
    });
    
    // Start new timer with immediate effect
    setTimeout(() => {
      setSession({
        activeId: id,
        type,
        title,
        timerMode,
        isRunning: true,
        timeRemaining: timerMode === 'focus' ? duration : 0,
        timeElapsed: 0,
        initialDuration: duration,
      });
    }, 0);
  };

  const pauseSession = () => {
    setSession(prev => ({ ...prev, isRunning: false }));
  };

  const resumeSession = () => {
    setSession(prev => ({ ...prev, isRunning: true }));
  };

  const stopSession = () => {
    setSession({
      activeId: null,
      type: null,
      title: '',
      timerMode: null,
      isRunning: false,
      timeRemaining: 25 * 60,
      timeElapsed: 0,
      initialDuration: 25 * 60,
    });
  };

  const updateTime = (updater: (prev: ActiveSessionState) => ActiveSessionState) => {
    setSession(updater);
  };

  return (
    <ActiveSessionContext.Provider value={{ session, startSession, pauseSession, resumeSession, stopSession, updateTime }}>
      {children}
    </ActiveSessionContext.Provider>
  );
};

export const useActiveSession = () => {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error('useActiveSession must be used within an ActiveSessionProvider');
  }
  return context;
};
