import React, { useState, useEffect } from 'react';
import { Check, Copy, ArrowRightLeft, History, Send } from 'lucide-react'; // [UPDATED] Cleaned imports

// Hooks
import { useCalculator } from '../../hooks/useCalculator';

// Components
import CalculatorInput from '../../components/CalculatorInput';
import { AccountSelector } from './AccountSelector';
import { Modal } from '../../components/Modal';
import { MessageService } from '../../services/MessageService';
// PaymentSummaryChat removed

export const ManualMode = ({ rates, accounts, theme, triggerHaptic, isKeyboardOpen }) => {
    const calc = useCalculator(rates);
    const [copied, setCopied] = useState(false);
    // Modal state removed as PaymentSummaryChat is gone

    // [NEW] History State
    const [history, setHistory] = useState([]);

    // [NEW] Send Logic State
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [messageTone, setMessageTone] = useState('casual'); // 'casual', 'formal', 'direct'
    const [clientName, setClientName] = useState('');
    const [mainCurrency, setMainCurrency] = useState('auto'); // 'auto', 'BS', 'USD', 'EUR'
    const [showReference, setShowReference] = useState(true);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('calc_history');
            if (saved) setHistory(JSON.parse(saved));
        } catch (e) {
            console.error(e);
        }
    }, []);

    const addToHistory = () => {
        if (!calc.amountTop || !calc.amountBot) return;

        const newEntry = {
            id: Date.now(),
            from: calc.from,
            to: calc.to,
            in: calc.amountTop,
            out: calc.amountBot,
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const newHistory = [newEntry, ...history].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem('calc_history', JSON.stringify(newHistory));
    };

    const restoreHistory = (item) => {
        triggerHaptic && triggerHaptic();
        calc.setFrom(item.from);
        calc.setTo(item.to);
        calc.handleAmountChange(item.in, 'top');
    };

    const modifiedCurrencies = calc.currencies.map(c => ({
        ...c,
        label: (c.label === '$ BCV' || c.id === 'USD' || c.id === 'BCV') ? 'Dolar' : c.label
    }));

    const handleCopy = () => {
        triggerHaptic && triggerHaptic();
        addToHistory(); // [NEW] Save to history
        if (!calc.amountBot) return;
        const text = `💰 Cambio: ${calc.amountTop} ${calc.from} -> ${calc.amountBot} ${calc.to}`;
        navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    return (
        // CONTENEDOR PRINCIPAL: Usa flex-col para separar scroll de botones fijos
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950/50">

            {/* ÁREA SCROLLABLE (Inputs y Título) */}
            <div className={`flex-1 overflow-y-auto ${isKeyboardOpen ? 'p-2' : 'p-4 sm:p-6'} scrollbar-hide`}>
                <div className={`transition-all duration-300 ${isKeyboardOpen ? 'space-y-2 pb-2' : 'space-y-8 pb-40'}`}>

                    {/* Header (Hidden in Ultra-Compact Mode) */}
                    {!isKeyboardOpen && (
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Conversión Rápida</h2>
                                <p className="text-sm text-slate-400 font-medium">Calculadora de precisión</p>
                            </div>
                        </div>
                    )}

                    {/* Inputs Stack */}
                    <div className="relative flex flex-col gap-3">

                        {/* Input TENGO */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-1 z-0">
                            <CalculatorInput
                                label="TENGO"
                                amount={calc.amountTop}
                                currency={calc.from}
                                currencies={modifiedCurrencies}
                                onAmountChange={(v) => calc.handleAmountChange(v, 'top')}
                                onCurrencyChange={calc.setFrom}
                                onClear={calc.clear}
                                compact={isKeyboardOpen}
                            />
                        </div>

                        {/* Botón Swap (Posicionamiento Absoluto Seguro) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={() => { triggerHaptic && triggerHaptic(); calc.handleSwap(); }}
                                className="bg-brand text-slate-900 p-3 rounded-full shadow-xl hover:scale-110 hover:rotate-180 transition-all duration-300 border-[6px] border-slate-50 dark:border-slate-950"
                            >
                                <ArrowRightLeft size={22} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Input RECIBO */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-1 z-0">
                            <CalculatorInput
                                label="RECIBO"
                                amount={calc.amountBot}
                                currency={calc.to}
                                currencies={modifiedCurrencies}
                                onAmountChange={(v) => calc.handleAmountChange(v, 'bot')}
                                onCurrencyChange={calc.setTo}
                                onClear={calc.clear}
                                compact={isKeyboardOpen}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ÁREA FIJA INFERIOR (Botones de Acción + Historial) */}
            {/* flex-shrink-0 asegura que NUNCA se aplasten */}
            {!isKeyboardOpen && (
                <div className="p-4 sm:p-5 pt-2 flex-shrink-0 z-20 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 animate-out slide-out-to-bottom duration-300">

                    {/* [NEW] History Bar */}
                    {history.length > 0 && (
                        <div className="mb-3 overflow-x-auto pb-1 scrollbar-hide flex gap-2">
                            {history.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => restoreHistory(item)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm active:scale-95 transition-transform"
                                >
                                    <History size={10} className="text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                        {item.in} {item.from} <span className="text-slate-300 mx-0.5">→</span> {item.out} {item.to}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Botones de Acción (Hidden in Ultra-Compact Mode) */}
                    {!isKeyboardOpen && (
                        <div className="flex gap-3 px-1 mt-6">
                            <button
                                onClick={handleCopy}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 hover:text-brand transition-all active:scale-95 shadow-sm"
                            >
                                <div className="p-2">
                                    {copied ? <Check size={22} className="text-emerald-500" /> : <Copy size={22} strokeWidth={2.5} />}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Copiar</span>
                            </button>

                            <button
                                onClick={() => { triggerHaptic && triggerHaptic(); if (calc.amountBot) setIsSendModalOpen(true); }}
                                disabled={!calc.amountTop}
                                className="flex-1 flex items-center justify-center gap-3 bg-brand text-slate-900 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-transform disabled:opacity-50 disabled:shadow-none"
                            >
                                <Send size={24} strokeWidth={3} />
                                <span>Enviar</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Envío (Restored Logic) */}
            <Modal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} title="Enviar al Cliente">
                <div className="space-y-5">

                    {/* Client Name Input */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nombre del Cliente (Opcional)</label>
                        <input
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                            className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                        />
                    </div>

                    {/* Currency & Reference Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Mostrar Total en</label>
                            <select
                                value={mainCurrency}
                                onChange={(e) => setMainCurrency(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl font-bold text-slate-700 dark:text-white outline-none text-xs"
                            >
                                <option value="auto">Automático</option>
                                <option value="BS">Bolívares (Bs)</option>
                                <option value="USD_BCV">Dólares BCV ($)</option>
                                <option value="USDT">USDT</option>
                                <option value="EUR">Euros (€)</option>
                            </select>
                        </div>
                        <div className="flex flex-col justify-end pb-1">
                            <button
                                onClick={() => setShowReference(!showReference)}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${showReference ? 'bg-brand/10 border-brand text-brand-dark' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                            >
                                {showReference ? 'Con Referencia' : 'Sin Referencia'}
                            </button>
                        </div>
                    </div>

                    {/* Tone Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Estilo del Mensaje</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {['casual', 'formal', 'direct'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setMessageTone(t)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${messageTone === t
                                        ? 'bg-white dark:bg-slate-700 text-brand-dark shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {t === 'direct' ? 'Directo' : t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Preview (Dynamic) */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                            Vista Previa <span className="text-[9px] font-normal normal-case text-slate-400 ml-auto opacity-70">(Ejemplo)</span>
                        </label>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed whitespace-pre-wrap select-text">
                            {(() => {
                                // Mock Account for Preview based on Target Currency
                                const isTargetVes = calc.to === 'VES' || calc.to === 'Bs';
                                const mockAccount = {
                                    currency: isTargetVes ? 'VES' : 'USDT',
                                    type: isTargetVes ? 'pago_movil' : 'binance',
                                    data: isTargetVes
                                        ? { bankName: 'Banco', phone: '04XX...', docId: '...' }
                                        : { email: 'correo@ejemplo.com' }
                                };

                                return MessageService.buildPaymentMessage({
                                    amountTop: calc.amountTop,
                                    amountBot: calc.amountBot,
                                    from: calc.from,
                                    to: calc.to,
                                    selectedAccount: mockAccount,
                                    showReference: showReference,
                                    rates: rates,
                                    currencies: calc.currencies,
                                    tone: messageTone,
                                    clientName: clientName,
                                    mainCurrency: mainCurrency
                                });
                            })()}
                        </p>
                    </div>

                    {/* Account Selector & Action */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Selecciona Cuenta para Enviar</label>
                        <AccountSelector
                            accounts={accounts}
                            onSelect={(acc) => {
                                triggerHaptic && triggerHaptic();
                                const text = MessageService.buildPaymentMessage({
                                    amountTop: calc.amountTop,
                                    amountBot: calc.amountBot,
                                    from: calc.from,
                                    to: calc.to,
                                    selectedAccount: acc,
                                    showReference: showReference,
                                    rates: rates,
                                    currencies: calc.currencies,
                                    tone: messageTone,
                                    clientName: clientName,
                                    mainCurrency: mainCurrency
                                });

                                // Close and Open WhatsApp
                                setIsSendModalOpen(false);
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                addToHistory(); // Save to history on send
                            }}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};