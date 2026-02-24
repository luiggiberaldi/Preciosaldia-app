import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_RATES = {
    usdt: { price: 37.10, source: 'Promedio P2P', type: 'p2p', change: 0.12 },
    bcv: { price: 36.35, source: 'BCV Oficial', change: 0.05 },
    euro: { price: 39.80, source: 'Euro BCV', change: -0.02 },
    lastUpdate: new Date().toISOString()
};

const EXCHANGERATE_KEY = import.meta.env.VITE_EXCHANGERATE_KEY || '';
const DEFAULT_EUR_USD_RATIO = 1.18;
const UPDATE_INTERVAL = 30000;

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

// [AUDIT FIX] Extraída como función reutilizable (antes duplicada en 2 bloques)
const alignMagnitude = (val, anchor) => {
    if (!val || val <= 0 || !anchor || anchor <= 0) return val;
    let corrected = val;
    while (corrected < (anchor * 0.20)) corrected *= 10;
    while (corrected > (anchor * 5.0)) corrected /= 10;
    return corrected;
};

const CONNECTION_STRATEGIES = [
    { name: 'Directo', buildUrl: (target) => target },
    { name: 'Proxy A (AllOrigins)', buildUrl: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
    { name: 'Proxy B (CodeTabs)', buildUrl: (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}` }
];

export function useRates() {
    const [rates, setRates] = useState(() => {
        try { return JSON.parse(localStorage.getItem('monitor_rates_v12')) || null; }
        catch { return null; }
    });

    const [loading, setLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [logs, setLogs] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // [PERFORMANCE] useRef impides re-renders inside updateData dependencies
    const ratesRef = useRef(rates);

    useEffect(() => {
        ratesRef.current = rates;
        if (rates) localStorage.setItem('monitor_rates_v12', JSON.stringify(rates));
        if ('Notification' in window && Notification.permission === 'granted') {
            setNotificationsEnabled(true);
        }
    }, [rates]);

    const addLog = useCallback((msg, type = 'info') => {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev.slice(-49), { time, msg, type }]);
    }, []);

    const enableNotifications = async () => {
        if (!('Notification' in window)) {
            alert("Tu navegador no soporta notificaciones.");
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
            new Notification("🔔 Notificaciones Activadas", {
                body: "Te avisaremos cuando cambie la tasa del BCV (Dólar y Euro).",
                icon: '/logodark.png'
            });
            addLog("Permiso de notificaciones concedido", "success");
        }
    };

    const parseSafeFloat = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const clean = val.replace(/[^\d.,]/g, '');
            const lastDot = clean.lastIndexOf('.');
            const lastComma = clean.lastIndexOf(',');
            const lastSep = Math.max(lastDot, lastComma);

            if (lastSep === -1) return parseFloat(clean) || 0;

            const integer = clean.slice(0, lastSep).replace(/[.,]/g, '');
            const decimals = clean.slice(lastSep + 1);
            return parseFloat(`${integer}.${decimals}`) || 0;
        }
        return 0;
    };

    const sendRateNotification = (title, body) => {
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, { body, icon: '/logodark.png', vibrate: [200, 100, 200] });
            } catch (e) { console.error("Error notificando", e); }
        }
    };

    const updateData = useCallback(async (isAutoUpdate = false) => {
        if (!isAutoUpdate) setLoading(true); // Don't block UI on auto-update
        // setIsOffline(false); // Avoid flickering

        const log = (msg, type) => !isAutoUpdate && addLog(msg, type);

        log(isAutoUpdate ? "--- Auto-Update ---" : "--- Actualización Manual ---");

        const fetchGeneric = async (url) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000);
            try {
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                if (!res.ok) return null;
                return await res.json();
            } catch (e) {
                clearTimeout(id);
                return null;
            }
        };

        const getEuroFactorFallback = async () => {
            try {
                const data = await fetchGeneric(`https://v6.exchangerate-api.com/v6/${EXCHANGERATE_KEY}/latest/USD`);
                if (data?.result === "success" && data.conversion_rates?.EUR) return 1 / data.conversion_rates.EUR;
            } catch (e) { }
            return DEFAULT_EUR_USD_RATIO;
        };

        const calculateP2PAverage = (dataField) => {
            if (typeof dataField === 'number') return dataField;
            if (Array.isArray(dataField) && dataField.length > 0) {
                const top3 = dataField.slice(0, 3);
                const getPrice = (item) => (typeof item === 'object' && item.price ? parseSafeFloat(item.price) : (typeof item === 'number' ? item : 0));
                return top3.reduce((acc, curr) => acc + getPrice(curr), 0) / top3.length;
            }
            return 0;
        };

        const getMeta = (newP, oldP, oldChange = 0, apiChange = null) => {
            let p = parseSafeFloat(newP);
            const o = parseSafeFloat(oldP);

            if (apiChange !== null && apiChange !== undefined && apiChange !== 0) {
                return { price: p, change: parseSafeFloat(apiChange) };
            }

            if (p === o) return { price: p, change: oldChange };
            return { price: p, change: (p > 0 && o > 0) ? ((p - o) / o) * 100 : 0 };
        };

        const fetchUSDT = async () => {
            const targetUrl = `https://criptoya.com/api/binancep2p/USDT/VES/1`;
            for (const strategy of CONNECTION_STRATEGIES) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    const res = await fetch(strategy.buildUrl(targetUrl), { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!res.ok) continue;

                    const result = await res.json();
                    const avgAsk = calculateP2PAverage(result.ask);
                    const avgBid = calculateP2PAverage(result.bid);

                    if (avgAsk > 0 || avgBid > 0) {
                        let finalPrice = (avgAsk > 0 && avgBid > 0) ? (avgAsk + avgBid) / 2 : (avgAsk || avgBid);
                        return { price: finalPrice, source: `Binance P2P (${strategy.name})` };
                    }
                } catch (err) { continue; }
            }
            return null;
        };

        try {
            // [PERFORMANCE] Parallel Execution
            const taskPrivate = fetchGeneric(GOOGLE_SCRIPT_URL);
            const taskUSDT = fetchUSDT();
            const taskDolarApi = fetchGeneric('https://ve.dolarapi.com/v1/dolares');
            const taskEuroFactor = getEuroFactorFallback();

            const [privateData, usdtResult, bcvFallbackData, euroFactor] = await Promise.all([
                taskPrivate.catch(() => null),
                taskUSDT.catch(() => null),
                taskDolarApi.catch(() => null),
                taskEuroFactor.catch(() => DEFAULT_EUR_USD_RATIO)
            ]);

            if (privateData) log("✅ Datos Privados Recibidos", "success");

            let newRates = { ...(ratesRef.current || DEFAULT_RATES) };

            // Procesar USDT
            if (usdtResult) {
                const meta = getMeta(usdtResult.price, newRates.usdt.price, newRates.usdt.change);
                newRates.usdt = { ...newRates.usdt, price: usdtResult.price, change: meta.change, source: usdtResult.source, type: 'p2p' };
            }

            let newBcvPrice = 0;
            let newEuroPrice = 0;

            // Procesar BCV/Euro
            if (privateData) {
                const rawBcv = privateData.bcv || privateData.usd;
                const rawEuro = privateData.euro || privateData.eur;

                let bcvP = parseSafeFloat(typeof rawBcv === 'object' ? rawBcv.price : rawBcv);
                let euroP = parseSafeFloat(typeof rawEuro === 'object' ? rawEuro.price : rawEuro);

                let apiBcvChange = typeof rawBcv === 'object' ? rawBcv.change : null;
                let apiEuroChange = typeof rawEuro === 'object' ? rawEuro.change : null;

                // [AUDIT FIX] alignMagnitude ahora es top-level

                if (newRates.usdt.price > 0) {
                    newBcvPrice = alignMagnitude(bcvP, newRates.usdt.price);
                    newEuroPrice = alignMagnitude(euroP, newRates.usdt.price);
                } else {
                    newBcvPrice = bcvP;
                    newEuroPrice = euroP;
                }

                if (newBcvPrice > 0) {
                    const meta = getMeta(newBcvPrice, newRates.bcv.price, newRates.bcv.change, apiBcvChange);
                    newRates.bcv = { ...newRates.bcv, ...meta, source: 'BCV Oficial' };
                }
                if (newEuroPrice > 0) {
                    const meta = getMeta(newEuroPrice, newRates.euro.price, newRates.euro.change, apiEuroChange);
                    newRates.euro = { ...newRates.euro, ...meta, source: 'Euro BCV' };
                }

            } else if (bcvFallbackData) {
                // Fallback Logic
                const oficial = Array.isArray(bcvFallbackData) ? bcvFallbackData.find(d => d.fuente === 'oficial' || d.nombre === 'Oficial') : null;

                if (oficial?.promedio > 0) {
                    let bcvP = parseSafeFloat(oficial.promedio);
                    if (newRates.usdt.price > 0) {
                        // [AUDIT FIX] alignMagnitude ahora es top-level
                        bcvP = alignMagnitude(bcvP, newRates.usdt.price);
                    }
                    newBcvPrice = bcvP;
                    const meta = getMeta(newBcvPrice, newRates.bcv.price, newRates.bcv.change);
                    newRates.bcv = { ...newRates.bcv, ...meta, source: 'BCV Oficial (Respaldo)' };

                    if (euroFactor) {
                        newEuroPrice = newBcvPrice * euroFactor;
                        const metaEur = getMeta(newEuroPrice, newRates.euro.price, newRates.euro.change);
                        newRates.euro = { ...newRates.euro, ...metaEur, source: 'Euro BCV (Triangulado)' };
                    }
                }
            }

            // Notificaciones
            // Access ratesRef.current to compare with LATEST known confirmed rates, 
            // but for notifications usually we compare 'rates' state vs 'newRates'. 
            // Since we are inside updateData, ratesRef.current holds the state from before this update cycle.
            if (notificationsEnabled) {
                const oldBcv = ratesRef.current?.bcv?.price || 0;
                const currentBcv = newRates.bcv.price;
                if (currentBcv > 0 && oldBcv > 0 && currentBcv !== oldBcv) {
                    const emoji = currentBcv > oldBcv ? "📈" : "📉";
                    sendRateNotification(`${emoji} Cambio Tasa BCV`, `La tasa oficial cambió a ${currentBcv.toFixed(2)} Bs.`);
                }

                const oldEuro = ratesRef.current?.euro?.price || 0;
                const currentEuro = newRates.euro.price;
                if (currentEuro > 0 && oldEuro > 0 && currentEuro !== oldEuro) {
                    const emoji = currentEuro > oldEuro ? "📈" : "📉";
                    sendRateNotification(`${emoji} Cambio Tasa EURO`, `La tasa oficial del Euro cambió a ${currentEuro.toFixed(2)} Bs.`);
                }
            }

            newRates.lastUpdate = new Date();
            setRates(newRates);
            if (!isAutoUpdate) addLog("Actualización completada", 'success');

        } catch (e) {
            console.error(e);
            log("Error actualización", 'error');
            setIsOffline(true);
        } finally {
            setLoading(false);
        }
    }, [addLog, notificationsEnabled]); // ratesRef is stable, no need to include

    useEffect(() => {
        // Initial load
        updateData(false);
        // Interval
        const intervalId = setInterval(() => { updateData(true); }, UPDATE_INTERVAL);
        return () => clearInterval(intervalId);
    }, [updateData]);

    const currentRates = rates || DEFAULT_RATES;
    return { rates: currentRates, loading, isOffline, logs, updateData, enableNotifications, notificationsEnabled };
}