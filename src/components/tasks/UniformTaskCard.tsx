import React, { useState, useRef } from 'react';
import {
  Check,
  Star,
  Clock,
  MessageSquare,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TaskItem, DEFAULT_TASK_CATEGORIES } from '../../types';
import { formatOSDate, formatLocalDate } from '../../utils/date';
import { CheckmarkCelebration, AnimatedCheckIcon } from '../common/CheckmarkCelebration';
import { SubtaskBranchIcon } from '../common/SubtaskBranchIcon';
import { OverdueIcon } from '../common/OverdueIcon';
import { soundEngine } from '../../utils/audio';
import { haptics } from '../../utils/haptics';

interface UniformTaskCardProps {
  task: TaskItem;
  onToggleTask: (id: string) => void;
  onToggleStar: (id: string) => void;
  onOpenDetailTask: (task: TaskItem) => void;
  onOpenEditTask?: (task: TaskItem) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onCycleEisenhower?: (task: TaskItem) => void;
  onFilterCategory?: (catId: string) => void;
  onFilterTag?: (tag: string) => void;
  onFilterProject?: (project: string) => void;
  onMovePrev?: () => void;
  onMoveNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isBeingDragged?: boolean;
  isDropTarget?: boolean;
  dropPosition?: 'before' | 'after' | null;
  className?: string;
  isCompact?: boolean;
}

export const UniformTaskCard: React.FC<UniformTaskCardProps> = ({
  task,
  onToggleTask,
  onToggleStar,
  onOpenDetailTask,
  onToggleSubtask,
  onMovePrev,
  onMoveNext,
  prevLabel,
  nextLabel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isBeingDragged = false,
  isDropTarget = false,
  dropPosition = null,
  className = '',
  isCompact = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState<number>(0);
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [isNotePeekOpen, setIsNotePeekOpen] = useState(false);
  const [isHandleActive, setIsHandleActive] = useState(false);
  const isDraggingRef = useRef(false);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnimating) return;
    const wasCompleted = task.completed;
    if (!wasCompleted) {
      setIsAnimating(true);
      try {
        soundEngine.playWaterDropNotification();
        haptics.complete();
      } catch {}

      setTimeout(() => {
        setCelebrationKey(prev => prev + 1);
      }, 260);

      setTimeout(() => {
        setIsAnimating(false);
        onToggleTask(task.id);
      }, 850);
    } else {
      haptics.toggle();
      onToggleTask(task.id);
    }
  };

  const subtasks = (Array.isArray(task.subtasks) && task.subtasks.length > 0)
    ? task.subtasks
    : (Array.isArray(task.checklist) && task.checklist.length > 0)
    ? task.checklist
    : [];
  const hasSubtasks = subtasks.length > 0;
  const completedSubs = subtasks.filter(s => s.completed).length;
  const todayStr = formatLocalDate(new Date());

  // Compute priority border class for the tick box
  const priorityStr = (task.priority || task.quadrant || 'low').toString().toLowerCase();
  const isHighPriority = priorityStr === 'high' || priorityStr === 'urgent_important' || priorityStr === 'p1';
  const isMediumPriority = priorityStr === 'medium' || priorityStr === 'not_urgent_important' || priorityStr === 'p2';

  const checkboxPriorityBorder = isHighPriority
    ? 'border-2 border-rose-500 dark:border-rose-400'
    : isMediumPriority
    ? 'border-2 border-amber-500 dark:border-amber-400'
    : 'border-2 border-emerald-500 dark:border-emerald-400';

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        isDraggingRef.current = true;
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.setData('text', task.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e);
      }}
      onDragEnd={() => {
        setIsHandleActive(false);
        setTimeout(() => { isDraggingRef.current = false; }, 250);
        onDragEnd?.();
      }}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative group select-none transition-all w-full ${
        isCompact
          ? 'px-2.5 py-1.5 min-h-[34px] hover:bg-slate-50/80 dark:hover:bg-slate-800/50 flex flex-col justify-center'
          : 'rounded-xl border px-2.5 py-1.5 flex flex-col justify-between gap-1 shadow-2xs hover:shadow-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
      } ${
        isBeingDragged ? 'opacity-40 scale-[0.98] border-dashed border-2 border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-none' : ''
      } ${
        isDropTarget && dropPosition === 'before'
          ? 'border-t-2 border-t-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
          : isDropTarget && dropPosition === 'after'
          ? 'border-b-2 border-b-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
          : ''
      } ${
        task.completed
          ? 'bg-slate-50/50 dark:bg-slate-900/40'
          : ''
      } ${className}`}
    >
      {/* Primary Row: Checkbox with Priority Border, Star, Title, Due Date, Subtasks Badge, Notes Peek */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full">
        {/* Left Side: Checkbox + Star + Title */}
        <div
          className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer overflow-hidden"
          onClick={() => {
            if (isDraggingRef.current) return;
            onOpenDetailTask(task);
          }}
        >
          {/* Checkbox - Instant toggle with Done celebration badge & Outer bold priority border */}
          <div className="relative flex items-center justify-center shrink-0">
            <CheckmarkCelebration
              activeKey={isAnimating ? celebrationKey : null}
              badgeText="Done✅"
              ringColor="border-emerald-500"
              align="left"
            />
            <button
              type="button"
              onClick={handleCheckboxClick}
              title={`Priority: ${task.priority || task.quadrant || 'low'} — Click to toggle completion`}
              className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                task.completed || isAnimating
                  ? 'bg-emerald-600 border-2 border-emerald-600 text-white'
                  : `${checkboxPriorityBorder} bg-white dark:bg-slate-800 hover:scale-105`
              }`}
            >
              {(task.completed || isAnimating) && (
                <AnimatedCheckIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} animate={isAnimating} />
              )}
            </button>
          </div>

          {/* Star Button */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggleStar(task.id);
            }}
            className="p-0.5 text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400 transition shrink-0 cursor-pointer"
            title={task.isStarred ? 'Starred' : 'Star task'}
          >
            <Star className={`w-3.5 h-3.5 ${task.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          {/* Task Title (Guaranteed Single-Line Truncation matching compact list) */}
          <span
            className={`flex-1 min-w-0 text-xs sm:text-[13px] font-semibold truncate transition ${
              task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
            }`}
            title={task.title}
          >
            {task.title}
          </span>
        </div>

        {/* Right Side: Due Date, Notes Icon, Subtasks Badge, Step Shift Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {/* Due Date Badge */}
          {task.dueDate && (
            <span
              className={`text-[11px] font-mono shrink-0 flex items-center gap-1 ${
                !task.completed && task.dueDate < todayStr ? 'text-rose-500 font-semibold' : 'text-slate-400'
              }`}
              title={`Due: ${formatOSDate(task.dueDate, 'DDMonthYYYY', task.dueTime)}`}
            >
              <span className={!task.completed && task.dueDate < todayStr ? 'px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold text-[10px]' : ''}>
                {formatOSDate(task.dueDate, 'DDMM')}
              </span>
              {!task.completed && task.dueDate < todayStr && (
                <span className="inline-flex items-center justify-center p-1 rounded-md bg-rose-500 text-white dark:bg-rose-600 shadow-2xs shrink-0" title="Overdue">
                  <OverdueIcon className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </span>
          )}

          {/* Note Peek Indicator */}
          {task.notes && task.notes.trim().length > 0 && (
            <div
              className="relative inline-flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsNotePeekOpen(!isNotePeekOpen);
              }}
              onMouseEnter={() => setIsNotePeekOpen(true)}
              onMouseLeave={() => setIsNotePeekOpen(false)}
            >
              <span
                className="inline-flex items-center justify-center p-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 shrink-0 shadow-2xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
                title="Has note (hover/click to view)"
              >
                <MessageSquare className="w-2.5 h-2.5 shrink-0" />
              </span>

              {isNotePeekOpen && (
                <>
                  <div
                    className="sm:hidden fixed inset-x-4 bottom-20 z-50 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span>Note</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsNotePeekOpen(false);
                        }}
                        className="p-1 -mr-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-normal font-normal">
                      {task.notes}
                    </p>
                  </div>

                  <div className="hidden sm:block absolute right-0 bottom-full mb-2 z-50 w-60 max-w-xs p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-white text-[11px] leading-relaxed shadow-xl border border-slate-700/80 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-slate-800 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                      <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                      <span>Note</span>
                    </div>
                    <p className="text-slate-200 text-[10.5px] leading-normal line-clamp-4 break-words whitespace-normal font-normal">
                      {task.notes.slice(0, 120)}{task.notes.length > 120 ? '...' : ''}
                    </p>
                    <div className="absolute top-full right-2.5 -mt-px border-4 border-transparent border-t-slate-900/95" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Subtasks Count Accordion Badge */}
          {hasSubtasks && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSubtasksExpanded(!isSubtasksExpanded);
              }}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer"
              title={isSubtasksExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              <SubtaskBranchIcon className="w-2.5 h-2.5 text-indigo-500" />
              <span>{completedSubs}/{subtasks.length}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isSubtasksExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Optional Prev/Next Stage Shift Controls */}
          {(onMovePrev || onMoveNext) && (
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {onMovePrev && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMovePrev();
                  }}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  title={prevLabel || 'Move back'}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}
              {onMoveNext && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveNext();
                  }}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  title={nextLabel || 'Advance'}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Subtasks Checklist Accordion */}
      {hasSubtasks && (
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isSubtasksExpanded
              ? 'max-h-[500px] opacity-100 bg-slate-50/70 dark:bg-slate-800/40 px-2 py-1 pl-6 space-y-0.5 border-t border-slate-100/80 dark:border-slate-800/60 rounded-b-lg'
              : 'max-h-0 opacity-0'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {subtasks.map(sub => (
            <div
              key={sub.id}
              className="flex items-center gap-1.5 text-[10px] text-slate-700 dark:text-slate-300 py-0.2"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSubtask?.(task.id, sub.id);
                }}
                className={`w-3 h-3 rounded-xs border flex items-center justify-center transition shrink-0 cursor-pointer ${
                  sub.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-500'
                }`}
                title={sub.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {sub.completed && <Check className="w-2 h-2 text-white stroke-[3]" />}
              </button>
              <span
                className={`truncate transition select-none ${
                  sub.completed
                    ? 'line-through text-slate-400 dark:text-slate-500 opacity-60'
                    : 'text-slate-700 dark:text-slate-300 font-medium'
                }`}
              >
                {sub.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
