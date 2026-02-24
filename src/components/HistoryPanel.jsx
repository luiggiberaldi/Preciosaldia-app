import React, { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

const TABS = [
    { label: '24h', days: 1 },
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
];

const CURRENCIES = [
    { key: 'bcv', label: 'BCV', color: '#3b82f6' },
    { key: 'usdt', label: 'USDT', color: '#22c55e' },
    { key: 'euro', label: 'Euro', color: '#a855f7' },
];

function MiniChart({ data, width = 300, height = 140, color = '#3b82f6' }) {
    const points = useMemo(() => {
        if (!data || data.length < 2) return null;

        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const padY = 12;
        const padX = 4;
        const usableW = width - padX * 2;
        const usableH = height - padY * 2;

        return data.map((d, i) => ({
            x: padX + (i / (data.length - 1)) * usableW,
            y: padY + usableH - ((d.value - min) / range) * usableH,
            value: d.value,
            time: d.time,
        }));
    }, [data, width, height]);

    if (!points || points.length < 2) {
        return (
            <div className="flex items-center justify-center" style={{ width, height }}>
                <p className="text-xs text-slate-400">Aún no hay suficientes datos</p>
            </div>
        );
    }

    const linePath = points.map((p, i) =>
        i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
    ).join(' ');

    const areaPath = `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;
    const gradId = `hist-grad-${color.replace('#', '')}`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Last point dot */}
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} stroke="white" strokeWidth="2" />
            {/* First point dot */}
            <circle cx={points[0].x} cy={points[0].y} r="3" fill={color} opacity="0.5" />
        </svg>
    );
}

export default function HistoryPanel({ isOpen, onClose, getHistory, getStats }) {
    const [activeDays, setActiveDays] = useState(7);
    const [activeCurrency, setActiveCurrency] = useState('bcv');

    const stats = useMemo(() => getStats(activeDays), [getStats, activeDays]);
    const chartData = useMemo(() => {
        const raw = getHistory(activeDays);
        return raw.map(d => ({
            value: d[activeCurrency],
            time: d.t,
        })).filter(d => d.value > 0);
    }, [getHistory, activeDays, activeCurrency]);

    const currencyConfig = CURRENCIES.find(c => c.key === activeCurrency);
    const stat = stats?.[activeCurrency];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm md:max-w-lg rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={20} className="text-brand" />
                        <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Historial de Tasas</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

                    {/* Currency Tabs */}
                    <div className="flex gap-1.5">
                        {CURRENCIES.map(c => (
                            <button
                                key={c.key}
                                onClick={() => setActiveCurrency(c.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeCurrency === c.key
                                    ? 'text-white shadow-md'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                                    }`}
                                style={activeCurrency === c.key ? { backgroundColor: c.color } : {}}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>

                    {/* Time Tabs */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                        {TABS.map(tab => (
                            <button
                                key={tab.days}
                                onClick={() => setActiveDays(tab.days)}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeDays === tab.days
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                    : 'text-slate-400'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Chart */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                        <MiniChart
                            data={chartData}
                            width={400}
                            height={160}
                            color={currencyConfig?.color || '#3b82f6'}
                        />
                    </div>

                    {/* Stats Row */}
                    {stat && stat.points > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800/30">
                                <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Mínimo ↓</p>
                                <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">{stat.min.toFixed(2)}</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800/30">
                                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Promedio ◎</p>
                                <p className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">{stat.avg.toFixed(2)}</p>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center border border-rose-100 dark:border-rose-800/30">
                                <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-0.5">Máximo ↑</p>
                                <p className="text-sm font-black text-rose-700 dark:text-rose-300 font-mono">{stat.max.toFixed(2)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-xs text-slate-400">No hay datos para este periodo</p>
                            <p className="text-[10px] text-slate-300 mt-1">Los datos se irán acumulando con cada actualización</p>
                        </div>
                    )}

                    {/* Trend Badge */}
                    {stat && stat.points > 1 && (
                        <div className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold ${stat.trend > 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                            : stat.trend < 0
                                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                            }`}>
                            {stat.trend > 0 ? <TrendingUp size={14} /> : stat.trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                            <span>
                                {stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(2)}% en {TABS.find(t => t.days === activeDays)?.label}
                            </span>
                            <span className="text-slate-400 font-normal">({stat.points} lecturas)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
