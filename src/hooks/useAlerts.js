import { useState, useCallback } from 'react';

const STORAGE_KEY = 'rate_alerts_v1';
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown per alert

function loadAlerts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAlerts(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('⚠️ Alerts save failed:', e);
    }
}

const CURRENCY_LABELS = {
    bcv: 'BCV',
    usdt: 'USDT',
    euro: 'Euro',
};

export function useAlerts() {
    const [alerts, setAlerts] = useState(loadAlerts);
    const [triggeredLog, setTriggeredLog] = useState([]);

    const addAlert = useCallback((currency, condition, value) => {
        const newAlert = {
            id: Date.now().toString(36),
            currency,
            condition, // 'above' | 'below'
            value: parseFloat(value),
            enabled: true,
            lastTriggered: 0,
            createdAt: Date.now(),
        };
        setAlerts(prev => {
            const updated = [...prev, newAlert];
            saveAlerts(updated);
            return updated;
        });
    }, []);

    const removeAlert = useCallback((id) => {
        setAlerts(prev => {
            const updated = prev.filter(a => a.id !== id);
            saveAlerts(updated);
            return updated;
        });
    }, []);

    const toggleAlert = useCallback((id) => {
        setAlerts(prev => {
            const updated = prev.map(a =>
                a.id === id ? { ...a, enabled: !a.enabled } : a
            );
            saveAlerts(updated);
            return updated;
        });
    }, []);

    const checkAlerts = useCallback((rates) => {
        if (!rates?.bcv?.price) return [];

        const now = Date.now();
        const triggered = [];

        setAlerts(prev => {
            let changed = false;
            const updated = prev.map(alert => {
                if (!alert.enabled) return alert;
                if (now - alert.lastTriggered < COOLDOWN_MS) return alert;

                const currentPrice = rates[alert.currency]?.price || 0;
                if (currentPrice <= 0) return alert;

                const shouldTrigger =
                    (alert.condition === 'above' && currentPrice >= alert.value) ||
                    (alert.condition === 'below' && currentPrice <= alert.value);

                if (shouldTrigger) {
                    changed = true;
                    const label = CURRENCY_LABELS[alert.currency] || alert.currency;
                    const emoji = alert.condition === 'above' ? '📈' : '📉';
                    const condText = alert.condition === 'above' ? 'superó' : 'bajó de';

                    triggered.push({
                        ...alert,
                        currentPrice,
                        message: `${emoji} ${label} ${condText} ${alert.value.toFixed(2)} Bs → Actual: ${currentPrice.toFixed(2)} Bs`,
                    });

                    // Fire notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification(`${emoji} Alerta ${label}`, {
                                body: `La tasa ${condText} ${alert.value.toFixed(2)} Bs. Actual: ${currentPrice.toFixed(2)} Bs.`,
                                icon: '/logodark.png',
                                vibrate: [200, 100, 200],
                            });
                        } catch (e) { console.error('Notification error:', e); }
                    }

                    return { ...alert, lastTriggered: now };
                }

                return alert;
            });

            if (changed) {
                saveAlerts(updated);
                return updated;
            }
            return prev;
        });

        if (triggered.length > 0) {
            setTriggeredLog(prev => [...triggered, ...prev].slice(0, 20));
        }

        return triggered;
    }, []);

    return {
        alerts,
        triggeredLog,
        addAlert,
        removeAlert,
        toggleAlert,
        checkAlerts,
    };
}
