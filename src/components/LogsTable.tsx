'use client';
import React from 'react';
import { CabLog } from '@/app/actions/db';

interface LogsTableProps {
  logs: CabLog[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (log: CabLog) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function LogsTable({
  logs,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
}: LogsTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const handleDeleteConfirm = async (id: string) => {
    if (confirm('Are you sure you want to delete this log?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-slate-800/40 border-dashed text-slate-500 text-sm">
          No log entries found. Click 'Add Log' to create one!
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW: Full Structured Table */}
          <div className="hidden md:block overflow-x-auto bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Trips</th>
                  <th className="py-3 px-4">Gas Filled</th>
                  <th className="py-3 px-4">Gas Cost</th>
                  <th className="py-3 px-4">Revenue</th>
                  <th className="py-3 px-4">Driver Pay</th>
                  <th className="py-3 px-4">Balance Amount</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{log.date}</td>
                    <td className="py-3.5 px-4">{log.tripsCount}</td>
                    <td className="py-3.5 px-4">{log.gasVolume ? `${log.gasVolume.toFixed(1)} L/g` : '-'}</td>
                    <td className="py-3.5 px-4 text-cyan-400">{log.gasCost ? formatCurrency(log.gasCost) : '-'}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-medium">{formatCurrency(log.amountReceived)}</td>
                    <td className="py-3.5 px-4 text-violet-400">{formatCurrency(log.driverPay)}</td>
                    <td className="py-3.5 px-4 font-bold">
                      <span className={`px-2 py-0.5 rounded ${
                        log.balance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {log.balance >= 0 ? '+' : ''}{formatCurrency(log.balance)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-48 truncate text-slate-400" title={log.notes}>
                      {log.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(log)}
                          className="cursor-pointer p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(log.id)}
                          className="cursor-pointer p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW: Collapsed Card Grid */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 space-y-4 hover:border-slate-700 transition"
              >
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-2.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200 text-sm">{log.date}</span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {log.tripsCount} trips {log.gasVolume ? `• ${log.gasVolume.toFixed(1)}L gas` : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(log)}
                      className="cursor-pointer p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 active:scale-95 transition text-xs"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(log.id)}
                      className="cursor-pointer p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 active:scale-95 transition text-xs"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Full Card Stats breakdown for mobile */}
                <div className="grid grid-cols-2 gap-3.5 text-xs py-1">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Trips Count</span>
                    <p className="text-slate-200 font-semibold mt-0.5">{log.tripsCount} trips</p>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Gas Filled</span>
                    <p className="text-slate-200 font-semibold mt-0.5">{log.gasVolume ? `${log.gasVolume.toFixed(1)} L/g` : '-'}</p>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Gas Cost</span>
                    <p className="text-cyan-400 font-semibold mt-0.5">{log.gasCost ? formatCurrency(log.gasCost) : '$0.00'}</p>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Amount Rec.</span>
                    <p className="text-emerald-400 font-bold mt-0.5">{formatCurrency(log.amountReceived)}</p>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Driver Pay</span>
                    <p className="text-violet-400 font-semibold mt-0.5">{formatCurrency(log.driverPay)}</p>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Balance Amt.</span>
                    <p className={`font-bold mt-0.5 ${log.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {log.balance >= 0 ? '+' : ''}{formatCurrency(log.balance)}
                    </p>
                  </div>
                </div>

                {/* Notes (Conditional) */}
                {log.notes && (
                  <div className="bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/40 text-2xs text-slate-400 mt-2">
                    <span className="block text-[9px] text-slate-500 uppercase font-bold mb-0.5">Notes</span>
                    <p className="line-clamp-2">{log.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center py-2 text-xs">
              <span className="text-slate-500 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="cursor-pointer px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-100 rounded-lg disabled:opacity-40 transition font-bold"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-100 rounded-lg disabled:opacity-40 transition font-bold"
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
