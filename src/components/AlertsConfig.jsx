import React, { useState } from 'react';
import { X, Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const CURRENCIES = [
    { key: 'bcv', label: 'BCV' },
    { key: 'usdt', label: 'USDT' },
    { key: 'euro', label: 'Euro' },
];

const CONDITIONS = [
    { key: 'above', label: 'Sube de', icon: <TrendingUp size={14} /> },
    { key: 'below', label: 'Baja de', icon: <TrendingDown size={14} /> },
];

export default function AlertsConfig({ isOpen, onClose, alerts, triggeredLog, addAlert, removeAlert, toggleAlert, currentRates }) {
    const [currency, setCurrency] = useState('bcv');
    const [condition, setCondition] = useState('above');
    const [value, setValue] = useState('');

    if (!isOpen) return null;

    const handleAdd = () => {
        const num = parseFloat(value);
        if (!num || num <= 0) return;
        addAlert(currency, condition, num);
        setValue('');
    };

    const currentPrice = currentRates?.[currency]?.price || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm md:max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Bell size={20} className="text-amber-500" />
                        <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Alertas de Tasa</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

                    {/* Create Alert */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crear alerta</p>

                        {/* Currency */}
                        <div className="flex gap-1.5">
                            {CURRENCIES.map(c => (
                                <button
                                    key={c.key}
                                    onClick={() => setCurrency(c.key)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${currency === c.key
                                        ? 'bg-brand text-slate-900 border-brand shadow-md'
                                        : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>

                        {/* Condition */}
                        <div className="flex gap-1.5">
                            {CONDITIONS.map(c => (
                                <button
                                    key={c.key}
                                    onClick={() => setCondition(c.key)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${condition === c.key
                                        ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white shadow-md'
                                        : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    {c.icon} {c.label}
                                </button>
                            ))}
                        </div>

                        {/* Value Input */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                    placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
                                    className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl font-bold text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 border border-slate-200 dark:border-slate-700"
                                    step="0.01"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Bs</span>
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={!value || parseFloat(value) <= 0}
                                className="p-3 bg-brand text-slate-900 rounded-xl font-bold shadow-lg shadow-brand/20 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {currentPrice > 0 && (
                            <p className="text-[10px] text-slate-400 text-center">
                                {CURRENCIES.find(c => c.key === currency)?.label} actual: <strong>{currentPrice.toFixed(2)} Bs</strong>
                            </p>
                        )}
                    </div>

                    {/* Active Alerts */}
                    {alerts.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Alertas activas ({alerts.length})</p>
                            {alerts.map(alert => (
                                <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${alert.enabled
                                    ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-50'
                                    }`}>
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {alert.condition === 'above'
                                            ? <TrendingUp size={14} className="text-emerald-500 shrink-0" />
                                            : <TrendingDown size={14} className="text-rose-500 shrink-0" />
                                        }
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 dark:text-white truncate">
                                                {CURRENCIES.find(c => c.key === alert.currency)?.label}{' '}
                                                {alert.condition === 'above' ? '≥' : '≤'}{' '}
                                                {alert.value.toFixed(2)} Bs
                                            </p>
                                            {alert.lastTriggered > 0 && (
                                                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                                                    <Clock size={8} /> Última: {new Date(alert.lastTriggered).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={() => toggleAlert(alert.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                            {alert.enabled
                                                ? <Bell size={14} className="text-amber-500" />
                                                : <BellOff size={14} className="text-slate-300" />
                                            }
                                        </button>
                                        <button onClick={() => removeAlert(alert.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <Trash2 size={14} className="text-slate-300 hover:text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Triggered Log */}
                    {triggeredLog.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Historial reciente</p>
                            {triggeredLog.slice(0, 5).map((t, i) => (
                                <div key={i} className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{t.message}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {alerts.length === 0 && triggeredLog.length === 0 && (
                        <div className="text-center py-6 space-y-2">
                            <Bell size={32} className="text-slate-200 dark:text-slate-700 mx-auto" />
                            <p className="text-xs text-slate-400">No tienes alertas configuradas</p>
                            <p className="text-[10px] text-slate-300">Crea una arriba para recibir notificaciones</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
