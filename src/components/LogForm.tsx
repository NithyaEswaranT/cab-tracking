'use client';

import React, { useState, useEffect } from 'react';
import { CabLog } from '@/app/actions/db';

interface LogFormProps {
  onSubmit: (log: Omit<CabLog, 'balance' | 'id'> & { id?: string }) => Promise<void>;
  editingLog?: CabLog | null;
  onCancelEdit?: () => void;
  defaultDriverPay?: string;
}

export default function LogForm({ onSubmit, editingLog, onCancelEdit, defaultDriverPay }: LogFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    gasCost: '',
    tripsCount: '',
    amountReceived: '',
    driverPay: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync edit mode fields and default values
  useEffect(() => {
    if (editingLog) {
      setFormData({
        date: editingLog.date,
        gasCost: editingLog.gasCost ? editingLog.gasCost.toString() : '',
        tripsCount: editingLog.tripsCount ? editingLog.tripsCount.toString() : '',
        amountReceived: editingLog.amountReceived ? editingLog.amountReceived.toString() : '',
        driverPay: editingLog.driverPay ? editingLog.driverPay.toString() : '',
        notes: editingLog.notes || '',
      });
    } else {
      // Clear form except date (as requested to keep date locked on submit)
      setFormData((prev) => ({
        ...prev,
        gasCost: '',
        tripsCount: '',
        amountReceived: '',
        driverPay: defaultDriverPay || '', // pre-fill with fixed salary setting
        notes: '',
      }));
    }
  }, [editingLog, defaultDriverPay]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setFormData((prev) => ({
      ...prev,
      date: d.toISOString().split('T')[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Mandatories check
    if (!formData.amountReceived || !formData.driverPay) {
      setError("Amount Received and Driver Pay are mandatory fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit({
        id: editingLog?.id,
        date: formData.date,
        gasVolume: 0,
        gasCost: formData.gasCost ? Number(formData.gasCost) : 0,
        tripsCount: formData.tripsCount ? Number(formData.tripsCount) : 0,
        amountReceived: Number(formData.amountReceived),
        driverPay: Number(formData.driverPay),
        notes: formData.notes,
      });

      // Clear all fields EXCEPT the date
      setFormData((prev) => ({
        date: prev.date,
        gasCost: '',
        tripsCount: '',
        amountReceived: '',
        driverPay: defaultDriverPay || '', // reset to fixed driver salary
        notes: '',
      }));
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while saving details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live tally preview calculation
  const amountRec = Number(formData.amountReceived || 0);
  const gasCost = Number(formData.gasCost || 0);
  const driverPay = Number(formData.driverPay || 0);
  const liveTally = amountRec - gasCost - driverPay;

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-100 tracking-tight">
          {editingLog ? '✏️ Edit Cab Log' : '🚖 Log Daily Activity'}
        </h3>
        {onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="cursor-pointer text-xs text-slate-400 hover:text-slate-250 font-semibold px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-850 transition"
          >
            {editingLog ? 'Cancel Edit' : 'Close Form ✕'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Field & Shortcuts */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Date
          </label>
          <input
            type="date"
            name="date"
            required
            value={formData.date}
            onChange={handleChange}
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => handleQuickDate(0)}
              className="cursor-pointer text-2xs bg-slate-800/60 hover:bg-slate-850 text-slate-400 px-2 py-1 rounded transition text-[11px]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(1)}
              className="cursor-pointer text-2xs bg-slate-800/60 hover:bg-slate-850 text-slate-400 px-2 py-1 rounded transition text-[11px]"
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Trips Count */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            No. of Trips
          </label>
          <input
            type="number"
            name="tripsCount"
            placeholder="e.g. 15"
            min="0"
            value={formData.tripsCount}
            onChange={handleChange}
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm"
          />
        </div>

        {/* Monetary Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Gas Cost (₹)
            </label>
            <input
              type="number"
              name="gasCost"
              placeholder="0.00"
              min="0"
              step="any"
              value={formData.gasCost}
              onChange={handleChange}
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500 transition text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Amount Rec (₹) *
            </label>
            <input
              type="number"
              name="amountReceived"
              placeholder="0.00"
              min="0"
              step="any"
              required
              value={formData.amountReceived}
              onChange={handleChange}
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 transition text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Driver Pay (₹) *
            </label>
            <input
              type="number"
              name="driverPay"
              placeholder="0.00"
              min="0"
              step="any"
              required
              value={formData.driverPay}
              onChange={handleChange}
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-violet-500 transition text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            placeholder="e.g. rain, highway routes, vehicle service..."
            rows={2}
            value={formData.notes}
            onChange={handleChange}
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm resize-none"
          />
        </div>

        {/* Balance Amount Preview */}
        <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-3.5 flex justify-between items-center">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Balance Amount Preview</span>
            <span className="text-2xs text-slate-500">Rec - (Gas + Driver)</span>
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold ${liveTally >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {liveTally >= 0 ? '+' : '-'}₹{Math.abs(liveTally).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Submit Buttons */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl shadow-lg transition duration-200 active:scale-[0.98] disabled:opacity-50 text-sm mt-2"
        >
          {isSubmitting ? 'Saving...' : editingLog ? '💾 Save Changes' : '➕ Add Daily Log'}
        </button>
      </form>
    </div>
  );
}
