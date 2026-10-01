import React from 'react';

interface OverdueIconProps {
  className?: string;
  size?: number;
}

export const OverdueIcon: React.FC<OverdueIconProps> = ({
  className = 'w-3.5 h-3.5',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <title>Overdue</title>
      {/* Outer Clock Ring */}
      <circle
        cx="48"
        cy="48"
        r="44"
        className="fill-slate-100 dark:fill-slate-800 stroke-slate-700 dark:stroke-slate-300"
        strokeWidth="6"
      />
      {/* Clock Face Inner Circle */}
      <circle
        cx="48"
        cy="48"
        r="38"
        className="fill-amber-50 dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-600"
        strokeWidth="2.5"
      />
      
      {/* 12, 3, 6, 9 Ticks */}
      <line x1="48" y1="14" x2="48" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-slate-700 dark:text-slate-300" />
      <line x1="82" y1="48" x2="76" y2="48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-slate-700 dark:text-slate-300" />
      <line x1="48" y1="82" x2="48" y2="76" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-slate-700 dark:text-slate-300" />
      <line x1="14" y1="48" x2="20" y2="48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-slate-700 dark:text-slate-300" />
      
      {/* Hour Hand pointing to 1 */}
      <line
        x1="48"
        y1="48"
        x2="64"
        y2="24"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        className="text-slate-800 dark:text-slate-100"
      />
      {/* Minute Hand pointing down to 6 */}
      <line
        x1="48"
        y1="48"
        x2="48"
        y2="72"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        className="text-slate-800 dark:text-slate-100"
      />
      {/* Center Pin */}
      <circle cx="48" cy="48" r="4.5" className="fill-slate-900 dark:fill-white" />

      {/* Red Warning Alert Triangle at bottom right */}
      <g transform="translate(48, 48)">
        <polygon
          points="24,2 48,46 0,46"
          className="fill-rose-500 stroke-rose-700 dark:stroke-rose-900"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Exclamation point */}
        <line
          x1="24"
          y1="18"
          x2="24"
          y2="32"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="39" r="2.5" fill="white" />
      </g>
    </svg>
  );
};
