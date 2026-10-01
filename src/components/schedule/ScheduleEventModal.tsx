import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Tag, AlertCircle, MapPin, AlignLeft, CheckSquare, Link2, Bell, AlarmClock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Priority, ScheduleCategory, ScheduleItem, ReminderType } from '../../types';
import { UnifiedReminderConfig } from '../common/UnifiedReminderConfig';

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialHour?: string;
  editingItem?: ScheduleItem | null;
}

const CATEGORIES: { id: ScheduleCategory; label: string; color: string }[] = [
  { id: 'work', label: 'Work', color: 'bg-blue-500' },
  { id: 'meeting', label: 'Meeting', color: 'bg-purple-500' },
  { id: 'focus', label: 'Focus & Deep Work', color: 'bg-amber-500' },
  { id: 'errand', label: 'Errand', color: 'bg-emerald-500' },
  { id: 'health', label: 'Health & Wellness', color: 'bg-rose-500' },
  { id: 'personal', label: 'Personal', color: 'bg-cyan-500' },
  { id: 'routine', label: 'Routine', color: 'bg-slate-500' },
];

export const ScheduleEventModal: React.FC<ScheduleEventModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialHour,
  editingItem,
}) => {
  const { addScheduleItem, updateScheduleItem, tasks } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<ScheduleCategory>('work');
  const [priority, setPriority] = useState<Priority>('medium');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [taskId, setTaskId] = useState<string>('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>('notification');
  const [reminderTiming, setReminderTiming] = useState('on_time');
  const [repeatType, setRepeatType] = useState('none');
  const [repeatUntil, setRepeatUntil] = useState('forever');

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setDate(editingItem.date);
      setStartTime(editingItem.startTime);
      setEndTime(editingItem.endTime);
      setCategory(editingItem.category);
      setPriority(editingItem.priority);
      setLocation(editingItem.location || '');
      setNotes(editingItem.notes || '');
      setTaskId(editingItem.taskId || '');
      setIsAllDay(Boolean(editingItem.isAllDay));
      setReminderType(editingItem.reminderType || 'notification');
      setReminderTiming(editingItem.reminderTiming || 'on_time');
      setRepeatType(editingItem.repeatType || 'none');
      setRepeatUntil(editingItem.repeatUntil || 'forever');
    } else {
      setTitle('');
      setDate(initialDate || todayStr);
      const start = initialHour ? `${initialHour.padStart(2, '0')}:00` : '09:00';
      setStartTime(start);
      const startH = parseInt(start.split(':')[0], 10);
      const endH = String(Math.min(23, startH + 1)).padStart(2, '0');
      setEndTime(`${endH}:00`);
      setCategory('work');
      setPriority('medium');
      setLocation('');
      setNotes('');
      setTaskId('');
      setIsAllDay(false);
      setReminderType('notification');
      setReminderTiming('on_time');
      setRepeatType('none');
      setRepeatUntil('forever');
    }
  }, [editingItem, initialDate, initialHour, isOpen, todayStr]);

  if (!isOpen) return null;

  const handleSetDuration = (minutes: number) => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMins = h * 60 + m + minutes;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingItem) {
      updateScheduleItem({
        ...editingItem,
        title: title.trim(),
        date,
        startTime,
        endTime,
        category,
        priority,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        taskId: taskId || undefined,
        isAllDay,
        reminderType,
        reminderTiming,
        repeatType,
        repeatUntil,
      });
    } else {
      addScheduleItem({
        title: title.trim(),
        date,
        startTime,
        endTime,
        category,
        priority,
        completed: false,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        taskId: taskId || undefined,
        isAllDay,
        reminderType,
        reminderTiming,
        repeatType,
        repeatUntil,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingItem ? 'Edit Scheduled Event' : 'Schedule New Event or Block'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Event Title / Action *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Staff meeting, Submit project milestone..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date
                </span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Start Time
                </span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> End Time
                </span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quick duration:</span>
            {[30, 45, 60, 90, 120].map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => handleSetDuration(mins)}
                className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 transition"
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
          </div>

          {/* Unified Reminders & Alarms Config */}
          <UnifiedReminderConfig
            dueDate={date}
            dueTime={startTime}
            isAllDay={isAllDay}
            reminderTiming={reminderTiming}
            reminderType={reminderType}
            repeatType={repeatType}
            repeatUntil={repeatUntil}
            titleForTest={title.trim() || 'Scheduled Event'}
            sourceType="schedule"
            onChange={updates => {
              if (updates.dueDate !== undefined) setDate(updates.dueDate);
              if (updates.dueTime !== undefined) setStartTime(updates.dueTime);
              if (updates.isAllDay !== undefined) setIsAllDay(updates.isAllDay);
              if (updates.reminderTiming !== undefined) setReminderTiming(updates.reminderTiming);
              if (updates.reminderType !== undefined) setReminderType(updates.reminderType);
              if (updates.repeatType !== undefined) setRepeatType(updates.repeatType);
              if (updates.repeatUntil !== undefined) setRepeatUntil(updates.repeatUntil);
            }}
          />

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" /> Category
                </span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ScheduleCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-500" /> Priority Level
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'high' as Priority, label: 'High', style: 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' },
                    { id: 'medium' as Priority, label: 'Medium', style: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
                    { id: 'low' as Priority, label: 'Low', style: 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40' },
                  ]
                ).map(p => {
                  const isSelected = priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`py-1.5 rounded-xl border text-xs font-bold text-center transition ${
                        isSelected
                          ? `${p.style} ring-2 ring-indigo-500/20 shadow-2xs`
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Link to existing Task */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-indigo-500" /> Link to Task (Optional)
              </span>
            </label>
            <select
              value={taskId}
              onChange={e => {
                const selectedId = e.target.value;
                setTaskId(selectedId);
                const matched = tasks.find(t => t.id === selectedId);
                if (matched && !title) {
                  setTitle(matched.title);
                  setPriority(matched.priority);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None (Independent scheduled event)</option>
              {tasks
                .filter(t => !t.completed || t.id === taskId)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.priority} • {t.project})
                  </option>
                ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Location or Video Link
              </span>
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Google Meet, Conference Room 2, City Pet Clinic..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1">
                <AlignLeft className="w-3.5 h-3.5 text-indigo-500" /> Notes & Agenda
              </span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add agenda items, preparation checklist, or reference details..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition active:scale-95"
            >
              {editingItem ? 'Save Changes' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
