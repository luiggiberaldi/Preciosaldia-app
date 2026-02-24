import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, CreditCard, Landmark, DollarSign, X, Bitcoin, Smartphone, QrCode, Pencil } from 'lucide-react';
import { Modal } from '../components/Modal';

// ✅ LISTA OFICIAL DE BANCOS VENEZOLANOS (2025)
const VENEZUELA_BANKS = [
    { code: "0102", name: "Banco de Venezuela" },
    { code: "0105", name: "Banco Mercantil" },
    { code: "0134", name: "Banesco" },
    { code: "0108", name: "Banco Provincial" },
    { code: "0191", name: "BNC Nacional de Crédito" },
    { code: "0172", name: "Bancamiga" },
    { code: "0171", name: "Banco Activo" },
    { code: "0166", name: "Banco Agrícola" },
    { code: "0175", name: "Banco Bicentenario" },
    { code: "0128", name: "Banco Caroní" },
    { code: "0163", name: "Banco del Tesoro" },
    { code: "0115", name: "Banco Exterior" },
    { code: "0151", name: "Banco Fondo Común (BFC)" },
    { code: "0173", name: "Banco Internacional de Desarrollo" },
    { code: "0138", name: "Banco Plaza" },
    { code: "0137", name: "Banco Sofitasa" },
    { code: "0104", name: "Banco Venezolano de Crédito" },
    { code: "0168", name: "Bancrecer" },
    { code: "0177", name: "Banfanb" },
    { code: "0146", name: "Bangente" },
    { code: "0174", name: "Banplus" },
    { code: "0196", name: "CitiBank" },
    { code: "0157", name: "Delsur" },
    { code: "0114", name: "Mi Banco" },
    { code: "0156", name: "100% Banco" },
    { code: "0178", name: "N58 Banco Digital" }
];

// [AUDIT FIX] Tailwind class for form inputs (replaces inline <style>)
const inputClass = "w-full p-3 rounded-xl text-sm outline-none transition-all bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function WalletView({ rates }) {
    // Estado de Cuentas
    const [accounts, setAccounts] = useState(() => {
        try { return JSON.parse(localStorage.getItem('my_accounts_v2')) || []; }
        catch { return []; }
    });

    // Estados de Interfaz
    const [showForm, setShowForm] = useState(false);
    const [showShareModal, setShowShareModal] = useState(null);

    // Estado para saber si estamos editando
    const [editingId, setEditingId] = useState(null);

    // [AUDIT FIX] Estado para modal de eliminación custom (reemplaza confirm() nativo)
    const [deleteId, setDeleteId] = useState(null);

    // Estado para alternar entre Texto y QR
    const [shareMode, setShareMode] = useState('text');

    // Estado del Formulario
    const initialFormState = {
        type: 'pago_movil',
        alias: '',
        bank: '',
        phone: '',
        id: '',
        email: '',
        holder: '',
        accountNumber: ''
    };
    const [newAccount, setNewAccount] = useState(initialFormState);

    // Estado del Modal de Cobro
    const [amountBs, setAmountBs] = useState('');
    const [selectedRate, setSelectedRate] = useState('bcv');

    useEffect(() => {
        localStorage.setItem('my_accounts_v2', JSON.stringify(accounts));
    }, [accounts]);

    // --- LÓGICA CRUD ---
    const openCreateModal = () => {
        setEditingId(null);
        setNewAccount(initialFormState);
        setShowForm(true);
    };

    const openEditModal = (acc, e) => {
        e.stopPropagation();
        setEditingId(acc.id_gen);
        setNewAccount(acc);
        setShowForm(true);
    };

    const handleSaveAccount = (e) => {
        e.preventDefault();
        if (editingId) {
            setAccounts(accounts.map(acc =>
                acc.id_gen === editingId ? { ...newAccount, id_gen: editingId } : acc
            ));
        } else {
            setAccounts([...accounts, { ...newAccount, id_gen: Date.now() }]);
        }
        setShowForm(false);
        setEditingId(null);
    };

    // [AUDIT FIX] Replaced native confirm() with custom modal
    const handleDelete = (id, e) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (deleteId) {
            setAccounts(accounts.filter(a => a.id_gen !== deleteId));
            setDeleteId(null);
        }
    };

    // --- HELPERS ---
    const getQRData = (account) => {
        if (account.type === 'pago_movil') return `PAGO MÓVIL\nBanco: ${account.bank}\nTel: ${account.phone}\nCI: ${account.id}\nTitular: ${account.holder}`;
        if (account.type === 'transferencia') return `TRANSFERENCIA\nBanco: ${account.bank}\nCuenta: ${account.accountNumber}\nRIF/CI: ${account.id}\nTitular: ${account.holder}`;
        if (account.type === 'zelle') return `ZELLE\nEmail: ${account.email}\nTitular: ${account.holder}`;
        if (account.type === 'binance') return `BINANCE PAY\nID/Email: ${account.email}\nAlias: ${account.alias}`;
        return "Datos de cuenta";
    };

    const handleShare = () => {
        const account = showShareModal;
        let message = "";
        const fmt = (n) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(n);

        if (account.type === 'pago_movil') {
            message = `📌 *Datos Pago Móvil*\n\n🏦 Banco: ${account.bank}\n📱 Teléfono: ${account.phone}\n🆔 C.I: ${account.id}\n👤 Titular: ${account.holder || account.alias}\n\n`;
            if (amountBs) message += `💰 Monto a pagar: ${fmt(amountBs)} Bs`;
        } else if (account.type === 'transferencia') {
            message = `🏦 *Datos Transferencia*\n\n🏛️ Banco: ${account.bank}\n🔢 Cuenta: ${account.accountNumber}\n🆔 C.I/RIF: ${account.id}\n👤 Titular: ${account.holder}\n\n`;
            if (amountBs) message += `💰 Monto a pagar: ${fmt(amountBs)} Bs`;
        } else if (account.type === 'zelle') {
            message = `🇺🇸 *Datos Zelle*\n\n✉️ Correo: ${account.email}\n👤 Titular: ${account.holder}\n\n`;
            if (amountBs && rates) {
                const rateVal = selectedRate === 'bcv' ? rates.bcv.price : rates.usdt.price;
                if (rateVal > 0) {
                    const amountUSD = parseFloat(amountBs) / rateVal;
                    message += `💵 Monto a enviar: $${amountUSD.toFixed(2)}\n(Ref: ${fmt(amountBs)} Bs a tasa ${selectedRate.toUpperCase()} ${fmt(rateVal)})`;
                }
            }
        } else if (account.type === 'binance') {
            message = `🟡 *Datos Binance Pay*\n\n🆔 Pay ID / Correo: ${account.email}\n👤 Alias: ${account.holder || account.alias}\n\n`;
            if (amountBs && rates) {
                const rateVal = selectedRate === 'bcv' ? rates.bcv.price : rates.usdt.price;
                if (rateVal > 0) {
                    const amountUSD = parseFloat(amountBs) / rateVal;
                    message += `💵 Monto a enviar: ${amountUSD.toFixed(2)} USDT\n(Ref: ${fmt(amountBs)} Bs a tasa ${selectedRate.toUpperCase()} ${fmt(rateVal)})`;
                }
            }
        }

        message += `\n\n📸 *Por favor enviar capture del comprobante de pago.*`;

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        setShowShareModal(null);
        setAmountBs('');
    };

    const getIcon = (type) => {
        switch (type) {
            case 'zelle': return <DollarSign size={20} />;
            case 'binance': return <Bitcoin size={20} />;
            case 'transferencia': return <Landmark size={20} />;
            default: return <Smartphone size={20} />;
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'zelle': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
            case 'binance': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
            case 'transferencia': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            default: return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
        }
    };

    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">

            {/* CABECERA */}
            <div className="flex justify-between items-center mb-4 px-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Mis Cuentas</h2>
                    <p className="text-xs font-medium text-slate-400">Guarda y comparte tus datos de pago</p>
                </div>
                <button onClick={openCreateModal} className="p-3 bg-brand hover:bg-brand-dark text-slate-900 rounded-xl shadow-lg shadow-brand/20 active:scale-95 transition-all">
                    <Plus size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* LISTA DE CUENTAS */}
            <div className="space-y-3 pb-20">
                {accounts.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <CreditCard size={48} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm text-slate-500">No tienes cuentas guardadas.</p>
                    </div>
                ) : (
                    accounts.map(acc => (
                        <div key={acc.id_gen} onClick={() => { setShowShareModal(acc); setShareMode('text'); }} className="relative group bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${getColor(acc.type)}`}>
                                        {getIcon(acc.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white capitalize">{acc.alias}</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{acc.type.replace('_', ' ')}</p>
                                    </div>
                                </div>

                                <div className="flex gap-1">
                                    <button
                                        onClick={(e) => openEditModal(acc, e)}
                                        className="p-2 text-slate-300 hover:text-brand-dark dark:hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                                    >
                                        <Pencil size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(acc.id_gen, e)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-all"
                                    >
                                        <Trash2 size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 pl-1">
                                {(acc.type === 'pago_movil') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.bank} • {acc.phone}</p>}
                                {(acc.type === 'transferencia') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.bank} • {acc.accountNumber.slice(0, 4)}...{acc.accountNumber.slice(-4)}</p>}
                                {(acc.type === 'zelle' || acc.type === 'binance') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.email}</p>}
                                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{acc.holder || acc.id}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* --- FORMULARIO (CREAR / EDITAR) --- */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[85vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                {editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSaveAccount} className="space-y-5 pb-4">

                            {/* SELECTOR DE TIPO */}
                            <div>
                                <label className={labelClass}>Tipo de Cuenta</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'pago_movil', label: 'Pago Móvil' },
                                        { id: 'transferencia', label: 'Transferencia' },
                                        { id: 'zelle', label: 'Zelle' },
                                        { id: 'binance', label: 'Binance' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setNewAccount({ ...newAccount, type: t.id })}
                                            className={`py-3 rounded-xl text-xs font-bold transition-all border ${newAccount.type === t.id ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ALIAS */}
                            <div>
                                <label className={labelClass}>Alias de la Cuenta</label>
                                <input required placeholder="Ej: Personal, Bodega" value={newAccount.alias} onChange={e => setNewAccount({ ...newAccount, alias: e.target.value })} className={inputClass} />
                            </div>

                            {/* SELECTOR DE BANCOS */}
                            {(newAccount.type === 'pago_movil' || newAccount.type === 'transferencia') && (
                                <div>
                                    <label className={labelClass}>Banco</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={newAccount.bank}
                                            onChange={e => setNewAccount({ ...newAccount, bank: e.target.value })}
                                            className={`${inputClass} appearance-none`}
                                        >
                                            <option value="" disabled>Selecciona un banco</option>
                                            {VENEZUELA_BANKS.map((b) => (
                                                <option key={b.code} value={b.name}>
                                                    {b.code} - {b.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(newAccount.type === 'transferencia') && (
                                <div>
                                    <label className={labelClass}>Número de Cuenta (20 Dígitos)</label>
                                    <input required type="number" placeholder="0000-0000-00-0000000000" value={newAccount.accountNumber} onChange={e => setNewAccount({ ...newAccount, accountNumber: e.target.value })} className={inputClass} />
                                </div>
                            )}

                            {(newAccount.type === 'pago_movil') && (
                                <div>
                                    <label className={labelClass}>Número de Teléfono</label>
                                    <input required type="tel" placeholder="Ej: 04121234567" value={newAccount.phone} onChange={e => setNewAccount({ ...newAccount, phone: e.target.value })} className={inputClass} />
                                </div>
                            )}

                            {(newAccount.type === 'pago_movil' || newAccount.type === 'transferencia') && (
                                <div>
                                    <label className={labelClass}>Cédula de Identidad / RIF</label>
                                    <input required placeholder="Ej: V12345678" value={newAccount.id} onChange={e => setNewAccount({ ...newAccount, id: e.target.value })} className={inputClass} />
                                </div>
                            )}

                            {(newAccount.type === 'zelle' || newAccount.type === 'binance') && (
                                <div>
                                    <label className={labelClass}>{newAccount.type === 'zelle' ? "Correo Electrónico" : "Correo o Binance ID"}</label>
                                    <input required placeholder="usuario@email.com" value={newAccount.email} onChange={e => setNewAccount({ ...newAccount, email: e.target.value })} className={inputClass} />
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>Nombre del Titular</label>
                                <input required placeholder="Nombre Apellido" value={newAccount.holder} onChange={e => setNewAccount({ ...newAccount, holder: e.target.value })} className={inputClass} />
                            </div>

                            <button type="submit" className="w-full py-4 bg-brand hover:bg-brand-dark text-slate-900 font-bold rounded-xl shadow-lg shadow-brand/20 mt-4 mb-2">
                                {editingId ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL COBRO --- */}
            {showShareModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">Cobrar con {showShareModal.alias}</h3>
                                <p className="text-xs text-slate-400">Selecciona el método de visualización</p>
                            </div>
                            <button onClick={() => setShowShareModal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={18} /></button>
                        </div>

                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                            <button
                                onClick={() => setShareMode('text')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${shareMode === 'text' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                            >
                                <Send size={14} /> WhatsApp
                            </button>
                            <button
                                onClick={() => setShareMode('qr')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${shareMode === 'qr' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                            >
                                <QrCode size={14} /> Código QR
                            </button>
                        </div>

                        {shareMode === 'text' ? (
                            <div className="space-y-4 animate-in fade-in pb-2">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Bs</span>
                                    <input type="number" autoFocus placeholder="Monto (Opcional)" value={amountBs} onChange={e => setAmountBs(e.target.value)} className="w-full pl-12 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-lg font-bold outline-none focus:ring-2 focus:ring-brand" />
                                </div>

                                {(showShareModal.type === 'zelle' || showShareModal.type === 'binance') && amountBs && rates && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase">Calcular a Tasa:</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setSelectedRate('bcv')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${selectedRate === 'bcv' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-transparent text-slate-400'}`}>🏛️ BCV ({rates.bcv.price})</button>
                                            <button onClick={() => setSelectedRate('usdt')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${selectedRate === 'usdt' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-transparent text-slate-400'}`}>📈 USDT ({rates.usdt.price})</button>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Recibirás ({showShareModal.type === 'binance' ? 'USDT' : 'USD'}):</span>
                                            <span className="text-xl font-black text-slate-800 dark:text-white">
                                                {(parseFloat(amountBs) / (selectedRate === 'bcv' ? rates.bcv.price : rates.usdt.price)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleShare} className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2">
                                    <Send size={20} /> Compartir por WhatsApp
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in slide-in-from-right-4 pb-6">
                                <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-200">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQRData(showShareModal))}&color=0f172a&bgcolor=ffffff`}
                                        alt="Código QR de Pago"
                                        className="w-48 h-48 mix-blend-multiply"
                                    />
                                </div>
                                <p className="text-xs text-center text-slate-400 max-w-[200px]">
                                    Muestra este código a tu cliente para que lo escanee directamente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* [AUDIT FIX] Modal de eliminación custom (reemplaza confirm() nativo) */}
            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar Cuenta">
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2">
                        <Trash2 size={32} className="text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">¿Estás seguro?</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 px-4">
                            Esta acción eliminará la cuenta permanentemente.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full pt-2">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all"
                        >
                            ¡Sí, eliminar!
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}