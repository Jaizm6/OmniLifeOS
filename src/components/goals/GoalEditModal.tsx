import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Target, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Goal, GoalCategory, GoalMilestone } from '../../types';

interface GoalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
}

export const GoalEditModal: React.FC<GoalEditModalProps> = ({ isOpen, onClose, goal }) => {
  const { updateGoal, soundEngine, pushNotification } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('career');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [status, setStatus] = useState<Goal['status']>('on_track');
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setCategory(goal.category);
      setTargetDate(goal.targetDate);
      setColor(goal.color);
      setStatus(goal.status);
      setMilestones(goal.milestones ? [...goal.milestones] : []);
    }
  }, [goal, isOpen]);

  if (!isOpen || !goal) return null;

  const handleAddMilestone = () => {
    if (!newMilestoneText.trim()) return;
    const newM: GoalMilestone = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newMilestoneText.trim(),
      completed: false,
    };
    setMilestones(prev => [...prev, newM]);
    setNewMilestoneText('');
  };

  const handleToggleMilestone = (id: string) => {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const handleDeleteMilestone = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const handleMilestoneTextChange = (id: string, text: string) => {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, title: text } : m))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const completedCount = milestones.filter(m => m.completed).length;
    const totalCount = milestones.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : goal.progress;

    updateGoal({
      ...goal,
      title: title.trim(),
      category,
      targetDate,
      color,
      status: progress === 100 ? 'completed' : status,
      progress,
      milestones,
    });

    soundEngine?.playSuccessChime();
    pushNotification('Goal Updated', `Changes to "${title.trim()}" saved.`, 'system');
    onClose();
  };

  const colorPresets = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Strategic Goal (OKR)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update timeline, targets, and key results
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Goal Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as GoalCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="career">🚀 Career & Work</option>
                <option value="health">💧 Health & Body</option>
                <option value="finance">💰 Financial Freedom</option>
                <option value="personal">🌱 Personal Growth</option>
                <option value="learning">📚 Skills & Learning</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Health / Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Goal['status'])}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-medium"
              >
                <option value="on_track">🟢 On Track</option>
                <option value="at_risk">🟡 At Risk</option>
                <option value="behind">🔴 Behind Schedule</option>
                <option value="completed">🏆 Completed</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Theme Color
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {colorPresets.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition ${
                      color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Key Results / Milestones */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Key Milestones ({milestones.filter(m => m.completed).length}/{milestones.length} completed)
            </label>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add milestone / key result..."
                value={newMilestoneText}
                onChange={e => setNewMilestoneText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMilestone();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddMilestone}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white font-semibold transition"
              >
                Add
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {milestones.length === 0 ? (
                <p className="text-slate-400 italic text-[11px] py-1">No milestones added yet.</p>
              ) : (
                milestones.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleMilestone(m.id)}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                        m.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                      }`}
                    >
                      {m.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <input
                      type="text"
                      value={m.title}
                      onChange={e => handleMilestoneTextChange(m.id, e.target.value)}
                      className={`flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden ${
                        m.completed ? 'line-through text-slate-400' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
