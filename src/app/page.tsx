'use client';

import React, { useState, useEffect } from 'react';
import LogForm from '@/components/LogForm';
import LogsTable from '@/components/LogsTable';
import Reports from '@/components/Reports';
import { CabLog, isDbConfigured, getLogs, saveLog, deleteLog, getLogsPaginated, getSetting, saveSetting } from '@/app/actions/db';

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
  const [fixedDriverSalary, setFixedDriverSalary] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSetting, setIsSavingSetting] = useState(false);

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

  // Load settings (Fixed Driver Salary) on DB Connection change
  useEffect(() => {
    async function loadSettings() {
      if (isDbConnected) {
        try {
          const salary = await getSetting('fixed_driver_salary', '');
          setFixedDriverSalary(salary);
        } catch (error) {
          console.error('Failed to load settings from DB:', error);
        }
      } else {
        const savedSalary = localStorage.getItem('cab_tracker_fixed_driver_salary') || '';
        setFixedDriverSalary(savedSalary);
      }
    }
    loadSettings();
  }, [isDbConnected]);

  const handleFixedSalaryChange = async (val: string) => {
    setFixedDriverSalary(val);
    localStorage.setItem('cab_tracker_fixed_driver_salary', val);
    
    if (isDbConnected) {
      setIsSavingSetting(true);
      try {
        await saveSetting('fixed_driver_salary', val);
      } catch (error) {
        console.error('Failed to save settings to DB:', error);
      } finally {
        setIsSavingSetting(false);
      }
    }
  };

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
        gasVolume: Number(logData.gasVolume ?? 0),
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      {/* Glow Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Banner Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 sticky top-0 z-40 backdrop-blur-md px-4 py-2.5 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-2.5 sm:flex-row sm:justify-between sm:items-center">
          {/* Row 1 (on mobile): Logo & Info, theme and DB connection badges */}
          <div className="flex justify-between items-center  sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚖</span>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                  Cab Tracker
                </h1>
                <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Expense & Earnings Log</p>
              </div>
            </div>

            {/* Badges on mobile right, desktop hidden */}
            <div className="flex items-center gap-2 sm:hidden">
              {/* Settings toggle */}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`cursor-pointer p-1 rounded-lg border transition text-xs shadow h-7 w-7 flex items-center justify-center ${
                  isSettingsOpen
                    ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-400'
                    : 'text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
                title="Settings"
              >
                ⚙️
              </button>

              {/* Theme switch */}
              <button
                onClick={toggleTheme}
                className="cursor-pointer text-slate-400 hover:text-slate-205 p-1 rounded-lg border border-slate-800 hover:bg-slate-900 transition text-xs shadow h-7 w-7 flex items-center justify-center"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              {/* DB Indicator */}
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-900 border border-slate-850 text-slate-405 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                {isDbConnected ? 'Live' : 'Local'}
              </span>
            </div>
          </div>

          {/* Navigation Pills (Visible on both mobile and desktop) */}
          <nav className="bg-slate-900 border border-slate-800/80 p-0.5 rounded-xl text-xs font-semibold flex justify-center w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg transition ${
                activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Track & Logs
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg transition ${
                activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reports
            </button>
          </nav>

          {/* Desktop Only Badges (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Settings toggle */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`cursor-pointer p-1.5 rounded-lg border transition text-xs shadow h-7 w-7 flex items-center justify-center ${
                isSettingsOpen
                  ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-400'
                  : 'text-slate-400 border-slate-800/80 hover:bg-slate-900'
              }`}
              title="Settings"
            >
              ⚙️
            </button>

            {/* Theme switch */}
            <button
              onClick={toggleTheme}
              className="cursor-pointer text-slate-400 hover:text-slate-205 p-1.5 rounded-lg border border-slate-800/80 hover:bg-slate-900 transition text-xs shadow h-7 w-7 flex items-center justify-center"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* DB Indicator */}
            <span
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1.5"
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
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-6">
        {/* Collapsible Settings Panel */}
        {isSettingsOpen && (
          <div className="animate-fadeIn bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 text-base">⚙️</span>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Cab Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="cursor-pointer text-slate-500 hover:text-slate-350 text-xs font-semibold"
              >
                Close ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Fixed Driver Daily Salary (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={fixedDriverSalary}
                    onChange={(e) => handleFixedSalaryChange(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl pl-8 pr-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm font-semibold"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₹</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-normal">
                  This salary is stored in the {isDbConnected ? 'MongoDB database' : 'browser local storage'} and will automatically pre-fill the driver payout when creating new daily logs. {isSavingSetting && <span className="text-indigo-400 font-bold ml-1 animate-pulse">Saving to DB...</span>}
                </p>
              </div>
            </div>
          </div>
        )}

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
              <div className="space-y-4 w-full animate-fadeIn">
                {/* Unified Action Row Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                  {/* Left side: Title and Mobile Add Log button */}
                  <div className="flex justify-between items-center w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚖</span>
                      <h3 className="text-base font-bold text-slate-100 tracking-tight">Cab Logs & Tracking</h3>
                    </div>
                    {/* Add Log Button (visible on mobile only) */}
                    <button
                      onClick={() => {
                        setEditingLog(null);
                        setIsFormOpen(!isFormOpen);
                      }}
                      className="cursor-pointer md:hidden bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-lg shrink-0"
                    >
                      <span>➕</span> Add Log
                    </button>
                  </div>

                  {/* Right side: Search field and Desktop Add Log button */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Search Field */}
                    <div className="w-full md:w-64">
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
                    {/* Add Log Button (hidden on mobile, visible on desktop) */}
                    <button
                      onClick={() => {
                        setEditingLog(null);
                        setIsFormOpen(!isFormOpen);
                      }}
                      className="cursor-pointer hidden md:flex bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold px-4 py-2 rounded-xl text-xs items-center justify-center gap-1.5 transition shadow-lg w-full sm:w-auto"
                    >
                      <span>➕</span> Add Log
                    </button>
                  </div>
                </div>

                {/* Inline Log Form (Shown dynamically in the page flow when toggled) */}
                {isFormOpen && (
                  <div className="animate-fadeIn w-full">
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
                      defaultDriverPay={fixedDriverSalary}
                    />
                  </div>
                )}

                <LogsTable
                  logs={logs}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                  onEdit={(log) => {
                    setEditingLog(log);
                    setIsFormOpen(true);
                    // Smooth scroll to top form on mobile devices
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDelete={handleDelete}
                />
              </div>
            )}

            {activeTab === 'reports' && <Reports logs={allLogsForReports} />}
          </div>
        )}
      </main>

    </div>
  );
}
