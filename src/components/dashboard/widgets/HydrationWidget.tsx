import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Droplets, Plus, Settings2, Bell, BellOff, GlassWater, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const HydrationWidget: React.FC = () => {
  const { hydration, addWater, setHydrationTarget, toggleWaterReminder } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [customTarget, setCustomTarget] = useState(hydration.targetMl.toString());
  const [customAmount, setCustomAmount] = useState('250');
  const [customUnit, setCustomUnit] = useState('');

  const targetMl = hydration.targetMl || 2500;
  const todayLogs = hydration.todayLogs || [];
  const currentTotalMl = todayLogs.reduce((acc, c) => acc + (c.amountMl || 0), 0);
  const percent = Math.min(100, Math.round((currentTotalMl / targetMl) * 100));
  const remainingMl = Math.max(0, targetMl - currentTotalMl);
  const glassesDrunk = (currentTotalMl / 250).toFixed(1);

  // Group today's logs by hour buckets (06:00 to 22:00)
  const chartData = useMemo(() => {
    const hoursMap: Record<string, number> = {
      '06:00': 0,
      '08:00': 0,
      '10:00': 0,
      '12:00': 0,
      '14:00': 0,
      '16:00': 0,
      '18:00': 0,
      '20:00': 0,
      '22:00': 0,
    };

    todayLogs.forEach(log => {
      if (!log.timestamp) return;
      const hourNum = parseInt(log.timestamp.split(':')[0], 10);
      if (isNaN(hourNum)) return;

      if (hourNum < 7) hoursMap['06:00'] += log.amountMl;
      else if (hourNum < 9) hoursMap['08:00'] += log.amountMl;
      else if (hourNum < 11) hoursMap['10:00'] += log.amountMl;
      else if (hourNum < 13) hoursMap['12:00'] += log.amountMl;
      else if (hourNum < 15) hoursMap['14:00'] += log.amountMl;
      else if (hourNum < 17) hoursMap['16:00'] += log.amountMl;
      else if (hourNum < 19) hoursMap['18:00'] += log.amountMl;
      else if (hourNum < 21) hoursMap['20:00'] += log.amountMl;
      else hoursMap['22:00'] += log.amountMl;
    });

    return Object.entries(hoursMap).map(([hour, ml]) => ({
      hour,
      ml,
      glasses: (ml / 250).toFixed(1),
    }));
  }, [todayLogs]);

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customTarget, 10);
    if (!isNaN(val) && val >= 500) {
      setHydrationTarget(val);
      setShowSettings(false);
    }
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(customAmount);
    if (!customUnit) {
      alert('Please select a unit (ML, Litre, KG, Oz, Cups, No. of) before adding intake.');
      return;
    }
    if (!isNaN(amt) && amt > 0) {
      addWater(amt, customUnit);
      setCustomAmount('');
      setCustomUnit('');
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2 rounded-xl bg-slate-900/95 text-white border border-cyan-500/40 shadow-xl text-xs space-y-0.5">
          <p className="font-bold text-cyan-400 font-mono">{label}</p>
          <div className="flex items-center gap-1 text-slate-200">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span className="font-bold font-mono">{data.ml} ml</span>
            <span className="text-slate-400 text-[10px]">({data.glasses} gl)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60 shrink-0">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Hydration & Water
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Daily goal: {targetMl} ml
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            {percent}%
          </span>
          <button
            id="btn-hydration-settings"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Hydration Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings ? (
        <form onSubmit={handleSaveTarget} className="space-y-3 text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Daily Target (ml):
            </label>
            <input
              type="number"
              step="100"
              value={customTarget}
              onChange={e => setCustomTarget(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Reminder (2h):</span>
            <button
              type="button"
              onClick={() => toggleWaterReminder(!hydration.reminderEnabled)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                hydration.reminderEnabled
                  ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              }`}
            >
              {hydration.reminderEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              <span>{hydration.reminderEnabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition cursor-pointer text-xs"
            >
              Save Goal
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Drunk</span>
              <div className="text-sm font-black font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                {currentTotalMl} <span className="text-[10px] font-sans font-normal text-slate-500">ml</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Glasses</span>
              <div className="text-sm font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {glassesDrunk} <span className="text-[10px] font-sans font-normal text-slate-500">gl</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Remaining</span>
              <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {remainingMl} <span className="text-[10px] font-sans font-normal text-slate-500">ml</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </div>

          {/* Custom Unit Input & Quick Add Bar */}
          <form onSubmit={handleCustomAdd} className="flex items-center gap-1.5 pt-1">
            <input
              type="number"
              step="any"
              placeholder="Amount"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              className="w-20 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden"
            />
            <select
              value={customUnit}
              onChange={e => setCustomUnit(e.target.value)}
              className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="" disabled>Select Unit...</option>
              <option value="ml">ML</option>
              <option value="litre">Litre</option>
              <option value="kg">KG</option>
              <option value="oz">Oz</option>
              <option value="cups">Cups</option>
              <option value="no_of">No. of</option>
            </select>
            <button
              type="submit"
              className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log</span>
            </button>
          </form>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => addWater(250, 'ml')}
              className="flex-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              +250 ml
            </button>
            <button
              type="button"
              onClick={() => addWater(500, 'ml')}
              className="flex-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              +500 ml
            </button>
            <button
              type="button"
              onClick={() => addWater(1, 'litre')}
              className="flex-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              +1 Litre
            </button>
            <button
              type="button"
              onClick={() => addWater(1, 'cups')}
              className="flex-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              +1 Cup
            </button>
          </div>

          {/* Hourly Trend Chart */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hourly Trend</span>
              <span className="text-[9px] font-mono text-slate-400">Today</span>
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ml" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.ml > 0 ? '#06b6d4' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
