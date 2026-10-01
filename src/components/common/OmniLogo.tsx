import React from 'react';

interface OmniLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const OmniLogo: React.FC<OmniLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle = 'All-in-One Unified Life Log',
  className = '',
  onClick,
}) => {
  const iconDimensions = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  const titleSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  }[size];

  const subtitleSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Omni Emblem Mark - Squircle */}
      <div
        className={`${iconDimensions} relative shrink-0 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-0.5 shadow-md shadow-indigo-500/10 border border-indigo-500/30 dark:border-indigo-400/30 flex items-center justify-center overflow-hidden group`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform transition-transform duration-300 group-hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="omniGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="omniGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="sparkGradComponent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
          </defs>

          {/* Ambient Glow */}
          <circle cx="50" cy="50" r="32" fill="#6366f1" fillOpacity="0.25" />

          {/* Upper Right Orbit Arc */}
          <path
            d="M 50 18 A 32 32 0 0 1 82 50 A 32 32 0 0 1 73 72"
            stroke="url(#omniGrad1)"
            strokeWidth="7.5"
            strokeLinecap="round"
          />

          {/* Lower Left Orbit Arc */}
          <path
            d="M 50 82 A 32 32 0 0 1 18 50 A 32 32 0 0 1 27 28"
            stroke="url(#omniGrad2)"
            strokeWidth="7.5"
            strokeLinecap="round"
          />

          {/* Inner Loop Nexus */}
          <path
            d="M 39 50 C 39 40 45 34 50 34 C 55 34 61 40 61 50 C 61 60 55 66 50 66 C 45 66 39 60 39 50 Z"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeOpacity="0.95"
          />

          {/* Orbit Node - Tasks & Flow (Cyan) */}
          <circle cx="82" cy="50" r="4.5" fill="#06b6d4" />
          <circle cx="82" cy="50" r="2.2" fill="#ffffff" />

          {/* Orbit Node - Health & Life (Emerald) */}
          <circle cx="18" cy="50" r="4.5" fill="#10b981" />
          <circle cx="18" cy="50" r="2.2" fill="#ffffff" />

          {/* Central Spark */}
          <path
            d="M 50 43 Q 50 50 57 50 Q 50 50 50 57 Q 50 50 43 50 Q 50 50 50 43 Z"
            fill="url(#sparkGradComponent)"
          />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`${titleSizes} font-black tracking-tight text-slate-900 dark:text-white leading-tight flex items-center`}
            >
              <span>Omni</span>
              <span className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                LifeOS
              </span>
            </span>
            <span className="hidden sm:inline-flex text-[7.5px] font-black uppercase tracking-wider px-1 py-0.2 rounded-full bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 leading-none select-none opacity-80 shadow-2xs">
              Universal
            </span>
          </div>
          {subtitle && (
            <p className={`${subtitleSizes} hidden sm:block font-medium text-slate-500 dark:text-slate-400 truncate leading-none mt-0.5`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
