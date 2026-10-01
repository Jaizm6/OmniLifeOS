import React, { useState } from 'react';
import { Plus, Check, Clock, Trash2, ChevronDown, ChevronUp, Sparkles, Sun, Moon, Heart } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Routine, RoutineItem } from '../../types';
import { IconRenderer } from '../common/IconRenderer';

export const HabitsRoutineSection: React.FC = () => {
  const { routines, toggleRoutineItem, addRoutineItem, deleteRoutineItem } = useApp();
  const [collapsedRoutines, setCollapsedRoutines] = useState<Record<string, boolean>>({});
  const [addingToRoutineId, setAddingToRoutineId] = useState<string | null>(null);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newDuration, setNewDuration] = useState<number | undefined>(undefined);
  const [newIcon, setNewIcon] = useState('✨');

  const toggleCollapse = (id: string) => {
    setCollapsedRoutines(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateItem = (routineId: string) => {
    if (!newTitle.trim()) return;
    addRoutineItem(routineId, {
      title: newTitle.trim(),
      icon: newIcon,
      scheduledTime: newTime,
      durationMinutes: newDuration ? Number(newDuration) : undefined,
    });
    setNewTitle('');
    setAddingToRoutineId(null);
  };

  const getRoutineIcon = (r: Routine) => {
    if (r.timeOfDay === 'morning') return <Sun className="w-5 h-5 text-amber-500" />;
    if (r.timeOfDay === 'evening') return <Moon className="w-5 h-5 text-indigo-400" />;
    return <Heart className="w-5 h-5 text-rose-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 p-4 sm:p-5 rounded-3xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Daily Routines & Rituals
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Build unshakeable momentum with structured morning, evening, and self-care flow states.
          </p>
        </div>
      </div>

      {/* Routine Cards List */}
      <div className="space-y-4">
        {routines.map(routine => {
          const completedCount = routine.items.filter(i => i.completed).length;
          const totalCount = routine.items.length;
          const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const isCollapsed = collapsedRoutines[routine.id] || false;

          return (
            <div
              key={routine.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-xs transition-all hover:border-emerald-500/40"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    <IconRenderer icon={routine.icon} className="w-5 h-5" fallback={getRoutineIcon(routine)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {routine.name}
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {completedCount}/{totalCount}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleCollapse(routine.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title={isCollapsed ? 'Expand routine' : 'Collapse routine'}
                  >
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Items List */}
              {!isCollapsed && (
                <div className="mt-5 space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  {routine.items.map(item => (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        item.completed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 text-slate-500'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => toggleRoutineItem(routine.id, item.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                            item.completed
                              ? 'bg-emerald-500 text-white shadow-2xs'
                              : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm shrink-0">
                          <IconRenderer icon={item.icon} className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fallback="✨" />
                        </div>

                        <span
                          className={`text-sm font-medium truncate ${
                            item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {item.scheduledTime && (
                          <span className="font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                            {item.scheduledTime}
                          </span>
                        )}
                        {item.durationMinutes && (
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            {item.durationMinutes}m
                          </span>
                        )}
                        <button
                          onClick={() => deleteRoutineItem(routine.id, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Task Toggle */}
                  {addingToRoutineId === routine.id ? (
                    <div className="p-4 rounded-2xl border border-emerald-500/40 bg-slate-50 dark:bg-slate-800/60 mt-3 space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Add New Routine Task
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Task name (e.g. 5m stretch)"
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          className="sm:col-span-2 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="time"
                          value={newTime}
                          onChange={e => setNewTime(e.target.value)}
                          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Mins (opt)"
                            value={newDuration || ''}
                            onChange={e => setNewDuration(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-1/2 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                          <div className="w-1/2 flex items-center gap-1">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm shrink-0">
                              <IconRenderer icon={newIcon} className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fallback="✨" />
                            </div>
                            <input
                              type="text"
                              placeholder="Icon"
                              value={newIcon}
                              onChange={e => setNewIcon(e.target.value)}
                              className="flex-1 px-2 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5">
                          {['💧', '⏰', '🧘', '📖', '📝', '🧴', '🥗', '😴', '✨'].map(emo => (
                            <button
                              key={emo}
                              type="button"
                              onClick={() => setNewIcon(emo)}
                              className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center border transition ${
                                newIcon === emo
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 scale-105'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {emo}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingToRoutineId(null)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateItem(routine.id)}
                          className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                        >
                          Add Task
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToRoutineId(routine.id)}
                      className="w-full py-2.5 mt-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Task to {routine.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
