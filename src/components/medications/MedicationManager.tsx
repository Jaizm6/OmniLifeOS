import React, { useState } from 'react';
import {
  Pill,
  Plus,
  Clock,
  AlertTriangle,
  Check,
  X,
  Droplets,
  Calendar,
  History,
  RotateCcw,
  Sparkles,
  Package,
  Edit2,
  Trash2,
  Bell,
  BellOff,
  AlarmClock,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Medication, MedicationFrequency, ReminderType } from '../../types';
import { soundEngine } from '../../utils/audio';
import { IconRenderer } from '../common/IconRenderer';
import { QuoteBanner } from '../common/QuoteBanner';

export const MedicationManager: React.FC = () => {
  const {
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
    doseLogs,
    logDose,
    refillPills,
    hydration,
    addWater,
    setHydrationTarget,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'inventory' | 'history'>('schedule');
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [refillMedId, setRefillMedId] = useState<string | null>(null);
  const [refillAmount, setRefillAmount] = useState('30');

  // Form state for adding/editing medication
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('After meal with water');
  const [frequency, setFrequency] = useState<MedicationFrequency>('daily');
  const [color, setColor] = useState('#6366f1');
  const [iconType, setIconType] = useState<Medication['iconType']>('pill');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(['08:00']);
  const [newTimeInput, setNewTimeInput] = useState('13:00');
  const [totalPills, setTotalPills] = useState('60');
  const [remainingPills, setRemainingPills] = useState('60');
  const [refillThreshold, setRefillThreshold] = useState('10');
  const [active, setActive] = useState(true);
  const [reminderType, setReminderType] = useState<ReminderType>('alarm');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleOpenAddModal = () => {
    setEditingMed(null);
    setName('');
    setDosage('');
    setInstructions('After meal with water');
    setFrequency('daily');
    setColor('#6366f1');
    setIconType('pill');
    setScheduleTimes(['08:00']);
    setNewTimeInput('13:00');
    setTotalPills('60');
    setRemainingPills('60');
    setRefillThreshold('10');
    setActive(true);
    setReminderType('alarm');
    setShowModal(true);
  };

  const handleOpenEditModal = (med: Medication) => {
    setEditingMed(med);
    setName(med.name);
    setDosage(med.dosage);
    setInstructions(med.instructions);
    setFrequency(med.frequency);
    setColor(med.color);
    setIconType(med.iconType);
    setScheduleTimes(med.schedules && med.schedules.length > 0 ? med.schedules.map(s => s.time) : ['08:00']);
    setNewTimeInput('13:00');
    setTotalPills(String(med.totalPills));
    setRemainingPills(String(med.remainingPills));
    setRefillThreshold(String(med.refillThreshold));
    setActive(med.active ?? true);
    setReminderType(med.reminderType || 'alarm');
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const schedules = scheduleTimes.map((time, idx) => ({
      time,
      label: idx === 0 ? 'Morning' : idx === 1 ? 'Afternoon' : idx === 2 ? 'Evening' : 'Night',
    }));

    const parsedTotal = Math.max(1, parseInt(totalPills, 10) || 30);
    const parsedThreshold = Math.max(1, parseInt(refillThreshold, 10) || 10);
    const parsedRemaining = Math.max(0, parseInt(remainingPills, 10) || 0);

    if (editingMed) {
      updateMedication({
        ...editingMed,
        name: name.trim(),
        dosage: dosage.trim() || '1 tablet',
        instructions: instructions.trim() || 'With water',
        frequency,
        color,
        iconType,
        schedules,
        totalPills: parsedTotal,
        remainingPills: parsedRemaining,
        refillThreshold: parsedThreshold,
        active,
        reminderType,
      });
    } else {
      addMedication({
        name: name.trim(),
        dosage: dosage.trim() || '1 tablet',
        instructions: instructions.trim() || 'With water',
        frequency,
        color,
        iconType,
        schedules,
        totalPills: parsedTotal,
        remainingPills: parsedRemaining || parsedTotal,
        refillThreshold: parsedThreshold,
        startDate: todayStr,
        active: true,
        reminderType,
      });
    }

    setShowModal(false);
  };

  const handleDeleteCurrentMed = () => {
    if (editingMed) {
      deleteMedication(editingMed.id);
      setShowModal(false);
    }
  };

  const handleAddTime = () => {
    if (newTimeInput && !scheduleTimes.includes(newTimeInput)) {
      setScheduleTimes([...scheduleTimes, newTimeInput].sort());
    }
  };

  const handleRemoveTime = (timeToRemove: string) => {
    if (scheduleTimes.length > 1) {
      setScheduleTimes(scheduleTimes.filter(t => t !== timeToRemove));
    }
  };

  const handleRefillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refillMedId) {
      const amt = parseInt(refillAmount, 10) || 30;
      refillPills(refillMedId, amt);
      setRefillMedId(null);
    }
  };

  const lowStockCount = medications.filter(m => m.active && m.remainingPills <= m.refillThreshold).length;

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Medication Title Bar (Consistent with Tasks & Master Calendar Pattern) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
            <Pill className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Medication & Supplement Regimen
              </h2>
              {lowStockCount > 0 ? (
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0">
                  <AlertTriangle className="w-3 h-3" />
                  {lowStockCount} Refill Needed
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                  {medications.filter(m => m.active).length} active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Intelligent dose scheduling, inventory tracking, refill alerts and adherence logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            id="btn-open-add-med"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* Daily Wisdom Widget (Positioned under the top medication header) */}
      <QuoteBanner />

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeSubTab === 'schedule'
              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Daily Schedule
        </button>
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'inventory'
              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Pill Inventory ({medications.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeSubTab === 'history'
              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Adherence Logs</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeSubTab === 'schedule' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map(med => {
            const isLowStock = med.remainingPills <= med.refillThreshold;
            const stockPct = Math.min(100, Math.round((med.remainingPills / med.totalPills) * 100));

            return (
              <div
                key={med.id}
                className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition flex flex-col justify-between ${
                  isLowStock
                    ? 'border-amber-300/80 dark:border-amber-800/80'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Pill Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
                        style={{ backgroundColor: `${med.color}25`, color: med.color }}
                      >
                        <IconRenderer icon={med.iconType} className="w-5 h-5" fallback={<Pill className="w-5 h-5" />} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {med.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                          {med.dosage} &bull; {med.frequency}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(med)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Medication"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefillMedId(med.id)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        + Refill
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Notes:</span> {med.instructions}
                  </div>

                  {/* Schedules */}
                  <div className="mt-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Scheduled Doses Today
                    </span>
                    <div className="space-y-1.5">
                      {med.schedules.map(sched => {
                        const doseLog = doseLogs.find(
                          d =>
                            d.medicationId === med.id &&
                            d.scheduledTime === sched.time &&
                            d.loggedAt.startsWith(todayStr)
                        );
                        const isTaken = doseLog?.status === 'taken';

                        return (
                          <div
                            key={sched.time}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 text-xs"
                          >
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              {sched.time} ({sched.label})
                            </span>

                            {isTaken ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <Check className="w-3.5 h-3.5" /> Taken
                              </span>
                            ) : (
                              <button
                                onClick={() => logDose(med.id, sched.time, 'taken')}
                                className="px-2.5 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                              >
                                Take Now
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Stock bar & Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400">
                      Inventory Remaining
                    </span>
                    <span className={`font-semibold ${isLowStock ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                      {med.remainingPills} / {med.totalPills} pills
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isLowStock ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${stockPct}%` }}
                    />
                  </div>
                  {isLowStock && (
                    <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Low stock alert (threshold: {med.refillThreshold})
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pill Inventory Table View */}
      {activeSubTab === 'inventory' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Medication</th>
                  <th className="p-3.5">Dosage</th>
                  <th className="p-3.5">Remaining Stock</th>
                  <th className="p-3.5">Refill Threshold</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {medications.map(med => (
                  <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold"
                        style={{ backgroundColor: `${med.color}20`, color: med.color }}
                      >
                        <IconRenderer icon={med.iconType} className="w-4 h-4" fallback={<Pill className="w-4 h-4" />} />
                      </div>
                      {med.name}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{med.dosage}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {med.remainingPills} pills
                    </td>
                    <td className="p-3.5 text-slate-500">{med.refillThreshold} pills</td>
                    <td className="p-3.5">
                      {med.remainingPills <= med.refillThreshold ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          Sufficient
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEditModal(med)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setRefillMedId(med.id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-semibold"
                      >
                        Refill
                      </button>
                      <button
                        onClick={() => deleteMedication(med.id)}
                        className="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adherence Dose Logs View */}
      {activeSubTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Dose Intake Log
            </h3>
            <span className="text-xs text-slate-400">Total logs: {doseLogs.length}</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {doseLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No medication doses logged yet.
              </div>
            ) : (
              doseLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {log.medicationName}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scheduled: {log.scheduledTime} &bull; Logged:{' '}
                      {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[11px] capitalize ${
                      log.status === 'taken'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Medication Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    editingMed
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {editingMed ? <Edit2 className="w-4 h-4" /> : <Pill className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {editingMed ? 'Edit Medication' : 'Add Medication / Supplement'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {editingMed ? 'Update dosage, schedule times, or pill inventory stock.' : 'Schedule a new medication with dose reminders and tracking.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs [scrollbar-width:thin]">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lisinopril, Omega-3, Multivitamin"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Medicine Form & Icon
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { type: 'pill', label: 'Pill' },
                      { type: 'capsule', label: 'Capsule' },
                      { type: 'drop', label: 'Drops' },
                      { type: 'injection', label: 'Injection' },
                      { type: 'inhaler', label: 'Inhaler' },
                    ].map(item => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setIconType(item.type as Medication['iconType'])}
                        className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition ${
                          iconType === item.type
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <IconRenderer icon={item.type} className="w-4 h-4" />
                        <span className="text-[10px] leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2,000 IU (1 Softgel), 10mg"
                      value={dosage}
                      onChange={e => setDosage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={e => setFrequency(e.target.value as MedicationFrequency)}
                      className="w-full px-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="daily">Daily</option>
                      <option value="twice_daily">Twice Daily</option>
                      <option value="thrice_daily">Thrice Daily</option>
                      <option value="as_needed">As Needed</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Instructions / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Take with morning meal or healthy fats"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Schedule times builder */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Dose Reminder Times
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {scheduleTimes.map(t => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
                      >
                        <Clock className="w-3 h-3" />
                        {t}
                        {scheduleTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTime(t)}
                            className="hover:text-rose-500 ml-1 text-sm font-bold"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={newTimeInput}
                      onChange={e => setNewTimeInput(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddTime}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition"
                    >
                      + Add Time
                    </button>
                  </div>
                </div>

                {/* Dose Alert Delivery Type */}
                <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Reminder Delivery Mode</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {reminderType === 'alarm' ? 'Plays audio chime & alert banner' : reminderType === 'notification' ? 'Standard app notification' : 'No sound or alerts (Disabled)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReminderType('none')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                        reminderType === 'none'
                          ? 'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300 font-bold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <BellOff className="w-4 h-4 text-slate-500 mb-1" />
                      <div className="text-[11px] font-bold">None</div>
                      <div className="text-[9px] text-slate-400 hidden sm:block">Silent</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReminderType('notification')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                        reminderType === 'notification'
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Bell className="w-4 h-4 text-indigo-500 mb-1" />
                      <div className="text-[11px] font-bold">Notification</div>
                      <div className="text-[9px] text-slate-400 hidden sm:block">Quiet Chime</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReminderType('alarm');
                        soundEngine?.playSuccessChime();
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                        reminderType === 'alarm'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <AlarmClock className="w-4 h-4 text-rose-500 mb-1" />
                      <div className="text-[11px] font-bold">Alarm</div>
                      <div className="text-[9px] text-slate-400 hidden sm:block">Full Alert</div>
                    </button>
                  </div>
                </div>

                {/* Inventory details */}
                <div className={`grid ${editingMed ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
                  {editingMed && (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Current Remaining
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={remainingPills}
                        onChange={e => setRemainingPills(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      {editingMed ? 'Total Supply Capacity' : 'Initial Stock Count'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={totalPills}
                      onChange={e => setTotalPills(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Refill Alert Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={refillThreshold}
                      onChange={e => setRefillThreshold(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Tag Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition ${
                          color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Active Toggle for editing */}
                {editingMed && (
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={e => setActive(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span>Active in daily regimen & dose reminders</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Fixed Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-xs">
                {editingMed ? (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentMed}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
                  >
                    {editingMed ? 'Save Changes' : 'Add Medication'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refill Modal */}
      {refillMedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Refill Medication Stock
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter number of pills or tablets added to your supply:
            </p>
            <form onSubmit={handleRefillSubmit} className="space-y-3">
              <input
                type="number"
                value={refillAmount}
                onChange={e => setRefillAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefillAmount('30')}
                  className="flex-1 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  +30
                </button>
                <button
                  type="button"
                  onClick={() => setRefillAmount('60')}
                  className="flex-1 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  +60
                </button>
                <button
                  type="button"
                  onClick={() => setRefillAmount('90')}
                  className="flex-1 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  +90
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefillMedId(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Confirm Refill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
