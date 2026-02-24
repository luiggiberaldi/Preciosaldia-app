import React, { useState, useEffect } from 'react';
import { ManualMode } from '../components/calculator/ManualMode';

const SAFE_RATES = { usdt: { price: 0 }, bcv: { price: 0 }, euro: { price: 0 } };

export default function CalculatorView({ rates, theme, triggerHaptic, isKeyboardOpen }) {
  const currentRates = rates || SAFE_RATES;
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('my_accounts_v2');
      setAccounts(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.warn('⚠️ localStorage bloqueado o corrupto en CalculatorView:', e);
      setAccounts([]); // Fallback seguro
    }
  }, []);

  // State for initial loading skeleton
  const isInitialLoading = !rates?.bcv?.price;

  if (isInitialLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] p-6 animate-pulse border border-slate-200 dark:border-slate-800">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4"></div>
        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100%-5rem)] bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative ring-4 ring-slate-100 dark:ring-slate-900/50 animate-in fade-in duration-500">
      <div className="flex-1 overflow-hidden relative bg-slate-50/50 dark:bg-slate-900/50">
        <ManualMode
          rates={currentRates}
          accounts={accounts}
          theme={theme}
          triggerHaptic={triggerHaptic}
          isKeyboardOpen={isKeyboardOpen}
        />
      </div>
    </div>
  );
}