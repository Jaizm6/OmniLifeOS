import React, { useRef, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatLocalDate } from '../../utils/date';
import { soundEngine } from '../../utils/audio';

interface ScrollableCompactDateStripProps {
  selectedDateStr: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  daysRange?: number; // default 28 days before & after
  className?: string;
  showTodayJump?: boolean;
}

export const ScrollableCompactDateStrip: React.FC<ScrollableCompactDateStripProps> = ({
  selectedDateStr,
  onSelectDate,
  daysRange = 28,
  className = '',
  showTodayJump = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedBtnRef = useRef<HTMLButtonElement>(null);
  const todayStr = formatLocalDate();

  // Generate date array centered around today
  const dateList = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = -daysRange; i <= daysRange; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Fri", "Sat"
      const dayNum = d.getDate(); // 25, 26
      const monthName = d.toLocaleDateString('en-US', { month: 'short' }); // "Sep"
      list.push({
        dateStr,
        dayName,
        dayNum,
        monthName,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
      });
    }
    return list;
  }, [selectedDateStr, todayStr, daysRange]);

  const isFirstMount = useRef(true);

  // Scroll selected date into center view on mount/change with smooth centering
  useEffect(() => {
    if (selectedBtnRef.current && containerRef.current) {
      selectedBtnRef.current.scrollIntoView({
        behavior: isFirstMount.current ? ('instant' as ScrollBehavior) : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      isFirstMount.current = false;
    }
  }, [selectedDateStr]);

  const handleSelect = (dateStr: string) => {
    if (dateStr !== selectedDateStr) {
      try {
        soundEngine?.playPill?.();
      } catch {}
      onSelectDate(dateStr);
    }
  };

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  const handleJumpToday = () => {
    handleSelect(todayStr);
  };

  return (
    <div className={`relative w-full flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/70 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs select-none backdrop-blur-xs ${className}`}>
      {/* Scroll Left Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.08 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        onClick={scrollLeft}
        className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer shadow-2xs"
        title="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </motion.button>

      {/* Date Carousel List */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-1 scroll-smooth"
      >
        {dateList.map((item) => {
          return (
            <motion.button
              key={item.dateStr}
              ref={item.isSelected ? selectedBtnRef : null}
              type="button"
              onClick={() => handleSelect(item.dateStr)}
              whileTap={{ scale: 0.90, y: 1 }}
              whileHover={{ scale: 1.04, y: -2 }}
              transition={{ type: "spring", stiffness: 450, damping: 28, mass: 0.8 }}
              className={`relative group flex flex-col items-center justify-between min-w-[56px] h-[78px] rounded-[24px] cursor-pointer shrink-0 text-center overflow-hidden border transition-all ${
                item.isSelected
                  ? 'border-[#c1415d] shadow-md ring-2 ring-[#c1415d]/20 z-10'
                  : item.isToday
                  ? 'border-[#c1415d]/40 dark:border-[#f3a4b5]/40 bg-white/50 dark:bg-slate-800/50'
                  : 'border-[#f2e6e7] dark:border-[#2e2627] hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-800/30'
              }`}
            >
              {/* Spring Active Indicator Background - Dual Tone via Linear Gradient */}
              {item.isSelected && (
                <motion.div
                  layoutId="activeDateStripHighlight"
                  className="absolute inset-0 rounded-[23px] -z-10"
                  style={{
                    background: 'linear-gradient(to bottom, #c1415d 43%, #992641 43%)'
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                />
              )}

              {/* Top Dual-Tone Half (Day Name: Fri, Sat, Tue, etc.) */}
              <div
                className={`w-full pt-2 pb-1 px-2 text-[11px] font-semibold tracking-wide transition-colors ${
                  item.isSelected
                    ? 'text-white/95'
                    : item.isToday
                    ? 'bg-[#feeef0] dark:bg-[#3a1518] text-[#c1415d] dark:text-[#f3a4b5]'
                    : 'bg-[#fcf6f7] dark:bg-[#1a1617] text-[#7c6a6c] dark:text-[#a09092] group-hover:text-slate-900 dark:group-hover:text-white'
                }`}
              >
                {item.dayName}
              </div>

              {/* Bottom Dual-Tone Half (Date Number: 25, 26, 29, etc.) */}
              <div
                className={`w-full flex-1 flex flex-col items-center justify-center px-2 pb-2 transition-colors relative ${
                  item.isSelected
                    ? 'text-white font-extrabold bg-transparent'
                    : item.isToday
                    ? 'bg-[#fddde1] dark:bg-[#4d191d] text-[#992641] dark:text-[#f8bac7] font-extrabold'
                    : 'bg-[#f4eae9] dark:bg-[#282021] text-[#5e4a4c] dark:text-[#dfd0d2] font-bold'
                }`}
              >
                <span className="text-base font-bold leading-none">{item.dayNum}</span>

                {/* Subtle White Notch Line at bottom for Selected Date, or Rose indicator for Today */}
                {item.isSelected ? (
                  <div className="w-4 h-0.75 bg-white/70 rounded-full mt-1.5" />
                ) : item.isToday ? (
                  <motion.div
                    className="w-3.5 h-0.5 rounded-full mt-1.5 bg-[#c1415d] dark:bg-[#f3a4b5]"
                    title="Today"
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                ) : null}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.08 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        onClick={scrollRight}
        className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer shadow-2xs"
        title="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </motion.button>

      {/* Today Jump Shortcut */}
      <AnimatePresence>
        {showTodayJump && selectedDateStr !== todayStr && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            whileTap={{ scale: 0.90 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={handleJumpToday}
            className="ml-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition shrink-0 flex items-center gap-1 cursor-pointer overflow-hidden"
            title="Jump to today"
          >
            <CalendarIcon className="w-3 h-3" />
            <span>Today</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
