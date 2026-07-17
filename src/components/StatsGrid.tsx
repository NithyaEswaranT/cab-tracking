'use client';
import React from 'react';
import { CabLog } from '@/app/actions/db';

interface StatsGridProps {
  logs: CabLog[];
}

export default function StatsGrid({ logs }: StatsGridProps) {
  const totalRevenue = logs.reduce((sum, log) => sum + Number(log.amountReceived), 0);
  const totalGasCost = logs.reduce((sum, log) => sum + Number(log.gasCost), 0);
  const totalDriverPay = logs.reduce((sum, log) => sum + Number(log.driverPay), 0);
  const totalTrips = logs.reduce((sum, log) => sum + Number(log.tripsCount), 0);
  const totalTally = logs.reduce((sum, log) => sum + Number(log.balance), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Net Tally Balance Card */}
      <div className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        totalTally >= 0
          ? 'bg-slate-900/60 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5'
          : 'bg-slate-900/60 border-rose-500/20 hover:border-rose-500/40 shadow-rose-500/5'
      }`}>
        <div className="flex justify-between items-start">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Balance Amount</p>
          <span className={`p-1.5 rounded-lg text-xs font-bold ${
            totalTally >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            Net
          </span>
        </div>
        <p className={`text-2xl md:text-3xl font-bold mt-3 tracking-tight ${
          totalTally >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {formatCurrency(totalTally)}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {logs.length} logged {logs.length === 1 ? 'day' : 'days'}
        </p>
      </div>

      {/* Gross Earnings Card */}
      <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300">
        <div className="flex justify-between items-start">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount Received</p>
          <span className="p-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400">
            Earnings
          </span>
        </div>
        <p className="text-2xl md:text-3xl font-bold mt-3 tracking-tight text-slate-100">
          {formatCurrency(totalRevenue)}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Average: {formatCurrency(logs.length ? totalRevenue / logs.length : 0)} / day
        </p>
      </div>

      {/* Driver Pay Card */}
      <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md hover:border-violet-500/20 hover:-translate-y-1 transition-all duration-300">
        <div className="flex justify-between items-start">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver Payout</p>
          <span className="p-1.5 rounded-lg text-xs font-bold bg-violet-500/10 text-violet-400">
            Driver
          </span>
        </div>
        <p className="text-2xl md:text-3xl font-bold mt-3 tracking-tight text-slate-100">
          {formatCurrency(totalDriverPay)}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {logs.length ? ((totalDriverPay / (totalRevenue || 1)) * 100).toFixed(0) : 0}% of earnings
        </p>
      </div>

      {/* Gas Cost Card */}
      <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md hover:border-cyan-500/20 hover:-translate-y-1 transition-all duration-300">
        <div className="flex justify-between items-start">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gas Expenses</p>
          <span className="p-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400">
            Gas
          </span>
        </div>
        <p className="text-2xl md:text-3xl font-bold mt-3 tracking-tight text-slate-100">
          {formatCurrency(totalGasCost)}
        </p>
        <p className="text-xs text-slate-550 mt-2">
          Total: {totalTrips} trips
        </p>
      </div>
    </div>
  );
}
