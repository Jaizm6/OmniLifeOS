import React, { useState, useEffect } from 'react';
import { X, Briefcase, Target, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const { updateProject, goals, soundEngine, pushNotification } = useApp();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💼');
  const [color, setColor] = useState('#6366f1');
  const [goalId, setGoalId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Project['status']>('active');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setIcon(project.icon || '💼');
      setColor(project.color || '#6366f1');
      setGoalId(project.goalId);
      setStatus(project.status || 'active');
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProject({
      ...project,
      name: name.trim(),
      icon,
      color,
      goalId: goalId || undefined,
      status,
    });

    soundEngine?.playSuccessChime();
    pushNotification('Project Updated', `Changes to workspace "${name.trim()}" saved.`, 'task');
    onClose();
  };

  const emojiPresets = ['💼', '🚀', '🎨', '🏡', '📚', '⚡', '🔬', '💡', '🛠️', '📱', '🌿', '🎯'];
  const colorPresets = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#3b82f6'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Workspace Project
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Updating project details cascades to linked tasks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {emojiPresets.map(emo => (
                <button
                  type="button"
                  key={emo}
                  onClick={() => setIcon(emo)}
                  className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border transition ${
                    icon === emo
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 scale-110 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Parent Strategic Goal (OKR)
            </label>
            <select
              value={goalId || ''}
              onChange={e => setGoalId(e.target.value || undefined)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-medium"
            >
              <option value="">🎯 None (Independent Workspace)</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  🎯 {g.title} ({g.category})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Linking feeds tasks from this project into the strategic goal automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Project['status'])}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="active">Active Workspace</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold / Paused</option>
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
