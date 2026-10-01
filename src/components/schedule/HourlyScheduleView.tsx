import React, { useMemo, useState } from 'react';
import { Clock, Plus, Check, Play, Edit2, Trash2, MapPin, AlignLeft, Link2, SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { ScheduleItem } from '../../types';
import { useApp } from '../../context/AppContext';

interface HourlyScheduleViewProps {
  selectedDate: string;
  items: ScheduleItem[];
  onAddAtHour: (hour: string) => void;
  onEditItem: (item: ScheduleItem) => void;
}

const formatHourLabel = (h24: string): string => {
  const num = parseInt(h24, 10);
  if (num === 0) return '12:00 AM';
  if (num < 12) return `${String(num).padStart(2, '0')}:00 AM`;
  if (num === 12) return '12:00 PM';
  return `${String(num - 12).padStart(2, '0')}:00 PM`;
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  work: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-900 dark:text-blue-200 font-semibold', border: 'border-blue-200 dark:border-blue-800' },
  meeting: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-900 dark:text-purple-200 font-semibold', border: 'border-purple-200 dark:border-purple-800' },
  focus: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-950 dark:text-amber-200 font-semibold', border: 'border-amber-300 dark:border-amber-800' },
  errand: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-900 dark:text-emerald-200 font-semibold', border: 'border-emerald-300 dark:border-emerald-800' },
  health: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-900 dark:text-rose-200 font-semibold', border: 'border-rose-200 dark:border-rose-800' },
  personal: { bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-900 dark:text-cyan-200 font-semibold', border: 'border-cyan-200 dark:border-cyan-800' },
  routine: { bg: 'bg-slate-100 dark:bg-slate-800/80', text: 'text-slate-900 dark:text-slate-200 font-semibold', border: 'border-slate-300 dark:border-slate-700' },
};

const PRIORITY_DOTS: Record<string, string> = {
  P1: 'bg-rose-500 ring-rose-300 dark:ring-rose-900',
  P2: 'bg-amber-500 ring-amber-300 dark:ring-amber-900',
  P3: 'bg-indigo-500 ring-indigo-300 dark:ring-indigo-900',
  P4: 'bg-slate-400 ring-slate-200 dark:ring-slate-700',
};

export const HourlyScheduleView: React.FC<HourlyScheduleViewProps> = ({
  selectedDate,
  items,
  onAddAtHour,
  onEditItem,
}) => {
  const {
    toggleScheduleItem,
    deleteScheduleItem,
    startPomodoro,
    setPomodoroTask,
    scheduleStartHour,
    setScheduleStartHour,
    scheduleEndHour,
    setScheduleEndHour,
    addEarlierScheduleHour,
    removeEarlierScheduleHour,
    addLaterScheduleHour,
    removeLaterScheduleHour,
    setScheduleTimingPreset,
  } = useApp();

  const [showTimingCustomizer, setShowTimingCustomizer] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMinute = now.getMinutes();

  // Dynamically generate hours array from scheduleStartHour to scheduleEndHour
  const hours = useMemo(() => {
    const list: string[] = [];
    for (let h = scheduleStartHour; h <= scheduleEndHour; h++) {
      list.push(String(h).padStart(2, '0'));
    }
    return list;
  }, [scheduleStartHour, scheduleEndHour]);

  // Group items by their starting hour
  const itemsByHour: Record<string, ScheduleItem[]> = {};
  items.forEach(item => {
    const h = item.startTime.split(':')[0];
    if (!itemsByHour[h]) itemsByHour[h] = [];
    itemsByHour[h].push(item);
  });

  const handleStartFocus = (item: ScheduleItem) => {
    if (item.taskId) {
      setPomodoroTask(item.taskId);
    }
    startPomodoro();
  };

  const startLabel = formatHourLabel(String(scheduleStartHour).padStart(2, '0'));
  const endLabel = formatHourLabel(String(scheduleEndHour).padStart(2, '0'));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Hourly Timeline Plan ({startLabel} – {endLabel})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {items.length} {items.length === 1 ? 'block' : 'blocks'} scheduled
          </span>

          <button
            type="button"
            onClick={() => setShowTimingCustomizer(prev => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
            title="Adjust schedule timing range"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Customize Timing</span>
          </button>
        </div>
      </div>

      {/* Expandable Timing Toolbar */}
      {showTimingCustomizer && (
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">Preset Timings:</span>
            <button
              type="button"
              onClick={() => setScheduleTimingPreset('standard')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                scheduleStartHour === 6 && scheduleEndHour === 22
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              6 AM – 10 PM (Standard)
            </button>
            <button
              type="button"
              onClick={() => setScheduleTimingPreset('workday')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                scheduleStartHour === 8 && scheduleEndHour === 20
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              8 AM – 8 PM (Workday)
            </button>
            <button
              type="button"
              onClick={() => setScheduleTimingPreset('early')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                scheduleStartHour === 5 && scheduleEndHour === 21
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              5 AM – 9 PM (Early Bird)
            </button>
            <button
              type="button"
              onClick={() => setScheduleTimingPreset('night')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                scheduleStartHour === 9 && scheduleEndHour === 23
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              9 AM – 11 PM (Late)
            </button>
            <button
              type="button"
              onClick={() => setScheduleTimingPreset('24h')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                scheduleStartHour === 0 && scheduleEndHour === 23
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              24 Hours
            </button>
          </div>

          {/* Exact selector dropdowns */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Start:</span>
              <select
                aria-label="Schedule start time"
                value={scheduleStartHour}
                onChange={e => setScheduleStartHour(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={`h_start_${i}`} value={i} disabled={i >= scheduleEndHour}>
                    {formatHourLabel(String(i).padStart(2, '0'))}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">End:</span>
              <select
                aria-label="Schedule end time"
                value={scheduleEndHour}
                onChange={e => setScheduleEndHour(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={`h_end_${i}`} value={i} disabled={i <= scheduleStartHour}>
                    {formatHourLabel(String(i).padStart(2, '0'))}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Top action row: Add earlier hour */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={addEarlierScheduleHour}
          disabled={scheduleStartHour <= 0}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Add 1 hour earlier to schedule"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add earlier hour ({formatHourLabel(String(Math.max(0, scheduleStartHour - 1)).padStart(2, '0'))})</span>
        </button>

        {scheduleStartHour < scheduleEndHour - 1 && (
          <button
            type="button"
            onClick={removeEarlierScheduleHour}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-[11px]"
            title="Remove earliest hour slot"
          >
            <span>Remove {startLabel}</span>
          </button>
        )}
      </div>

      {/* Hourly Grid Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {hours.map(hour => {
          const hourItems = itemsByHour[hour] || [];
          const isCurrentHourSlot = isToday && hour === currentHour;
          const label = formatHourLabel(hour);

          return (
            <div
              key={hour}
              className={`flex flex-col sm:flex-row group relative transition-colors ${
                isCurrentHourSlot ? 'bg-indigo-50/40 dark:bg-indigo-950/15' : 'hover:bg-slate-50/50 dark:hover:bg-slate-850/30'
              }`}
            >
              {/* Current Time Indicator Line */}
              {isCurrentHourSlot && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                  style={{ top: `${(currentMinute / 60) * 100}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-200 dark:ring-rose-950 -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-rose-500 shadow-xs" />
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded mr-2 border border-rose-200 dark:border-rose-900">
                    Now
                  </span>
                </div>
              )}

              {/* Time Column */}
              <div className="w-full sm:w-28 p-3 sm:py-3.5 sm:px-4 shrink-0 flex items-center sm:items-start justify-between sm:justify-start border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20">
                <span
                  className={`text-xs font-bold tracking-tight ${
                    isCurrentHourSlot
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => onAddAtHour(hour)}
                  className="sm:hidden p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title={`Add event at ${label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Events in this hour slot */}
              <div className="flex-1 p-2.5 sm:p-3 min-h-[56px] flex flex-col justify-center">
                {hourItems.length > 0 ? (
                  <div className="space-y-2">
                    {hourItems.map(item => {
                      const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.routine;
                      const isItemActiveNow =
                        isToday &&
                        item.startTime <= `${currentHour}:${String(currentMinute).padStart(2, '0')}` &&
                        item.endTime > `${currentHour}:${String(currentMinute).padStart(2, '0')}`;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-2.5 sm:p-3 transition-all ${
                            colors.bg
                          } ${colors.border} ${
                            item.completed ? 'opacity-65' : ''
                          } ${
                            isItemActiveNow ? 'ring-2 ring-indigo-500/60 shadow-xs' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            {/* Checkbox & Title */}
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleScheduleItem(item.id)}
                                className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                  item.completed
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 bg-white dark:bg-slate-800'
                                }`}
                              >
                                {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span
                                    className={`w-2 h-2 rounded-full ring-2 ${
                                      PRIORITY_DOTS[item.priority] || PRIORITY_DOTS.P2
                                    }`}
                                    title={`Priority: ${item.priority}`}
                                  />
                                  <span
                                    className={`text-xs sm:text-sm font-semibold truncate ${
                                      item.completed
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-900 dark:text-slate-100'
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                    {item.startTime} – {item.endTime}
                                  </span>
                                  <span className="capitalize px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-semibold">
                                    {item.category}
                                  </span>
                                  {item.location && (
                                    <span className="flex items-center gap-0.5 truncate">
                                      <MapPin className="w-3 h-3" />
                                      <span>{item.location}</span>
                                    </span>
                                  )}
                                  {item.taskId && (
                                    <span className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400" title="Linked to task">
                                      <Link2 className="w-3 h-3" />
                                      <span>Task</span>
                                    </span>
                                  )}
                                </div>

                                {item.notes && (
                                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions on Event */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartFocus(item)}
                                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/80 dark:bg-slate-800/80 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                                title="Start Focus Timer on this block"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Focus</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditItem(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition"
                                title="Edit event"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteScheduleItem(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 transition"
                                title="Delete event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-600 py-1">
                    <span className="italic text-[11px] text-slate-400 dark:text-slate-600">Open slot</span>
                    <button
                      type="button"
                      onClick={() => onAddAtHour(hour)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule at {label}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom action row: Add later hour */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={addLaterScheduleHour}
          disabled={scheduleEndHour >= 23}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Add 1 hour later to schedule"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add later hour ({formatHourLabel(String(Math.min(23, scheduleEndHour + 1)).padStart(2, '0'))})</span>
        </button>

        {scheduleEndHour > scheduleStartHour + 1 && (
          <button
            type="button"
            onClick={removeLaterScheduleHour}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-[11px]"
            title="Remove latest hour slot"
          >
            <span>Remove {endLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
