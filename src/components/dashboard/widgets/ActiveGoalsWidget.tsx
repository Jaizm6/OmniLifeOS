import React from 'react';
import { Target, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const ActiveGoalsWidget: React.FC = () => {
  const { goals, toggleGoalMilestone, setActiveTab } = useApp();

  const activeGoals = goals.filter(g => g.status !== 'completed');

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/60 shrink-0">
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
            <span>Active Goals & OKRs</span>
            <span className="text-[9.5px] font-medium font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50 hidden sm:inline">
              {activeGoals.length} targets
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('goals')}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-72">
        {activeGoals.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-indigo-500 mb-1" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Goals Achieved!</p>
            <p className="text-[11px]">Set a new quarterly milestone</p>
          </div>
        ) : (
          activeGoals.slice(0, 3).map(goal => {
            const completedMilestones = goal.milestones.filter(m => m.completed).length;
            const progress = goal.milestones.length > 0
              ? Math.round((completedMilestones / goal.milestones.length) * 100)
              : goal.progress || 0;

            return (
              <div
                key={goal.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {goal.title}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Next Milestone */}
                {goal.milestones.length > 0 && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>
                      {completedMilestones}/{goal.milestones.length} milestones complete
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      Target: {goal.targetDate}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
