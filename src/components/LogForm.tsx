'use client';
import React, { useState, useEffect } from 'react';
import { CabLog } from '@/app/actions/db';

interface LogFormProps {
  onSubmit: (log: Omit<CabLog, 'balance' | 'id'> & { id?: string }) => Promise<void>;
  editingLog: CabLog | null;
  onCancelEdit: () => void;
}

const initialFormState = {
  date: new Date().toISOString().split('T')[0],
  gasVolume: '',
  gasCost: '',
  tripsCount: '',
  amountReceived: '',
  driverPay: '',
  notes: '',
};

export default function LogForm({ onSubmit, editingLog, onCancelEdit }: LogFormProps) {
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevEditingLog, setPrevEditingLog] = useState<CabLog | null>(null);

  // Sync with editing log
  useEffect(() => {
    if (editingLog !== prevEditingLog) {
      setPrevEditingLog(editingLog);
      if (editingLog) {
        setFormData({
          date: editingLog.date,
          gasVolume: editingLog.gasVolume.toString(),
          gasCost: editingLog.gasCost.toString(),
          tripsCount: editingLog.tripsCount.toString(),
          amountReceived: editingLog.amountReceived.toString(),
          driverPay: editingLog.driverPay.toString(),
          notes: editingLog.notes || '',
        });
      } else if (prevEditingLog) {
        // Only reset if transitioning from edit mode to add mode
        setFormData({
          ...initialFormState,
          date: new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [editingLog, prevEditingLog]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setFormData((prev) => ({ ...prev, date: d.toISOString().split('T')[0] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate
    if (!formData.date) {
      setError('Date is required');
      setIsSubmitting(false);
      return;
    }
    if (formData.amountReceived.trim() === '') {
      setError('Amount Received is mandatory');
      setIsSubmitting(false);
      return;
    }
    if (formData.driverPay.trim() === '') {
      setError('Driver Pay is mandatory');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit({
        id: editingLog?.id,
        date: formData.date,
        gasVolume: Number(formData.gasVolume || 0),
        gasCost: Number(formData.gasCost || 0),
        tripsCount: Number(formData.tripsCount || 0),
        amountReceived: Number(formData.amountReceived || 0),
        driverPay: Number(formData.driverPay || 0),
        notes: formData.notes,
      });

      if (!editingLog) {
        // Reset form except date (handy for sequential entries)
        setFormData((prev) => ({
          ...initialFormState,
          date: prev.date,
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
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
        <h3 className="text-lg font-bold text-white tracking-tight">
          {editingLog ? '✏️ Edit Cab Log' : '🚖 Log Daily Activity'}
        </h3>
        {editingLog && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 transition"
          >
            Cancel Edit
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
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition text-sm"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => handleQuickDate(0)}
              className="text-2xs bg-slate-800/60 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded transition text-[11px]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(1)}
              className="text-2xs bg-slate-800/60 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded transition text-[11px]"
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Trips Count & Gas Filled */}
        <div className="grid grid-cols-2 gap-4">
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
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Gas Filled (L/gal)
            </label>
            <input
              type="number"
              name="gasVolume"
              placeholder="e.g. 12.5"
              min="0"
              step="any"
              value={formData.gasVolume}
              onChange={handleChange}
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>
        </div>

        {/* Monetary Fields */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Gas Cost ($)
            </label>
            <input
              type="number"
              name="gasCost"
              placeholder="0.00"
              min="0"
              step="any"
              value={formData.gasCost}
              onChange={handleChange}
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Amount Rec ($) *
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
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Driver Pay ($) *
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
              className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition text-sm"
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
            className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition text-sm resize-none"
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
              {liveTally >= 0 ? '+' : ''}
              {liveTally.toFixed(2)}
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
