import React, { useState } from 'react';
import { Sparkles, Shuffle, ArrowRight, BookOpen, Quote } from 'lucide-react';

interface ReflectionPromptCardProps {
  onAnswerPrompt: (promptText: string) => void;
}

const REFLECTION_QUESTIONS = [
  'What would my day be like if there were no financial limitations?',
  'What books, movies, or conversations have had a deep impact on me and why?',
  'What worries me about the future? How can I calmly prepare for it today?',
  'What positive events happened today, and how did they change my perspective?',
  'What can I do today to be healthier both physically and mentally?',
  'What new skills or curiosities do I want to explore, and how can I take the first step?',
  'How do I envision my ideal, peaceful future five years from now?',
  'What boundary can I set this week to protect my energy and inner peace?',
  'What is one small, quiet moment of beauty I noticed today?',
  'What did I forgive myself for recently, or what do I need to let go of?',
];

export const ReflectionPromptCard: React.FC<ReflectionPromptCardProps> = ({
  onAnswerPrompt,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  const currentQuestion = REFLECTION_QUESTIONS[currentIndex];

  const handleNextPrompt = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % REFLECTION_QUESTIONS.length);
      setIsFlipping(false);
    }, 150);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-pink-900/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200/70 dark:border-indigo-800/60 p-5 sm:p-6 shadow-xs">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
              Daily Reflection Prompt
            </span>
            <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 whitespace-nowrap">
              #{currentIndex + 1} of {REFLECTION_QUESTIONS.length}
            </span>
          </div>

          <div
            className={`min-h-[50px] flex items-center transition-opacity duration-150 ${
              isFlipping ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            }`}
          >
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              "{currentQuestion}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 pt-1 md:pt-0">
          <button
            type="button"
            onClick={handleNextPrompt}
            className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition shadow-2xs flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
            title="Next reflection prompt"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
            <span>Shuffle</span>
          </button>

          <button
            type="button"
            onClick={() => onAnswerPrompt(currentQuestion)}
            className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow-md transition active:scale-95 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
