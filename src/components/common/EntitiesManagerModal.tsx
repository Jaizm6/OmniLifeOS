import React, { useState } from 'react';
import {
  X,
  Plus,
  FolderKanban,
  Target,
  Tag,
  Edit2,
  Trash2,
  Check,
  Calendar,
  Layers,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project, Goal, AppTag, GoalCategory } from '../../types';
import { ProjectEditModal } from '../goals/ProjectEditModal';
import { GoalEditModal } from '../goals/GoalEditModal';

interface EntitiesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'projects' | 'goals' | 'tags';
}

const PRESET_TAG_COLORS = [
  '#6366f1', // Indigo
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export const EntitiesManagerModal: React.FC<EntitiesManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'projects',
}) => {
  const {
    projects,
    addProject,
    deleteProject,
    goals,
    addGoal,
    deleteGoal,
    tags,
    addTag,
    updateTag,
    deleteTag,
    tasks,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'projects' | 'goals' | 'tags'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state for Project & Goal modals
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // New Project Form state
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#6366f1');
  const [newProjectGoalId, setNewProjectGoalId] = useState('');

  // New Goal Form state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory>('career');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
  );
  const [newGoalColor, setNewGoalColor] = useState('#6366f1');

  // New / Edit Tag state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [editingTag, setEditingTag] = useState<AppTag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('#6366f1');

  if (!isOpen) return null;

  // Count tasks per project
  const getTasksCountForProject = (projectId: string, projectName: string) => {
    return tasks.filter(t => t.projectId === projectId || t.project === projectName).length;
  };

  // Count tasks per goal
  const getTasksCountForGoal = (goalId: string) => {
    return tasks.filter(t => t.goalId === goalId).length;
  };

  // Count tasks per tag
  const getTasksCountForTag = (tagName: string) => {
    const clean = tagName.toLowerCase();
    return tasks.filter(t => t.tags?.some(tag => tag.toLowerCase() === clean)).length;
  };

  // Handle Project Creation
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    addProject({
      name: newProjectName.trim(),
      color: newProjectColor,
      goalId: newProjectGoalId || undefined,
      status: 'active',
      icon: '💼',
    });
    setNewProjectName('');
    setIsAddingProject(false);
  };

  // Handle Goal Creation
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    addGoal({
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      targetDate: newGoalTargetDate,
      color: newGoalColor,
      status: 'on_track',
      progress: 0,
      milestones: [],
    });
    setNewGoalTitle('');
    setIsAddingGoal(false);
  };

  // Handle Tag Creation
  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    addTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setIsAddingTag(false);
  };

  // Handle Tag Update
  const handleSaveTagEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editTagName.trim()) return;
    updateTag(editingTag.name, editTagName.trim(), editTagColor);
    setEditingTag(null);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGoals = goals.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
        <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  Workspace Entities Hub
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Central management for Projects, Life Goals, and Tags with synchronized updates
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close Hub"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Bar & Search */}
          <div className="px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
            {/* Tab switchers */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('projects');
                  setIsAddingProject(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Projects ({projects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('goals');
                  setIsAddingGoal(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'goals'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Goals ({goals.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('tags');
                  setIsAddingTag(false);
                  setEditingTag(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'tags'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Tags ({tags.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* 1. PROJECTS TAB */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Workspaces & Projects
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Organize your tasks into structured projects and link them to higher life goals
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingProject(!isAddingProject)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingProject ? 'Cancel' : 'New Project'}</span>
                  </button>
                </div>

                {/* Add Project Form */}
                {isAddingProject && (
                  <form
                    onSubmit={handleCreateProject}
                    className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3 animate-in fade-in"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Project Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Website Redesign, Fitness Protocol..."
                          value={newProjectName}
                          onChange={e => setNewProjectName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Link to Goal (Optional)
                        </label>
                        <select
                          value={newProjectGoalId}
                          onChange={e => setNewProjectGoalId(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium cursor-pointer"
                        >
                          <option value="">No goal bound</option>
                          {goals.map(g => (
                            <option key={g.id} value={g.id}>
                              🎯 {g.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">Color:</span>
                        {PRESET_TAG_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewProjectColor(c)}
                            className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                              newProjectColor === c ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-80'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingProject(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs"
                        >
                          Create Project
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Projects Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProjects.map(proj => {
                    const taskCount = getTasksCountForProject(proj.id, proj.name);
                    const linkedGoal = goals.find(g => g.id === proj.goalId);

                    return (
                      <div
                        key={proj.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: proj.color || '#6366f1' }}
                            />
                            <div className="min-w-0">
                              <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {proj.name}
                              </h5>
                              {linkedGoal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                                  <span>🎯 {linkedGoal.title}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingProject(proj)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Modify Project"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete project "${proj.name}"? Tasks will be moved to General.`)) {
                                  deleteProject(proj.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-[11px]">
                            {taskCount} task{taskCount !== 1 ? 's' : ''} assigned
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {proj.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. GOALS TAB */}
            {activeTab === 'goals' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Life Goals & Milestones
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      High-level milestones that tie into projects and daily action items
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingGoal(!isAddingGoal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingGoal ? 'Cancel' : 'New Goal'}</span>
                  </button>
                </div>

                {/* Add Goal Form */}
                {isAddingGoal && (
                  <form
                    onSubmit={handleCreateGoal}
                    className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-3 animate-in fade-in"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Goal Title
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Run Half-Marathon, Master TypeScript..."
                          value={newGoalTitle}
                          onChange={e => setNewGoalTitle(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Category
                        </label>
                        <select
                          value={newGoalCategory}
                          onChange={e => setNewGoalCategory(e.target.value as GoalCategory)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium cursor-pointer"
                        >
                          <option value="career">🚀 Career</option>
                          <option value="health">💧 Health</option>
                          <option value="finance">💰 Finance</option>
                          <option value="personal">🌱 Personal</option>
                          <option value="learning">📚 Learning</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">Target Date:</span>
                        <input
                          type="date"
                          value={newGoalTargetDate}
                          onChange={e => setNewGoalTargetDate(e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingGoal(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs"
                        >
                          Create Goal
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Goals List */}
                <div className="space-y-3">
                  {filteredGoals.map(goal => {
                    const taskCount = getTasksCountForGoal(goal.id);
                    const linkedProjects = projects.filter(p => p.goalId === goal.id);

                    return (
                      <div
                        key={goal.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: goal.color || '#f43f5e' }}
                            />
                            <div className="min-w-0">
                              <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {goal.title}
                              </h5>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                                <span className="capitalize font-semibold text-rose-600 dark:text-rose-400">
                                  {goal.category}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-[11px]">Due {goal.targetDate}</span>
                                <span>•</span>
                                <span>{goal.milestones?.length || 0} milestone(s)</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingGoal(goal)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Modify Goal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete goal "${goal.title}"?`)) {
                                  deleteGoal(goal.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Delete Goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            <span>Progress</span>
                            <span>{goal.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full transition-all"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[11px]">
                            {taskCount} task{taskCount !== 1 ? 's' : ''} • {linkedProjects.length} project{linkedProjects.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TAGS TAB (Central Registry with rename/delete and task cascading) */}
            {activeTab === 'tags' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tag Registry & Categories
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Modifying or renaming a tag automatically updates all tasks across the system
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTag(!isAddingTag);
                      setEditingTag(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingTag ? 'Cancel' : 'New Tag'}</span>
                  </button>
                </div>

                {/* Add Tag Form */}
                {isAddingTag && (
                  <form
                    onSubmit={handleCreateTag}
                    className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3 animate-in fade-in"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tag Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. urgent, client-meeting, deepwork"
                          value={newTagName}
                          onChange={e => setNewTagName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Color
                        </label>
                        <div className="flex items-center gap-1.5">
                          {PRESET_TAG_COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewTagColor(c)}
                              className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                                newTagColor === c ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-80'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingTag(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                      >
                        Add Tag
                      </button>
                    </div>
                  </form>
                )}

                {/* Edit Tag Inline Form */}
                {editingTag && (
                  <form
                    onSubmit={handleSaveTagEdit}
                    className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Renaming Tag #{editingTag.name} (propagates to all tasks)
                      </h5>
                      <button
                        type="button"
                        onClick={() => setEditingTag(null)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          required
                          value={editTagName}
                          onChange={e => setEditTagName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {PRESET_TAG_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditTagColor(c)}
                            className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                              editTagColor === c ? 'ring-2 ring-amber-500 scale-110' : 'opacity-80'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingTag(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
                      >
                        Update Across All Tasks
                      </button>
                    </div>
                  </form>
                )}

                {/* Tags List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {filteredTags.map(tagItem => {
                    const taskCount = getTasksCountForTag(tagItem.name);

                    return (
                      <div
                        key={tagItem.id || tagItem.name}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: tagItem.color || '#6366f1' }}
                          />
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate block">
                              #{tagItem.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {taskCount} task{taskCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTag(tagItem);
                              setEditTagName(tagItem.name);
                              setEditTagColor(tagItem.color || '#6366f1');
                              setIsAddingTag(false);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Rename / Modify Tag"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete tag #${tagItem.name}? This will remove it from all ${taskCount} task(s).`)) {
                                deleteTag(tagItem.name);
                              }
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Delete Tag"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editing Modals */}
      <ProjectEditModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
      />

      <GoalEditModal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        goal={editingGoal}
      />
    </>
  );
};
