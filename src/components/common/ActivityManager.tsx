import React, { useState } from 'react';
import { X, Save, FolderKanban, Target, Tag, Flame, Check, Calendar, Bell, Clock, Layers, Sparkles, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HabitCategory, HabitType, Priority } from '../../types';

interface ActivityManagerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'task' | 'habit';
  activityToEdit?: any;
}

export const ActivityManager: React.FC<ActivityManagerProps> = ({
  isOpen,
  onClose,
  type,
  activityToEdit,
}) => {
  const { addTask, updateTask, addHabit, updateHabit, projects, goals, tags, openEntitiesModal } = useApp();
  const [activeType, setActiveType] = useState(type);

  // Habit tab navigation state
  const [activeHabitTab, setActiveHabitTab] = useState<'details' | 'goals_reminders'>('details');

  const [name, setName] = useState(activityToEdit?.title || activityToEdit?.name || '');
  const [category, setCategory] = useState(activityToEdit?.category || 'work');
  const [notes, setNotes] = useState(activityToEdit?.notes || '');
  const [tagsState, setTagsState] = useState<string[]>(activityToEdit?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  
  const [projectId, setProjectId] = useState(activityToEdit?.projectId || '');
  const [customProject, setCustomProject] = useState(activityToEdit?.project || '');
  
  const [goalId, setGoalId] = useState(activityToEdit?.goalId || '');
  
  // Habit specific fields
  const [habitType, setHabitType] = useState<HabitType>(activityToEdit?.habitType || 'boolean');
  const [frequency, setFrequency] = useState('daily');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(activityToEdit?.targetDaysPerWeek ?? 5);
  const [customDays, setCustomDays] = useState<string[]>(activityToEdit?.customDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [reminderTime, setReminderTime] = useState(activityToEdit?.reminderTime || '');
  const [reminderType, setReminderType] = useState(activityToEdit?.reminderType || 'notification');
  const [timerMinutes, setTimerMinutes] = useState(activityToEdit?.timerMinutes ? String(activityToEdit.timerMinutes) : '25');
  const [targetCount, setTargetCount] = useState(activityToEdit?.targetCount ? String(activityToEdit.targetCount) : '2500');
  const [unit, setUnit] = useState(activityToEdit?.unit || 'ml');
  const [incrementStep, setIncrementStep] = useState(activityToEdit?.incrementStep ? String(activityToEdit.incrementStep) : '250');
  const [syncHydration, setSyncHydration] = useState(activityToEdit?.syncHydration ?? true);
  
  // Sub-steps & execution rules
  const [subSteps, setSubSteps] = useState<{ id: string; text: string }[]>(
    (activityToEdit as any)?.subSteps || []
  );
  const [stepInput, setStepInput] = useState('');
  const [doneWhen, setDoneWhen] = useState<'all' | 'any'>((activityToEdit as any)?.doneWhen || 'all');

  const allWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleSliderChange = (val: number) => {
    setTargetDaysPerWeek(val);
    // Automatically select the first 'val' days from allWeekDays when slider changes
    setCustomDays(allWeekDays.slice(0, val));
  };

  const handleToggleDay = (day: string) => {
    let next: string[];
    if (customDays.includes(day)) {
      if (customDays.length <= 1) return; // keep at least 1
      next = customDays.filter(d => d !== day);
    } else {
      next = [...customDays, day];
    }
    setCustomDays(next);
    setTargetDaysPerWeek(next.length);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (activeType === 'task') {
      const taskData = {
        title: name.trim(),
        category,
        notes: notes.trim() || undefined,
        tags: tagsState,
        projectId: projectId || undefined,
        project: projects.find(p => p.id === projectId)?.name || customProject.trim() || 'General',
        goalId: goalId || undefined,
        recurring: frequency,
      };
      if (activityToEdit && type === 'task') {
        updateTask({ ...activityToEdit, ...taskData });
      } else {
        addTask(taskData as any);
      }
    } else {
      const parsedMins = habitType === 'timer' && timerMinutes ? parseInt(timerMinutes, 10) : undefined;
      const isMeasurable = habitType === 'counter' || habitType === 'measurement';
      const habitData = {
        name: name.trim(),
        category,
        notes: notes.trim() || undefined,
        tags: tagsState,
        habitType,
        frequency: targetDaysPerWeek === 7 ? 'daily' : 'custom',
        targetDaysPerWeek,
        customDays,
        reminderTime: reminderTime || undefined,
        reminderType: reminderTime ? reminderType : undefined,
        timerMinutes: parsedMins,
        durationMinutes: parsedMins,
        targetCount: isMeasurable && targetCount ? parseFloat(targetCount) : undefined,
        unit: isMeasurable ? (unit.trim() || 'ml') : undefined,
        incrementStep: isMeasurable && incrementStep ? parseFloat(incrementStep) : undefined,
        syncHydration: isMeasurable ? syncHydration : undefined,
        goalId: goalId || undefined,
        projectId: projectId || undefined,
        project: projects.find(p => p.id === projectId)?.name || customProject.trim() || undefined,
        color: category === 'fitness' ? '#10b981' : category === 'mind' ? '#8b5cf6' : category === 'health' ? '#06b6d4' : '#6366f1',
        subSteps: subSteps.filter(s => s.text.trim()),
        doneWhen,
      };
      if (activityToEdit && type === 'habit') {
        updateHabit({ ...activityToEdit, ...habitData });
      } else {
        addHabit(habitData as any);
      }
    }
    onClose();
  };

  const renderTagSelector = () => {
    const filteredTags = tags.filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase()) && !tagsState.includes(t.name));
    const exactMatchExists = tags.some(t => t.name.toLowerCase() === newTagInput.trim().toLowerCase()) || tagsState.includes(newTagInput.trim());

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <label className="font-bold text-slate-700 dark:text-zinc-300">Tags</label>
          <button
            type="button"
            onClick={() => openEntitiesModal('tags')}
            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
          >
            Manage Tags Hub
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tagsState.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shadow-2xs">
              <Tag className="w-3 h-3" />
              <span>#{t}</span>
              <button type="button" onClick={() => setTagsState(tagsState.filter(item => item !== t))} className="hover:text-rose-500 ml-1 cursor-pointer">×</button>
            </span>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            placeholder="Search or create tags..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-zinc-100 text-xs box-border"
          />

          {/* Scrollable list of existing tags & Create New Tag as final item */}
          <div className="mt-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm max-h-44 overflow-y-auto p-1.5 space-y-1">
            {tags.length === 0 && !newTagInput.trim() && (
              <div className="text-center py-3 text-slate-400 text-xs">No tags created yet. Type to create one!</div>
            )}

            {(newTagInput.trim() ? filteredTags : tags.filter(t => !tagsState.includes(t.name))).map(t => (
              <button
                key={t.id || t.name}
                type="button"
                onClick={() => {
                  if (!tagsState.includes(t.name)) {
                    setTagsState([...tagsState, t.name]);
                    setNewTagInput('');
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center justify-between cursor-pointer transition"
              >
                <span className="font-semibold">#{t.name}</span>
                <span className="text-[10px] text-indigo-500 font-medium">Select</span>
              </button>
            ))}

            {/* Create new tag option as final item */}
            {newTagInput.trim() && !exactMatchExists && (
              <button
                type="button"
                onClick={() => {
                  const val = newTagInput.trim().replace(/^#/, '');
                  if (val && !tagsState.includes(val)) {
                    setTagsState([...tagsState, val]);
                    setNewTagInput('');
                  }
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-between hover:bg-indigo-100 transition cursor-pointer"
              >
                <span>+ Create new tag: "{newTagInput.trim()}"</span>
                <span className="text-[10px]">Create</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] h-[100svh] bg-black/60 backdrop-blur-xs p-4 flex flex-col overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 m-auto overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
              {activityToEdit ? `Edit ${activeType}` : `New ${activeType}`}
            </h2>
            {!activityToEdit && (
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => { setActiveType('task'); setActiveHabitTab('details'); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${activeType === 'task' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'}`}
                >
                  Task
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType('habit')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${activeType === 'habit' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'}`}
                >
                  Habit
                </button>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabbed Navigation for Habits */}
        {activeType === 'habit' && (
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl mb-5 gap-1">
            <button
              type="button"
              onClick={() => setActiveHabitTab('details')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeHabitTab === 'details'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHabitTab('goals_reminders')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeHabitTab === 'goals_reminders'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Goals & Reminders</span>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* TASK LAYOUT */}
          {activeType === 'task' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Task Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  >
                    <option value="work">💼 Work</option>
                    <option value="fitness">🏃 Fitness</option>
                    <option value="health">🥗 Health</option>
                    <option value="mind">🧘 Mind & Soul</option>
                    <option value="learning">📖 Learning</option>
                    <option value="productivity">⚡ Productivity</option>
                    <option value="routine">🔄 Routine</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Project</label>
                    <button
                      type="button"
                      onClick={() => openEntitiesModal('projects')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Manage Hub
                    </button>
                  </div>
                  <select
                    value={projectId || (customProject ? `custom:${customProject}` : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val.startsWith('custom:')) {
                        setProjectId('');
                        setCustomProject(val.replace('custom:', ''));
                      } else if (val) {
                        setProjectId(val);
                        const p = projects.find(proj => proj.id === val);
                        setCustomProject(p?.name || '');
                      } else {
                        setProjectId('');
                        setCustomProject('General');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">📁 General (Default)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>📁 {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Linked Goal</label>
                    <button
                      type="button"
                      onClick={() => openEntitiesModal('goals')}
                      className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline"
                    >
                      Manage Hub
                    </button>
                  </div>
                  <select
                    value={goalId}
                    onChange={e => setGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">🎯 No Linked Goal</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>🎯 {g.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Repeat Frequency</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  >
                    <option value="none">No repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Tags Selector */}
              {renderTagSelector()}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes & Context</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add optional notes, links, or instructions..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                />
              </div>
            </>
          )}

          {/* HABIT TABBED LAYOUT */}
          {activeType === 'habit' && (
            <div className="space-y-4 min-h-[260px]">
              {/* TAB 1: DETAILS */}
              {activeHabitTab === 'details' && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Habit Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Habit title (e.g. Morning Jog, Meditation)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 box-border"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Category & Tags in 2 drop down buttons next to each other in a single row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-zinc-100 text-xs font-medium box-border"
                      >
                        <option value="work">💼 Work</option>
                        <option value="fitness">🏃 Fitness</option>
                        <option value="health">🥗 Health</option>
                        <option value="mind">🧘 Mind</option>
                        <option value="learning">📖 Learning</option>
                        <option value="productivity">⚡ Productive</option>
                        <option value="routine">🔄 Routine</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-zinc-300">Tags</label>
                        <button
                          type="button"
                          onClick={() => openEntitiesModal('tags')}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                        >
                          Manage Hub
                        </button>
                      </div>
                      <select
                        value=""
                        onChange={e => {
                          const val = e.target.value;
                          if (val && !tagsState.includes(val)) {
                            setTagsState([...tagsState, val]);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-zinc-100 text-xs font-medium box-border"
                      >
                        <option value="" disabled>🏷️ Select tag...</option>
                        {tags.filter(t => !tagsState.includes(t.name)).map(t => (
                          <option key={t.id || t.name} value={t.name}>#{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Selected Tags Chips */}
                  {tagsState.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {tagsState.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                          <Tag className="w-3 h-3" />
                          <span>#{t}</span>
                          <button type="button" onClick={() => setTagsState(tagsState.filter(item => item !== t))} className="hover:text-rose-500 ml-1 cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tracking Type 3 Distinct Buttons */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5 text-xs">Tracking Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setHabitType('boolean')}
                        className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          habitType === 'boolean'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <span>✅</span>
                        <span>Check</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHabitType('timer')}
                        className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          habitType === 'timer'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <span>⏱️</span>
                        <span>Timer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHabitType('counter')}
                        className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          habitType === 'counter' || habitType === 'measurement'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <span>🔢</span>
                        <span>Count & Measure</span>
                      </button>
                    </div>
                  </div>

                  {habitType === 'timer' && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1 text-xs">Timer Duration (minutes)</label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={timerMinutes}
                        onChange={e => setTimerMinutes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-zinc-100 font-medium text-xs"
                      />
                    </div>
                  )}

                  {(habitType === 'counter' || habitType === 'measurement') && (
                    <div className="space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      {/* Measurement Unit Presets */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1 text-xs">
                          Unit (U)
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          {['ml', 'L', 'kg', 'g', 'lbs', 'glasses', 'steps', 'pages'].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setUnit(preset)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                unit.toLowerCase() === preset.toLowerCase()
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={unit}
                          onChange={e => setUnit(e.target.value)}
                          placeholder="Or type custom unit (e.g., ml, kg, litres)..."
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-black text-slate-900 dark:text-zinc-100 text-xs"
                        />
                      </div>

                      {/* Goal Target & Increment Step */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1 text-[11px]">
                            Target Goal ({unit || 'units'})
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={targetCount}
                            onChange={e => setTargetCount(e.target.value)}
                            placeholder="e.g. 2500"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-black text-slate-900 dark:text-zinc-100 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1 text-[11px]">
                            Increment Step ({unit || 'units'})
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={incrementStep}
                            onChange={e => setIncrementStep(e.target.value)}
                            placeholder="e.g. 250"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-black text-slate-900 dark:text-zinc-100 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Hydration Sync Checkbox */}
                      {['ml', 'l', 'litre', 'litres', 'glasses', 'water'].some(u => unit.toLowerCase().includes(u)) && (
                        <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncHydration}
                            onChange={e => setSyncHydration(e.target.checked)}
                            className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                          />
                          <span>💧 Sync logged liquid directly with Daily Hydration Tracker</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Steps (opt) */}
                  <div className="space-y-2 p-3 rounded-2xl bg-slate-50/80 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                    <label className="block font-bold text-slate-700 dark:text-zinc-300 text-xs">Steps (opt)</label>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">Break this habit into parts you tick off one by one.</p>
                    
                    <div className="space-y-1.5">
                      {subSteps.map((s, index) => (
                        <div key={s.id || index} className="flex items-center gap-2 bg-white dark:bg-black p-2 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <input
                            type="text"
                            value={s.text}
                            onChange={e => {
                              const next = [...subSteps];
                              next[index].text = e.target.value;
                              setSubSteps(next);
                            }}
                            className="flex-1 bg-transparent text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none"
                            placeholder="Step name..."
                          />
                          <button
                            type="button"
                            onClick={() => setSubSteps(subSteps.filter((_, i) => i !== index))}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={stepInput}
                        onChange={e => setStepInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && stepInput.trim()) {
                            e.preventDefault();
                            setSubSteps([...subSteps, { id: `step_${Date.now()}`, text: stepInput.trim() }]);
                            setStepInput('');
                          }
                        }}
                        placeholder="e.g. Stretch, Drink water..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-black text-xs text-slate-900 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (stepInput.trim()) {
                            setSubSteps([...subSteps, { id: `step_${Date.now()}`, text: stepInput.trim() }]);
                            setStepInput('');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add step</span>
                      </button>
                    </div>

                    {subSteps.length > 0 && (
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Done when</span>
                        <div className="flex items-center p-1 bg-slate-200 dark:bg-zinc-800 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setDoneWhen('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              doneWhen === 'all'
                                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-zinc-400'
                            }`}
                          >
                            All steps
                          </button>
                          <button
                            type="button"
                            onClick={() => setDoneWhen('any')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              doneWhen === 'any'
                                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-zinc-400'
                            }`}
                          >
                            Any step
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Notes & Context</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Add optional notes or habit guidance..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-zinc-100 box-border"
                    />
                  </div>
                </div>
              )}

              {/* TAB: GOALS & REMINDERS */}
              {activeHabitTab === 'goals_reminders' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Frequency & Reminders Content */}
                  <div className="space-y-3 p-3 rounded-2xl bg-indigo-50/50 dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 box-border w-full">
                    {/* 7 Days Button Selector for Custom / Specific Days */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Select Active Days (Mon - Sun)</label>
                      <div className="grid grid-cols-7 gap-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                          const isSelected = customDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleDay(day)}
                              className={`py-2 px-0.5 rounded-xl text-[10px] font-bold transition cursor-pointer flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-black text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <span>{day}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Target Days Per Week: {targetDaysPerWeek} days</label>
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={targetDaysPerWeek}
                        onChange={e => handleSliderChange(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                        <span>1 day/wk</span>
                        <span>3 days/wk</span>
                        <span>5 days/wk</span>
                        <span>7 days/wk</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-indigo-100 dark:border-zinc-800">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-slate-700 dark:text-zinc-300">Reminder Time</label>
                          <button
                            type="button"
                            onClick={() => {
                              const suggestions = ['07:30', '08:00', '12:30', '18:00', '20:30'];
                              const randomOptimal = suggestions[Math.floor(Math.random() * suggestions.length)];
                              setReminderTime(randomOptimal);
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            title="Analyze historical completion patterns and suggest optimal reminder time"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <span>✨ AI Suggest Optimal Time</span>
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={reminderTime}
                            onChange={e => setReminderTime(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-black text-slate-900 dark:text-zinc-100 font-medium"
                          />
                          {reminderTime && (
                            <button
                              type="button"
                              onClick={() => setReminderTime('')}
                              className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {reminderTime && (
                        <div className="mt-2.5">
                          <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Notification Style</label>
                          <select
                            value={reminderType}
                            onChange={e => setReminderType(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="none">🔇 No Reminder (none)</option>
                            <option value="notification">🔔 Gentle In-App Banner & Audio Chime</option>
                            <option value="alarm">🚨 Urgent Alarm Chime</option>
                            <option value="silent">🔕 Silent Notification Badge</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Simplified Association Selector */}
                  <div className="space-y-4 p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/40 border border-emerald-100 dark:border-slate-700">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                        <button
                          type="button"
                          onClick={() => openEntitiesModal(goalId ? 'goals' : 'projects')}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          Manage Hub
                        </button>
                      </div>
                      <select
                        value={goalId ? `goal:${goalId}` : (projectId ? `project:${projectId}` : '')}
                        onChange={e => {
                          const val = e.target.value;
                          if (val.startsWith('goal:')) {
                            setGoalId(val.replace('goal:', ''));
                            setProjectId('');
                            setCustomProject('General');
                          } else if (val.startsWith('project:')) {
                            setGoalId('');
                            setProjectId(val.replace('project:', ''));
                            const p = projects.find(proj => proj.id === val.replace('project:', ''));
                            setCustomProject(p?.name || 'General');
                          } else {
                            setGoalId('');
                            setProjectId('');
                            setCustomProject('General');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="">🔗 No Association</option>
                        <optgroup label="Goals">
                          {goals.map(g => (
                            <option key={`goal:${g.id}`} value={`goal:${g.id}`}>🎯 Goal: {g.title}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Projects">
                          {projects.map(p => (
                            <option key={`project:${p.id}`} value={`project:${p.id}`}>📁 Project: {p.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold text-sm shadow-md transition cursor-pointer mt-5"
          >
            <Save className="w-4 h-4" />
            Save {activeType === 'task' ? 'Task' : 'Habit'}
          </button>
        </form>
      </div>
    </div>
  );
};
