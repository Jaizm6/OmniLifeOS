import React from 'react';
import {
  Book,
  PenTool,
  Sparkles,
  Sun,
  Moon,
  Heart,
  Brain,
} from 'lucide-react';

export interface GuidedTemplatesDeckProps {
  onSelectTemplate: (templateType: 'daily_reflection' | 'notes' | 'dream_journal' | 'morning' | 'evening' | 'positive' | 'cbt') => void;
}

export const GuidedTemplatesDeck: React.FC<GuidedTemplatesDeckProps> = ({
  onSelectTemplate,
}) => {
  const templates = [
    {
      id: 'daily_reflection' as const,
      title: 'Daily Reflection',
      subtitle: 'Reflect on today’s events, wins, and key takeaways',
      icon: <Book className="w-4 h-4 text-indigo-500" />,
      accentBg: 'from-indigo-500/10 to-blue-500/5 dark:from-indigo-950/30 dark:to-slate-900',
      borderColor: 'border-indigo-200/80 dark:border-indigo-800/50',
    },
    {
      id: 'notes' as const,
      title: 'Notes',
      subtitle: 'Capture quick thoughts, ideas, and freeform notes',
      icon: <PenTool className="w-4 h-4 text-emerald-500" />,
      accentBg: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/30 dark:to-slate-900',
      borderColor: 'border-emerald-200/80 dark:border-emerald-800/50',
    },
    {
      id: 'dream_journal' as const,
      title: 'Dream Journal',
      subtitle: 'Record vivid dreams, symbols, and morning thoughts',
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      accentBg: 'from-purple-500/10 to-pink-500/5 dark:from-purple-950/30 dark:to-slate-900',
      borderColor: 'border-purple-200/80 dark:border-purple-800/50',
    },
    {
      id: 'morning' as const,
      title: 'Morning Intentions',
      subtitle: 'Set intentional goals, mindsets & early gratitude',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      accentBg: 'from-amber-500/10 to-orange-500/5 dark:from-amber-950/30 dark:to-slate-900',
      borderColor: 'border-amber-200/80 dark:border-amber-800/50',
    },
    {
      id: 'evening' as const,
      title: 'Evening Review',
      subtitle: 'Review accomplishments, peace of mind & lessons',
      icon: <Moon className="w-4 h-4 text-indigo-500" />,
      accentBg: 'from-indigo-500/10 to-purple-500/5 dark:from-indigo-950/30 dark:to-slate-900',
      borderColor: 'border-indigo-200/80 dark:border-indigo-800/50',
    },
    {
      id: 'positive' as const,
      title: 'Positive Moments',
      subtitle: 'Celebrate micro-wins, savor happiness & blessings',
      icon: <Heart className="w-4 h-4 text-rose-500" />,
      accentBg: 'from-rose-500/10 to-pink-500/5 dark:from-rose-950/30 dark:to-slate-900',
      borderColor: 'border-rose-200/80 dark:border-rose-800/50',
    },
    {
      id: 'cbt' as const,
      title: 'CBT Thought Diary',
      subtitle: 'Examine automatic thoughts & cognitive reframing',
      icon: <Brain className="w-4 h-4 text-purple-500" />,
      accentBg: 'from-purple-500/10 to-rose-500/5 dark:from-purple-950/30 dark:to-slate-900',
      borderColor: 'border-purple-200/80 dark:border-purple-800/50',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Guided Journal Template
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full">
        {templates.map(tmpl => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onSelectTemplate(tmpl.id)}
            className={`p-3 rounded-xl bg-gradient-to-br ${tmpl.accentBg} border ${tmpl.borderColor} flex items-center justify-start gap-4 hover:shadow-md transition overflow-hidden w-full cursor-pointer text-left`}
          >
            <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-2xs">
              {tmpl.icon}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {tmpl.title}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {tmpl.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
