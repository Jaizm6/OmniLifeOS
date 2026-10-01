import React, { useState } from 'react';
import { Droplets, Settings2, Bell, BellOff, Plus } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const HydrationDashboard: React.FC = () => {
  const { hydration, addWater, setHydrationTarget, toggleWaterReminder } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [customTarget, setCustomTarget] = useState(hydration.targetMl.toString());
  const [amount, setAmount] = useState('250');
  const [unit, setUnit] = useState('');

  const targetMl = hydration.targetMl || 2500;
  const todayLogs = hydration.todayLogs || [];
  const currentTotalMl = todayLogs.reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
  const achievementPct = Math.min(100, Math.round((currentTotalMl / targetMl) * 100));
  const currentGlasses = (currentTotalMl / 250).toFixed(1);
  const targetGlasses = (targetMl / 250).toFixed(0);

  const handleAddWater = (quickAmount?: number, quickUnit?: string) => {
    const amt = quickAmount !== undefined ? quickAmount : parseFloat(amount);
    const u = quickUnit !== undefined ? quickUnit : unit;
    if (!u) {
      alert('Please select a unit (ML, Litre, KG, Oz, Cups, No. of) before adding intake.');
      return;
    }
    if (!isNaN(amt) && amt > 0) {
      addWater(amt, u);
      setUnit('');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customTarget);
    if (!isNaN(val) && val > 0) {
      setHydrationTarget(val);
    }
    setShowSettings(false);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Hydration</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
          title="Hydration Settings"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {showSettings ? (
        <form onSubmit={handleSaveSettings} className="space-y-2 text-xs">
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">
              Daily Goal (ml):
            </label>
            <input
              type="number"
              step="100"
              value={customTarget}
              onChange={e => setCustomTarget(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 dark:text-slate-300">Drink Reminder:</span>
            <button
              type="button"
              onClick={() => toggleWaterReminder(!hydration.reminderEnabled)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[10px] transition cursor-pointer ${
                hydration.reminderEnabled
                  ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}
            >
              {hydration.reminderEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              <span>{hydration.reminderEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
          <div className="flex gap-1.5 pt-1">
            <button
              type="submit"
              className="flex-1 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {/* Progress Row */}
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-mono font-black text-cyan-600 dark:text-cyan-400 tracking-tight">
                {currentTotalMl}
              </span>
              <span className="text-[11px] font-sans text-slate-400">
                / {targetMl} ml
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50">
              {achievementPct}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, achievementPct)}%` }}
            />
          </div>

          {/* Sub-text summary */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>🥛 {currentGlasses} / {targetGlasses} glasses</span>
            <span className="text-cyan-600 dark:text-cyan-400">
              {achievementPct >= 100 ? 'Goal Met! 💧' : `${Math.max(0, targetMl - currentTotalMl)}ml left`}
            </span>
          </div>

          {/* Custom Input + Unit Dropdown + Add */}
          <div className="flex items-center gap-1 pt-1">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              placeholder="Qty"
            />
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="" disabled>Select Unit...</option>
              <option value="ml">ML</option>
              <option value="l">Litre</option>
              <option value="kg">KG</option>
              <option value="oz">Oz</option>
              <option value="cups">Cups</option>
              <option value="no_of">No. of</option>
            </select>
            <button
              type="button"
              onClick={() => handleAddWater()}
              className="flex-1 py-1 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Compact Quick Add Row */}
          <div className="grid grid-cols-3 gap-1 pt-0.5">
            <button
              type="button"
              onClick={() => handleAddWater(250, 'ml')}
              className="py-1 px-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/70 text-cyan-700 dark:text-cyan-300 font-bold text-[10px] border border-cyan-200/50 dark:border-cyan-800/50 transition text-center cursor-pointer active:scale-95"
            >
              🥛 +250ml
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(350, 'ml')}
              className="py-1 px-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/70 text-cyan-700 dark:text-cyan-300 font-bold text-[10px] border border-cyan-200/50 dark:border-cyan-800/50 transition text-center cursor-pointer active:scale-95"
            >
              +350ml
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(500, 'ml')}
              className="py-1 px-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/70 dark:hover:bg-cyan-800 text-cyan-800 dark:text-cyan-200 font-bold text-[10px] border border-cyan-300/60 dark:border-cyan-700/60 transition text-center cursor-pointer active:scale-95"
            >
              +500ml
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
