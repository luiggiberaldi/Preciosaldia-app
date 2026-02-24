import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'rate_history_v1';
const MAX_ENTRIES = 2000;
const HEARTBEAT_MS = 15 * 60 * 1000; // 15 min heartbeat even if prices unchanged

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('⚠️ Rate history save failed:', e);
    }
}

export function useRateHistory() {
    const [history, setHistory] = useState(loadHistory);
    const lastSaveRef = useRef(0);

    const addSnapshot = useCallback((rates) => {
        if (!rates?.bcv?.price || !rates?.usdt?.price) return;

        const now = Date.now();
        const snapshot = {
            t: now,
            bcv: Math.round(rates.bcv.price * 100) / 100,
            usdt: Math.round(rates.usdt.price * 100) / 100,
            euro: Math.round((rates.euro?.price || 0) * 100) / 100,
        };

        setHistory(prev => {
            const last = prev[prev.length - 1];

            // Dedup: skip if all prices match AND less than heartbeat elapsed
            if (last) {
                const pricesMatch = last.bcv === snapshot.bcv &&
                    last.usdt === snapshot.usdt &&
                    last.euro === snapshot.euro;
                const elapsed = now - last.t;

                if (pricesMatch && elapsed < HEARTBEAT_MS) return prev;
            }

            // Append + cap
            const updated = [...prev, snapshot];
            const capped = updated.length > MAX_ENTRIES
                ? updated.slice(updated.length - MAX_ENTRIES)
                : updated;

            saveHistory(capped);
            lastSaveRef.current = now;
            return capped;
        });
    }, []);

    const getHistory = useCallback((days = 7) => {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return history.filter(h => h.t >= cutoff);
    }, [history]);

    const getStats = useCallback((days = 7) => {
        const data = getHistory(days);
        if (data.length === 0) return null;

        const stats = {};
        ['bcv', 'usdt', 'euro'].forEach(key => {
            const values = data.map(d => d[key]).filter(v => v > 0);
            if (values.length === 0) {
                stats[key] = { min: 0, max: 0, avg: 0, current: 0, trend: 0, points: 0 };
                return;
            }
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const current = values[values.length - 1];
            const first = values[0];
            const trend = first > 0 ? ((current - first) / first) * 100 : 0;

            stats[key] = {
                min: Math.round(min * 100) / 100,
                max: Math.round(max * 100) / 100,
                avg: Math.round(avg * 100) / 100,
                current,
                trend: Math.round(trend * 100) / 100,
                points: values.length,
            };
        });

        return stats;
    }, [getHistory]);

    const getSparklineData = useCallback((currency = 'bcv', days = 1) => {
        const data = getHistory(days);
        return data.map(d => d[currency]).filter(v => v > 0);
    }, [getHistory]);

    return {
        history,
        addSnapshot,
        getHistory,
        getStats,
        getSparklineData,
        totalPoints: history.length,
    };
}
