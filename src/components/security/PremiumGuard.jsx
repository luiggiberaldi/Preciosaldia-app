import React, { useState } from 'react';
import { Lock, Copy, Check, Star, Sparkles, Send, Bot, Store, MessageCircle, Database, Calculator, Clock, XCircle, Crown } from 'lucide-react';
import { useSecurity } from '../../hooks/useSecurity';
import { Modal } from '../Modal'; // Importar Modal Genérico

export default function PremiumGuard({ children, featureName = "Esta función", isAI = false, isShop = false }) { // [UPDATED]
    const { deviceId, isPremium, loading, unlockApp } = useSecurity();
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // [NEW] Estado para Modales de Mensaje (Alert Replacement)
    const [messageModal, setMessageModal] = useState({ open: false, title: '', content: '' });

    // Mientras carga el estado de seguridad, mostramos un loader simple o nada
    if (loading) return <div className="p-10 text-center text-slate-400">Verificando licencia...</div>;

    // Si es Premium, renderizamos el contenido protegido
    if (isPremium) return children;

    // Si NO es Premium, mostramos el Paywall
    const handleUnlock = async (e) => {
        e.preventDefault();
        const result = await unlockApp(inputCode);

        if (result.success) {
            setSuccess(true);
            setError(false);

            if (result.status === 'DEMO_ACTIVATED') {
                setMessageModal({
                    open: true,
                    title: '🎉 ¡Modo Demo Activado!',
                    content: 'Disfruta de todas las funciones VIP por 24 horas. Aprovecha al máximo la herramienta para potenciar tu negocio.'
                });
            }
        } else {
            setError(true);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

            if (result.status === 'DEMO_USED') {
                setMessageModal({
                    open: true,
                    title: '🚫 Demo Ya Utilizado',
                    content: 'El periodo de prueba ya fue utilizado en este dispositivo. Por favor, contacta a soporte para adquirir una licencia ilimitada.'
                });
            }

            setTimeout(() => setError(false), 2000);
        }
    };

    const copyToClipboard = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(deviceId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openWhatsApp = () => {
        const message = `Hola! Quiero adquirir una licencia Premium para TasasAlDía. Mi ID de instalación es: ${deviceId}`;
        const url = `https://wa.me/584124051793?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // [NEW] Configuration Logic
    let title, message, Icon, iconColor, benefits;

    // ESTILO "LIGHT & CLEAN" (Unificado para todas las variantes para evitar peso visual)
    const bgContainer = "bg-white/95 dark:bg-slate-900/95";
    const containerClasses = "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none";

    if (isShop) {
        title = <span>TasasAlDía <span className="text-amber-500">Business</span> 👑</span>;
        message = "Gestiona tu catálogo con precios bimoneda y comparte cotizaciones al instante.";
        Icon = Store;
        iconColor = "text-indigo-600 dark:text-indigo-400 animate-pulse";
        benefits = (
            <>
                <BenefitItem icon={<Store size={15} className="text-indigo-500" />} text="Catálogo Bodega bimoneda (USD/Bs)" />
                <BenefitItem icon={<MessageCircle size={15} className="text-green-500" />} text="Cotizaciones para WhatsApp" />
                <BenefitItem icon={<Database size={15} className="text-blue-500" />} text="Almacenamiento offline en el dispositivo" />
            </>
        );
    } else if (isAI) {
        title = "Asesoría VIP Agotada ⚡";
        message = "Para seguir con análisis precisos y conversiones ilimitadas, activa tu licencia.";
        Icon = Bot;
        iconColor = "text-violet-600 dark:text-violet-400 animate-pulse";
        benefits = (
            <>
                <BenefitItem icon={<Calculator size={15} className="text-violet-600 dark:text-violet-400" />} text="Calculadora bimoneda ilimitada" />
                <BenefitItem icon={<Star size={15} className="text-amber-500" />} text="Acceso a Catálogo Bodega" />
                <BenefitItem icon={<Check size={15} className="text-green-600 dark:text-green-500" />} text="Soporte prioritario" />
            </>
        );
    } else {
        title = <span>TasasAlDía <span className="text-amber-500">Premium</span> 👑</span>;
        message = <span>Acceso exclusivo a <strong>{featureName}</strong> para miembros Premium.</span>;
        Icon = Lock;
        iconColor = "text-amber-500";
        benefits = (
            <>
                <BenefitItem icon={<Store size={15} className="text-indigo-500" />} text="Catálogo Bodega con precios bimoneda" />
                <BenefitItem icon={<MessageCircle size={15} className="text-green-500" />} text="Cotizaciones vía WhatsApp" />
                <BenefitItem icon={<Calculator size={15} className="text-amber-500" />} text="Calculadora avanzada ilimitada" />
            </>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center h-full p-2 text-center overflow-hidden px-4`}>
            {/* Added styles for medial query */}
            <style>{`
                @media (max-height: 600px) {
                    .benefits-list { display: none; }
                }
            `}</style>

            <div className={`w-full max-w-[320px] sm:max-w-sm max-h-[95%] overflow-hidden rounded-[2rem] p-4 relative ${containerClasses}`}>

                {/* Decorative Background Elements (Light & Subtle) */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* Icon & Title */}
                <div className="mb-2 relative z-10">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <Icon className={iconColor} size={24} strokeWidth={2} />
                    </div>
                    <h2 className="text-xl font-black mb-1 tracking-tight text-slate-900 dark:text-white leading-tight">
                        {title}
                    </h2>
                    <p className="text-xs font-medium leading-tight text-slate-500 dark:text-slate-400 px-1">
                        {message}
                    </p>
                </div>

                {/* Benefits */}
                <div className="benefits-list space-y-1 mb-3 text-left relative z-10 px-1">
                    {benefits}
                </div>

                {/* Device ID Section */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2 mb-3 border border-slate-100 dark:border-slate-700/50">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5 font-bold leading-tight">Tu ID de Instalación</p>
                    <div className="flex items-center justify-between gap-2">
                        <code className="text-base font-mono font-bold text-slate-900 dark:text-slate-200 tracking-wider">
                            {deviceId}
                        </code>
                        <button
                            onClick={copyToClipboard}
                            className="p-1.5 bg-white dark:bg-slate-700 hover:scale-105 shadow-sm border border-slate-100 dark:border-slate-600 rounded-lg transition-all text-slate-400 dark:text-slate-300 hover:text-amber-500"
                            title="Copiar ID"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={openWhatsApp}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-3 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 active:scale-95 text-sm"
                >
                    <Send size={16} fill="white" />
                    <span>Solicitar Licencia</span>
                </button>

                {/* Activation Form */}
                <form onSubmit={handleUnlock} className="border-t border-slate-100 dark:border-slate-800 pt-2">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-bold uppercase tracking-wide leading-tight">Código de Activación</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            placeholder="XP-CODE"
                            className={`flex-1 bg-white dark:bg-slate-950 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-2 py-2 text-center font-mono text-xs font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all uppercase placeholder:text-slate-300 dark:placeholder:text-slate-600 shadow-sm`}
                        />
                        <button
                            type="submit"
                            className="bg-slate-900 dark:bg-slate-800 dark:border dark:border-slate-700 text-white font-bold px-4 rounded-xl text-xs hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                        >
                            <Check size={16} strokeWidth={3} />
                        </button>
                    </div>
                    {error && <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">Código inválido.</p>}
                    {success && <p className="text-[10px] text-green-500 mt-1 font-bold">¡Activado!</p>}
                </form>

                {/* Demo Button (Portafolio) */}
                <button
                    onClick={() => setShowConfirmation(true)}
                    className="w-full mt-2 py-2 text-[10px] text-slate-400 dark:text-slate-500 hover:text-brand-dark dark:hover:text-white font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100"
                >
                    {deviceId === 'TASAS-DEMO' ? (
                        <>
                            <XCircle size={11} />
                            <span>Salir de Demo</span>
                        </>
                    ) : (
                        <>
                            <Clock size={11} />
                            <span>Solicitar Demo (24h)</span>
                        </>
                    )}
                </button>

                {/* MODAL DE CONFIRMACIÓN CUSTOM */}
                {showConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-6 max-w-xs text-center transform scale-100 animate-in zoom-in-95 duration-200">

                            <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3">
                                <Crown size={24} className="text-amber-500" />
                            </div>

                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 leading-tight">
                                {deviceId === 'TASAS-DEMO' ? '¿Finalizar Sesión Demo?' : '¿Activar Entorno Demo?'}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-5 leading-relaxed">
                                {deviceId === 'TASAS-DEMO'
                                    ? 'Se borrará la licencia temporal y se restaurará la configuración original del dispositivo.'
                                    : 'Esta acción configurará el dispositivo para pruebas de evaluación técnica durante 24 horas.'}
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (deviceId === 'TASAS-DEMO') {
                                            localStorage.removeItem('device_id');
                                            localStorage.removeItem('premium_token');
                                        } else {
                                            localStorage.setItem('device_id', 'TASAS-DEMO');
                                        }
                                        window.location.reload();
                                    }}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-brand-dark hover:opacity-90 transition-opacity shadow-lg shadow-slate-500/20"
                                >
                                    {deviceId === 'TASAS-DEMO' ? 'Restaurar' : 'Activar Demo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE MENSAJES (Reemplazo de Alert) */}
                <Modal
                    isOpen={messageModal.open}
                    onClose={() => setMessageModal({ ...messageModal, open: false })}
                    title={messageModal.title}
                >
                    <div className="text-center py-4">
                        <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                            {messageModal.content}
                        </p>
                        <button
                            onClick={() => setMessageModal({ ...messageModal, open: false })}
                            className="w-full py-3 bg-brand text-slate-900 font-bold rounded-xl shadow-lg shadow-brand/20 active:scale-95 transition-transform"
                        >
                            Entendido
                        </button>
                    </div>
                </Modal>

            </div>
        </div>
    );
}

function BenefitItem({ icon, text }) {
    return (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                {icon}
            </div>
            <span>{text}</span>
        </div>
    );
}
