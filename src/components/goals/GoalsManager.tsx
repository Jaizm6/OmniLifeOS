import React, { useState } from 'react';
import {
  Target,
  FolderKanban,
  Plus,
  Check,
  Calendar,
  Award,
  ChevronRight,
  Trash2,
  Edit2,
  X,
  Link2,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Goal, GoalCategory, Project, TaskItem } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { GoalEditModal } from './GoalEditModal';
import { ProjectEditModal } from './ProjectEditModal';
import { LinkTasksModal } from './LinkTasksModal';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { QuoteBanner } from '../common/QuoteBanner';

export const GoalsManager: React.FC = () => {
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoalMilestone,
    projects,
    addProject,
    updateProject,
    deleteProject,
    tasks,
    toggleTask,
    linkTaskToGoal,
    linkTaskToProject,
    setActiveTab,
    openEntitiesModal,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'goals' | 'projects'>('goals');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Edit Modals State
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Link Tasks Modal State
  const [linkModalTarget, setLinkModalTarget] = useState<{
    type: 'goal' | 'project';
    id: string;
    title: string;
    color?: string;
  } | null>(null);

  // Create Task Directly Linked Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaultGoalId, setTaskModalDefaultGoalId] = useState<string | undefined>(undefined);
  const [taskModalDefaultProjectId, setTaskModalDefaultProjectId] = useState<string | undefined>(undefined);
  const [taskModalDefaultProject, setTaskModalDefaultProject] = useState<string | undefined>(undefined);

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('career');
  const [goalTargetDate, setGoalTargetDate] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
  );
  const [goalColor, setGoalColor] = useState('#6366f1');
  const [milestonesList, setMilestonesList] = useState<string[]>([]);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState('#6366f1');
  const [projectIcon, setProjectIcon] = useState('💼');
  const [projectGoalId, setProjectGoalId] = useState<string>('');

  const categoryIcons: Record<GoalCategory, string> = {
    health: '💧',
    career: '🚀',
    finance: '💰',
    personal: '🌱',
    learning: '📚',
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    addGoal({
      title: goalTitle.trim(),
      category: goalCategory,
      targetDate: goalTargetDate,
      progress: 0,
      status: 'on_track',
      color: goalColor,
      milestones: milestonesList.map((m, idx) => ({
        id: `m_${Date.now()}_${idx}`,
        title: m,
        completed: false,
      })),
    });

    setGoalTitle('');
    setMilestonesList([]);
    setShowGoalModal(false);
  };

  const handleAddMilestoneDraft = () => {
    if (newMilestoneText.trim()) {
      setMilestonesList([...milestonesList, newMilestoneText.trim()]);
      setNewMilestoneText('');
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    addProject({
      name: projectName.trim(),
      color: projectColor,
      icon: projectIcon,
      status: 'active',
      goalId: projectGoalId || undefined,
    });

    setProjectName('');
    setProjectGoalId('');
    setShowProjectModal(false);
  };

  const openAddTaskForGoal = (goal: Goal) => {
    setTaskModalDefaultGoalId(goal.id);
    const relatedProj = projects.find(p => p.goalId === goal.id);
    setTaskModalDefaultProjectId(relatedProj?.id);
    setTaskModalDefaultProject(relatedProj?.name || 'Work');
    setIsTaskModalOpen(true);
  };

  const openAddTaskForProject = (project: Project) => {
    setTaskModalDefaultProjectId(project.id);
    setTaskModalDefaultProject(project.name);
    setTaskModalDefaultGoalId(project.goalId);
    setIsTaskModalOpen(true);
  };

  const completedGoalsCount = goals.filter(g => g.progress === 100).length;

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
      {/* Goals & Projects Title Bar (Consistent with Tasks & Master Calendar Pattern) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
            <Target className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Goals & Projects
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                {goals.length} goals • {projects.length} workspaces
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Map high-level visions to actionable milestones, track OKRs, and link tasks directly
            </p>
          </div>
        </div>

        {/* Tab switch & Add buttons */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setActiveSubTab('goals')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeSubTab === 'goals'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Goals ({goals.length})
            </button>
            <button
              onClick={() => setActiveSubTab('projects')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeSubTab === 'projects'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Workspaces ({projects.length})
            </button>
          </div>

          {/* Central Projects, Goals & Tags Hub Button */}
          <button
            type="button"
            onClick={() => openEntitiesModal(activeSubTab === 'projects' ? 'projects' : 'goals')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
            title="Open Central Hub for Projects, Goals & Tags"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Central View & Tags</span>
          </button>

          {activeSubTab === 'goals' ? (
            <button
              onClick={() => setShowGoalModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Goal</span>
            </button>
          ) : (
            <button
              onClick={() => setShowProjectModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Wisdom Widget (Positioned under the top goals header) */}
      <QuoteBanner />

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {goals.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Active High-Level Goals</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {completedGoalsCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Accomplished Goals</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {projects.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Connected Workspaces</div>
          </div>
        </div>
      </div>

      {/* Main SubTab Content */}
      {activeSubTab === 'goals' ? (
        <div className="space-y-4">
          {goals.map(goal => {
            const linkedTasks = tasks.filter(t => t.goalId === goal.id);
            const doneTasks = linkedTasks.filter(t => t.completed).length;

            return (
              <div
                key={goal.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                {/* Goal Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-2xs"
                      style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                    >
                      {categoryIcons[goal.category] || '🎯'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {goal.title}
                        </h4>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                        >
                          {goal.category}
                        </span>
                        {goal.status && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              goal.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : goal.status === 'at_risk'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : goal.status === 'behind'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {goal.status.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Target: {goal.targetDate}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full sm:w-80 mt-2.5">
                        <div className="flex justify-between text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                          <span>Milestones Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit, Link, Delete */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                      title="Edit Goal details & milestones"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() =>
                        setLinkModalTarget({
                          type: 'goal',
                          id: goal.id,
                          title: goal.title,
                          color: goal.color,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition"
                      title="Link or manage tasks for this goal"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Link Tasks</span>
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Milestones Checklist */}
                {goal.milestones.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Key Results / Milestones ({goal.milestones.filter(m => m.completed).length} / {goal.milestones.length})
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {goal.milestones.map(m => (
                        <div
                          key={m.id}
                          onClick={() => toggleGoalMilestone(goal.id, m.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium cursor-pointer transition ${
                            m.completed
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                              m.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {m.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{m.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Tasks Section */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-indigo-500" />
                        Linked Tasks ({doneTasks}/{linkedTasks.length} done)
                      </h5>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openAddTaskForGoal(goal)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Task</span>
                      </button>
                      <button
                        onClick={() =>
                          setLinkModalTarget({
                            type: 'goal',
                            id: goal.id,
                            title: goal.title,
                            color: goal.color,
                          })
                        }
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>Manage Links</span>
                      </button>
                    </div>
                  </div>

                  {linkedTasks.length === 0 ? (
                    <div className="py-4 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>No tasks linked to this goal yet.</span>
                      <button
                        onClick={() =>
                          setLinkModalTarget({
                            type: 'goal',
                            id: goal.id,
                            title: goal.title,
                            color: goal.color,
                          })
                        }
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        Link Existing Tasks &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {linkedTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={() => toggleTask(task.id)}
                              className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                                task.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <span
                              className={`truncate font-medium ${
                                task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {task.project}
                            </span>
                            <button
                              onClick={() => linkTaskToGoal(task.id, undefined)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500"
                              title="Unlink from this goal"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Projects List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const projectTasks = tasks.filter(t => t.projectId === p.id || t.project.toLowerCase() === p.name.toLowerCase());
            const doneTasks = projectTasks.filter(t => t.completed).length;
            const completion = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
            const parentGoal = p.goalId ? goals.find(g => g.id === p.goalId) : null;

            return (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar: Icon, Name, Edit, Delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-2xs"
                        style={{ backgroundColor: `${p.color}20`, color: p.color }}
                      >
                        <IconRenderer icon={p.icon} className="w-5 h-5" fallback="📁" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {p.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {projectTasks.length} tasks registered
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProject(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Project details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteProject(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Parent OKR / Strategic Goal connection */}
                  {parentGoal ? (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-xl">
                      <Target className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">OKR: {parentGoal.title}</span>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <span>No linked Strategic Goal</span>
                      <button
                        onClick={() => setEditingProject(p)}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        Link OKR
                      </button>
                    </div>
                  )}

                  {/* Tasks Completion Progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      <span>Tasks Done ({doneTasks}/{projectTasks.length})</span>
                      <span>{completion}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${completion}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>

                  {/* Linked Tasks Preview */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Workspace Tasks
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openAddTaskForProject(p)}
                          className="p-1 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] font-semibold flex items-center gap-0.5"
                          title="Add task to this workspace"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Task</span>
                        </button>
                        <button
                          onClick={() =>
                            setLinkModalTarget({
                              type: 'project',
                              id: p.id,
                              title: p.name,
                              color: p.color,
                            })
                          }
                          className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold flex items-center gap-0.5"
                          title="Link existing tasks"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Link</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {projectTasks.length === 0 ? (
                        <p className="text-slate-400 italic text-[11px] py-1">No tasks in this workspace yet.</p>
                      ) : (
                        projectTasks.slice(0, 5).map(task => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button
                                onClick={() => toggleTask(task.id)}
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition shrink-0 ${
                                  task.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {task.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>
                              <span
                                className={`truncate text-[11px] font-medium ${
                                  task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                              {task.dueDate.split('-').slice(1).join('/')}
                            </span>
                          </div>
                        ))
                      )}
                      {projectTasks.length > 5 && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                          +{projectTasks.length - 5} more tasks
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  <span>Open Tasks Board</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                New Strategic Goal (OKR)
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Run a 10km Marathon, Launch MVP"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={goalCategory}
                    onChange={e => setGoalCategory(e.target.value as GoalCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
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
                    value={goalTargetDate}
                    onChange={e => setGoalTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Milestones Input */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Key Milestones
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add a milestone e.g. Register for race"
                    value={newMilestoneText}
                    onChange={e => setNewMilestoneText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestoneDraft();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestoneDraft}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-semibold"
                  >
                    Add
                  </button>
                </div>

                {milestonesList.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 mb-1">
                    <span>{m}</span>
                    <button
                      type="button"
                      onClick={() => setMilestonesList(milestonesList.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                New Project Workspace
              </h3>
              <button
                onClick={() => setShowProjectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile App Redesign"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emoji Icon
                </label>
                <div className="flex gap-2">
                  {['💼', '🚀', '🎨', '🏡', '📚', '⚡', '🔬'].map(emo => (
                    <button
                      type="button"
                      key={emo}
                      onClick={() => setProjectIcon(emo)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition ${
                        projectIcon === emo
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link to Strategic Goal (Optional)
                </label>
                <select
                  value={projectGoalId}
                  onChange={e => setProjectGoalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                >
                  <option value="">🎯 None (Independent Workspace)</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      🎯 {g.title} ({g.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      <GoalEditModal
        isOpen={Boolean(editingGoal)}
        onClose={() => setEditingGoal(null)}
        goal={editingGoal}
      />

      {/* Edit Project Modal */}
      <ProjectEditModal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        project={editingProject}
      />

      {/* Link Tasks Modal */}
      {linkModalTarget && (
        <LinkTasksModal
          isOpen={Boolean(linkModalTarget)}
          onClose={() => setLinkModalTarget(null)}
          targetType={linkModalTarget.type}
          targetId={linkModalTarget.id}
          targetTitle={linkModalTarget.title}
          targetColor={linkModalTarget.color}
        />
      )}

      {/* Create Task Directly Linked Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultGoalId={taskModalDefaultGoalId}
        defaultProjectId={taskModalDefaultProjectId}
        defaultProject={taskModalDefaultProject}
      />
    </div>
  );
};
