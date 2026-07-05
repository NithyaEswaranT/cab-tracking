'use client';
import React, { useState } from 'react';
import { CabLog } from '@/app/actions/db';
import StatsGrid from '@/components/StatsGrid';

interface ReportsProps {
  logs: CabLog[];
}

interface GroupedData {
  key: string;
  sortKey: string;
  amountReceived: number;
  gasCost: number;
  gasVolume: number;
  driverPay: number;
  tripsCount: number;
  balance: number;
  daysLogged: number;
}

export default function Reports({ logs }: ReportsProps) {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper: Get Sunday of the week
  const getSundayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day; // adjust to Sunday
    const sunday = new Date(d.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  };

  // Helper: Format Sunday -> Saturday range
  const getWeekRangeStr = (dateStr: string) => {
    const sunday = getSundayDate(dateStr);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return `${formatDate(sunday)} - ${formatDate(saturday)}`;
  };

  // Helper: Get Month name
  const getMonthStr = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthSortKey = (dateStr: string) => {
    return dateStr.substring(0, 7); // YYYY-MM
  };

  const getWeekSortKey = (dateStr: string) => {
    return getSundayDate(dateStr).toISOString().substring(0, 10); // YYYY-MM-DD
  };

  // Grouping Logic
  const getGroupedData = (): GroupedData[] => {
    const groups: { [key: string]: GroupedData } = {};

    logs.forEach((log) => {
      const isWeekly = reportType === 'weekly';
      const key = isWeekly ? getWeekRangeStr(log.date) : getMonthStr(log.date);
      const sortKey = isWeekly ? getWeekSortKey(log.date) : getMonthSortKey(log.date);

      if (!groups[key]) {
        groups[key] = {
          key,
          sortKey,
          amountReceived: 0,
          gasCost: 0,
          gasVolume: 0,
          driverPay: 0,
          tripsCount: 0,
          balance: 0,
          daysLogged: 0,
        };
      }

      groups[key].amountReceived += Number(log.amountReceived);
      groups[key].gasCost += Number(log.gasCost);
      groups[key].gasVolume += Number(log.gasVolume);
      groups[key].driverPay += Number(log.driverPay);
      groups[key].tripsCount += Number(log.tripsCount);
      groups[key].balance += Number(log.balance);
      groups[key].daysLogged += 1;
    });

    return Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  };

  const groupedList = getGroupedData();

  // Excel Export Handler (Generates formatted CSV)
  const handleExportExcel = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const headers = [
      "Period",
      "Days Logged",
      "Trips Count",
      "Revenue Received",
      "Gas Cost",
      "Driver Pay",
      "Total Deductions",
      "Balance Amount"
    ];

    const rows = groupedList.map(item => {
      const deductions = Number(item.gasCost) + Number(item.driverPay);
      return [
        `"${item.key.replace(/"/g, '""')}"`,
        item.daysLogged,
        item.tripsCount,
        item.amountReceived.toFixed(2),
        item.gasCost.toFixed(2),
        item.driverPay.toFixed(2),
        deductions.toFixed(2),
        item.balance.toFixed(2)
      ];
    });

    const csvString = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType}_performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Excel Export Handler for a specific week/month (Generates detailed CSV of daily logs in that period)
  const handleExportGroupExcel = (e: React.MouseEvent, groupKey: string, groupName: string) => {
    e.stopPropagation(); // Prevent card expansion when clicking export!

    const groupLogs = logs.filter((log) => {
      const isWeekly = reportType === 'weekly';
      const key = isWeekly ? getWeekRangeStr(log.date) : getMonthStr(log.date);
      return key === groupKey;
    }).sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically ascending for export

    const headers = [
      "Date",
      "Trips Count",
      "Gas Filled (L/g)",
      "Gas Cost ($)",
      "Amount Received ($)",
      "Driver Pay ($)",
      "Total Deductions ($)",
      "Balance Amount ($)",
      "Notes"
    ];

    const rows = groupLogs.map(log => {
      const deductions = Number(log.gasCost) + Number(log.driverPay);
      return [
        log.date,
        log.tripsCount,
        log.gasVolume,
        log.gasCost.toFixed(2),
        log.amountReceived.toFixed(2),
        log.driverPay.toFixed(2),
        deductions.toFixed(2),
        log.balance.toFixed(2),
        `"${(log.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvString = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cab_log_details_${groupName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Create details for trend chart (last 6 items)
  const chartItems = [...groupedList].reverse().slice(-6);
  const maxVal = Math.max(
    ...chartItems.map((item) => Math.max(item.amountReceived, item.gasCost + item.driverPay, 100))
  );

  return (
    <div className="space-y-6">
      {/* 1. Aggregated Summary Cards rendered inside reports */}
      <StatsGrid logs={logs} />

      {/* Toggle Tab & Excel Export Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 backdrop-blur-md">
        <h4 className="text-base font-bold text-white tracking-tight">
          📊 Cab Performance Reports
        </h4>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            className="cursor-pointer px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
            title="Download CSV report compatible with Excel"
          >
            <span>📥</span> Export to Excel
          </button>
          
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setReportType('weekly');
                setExpandedGroupKey(null);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                reportType === 'weekly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => {
                setReportType('monthly');
                setExpandedGroupKey(null);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                reportType === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-slate-800/40 border-dashed text-slate-500 text-sm">
          No records logged. Add daily entries to view reports.
        </div>
      ) : (
        <>
          {/* Trend Visualization Chart */}
          {chartItems.length > 0 && (
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-xl">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">
                📈 Trend: Revenue vs Expenses (Last {chartItems.length} {reportType === 'weekly' ? 'Weeks' : 'Months'})
              </h5>
              
              <div className="h-48 flex items-end gap-3 md:gap-6 pt-6 border-b border-slate-800/80 pb-2 relative">
                <div className="absolute left-0 right-0 top-1/4 border-t border-slate-800/30 text-3xs text-slate-600"></div>
                <div className="absolute left-0 right-0 top-2/4 border-t border-slate-800/30 text-3xs text-slate-600"></div>
                <div className="absolute left-0 right-0 top-3/4 border-t border-slate-800/30 text-3xs text-slate-600"></div>

                {chartItems.map((item, idx) => {
                  const expenses = item.gasCost + item.driverPay;
                  const revHeight = (item.amountReceived / maxVal) * 100;
                  const expHeight = (expenses / maxVal) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div className="absolute bottom-full mb-2 bg-slate-950 border border-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition duration-150 z-10 shadow-xl whitespace-nowrap">
                        <p className="font-bold text-slate-400">{item.key}</p>
                        <p className="text-emerald-400">Revenue: {formatCurrency(item.amountReceived)}</p>
                        <p className="text-rose-400">Expenses: {formatCurrency(expenses)}</p>
                        <p className="border-t border-slate-800 mt-1 pt-1 font-bold text-indigo-400">Balance Amount: {formatCurrency(item.balance)}</p>
                      </div>

                      <div className="flex gap-1.5 w-full justify-center items-end h-full">
                        <div
                          style={{ height: `${revHeight}%` }}
                          className="w-3 sm:w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm"
                        ></div>
                        <div
                          style={{ height: `${expHeight}%` }}
                          className="w-3 sm:w-5 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-sm"
                        ></div>
                      </div>

                      <span className="text-[10px] text-slate-500 font-semibold truncate max-w-full text-center mt-2.5">
                        {reportType === 'weekly'
                          ? `Wk ${idx + 1}`
                          : item.key.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-[10px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                  <span className="text-slate-400">Gross Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
                  <span className="text-slate-400">Expenses (Gas + Driver)</span>
                </div>
              </div>
            </div>
          )}

          {/* Aggregated List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedList.map((group) => {
              const expenses = group.gasCost + group.driverPay;
              const gasPercent = group.amountReceived ? (group.gasCost / group.amountReceived) * 100 : 0;
              const payPercent = group.amountReceived ? (group.driverPay / group.amountReceived) * 100 : 0;
              const isExpanded = expandedGroupKey === group.key;

              // Filter logs belonging to this specific week or month
              const groupLogs = logs.filter((log) => {
                const isWeekly = reportType === 'weekly';
                const key = isWeekly ? getWeekRangeStr(log.date) : getMonthStr(log.date);
                return key === group.key;
              }).sort((a, b) => b.date.localeCompare(a.date));

              return (
                <div
                  key={group.key}
                  onClick={() => setExpandedGroupKey(isExpanded ? null : group.key)}
                  className={`bg-slate-900/50 backdrop-blur-md rounded-2xl border p-5 space-y-4 hover:border-indigo-500/40 hover:bg-slate-900/70 transition duration-200 cursor-pointer ${
                    isExpanded ? 'border-indigo-500/50 bg-slate-900/80 ring-1 ring-indigo-500/20' : 'border-slate-800/80'
                  }`}
                >
                  {/* Card Title */}
                  <div className="flex justify-between items-start border-b border-slate-800/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-200 text-sm leading-none">{group.key}</h4>
                        <button
                          onClick={(e) => handleExportGroupExcel(e, group.key, group.key)}
                          className="cursor-pointer p-1 hover:bg-slate-800 rounded text-xs text-emerald-400 hover:text-emerald-300 transition"
                          title="Export this period's logs to Excel (CSV)"
                        >
                          📥
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">
                        {group.daysLogged} days logged • {group.tripsCount} trips
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      group.balance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {group.balance >= 0 ? '+' : ''}{formatCurrency(group.balance)}
                    </span>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center py-1 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    <div className="p-2 border-r border-slate-800/40">
                      <span className="block text-[9px] text-slate-500 uppercase font-bold">Revenue</span>
                      <span className="text-xs font-bold text-white block mt-0.5">{formatCurrency(group.amountReceived)}</span>
                    </div>
                    <div className="p-2 border-r border-slate-800/40">
                      <span className="block text-[9px] text-slate-500 uppercase font-bold">Gas Cost</span>
                      <span className="text-xs font-bold text-cyan-400 block mt-0.5">{formatCurrency(group.gasCost)}</span>
                    </div>
                    <div className="p-2">
                      <span className="block text-[9px] text-slate-500 uppercase font-bold">Driver Pay</span>
                      <span className="text-xs font-bold text-violet-400 block mt-0.5">{formatCurrency(group.driverPay)}</span>
                    </div>
                  </div>

                  {/* Efficiency and Ratios */}
                  <div className="space-y-2 text-2xs font-semibold text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>Average Earnings / Trip:</span>
                      <span className="text-slate-200">
                        {group.tripsCount ? formatCurrency(group.amountReceived / group.tripsCount) : '$0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Gas Cost Ratio:</span>
                      <span className="text-cyan-400">{gasPercent.toFixed(0)}% of revenue</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Driver Pay Ratio:</span>
                      <span className="text-violet-400">{payPercent.toFixed(0)}% of revenue</span>
                    </div>

                    {/* Visual Progress Bar Stack */}
                    <div className="w-full bg-slate-950 rounded-full h-2 mt-3 overflow-hidden flex">
                      <div
                        style={{ width: `${gasPercent}%` }}
                        className="bg-cyan-500 h-full"
                        title={`Gas Cost: ${gasPercent.toFixed(0)}%`}
                      ></div>
                      <div
                        style={{ width: `${payPercent}%` }}
                        className="bg-violet-500 h-full"
                        title={`Driver Pay: ${payPercent.toFixed(0)}%`}
                      ></div>
                      <div
                        style={{ width: `${Math.max(0, 100 - gasPercent - payPercent)}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Net Balance: ${(100 - gasPercent - payPercent).toFixed(0)}%`}
                      ></div>
                    </div>
                  </div>

                  {/* Expand Indicator */}
                  <div className="pt-2 border-t border-slate-800/40 text-center">
                    <span className="text-3xs text-indigo-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      {isExpanded ? '▲ Hide Daily Breakdown' : '▼ Click to View Daily Logs'}
                    </span>
                  </div>

                  {/* Expanded list of daily logs for this group */}
                  {isExpanded && (
                    <div 
                      className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 max-h-60 overflow-y-auto pr-1"
                      onClick={(e) => e.stopPropagation()} // Prevent clicking child items from toggling parent
                    >
                      {groupLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40 flex justify-between items-center text-2xs transition hover:bg-slate-950"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-200">{log.date}</p>
                            <p className="text-slate-500 font-semibold">
                              {log.tripsCount} trips {log.gasVolume ? `• ${log.gasVolume}L gas` : ''}
                            </p>
                            {log.notes && (
                              <p className="text-slate-400 italic text-[10px] max-w-44 truncate" title={log.notes}>
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-0.5">
                            <p className="text-emerald-400 font-bold">Amt Rec: {formatCurrency(log.amountReceived)}</p>
                            <p className="text-slate-400 font-medium">Gas: {formatCurrency(log.gasCost)} • Pay: {formatCurrency(log.driverPay)}</p>
                            <p className={`font-bold ${log.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              Bal Amt: {log.balance >= 0 ? '+' : ''}{formatCurrency(log.balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
