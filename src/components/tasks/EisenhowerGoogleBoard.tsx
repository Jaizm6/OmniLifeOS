import React, { useState, useRef } from 'react';
import {
  Plus,
  Check,
  ArrowUpDown,
  Grid2X2,
  Columns4,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TaskItem, EisenhowerQuadrant, Priority } from '../../types';
import { DragAndDropContextType } from '../../hooks/useTaskDragAndDrop';

interface EisenhowerGoogleBoardProps {
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onToggleStar: (id: string) => void;
  onOpenEditTask: (task: TaskItem) => void;
  onOpenDetailTask: (task: TaskItem) => void;
  onAddTask: (quadrant?: EisenhowerQuadrant) => void;
  onUpdateTaskQuadrant: (taskId: string, quadrant: EisenhowerQuadrant) => void;
  matchesFilterTab: (task: TaskItem) => boolean;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onCycleEisenhower?: (task: TaskItem) => void;
  onFilterCategory?: (catId: string) => void;
  onFilterTag?: (tag: string) => void;
  onFilterProject?: (project: string) => void;
  dndProps: DragAndDropContextType;
}

type SortMode = 'manual' | 'dueDate' | 'starred' | 'title' | 'priority';
type LayoutMode = 'grid2x2' | 'columns';

interface QuadrantConfig {
  id: EisenhowerQuadrant;
  emoji: string;
  title: string;
  tag: string;
  color: string;
  headingColor: string;
  borderColor: string;
  activeDropClass: string;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: 'urgent_important',
    emoji: '🚨',
    title: 'DO',
    tag: '(Urg & Imp)',
    color: '#ef4444',
    headingColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-500',
    activeDropClass: 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 ring-2 ring-rose-500/40',
  },
  {
    id: 'not_urgent_important',
    emoji: '⏳',
    title: 'PLAN',
    tag: '(Imp)',
    color: '#f59e0b',
    headingColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500',
    activeDropClass: 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-2 ring-amber-500/40',
  },
  {
    id: 'urgent_not_important',
    emoji: '⏩',
    title: 'PASS',
    tag: '(Urg)',
    color: '#3b82f6',
    headingColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500',
    activeDropClass: 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/40',
  },
  {
    id: 'not_urgent_not_important',
    emoji: '💤',
    title: 'SKIP',
    tag: '(None)',
    color: '#10b981',
    headingColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500',
    activeDropClass: 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/40',
  },
];

const priorityOrder: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

const formatMatrixDueDate = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[m - 1] || '';
    if (timeStr) {
      return `${d} ${month}, ${timeStr}`;
    }
    return `${d} ${month}`;
  } catch {
    return dateStr;
  }
};

export const EisenhowerGoogleBoard: React.FC<EisenhowerGoogleBoardProps> = ({
  tasks,
  onToggleTask,
  onOpenDetailTask,
  onAddTask,
  onUpdateTaskQuadrant,
  matchesFilterTab,
  dndProps,
}) => {
  const [activeQuadId, setActiveQuadId] = useState<EisenhowerQuadrant>('urgent_important');
  const [columnSorts, setColumnSorts] = useState<Record<string, SortMode>>({});
  const [activeSortMenuQuad, setActiveSortMenuQuad] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid2x2');

  const carouselRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const todayStr = new Date().toISOString().split('T')[0];

  const scrollToQuad = (quadId: EisenhowerQuadrant) => {
    setActiveQuadId(quadId);
    const el = columnRefs.current[quadId];
    if (el && carouselRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleScroll = () => {
    if (!carouselRef.current || layoutMode !== 'columns') return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const containerCenter = scrollLeft + container.clientWidth / 2;

    let closestQuadId = QUADRANTS[0].id;
    let minDistance = Infinity;

    QUADRANTS.forEach(q => {
      const el = columnRefs.current[q.id];
      if (el) {
        const elCenter = el.offsetLeft + el.clientWidth / 2;
        const dist = Math.abs(containerCenter - elCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestQuadId = q.id;
        }
      }
    });

    if (closestQuadId !== activeQuadId) {
      setActiveQuadId(closestQuadId);
    }
  };

  const getQuadTasks = (quadId: EisenhowerQuadrant) => {
    const raw = tasks.filter(t => {
      const taskQuad = t.quadrant || 'urgent_important';
      const isMatch =
        taskQuad === quadId ||
        (quadId === 'not_urgent_not_important' && (taskQuad === 'neither' || !taskQuad));
      if (!isMatch) return false;
      return matchesFilterTab(t);
    });

    const sort = columnSorts[quadId] || 'manual';

    return [...raw].sort((a, b) => {
      if (sort === 'starred') {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
      }
      if (sort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sort === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sort === 'priority') {
        return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
      }
      return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    });
  };

  const getNextQuad = (currentQuad: EisenhowerQuadrant): EisenhowerQuadrant | null => {
    const idx = QUADRANTS.findIndex(q => q.id === currentQuad);
    if (idx >= 0 && idx < QUADRANTS.length - 1) {
      return QUADRANTS[idx + 1].id;
    }
    return null;
  };

  const getPrevQuad = (currentQuad: EisenhowerQuadrant): EisenhowerQuadrant | null => {
    const idx = QUADRANTS.findIndex(q => q.id === currentQuad);
    if (idx > 0) {
      return QUADRANTS[idx - 1].id;
    }
    return null;
  };

  const totalFilteredTasks = QUADRANTS.reduce((sum, q) => sum + getQuadTasks(q.id).length, 0);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full select-none relative space-y-1 h-full overflow-hidden">
      {/* Top Header: Ultra-compact, single-line (Layout Switch + Tasks Count + New Task) */}
      <div className="flex items-center justify-between gap-1.5 px-1 py-0.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Eisenhower Matrix
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
            {totalFilteredTasks}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Layout Mode Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setLayoutMode('grid2x2')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                layoutMode === 'grid2x2'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="2x2 Grid (1 Frame)"
            >
              <Grid2X2 className="w-3 h-3" />
              <span className="hidden sm:inline">2x2 Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('columns')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                layoutMode === 'columns'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="4 Columns Board"
            >
              <Columns4 className="w-3 h-3" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAddTask(activeQuadId)}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Main Quadrants Container: Exactly 1 Frame on Mobile Viewport */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className={
          layoutMode === 'grid2x2'
            ? 'flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-1 sm:gap-2 w-full h-full overflow-hidden'
            : 'flex-1 min-h-0 flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 pt-0.5 px-0.5 scroll-smooth custom-scrollbar items-stretch w-full h-full'
        }
      >
        {QUADRANTS.map(quad => {
          const quadTasks = getQuadTasks(quad.id);
          const isDropTarget = dndProps.dragOverQuadrantId === quad.id;
          const currentSort = columnSorts[quad.id] || 'manual';

          return (
            <div
              key={quad.id}
              {...dndProps.getQuadrantDropProps(quad.id)}
              ref={el => {
                columnRefs.current[quad.id] = el;
              }}
              className={`${
                layoutMode === 'grid2x2'
                  ? 'w-full h-full min-w-0'
                  : 'w-[85vw] sm:w-[320px] md:w-[350px] lg:w-[380px] shrink-0 snap-center h-full'
              } rounded-lg sm:rounded-xl border transition-all flex flex-col overflow-hidden shadow-2xs ${
                isDropTarget
                  ? quad.activeDropClass
                  : 'border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#18181b]'
              }`}
            >
              {/* Standardized Header: 🚨 DO [count] (Urg & Imp) */}
              <div 
                className="flex items-center justify-between px-1.5 sm:px-2 py-0.5 sm:py-1 border-b border-slate-200/70 dark:border-slate-800/70 select-none shrink-0"
                style={{ backgroundColor: `${quad.color}15` }}
              >
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <span className="text-xs sm:text-sm leading-none shrink-0">{quad.emoji}</span>
                  <span className={`font-black text-[11px] sm:text-xs tracking-tight ${quad.headingColor}`}>
                    {quad.title}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0">
                    [{quadTasks.length}]
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {quad.tag}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 relative">
                  {/* Sort Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSortMenuQuad(activeSortMenuQuad === quad.id ? null : quad.id)
                      }
                      className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                      title="Sort tasks"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </button>

                    {activeSortMenuQuad === quad.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActiveSortMenuQuad(null)}
                        />
                        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-40 py-1 text-xs">
                          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Sort By
                          </span>
                          {(
                            [
                              { key: 'manual', label: 'Default / Manual' },
                              { key: 'dueDate', label: 'Due Date' },
                              { key: 'starred', label: 'Starred First' },
                              { key: 'priority', label: 'Priority' },
                              { key: 'title', label: 'Title (A-Z)' },
                            ] as const
                          ).map(opt => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setColumnSorts(prev => ({ ...prev, [quad.id]: opt.key }));
                                setActiveSortMenuQuad(null);
                              }}
                              className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                                currentSort === opt.key
                                  ? 'font-bold text-indigo-600 dark:text-indigo-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {currentSort === opt.key && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Add Task directly to this quadrant */}
                  <button
                    type="button"
                    onClick={() => onAddTask(quad.id)}
                    className="p-0.5 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                    title={`Add task to ${quad.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tasks List inside Quadrant Socket: High Density, Seamless Fit */}
              <div 
                {...dndProps.getQuadrantDropProps(quad.id)}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 space-y-0.5 min-w-0"
              >
                {quadTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-2 text-slate-400 dark:text-slate-500">
                    <span className="text-[11px] font-medium">No tasks</span>
                    <button
                      type="button"
                      onClick={() => onAddTask(quad.id)}
                      className="mt-0.5 text-[10px] font-semibold text-blue-500 hover:underline cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                ) : (
                  quadTasks.map(task => {
                    const isBeingDragged = dndProps.draggedTaskId === task.id;
                    const isDropTargetItem = dndProps.dragOverTaskId === task.id;
                    const nextQ = getNextQuad(quad.id);
                    const prevQ = getPrevQuad(quad.id);

                    return (
                      <div
                        key={task.id}
                        {...dndProps.getTaskItemProps(task.id, task.title)}
                        onClick={() => {
                          if (dndProps.wasDraggingRef.current) return;
                          onOpenDetailTask(task);
                        }}
                        className={`group relative flex items-start gap-1.5 p-1 sm:p-1.5 rounded-lg transition cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 select-none ${
                          isBeingDragged ? 'opacity-40 scale-[0.98]' : ''
                        } ${
                          isDropTargetItem
                            ? dndProps.dropPosition === 'before'
                              ? 'border-t-2 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                              : 'border-b-2 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                            : ''
                        }`}
                      >
                        {/* Checkbox with outer bold border matching quadrant priority */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(task.id);
                          }}
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                            task.completed
                              ? 'bg-emerald-600 border-2 border-emerald-600 text-white'
                              : `${quad.borderColor} border-2 bg-transparent hover:scale-105`
                          }`}
                          title={task.completed ? 'Completed' : 'Click to complete'}
                        >
                          {task.completed && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </button>

                        {/* Title & subtle due date underneath */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[11px] sm:text-xs font-normal leading-snug break-words ${
                              task.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </p>

                          {task.dueDate && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`text-[9px] font-mono leading-none ${
                                  !task.completed && task.dueDate < todayStr
                                    ? 'text-rose-500 dark:text-rose-400 font-bold'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {formatMatrixDueDate(task.dueDate, task.dueTime)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Quadrant Shift Buttons (Visible on hover/touch) */}
                        {(prevQ || nextQ) && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                            {prevQ && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTaskQuadrant(task.id, prevQ);
                                }}
                                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                title={`Move to ${prevQ}`}
                              >
                                <ChevronLeft className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {nextQ && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTaskQuadrant(task.id, nextQ);
                                }}
                                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                title={`Move to ${nextQ}`}
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button (FAB) at Bottom Right for Mobile */}
      <button
        type="button"
        onClick={() => onAddTask(activeQuadId)}
        className="fixed right-4 bottom-18 sm:bottom-6 z-40 w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-xl flex items-center justify-center transition cursor-pointer hover:shadow-blue-500/30"
        title="Add New Task"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Mobile Pagination Indicator Dots (When in horizontal columns mode) */}
      {layoutMode === 'columns' && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 pt-0.5 shrink-0">
          {QUADRANTS.map(quad => (
            <button
              key={quad.id}
              type="button"
              onClick={() => scrollToQuad(quad.id)}
              className={`transition-all rounded-full ${
                activeQuadId === quad.id
                  ? 'w-4 h-1.5 bg-blue-600 dark:bg-blue-400'
                  : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
              title={`Jump to ${quad.title}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
