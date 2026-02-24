import React, { useState, useRef, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, WifiOff, Clock, Bell, BellRing, Maximize, Minimize, Camera, Loader2, AlertTriangle, Sun, Moon, BarChart3, BellDot } from 'lucide-react';
// ✅ Asegúrate de tener instalado: npm i html2canvas
import html2canvas from 'html2canvas';
import Sparkline from '../components/Sparkline';
import HistoryPanel from '../components/HistoryPanel';
import AlertsConfig from '../components/AlertsConfig';

export default function MonitorView({ rates, loading, isOffline, onRefresh, toggleTheme, theme, copyLogs, enableNotifications, notificationsEnabled, addLog, triggerHaptic, rateHistory, alerts }) {

    const [secretCount, setSecretCount] = useState(0);
    const [kioskMode, setKioskMode] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);

    // Referencia al contenedor del Kiosco (para la foto)
    const kioskRef = useRef(null);

    // Detección de Datos Viejos (> 4 Horas)
    const isOldData = (() => {
        if (!rates || !rates.lastUpdate) return false;
        const diff = new Date() - new Date(rates.lastUpdate);
        return diff > 4 * 60 * 60 * 1000; // 4 Hours
    })();

    // Truco para ver logs (7 clics en el logo)
    const handleSecretDebug = () => {
        triggerHaptic && triggerHaptic();
        const newCount = secretCount + 1;
        setSecretCount(newCount);
        if (newCount === 7) {
            copyLogs && copyLogs();
            setSecretCount(0);
        }
        if (newCount === 1) setTimeout(() => setSecretCount(0), 2000);
    };

    const formatVES = (amount) => {
        return new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.ceil(amount));
    };

    // [NEW] Formato exacto para tasas (2 decimales, sin redondeo hacia arriba)
    const formatExactRate = (amount) => {
        return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    // Cálculos matemáticos
    const spread = rates.bcv.price > 0 ? ((rates.usdt.price - rates.bcv.price) / rates.bcv.price) * 100 : 0;
    const diffBs = rates.usdt.price - rates.bcv.price;

    const renderChange = (change) => {
        if (!change || change === 0) return null;
        const isPositive = change > 0;
        return (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border ${isPositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(change).toFixed(2)}%
            </span>
        );
    };

    // 📸 FUNCIÓN DE CAPTURA (Estable y Rápida)
    const handleCaptureKiosk = async () => {
        triggerHaptic && triggerHaptic();
        if (!kioskRef.current || isCapturing) return;
        setIsCapturing(true);
        const log = addLog || console.log;

        try {
            // 1. Capturamos el elemento visual (KioskRef)
            // 'ignoreElements' oculta los botones para que la foto salga limpia
            const canvas = await html2canvas(kioskRef.current, {
                useCORS: true,
                scale: window.devicePixelRatio, // Usa la calidad nativa del teléfono
                backgroundColor: '#020617',     // Fondo oscuro forzado
                ignoreElements: (element) => element.id === 'hide-on-capture',
            });

            // 2. Generamos la imagen JPEG (Más ligera y compatible)
            const image = canvas.toDataURL("image/jpeg", 0.9);

            // 3. Descarga automática
            const link = document.createElement('a');
            const dateStr = new Date().toLocaleDateString('es-VE').replace(/\//g, '-');
            const timeStr = new Date().toLocaleTimeString('es-VE', { hour12: false }).replace(/:/g, '');

            link.download = `TasasAlDía_${dateStr}_${timeStr}.jpg`;
            link.href = image;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            log("Captura guardada con éxito", "success");

        } catch (e) {
            console.error("Error captura:", e);
            alert("Hubo un error al guardar la imagen.");
        } finally {
            setIsCapturing(false);
        }
    };

    // --- MODO KIOSCO (Pantalla Completa) ---
    if (kioskMode) {
        return (
            <div
                ref={kioskRef}
                className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col justify-between items-center p-6 animate-in zoom-in duration-300"
                style={{ fontFamily: 'sans-serif' }}
            >
                {/* Botón Salir (ID especial para ocultarlo en la foto) */}
                <button
                    id="hide-on-capture"
                    onClick={() => { triggerHaptic && triggerHaptic(); setKioskMode(false); }}
                    className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white/50 hover:text-white transition-colors z-20"
                >
                    <Minimize size={24} />
                </button>

                {/* Encabezado Kiosco */}
                <div className="flex flex-col items-center mt-12 gap-4">
                    <img src="/logodark.png" alt="TasasAlDía" className="h-20 w-auto object-contain drop-shadow-lg" />
                    <div className="bg-slate-800/60 px-4 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-md">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">MONITOR EN TIEMPO REAL</p>
                    </div>
                </div>

                {/* PRECIO GIGANTE (Responsive con vw) */}
                <div className="flex flex-col items-center justify-center -mt-8">
                    <h1 className="text-[18vw] sm:text-[10rem] font-black font-mono leading-none tracking-tighter text-brand drop-shadow-[0_0_40px_rgba(255,204,0,0.2)]">
                        {formatExactRate(rates.usdt.price)}
                    </h1>
                    <p className="text-xl sm:text-3xl text-slate-500 font-mono font-medium tracking-widest mt-2">1 USDT = BS</p>
                </div>

                {/* Tarjetas Informativas */}
                <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-sm rounded-[2rem] border border-slate-800/50 p-6 sm:p-8 flex justify-between items-center mb-8">
                    <div className="text-center w-1/2 border-r border-slate-800 pr-4">
                        <p className="text-xs sm:text-sm font-bold uppercase text-slate-500 tracking-wider mb-2">BCV OFICIAL</p>
                        <p className="text-2xl sm:text-4xl font-mono font-bold text-white">{formatExactRate(rates.bcv.price)}</p>
                    </div>
                    <div className="text-center w-1/2 pl-4">
                        <p className="text-xs sm:text-sm font-bold uppercase text-slate-500 tracking-wider mb-2">EURO BCV</p>
                        <p className="text-2xl sm:text-4xl font-mono font-bold text-white">{formatExactRate(rates.euro.price)}</p>
                    </div>
                </div>

                {/* Pie de página + Botón Captura */}
                <div className="flex flex-col items-center gap-6 mb-8 w-full relative z-10">
                    <div className="text-center opacity-60">
                        <p className="text-lg font-medium text-brand">
                            {rates.lastUpdate ? new Date(rates.lastUpdate).toLocaleDateString('es-VE', { day: 'numeric', month: 'long' }) : '---'}
                        </p>
                        <p className="text-sm font-mono">
                            {rates.lastUpdate ? new Date(rates.lastUpdate).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                        </p>
                    </div>

                    {/* BOTÓN FLOTANTE PARA CAPTURAR (Se oculta al tomar la foto) */}
                    {!isCapturing && (
                        <button
                            id="hide-on-capture"
                            onClick={handleCaptureKiosk}
                            className="flex items-center gap-2 bg-brand text-slate-900 px-6 py-3 rounded-full font-bold shadow-lg shadow-brand/20 active:scale-95 transition-transform"
                        >
                            {isCapturing ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                            <span>Guardar Imagen</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // --- SKELETON LOADING (Carga inicial) ---
    if (loading && (!rates || !rates.usdt || rates.usdt.price === 0)) {
        return (
            <div className="space-y-8 pt-6 px-1 animate-pulse">
                <div className="flex justify-between items-center mb-8 px-2">
                    <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="flex gap-2">
                        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    </div>
                </div>
                <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]"></div>
                    <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]"></div>
                </div>
            </div>
        );
    }

    // --- VISTA NORMAL (GRID PRINCIPAL) ---
    return (
        <div className="flex flex-col h-[calc(100dvh-150px)] overflow-hidden justify-between py-2 animate-in fade-in slide-in-from-bottom-2 duration-500 relative max-w-xl mx-auto w-full">

            {/* HEADER */}
            <header className="flex items-center justify-between pt-2 pb-2 px-3 sm:px-4 shrink-0">
                <div className="flex flex-col items-start gap-1">
                    <button onClick={handleSecretDebug} className="active:scale-95 transition-transform outline-none">
                        <img src={theme === 'dark' ? '/logodark.png' : '/logoprincipal.png'} alt="TasasAlDía" className="h-10 sm:h-12 w-auto object-contain animate-in fade-in slide-in-from-left-2 duration-500 drop-shadow-sm" />
                    </button>
                    <div className="flex items-center gap-2 ml-1 mt-0.5">
                        <div className="bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm pointer-events-none">
                            <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] leading-none">V4.0</p>
                        </div>
                        <button
                            onClick={() => { triggerHaptic && triggerHaptic(); toggleTheme(); }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity active:scale-90 outline-none"
                        >
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    {/* KIOSCO — solo visible en sm+ */}
                    <button
                        onClick={() => { triggerHaptic && triggerHaptic(); setKioskMode(true); }}
                        className="hidden sm:flex p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-brand-dark dark:hover:text-brand transition-all shadow-sm active:scale-95"
                        title="Pantalla Completa / Captura"
                    >
                        <Maximize size={18} strokeWidth={2} />
                    </button>

                    {/* NOTIFICACIONES PUSH — solo visible en sm+ */}
                    <button onClick={() => { triggerHaptic && triggerHaptic(); enableNotifications(); }} disabled={notificationsEnabled} className={`hidden sm:flex p-2 sm:p-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${notificationsEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-400'}`}>
                        {notificationsEnabled ? <BellRing size={16} /> : <Bell size={16} />}
                    </button>

                    {/* v4.0: Alertas — siempre visible */}
                    <button
                        onClick={() => { triggerHaptic && triggerHaptic(); setShowAlerts(true); }}
                        className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-amber-500 transition-all shadow-sm active:scale-95 relative"
                        title="Alertas de Tasa"
                    >
                        <BellDot size={16} className="sm:w-[18px] sm:h-[18px]" />
                        {alerts?.alerts?.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
                        )}
                    </button>

                    {/* v4.0: Historial — siempre visible */}
                    <button
                        onClick={() => { triggerHaptic && triggerHaptic(); setShowHistory(true); }}
                        className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-blue-500 transition-all shadow-sm active:scale-95"
                        title="Historial de Tasas"
                    >
                        <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>

                    {/* REFRESH — siempre visible */}
                    <button onClick={() => { triggerHaptic && triggerHaptic(); onRefresh(); }} disabled={loading} className={`p-2 sm:p-2.5 rounded-2xl text-slate-900 shadow-lg shadow-brand/10 border border-transparent transition-all active:scale-95 ${loading ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed' : 'bg-brand hover:bg-brand-light'}`}>
                        <RefreshCw size={16} className={`sm:w-[18px] sm:h-[18px] ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            {/* Warning de Datos Viejos */}
            {isOldData && (
                <div className="mx-3 sm:mx-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl flex items-center justify-center gap-2 animate-in slide-in-from-top-2 shrink-0">
                    <AlertTriangle size={14} className="text-amber-600 dark:text-amber-500" />
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-500">
                        Precios referenciales (No actualizados hoy)
                    </p>
                </div>
            )}

            {/* CONTENEDOR TARJETAS (FLEX-1 PARA OCUPAR ESPACIO Y CENTRAR) */}
            <div className="flex-1 flex flex-col justify-center gap-4 min-h-0">

                {/* Tarjeta Principal USDT */}
                <div className="relative group shrink-0">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-brand/30 to-purple-500/30 rounded-[2.2rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.02] transform rotate-12 pointer-events-none"><TrendingUp size={140} /></div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Promedio P2P</span>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                                    Tasa USDT {rates.usdt.type === 'p2p' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                </h2>
                            </div>
                            {renderChange(rates.usdt.change)}
                        </div>

                        <div className="flex items-baseline gap-1 mb-4 select-none">
                            <span className="text-2xl text-slate-300 dark:text-slate-600 font-bold font-sans transform -translate-y-4">$</span>
                            <div className="text-[12vw] sm:text-[4rem] lg:text-[3.5rem] xl:text-[4rem] leading-none font-black text-slate-900 dark:text-white tracking-tighter font-mono">
                                {formatExactRate(rates.usdt.price).split(',')[0]}
                                <span className="text-3xl text-slate-400 dark:text-slate-600">,{formatExactRate(rates.usdt.price).split(',')[1]}</span>
                            </div>
                            <span className="text-xl font-bold text-slate-400 ml-2">Bs</span>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                            {/* v4.0: Sparkline */}
                            {rateHistory && (() => {
                                const sparkData = rateHistory.getSparklineData('usdt', 1);
                                return sparkData.length >= 2 ? (
                                    <Sparkline data={sparkData} width={80} height={24} color="#22c55e" />
                                ) : null;
                            })()}
                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${spread > 10 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                Brecha: {spread.toFixed(2)}%
                            </div>
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">Diferencia: {formatVES(diffBs)} Bs</span>
                        </div>
                    </div>
                </div>

                {/* Tarjetas Secundarias (BCV / Euro) */}
                <div className="grid grid-cols-2 gap-4 shrink-0">
                    <RateCardMini title="Dolar BCV Oficial" price={rates.bcv.price} change={rates.bcv.change} icon="🏛️" formatVES={formatExactRate} renderChange={renderChange} symbol="Bs / $"
                        sparkData={rateHistory?.getSparklineData('bcv', 1)} sparkColor="#3b82f6" />
                    <RateCardMini title="Euro BCV Oficial" price={rates.euro.price} change={rates.euro.change} icon="🇪🇺" formatVES={formatExactRate} renderChange={renderChange} symbol="Bs / €"
                        sparkData={rateHistory?.getSparklineData('euro', 1)} sparkColor="#a855f7" />
                </div>
            </div>

            {/* Footer Clock */}
            <div className="flex justify-center mt-auto opacity-60 hover:opacity-100 transition-opacity shrink-0">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                        Actualizado: {rates.lastUpdate ? new Date(rates.lastUpdate).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                    </span>
                </div>
            </div>
            {/* v4.0: History & Alerts Modals */}
            {rateHistory && (
                <HistoryPanel
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    getHistory={rateHistory.getHistory}
                    getStats={rateHistory.getStats}
                />
            )}
            {alerts && (
                <AlertsConfig
                    isOpen={showAlerts}
                    onClose={() => setShowAlerts(false)}
                    alerts={alerts.alerts}
                    triggeredLog={alerts.triggeredLog}
                    addAlert={alerts.addAlert}
                    removeAlert={alerts.removeAlert}
                    toggleAlert={alerts.toggleAlert}
                    currentRates={rates}
                />
            )}
        </div>
    );
}

// Componente pequeño para tarjetas secundarias
function RateCardMini({ title, price, change, icon, formatVES, renderChange, symbol, sparkData, sparkColor }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start mb-4">
                <span className="text-xl filter grayscale opacity-80">{icon}</span>
                {change !== 0 ? renderChange(change) : <div className="h-5"></div>}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{title}</span>
            <div className="text-xl font-black text-slate-800 dark:text-white tracking-tight font-mono">{formatVES(price)}</div>
            <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-400 font-medium">{symbol || 'Bs / $'}</span>
                {sparkData && sparkData.length >= 2 && (
                    <Sparkline data={sparkData} width={50} height={16} color={sparkColor || '#3b82f6'} showArea={false} />
                )}
            </div>
        </div>
    );
}