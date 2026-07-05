'use client';

import React, { useState, useEffect } from 'react';
import LogForm from '@/components/LogForm';
import LogsTable from '@/components/LogsTable';
import Reports from '@/components/Reports';
import { CabLog, isDbConfigured, getLogs, saveLog, deleteLog, getLogsPaginated } from '@/app/actions/db';

export default function Home() {
  const [logs, setLogs] = useState<CabLog[]>([]);
  const [allLogsForReports, setAllLogsForReports] = useState<CabLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'reports'>('logs');
  const [editingLog, setEditingLog] = useState<CabLog | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const itemsPerPage = 8;

  // Load theme config on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('cab_tracker_theme') as 'dark' | 'light';
    const active = savedTheme || 'dark';
    setTheme(active);
    if (active === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cab_tracker_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Initialize DB Connection config check on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const configured = await isDbConfigured();
        setIsDbConnected(configured);
      } catch (err) {
        console.error('Failed check for MongoDB configurations:', err);
      }
    }
    checkConnection();
  }, []);

  // Fetch paginated tracker logs and complete archive summaries
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        if (isDbConnected) {
          // 1. Fetch paginated slice from server (MongoDB)
          const { logs: pLogs, totalPages: tPages } = await getLogsPaginated(currentPage, itemsPerPage, searchQuery);
          setLogs(pLogs);
          setTotalPages(tPages || 1);

          // 2. Fetch all entries for report aggregations
          const all = await getLogs();
          setAllLogsForReports(all);
        } else {
          // Client-side local storage simulation
          const localData = localStorage.getItem('cab_tracker_logs');
          if (localData) {
            const allLogs: CabLog[] = JSON.parse(localData);
            setAllLogsForReports(allLogs);

            // Filter query
            const filtered = allLogs.filter(log => {
              const q = searchQuery.toLowerCase().trim();
              return log.date.includes(q) || (log.notes && log.notes.toLowerCase().includes(q));
            });

            // Paginate local list
            const totalP = Math.ceil(filtered.length / itemsPerPage);
            setTotalPages(totalP || 1);

            const startIdx = (currentPage - 1) * itemsPerPage;
            const pageItems = filtered.slice(startIdx, startIdx + itemsPerPage);
            setLogs(pageItems);
          } else {
            setLogs([]);
            setAllLogsForReports([]);
            setTotalPages(1);
          }
        }
      } catch (err) {
        console.error('Failed to load tracker logs data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentPage, searchQuery, isDbConnected, refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Save operation handler (MongoDB or LocalStorage)
  const handleSave = async (logData: Omit<CabLog, 'balance' | 'id'> & { id?: string }) => {
    if (isDbConnected) {
      const res = await saveLog(logData);
      if (res.success && res.log) {
        setEditingLog(null);
        if (!logData.id) {
          setCurrentPage(1); // Return to page 1 to see the new entry
        }
        triggerRefresh();
      } else {
        throw new Error(res.error || 'Failed to save log to MongoDB');
      }
    } else {
      const balance = Number(logData.amountReceived) - Number(logData.gasCost) - Number(logData.driverPay);
      const newLog: CabLog = {
        id: logData.id || new Date().getTime().toString() + Math.random().toString(36).substring(2, 7),
        date: logData.date,
        gasVolume: Number(logData.gasVolume),
        gasCost: Number(logData.gasCost),
        tripsCount: Number(logData.tripsCount),
        amountReceived: Number(logData.amountReceived),
        driverPay: Number(logData.driverPay),
        balance,
        notes: logData.notes || '',
      };

      const localData = localStorage.getItem('cab_tracker_logs');
      const allLogs: CabLog[] = localData ? JSON.parse(localData) : [];

      let updatedList: CabLog[];
      if (logData.id) {
        updatedList = allLogs.map((item) => (item.id === logData.id ? newLog : item));
      } else {
        updatedList = [newLog, ...allLogs];
      }

      updatedList.sort((a, b) => b.date.localeCompare(a.date));
      localStorage.setItem('cab_tracker_logs', JSON.stringify(updatedList));
      
      setEditingLog(null);
      if (!logData.id) {
        setCurrentPage(1);
      }
      triggerRefresh();
    }
  };

  // Delete operation handler (MongoDB or LocalStorage)
  const handleDelete = async (id: string) => {
    if (isDbConnected) {
      const res = await deleteLog(id);
      if (res.success) {
        triggerRefresh();
      } else {
        alert('Failed to delete log from database');
      }
    } else {
      const localData = localStorage.getItem('cab_tracker_logs');
      if (localData) {
        const allLogs: CabLog[] = JSON.parse(localData);
        const updatedList = allLogs.filter((item) => item.id !== id);
        localStorage.setItem('cab_tracker_logs', JSON.stringify(updatedList));
        triggerRefresh();
      }
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      {/* Glow Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Banner Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 sticky top-0 z-40 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚖</span>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                Cab Tracker
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Expense & Earnings Log</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex bg-slate-900 border border-slate-800/80 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-1.5 rounded-lg transition ${
                activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Track & Logs
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-1.5 rounded-lg transition ${
                activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reports
            </button>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="cursor-pointer p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition text-xs shadow flex items-center justify-center h-7 w-7"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Database Connectivity Status Widget */}
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                isDbConnected
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
              title={
                isDbConnected
                  ? 'Connected to your MongoDB Instance'
                  : 'No MongoDB URI configured. Storing data inside local browser memory.'
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {isDbConnected ? 'MongoDB Live' : 'Preview Mode'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {/* Connection Setup Assistant Notice */}
        {!isDbConnected && (
          <div className="bg-slate-900/60 backdrop-blur-sm border border-amber-500/10 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-2xs text-amber-400 font-bold uppercase tracking-wider">Storage Notice</span>
              <p className="text-xs text-slate-300">
                You are currently running in <strong className="text-amber-400">Preview Mode</strong>. Data is saved inside your local browser.
              </p>
              <p className="text-[10px] text-slate-500">
                To link MongoDB, create a <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400">.env.local</code> file in the project folder with <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400">MONGODB_URI=...</code>
              </p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 text-sm">
            <span className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
            Loading tracker records...
          </div>
        ) : (
          <div className="space-y-6">
            {/* 2. Page Content Routing */}
            {activeTab === 'logs' && (
              <div className="space-y-4 w-full">
                {/* Unified Modern Action Row Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚖</span>
                    <h3 className="text-base font-bold text-slate-100 tracking-tight">Cab Logs & Tracking</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Search Field directly in the header */}
                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search date or notes..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition text-xs"
                      />
                    </div>
                    {/* Add Log Button */}
                    <button
                      onClick={() => {
                        setEditingLog(null);
                        setIsFormOpen(true);
                      }}
                      className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg w-full sm:w-auto"
                    >
                      <span>➕</span> Add Log
                    </button>
                  </div>
                </div>

                <LogsTable
                  logs={logs}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                  onEdit={(log) => {
                    setEditingLog(log);
                    setIsFormOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              </div>
            )}

            {activeTab === 'reports' && <Reports logs={allLogsForReports} />}

            {/* Form Overlay Modal */}
            {isFormOpen && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-lg relative animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                  <LogForm
                    onSubmit={async (logData) => {
                      await handleSave(logData);
                      setIsFormOpen(false);
                    }}
                    editingLog={editingLog}
                    onCancelEdit={() => {
                      setEditingLog(null);
                      setIsFormOpen(false);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Nav (Mobile/Tablet Only) */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg px-6 py-2.5 z-40 flex justify-between items-center">
        <button
          onClick={() => {
            setActiveTab('logs');
            setEditingLog(null);
          }}
          className={`flex flex-col items-center gap-1 flex-1 transition ${
            activeTab === 'logs' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-base">🚖</span>
          <span className="text-[10px] font-semibold">Track & Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 flex-1 transition ${
            activeTab === 'reports' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-base">📊</span>
          <span className="text-[10px] font-semibold">Reports</span>
        </button>
      </footer>
    </div>
  );
}
