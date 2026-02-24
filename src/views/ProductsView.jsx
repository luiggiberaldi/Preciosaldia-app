import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Camera, X, Store, Tag, Pencil, Banknote, Search, ChevronLeft, ChevronRight, Share2, Settings, Zap } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ProductShareModal } from '../components/ProductShareModal';
import SettingsModal from '../components/SettingsModal';
import { formatBs, formatUsd, smartCashRounding } from '../utils/calculatorUtils';
import { useWallet } from '../hooks/useWallet';

export const ProductsView = ({ rates, triggerHaptic }) => {
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // [NEW] backup state

    // MARKET LOGIC (PDA v1.0) - REPOSITION PARITY
    const [streetRate, setStreetRate] = useState(() => {
        const saved = localStorage.getItem('street_rate_bs');
        return saved ? parseFloat(saved) : 0;
    });
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
    const [streetPriceInput, setStreetPriceInput] = useState('');

    // [NEW] MANUAL USDT RATE LOGIC
    const [useAutoUsdt, setUseAutoUsdt] = useState(() => {
        const saved = localStorage.getItem('catalog_use_auto_usdt');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [customUsdtPrice, setCustomUsdtPrice] = useState(() => {
        const saved = localStorage.getItem('catalog_custom_usdt_price');
        // Usamos string para manejar mejor los inputs (decimales y borrado de 0)
        return saved && parseFloat(saved) > 0 ? saved : '';
    });
    const [showCashPrice, setShowCashPrice] = useState(() => { // [NEW] Toggle for hiding Cash Price
        const saved = localStorage.getItem('catalog_show_cash_price');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isConfigOpen, setIsConfigOpen] = useState(false); // Unified Toggle

    // EFFECTIVE RATE (The heart of the feature)
    const effectiveUsdtRate = useAutoUsdt ? rates.usdt.price : (parseFloat(customUsdtPrice) > 0 ? parseFloat(customUsdtPrice) : rates.usdt.price);

    // Share State
    const [shareProduct, setShareProduct] = useState(null);
    const { accounts } = useWallet();

    // Paginación y Búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Form State (Restaurado)
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [priceUsdt, setPriceUsdt] = useState('');
    const [priceEfectivo, setPriceEfectivo] = useState('');
    const [image, setImage] = useState(null);
    const fileInputRef = useRef(null);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem('my_products_v1');
        if (saved) setProducts(JSON.parse(saved));
    }, []);

    // Set Initial Street Rate if not set (Safe default: USDT Rate)
    // ONLY if no value is present in localStorage
    useEffect(() => {
        if (!streetRate && rates.usdt.price > 0 && !localStorage.getItem('street_rate_bs')) {
            setStreetRate(rates.usdt.price);
        }
    }, [rates.usdt.price, streetRate]);

    // Guardar al cambiar
    useEffect(() => {
        if (products.length > 0) localStorage.setItem('my_products_v1', JSON.stringify(products));
        else localStorage.removeItem('my_products_v1');
    }, [products]);

    useEffect(() => {
        if (streetRate > 0) localStorage.setItem('street_rate_bs', streetRate.toString());
    }, [streetRate]);

    // [NEW] Persist Manual USDT Config
    useEffect(() => {
        localStorage.setItem('catalog_use_auto_usdt', JSON.stringify(useAutoUsdt));
        localStorage.setItem('catalog_custom_usdt_price', customUsdtPrice.toString());
        localStorage.setItem('catalog_show_cash_price', JSON.stringify(showCashPrice));
    }, [useAutoUsdt, customUsdtPrice, showCashPrice]);

    // Función comprimir imagen (OPTIMIZADA PDA v1.0: 400x400 WebP 70%)
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 400; // Max 400px

                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Conversión a WebP y compresión 70%
                setImage(canvas.toDataURL('image/webp', 0.7));
            };
        };
    };

    // Lógica de Filtrado y Paginación
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Resetear página al buscar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // [NEW] Delete State
    const [deleteId, setDeleteId] = useState(null);

    const handleSave = () => {
        triggerHaptic && triggerHaptic();
        if (!name || !priceUsdt) return alert("Nombre y precio requeridos");

        // Auto-Capitalize
        const formattedName = name.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

        if (editingId) {
            const updatedProducts = products.map(p =>
                p.id === editingId
                    ? { ...p, name: formattedName, priceUsdt: parseFloat(priceUsdt), image: image || p.image }
                    : p
            );
            setProducts(updatedProducts);
        } else {
            const newProduct = {
                id: crypto.randomUUID(),
                name: formattedName,
                priceUsdt: parseFloat(priceUsdt),
                image,
                createdAt: new Date().toISOString()
            };
            setProducts([newProduct, ...products]);
        }
        handleClose();
    };

    const handleEdit = (product) => {
        triggerHaptic && triggerHaptic();
        setEditingId(product.id);
        setName(product.name);
        setPriceUsdt(product.priceUsdt);

        // Calculate Init Efectivo (Parity: what value in efectivo allows buying the product valBs at street rate?)
        if (streetRate > 0) {
            const valBs = product.priceUsdt * effectiveUsdtRate; // [UPDATED] Use effective rate
            const parityEfectivo = valBs / streetRate;
            setPriceEfectivo(smartCashRounding(parityEfectivo).toString()); // Usamos nueva lógica <= 0.2 Down
        } else {
            setPriceEfectivo(product.priceUsdt);
        }

        setImage(product.image);
        setIsModalOpen(true);
    };

    // [UPDATED] Pricing Logic Handlers (Parity)
    const handleEfectivoChange = (val) => {
        setPriceEfectivo(val);
        if (!val || parseFloat(val) <= 0 || streetRate <= 0) { setPriceUsdt(''); return; }

        // Efectivo -> USDT (Parity Logic Reverse)
        // Efectivo * StreetRate = TotalBs -> TotalBs / USDT_Rate = USDT
        const totalBs = parseFloat(val) * streetRate;
        const usdt = totalBs / effectiveUsdtRate; // [UPDATED] Use effective rate
        setPriceUsdt(usdt.toFixed(2));
    };

    const handleUsdtChange = (val) => {
        setPriceUsdt(val);
        if (!val || parseFloat(val) <= 0 || streetRate <= 0) { setPriceEfectivo(''); return; }

        // USDT -> Efectivo (Parity Logic)
        // USDT * USDT_Rate = TotalBs -> TotalBs / StreetRate = Efectivo
        const totalBs = parseFloat(val) * effectiveUsdtRate; // [UPDATED] Use effective rate
        const efectivo = totalBs / streetRate;
        setPriceEfectivo(Math.round(efectivo).toFixed(2)); // Smart Rounding to Integer
    };

    // [NEW] Calibration Logic (Set Street Rate Directly)
    const handleCalibration = (val) => {
        setStreetPriceInput(val);
    };

    const applyCalibration = () => {
        const val = parseFloat(streetPriceInput);
        if (val > 0) {
            setStreetRate(val);
            setIsCalibrationOpen(false);
            setStreetPriceInput('');
            triggerHaptic && triggerHaptic();
        }
    };

    // [UPDATED] Trigger Custom Modal
    const handleDelete = (id) => {
        triggerHaptic && triggerHaptic();
        setDeleteId(id);
    };

    // [NEW] Execute Delete
    const confirmDelete = () => {
        if (deleteId) {
            const clean = products.filter(p => p.id !== deleteId);
            setProducts(clean);
            setDeleteId(null);
            triggerHaptic && triggerHaptic();
        }
    };

    const handleClose = () => {
        setName(''); setPriceUsdt(''); setPriceEfectivo(''); setImage(null); setEditingId(null); setIsModalOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 overflow-hidden">

            {/* Header + Search */}
            <div className="shrink-0 mb-6 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            <Store size={26} className="text-brand" /> Catálogo
                        </h2>
                        <p className="text-sm text-slate-400 font-medium ml-1">Mis Productos</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { triggerHaptic && triggerHaptic(); setIsSettingsOpen(true); }}
                            className="p-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl shadow-sm hover:scale-105 transition-transform"
                            title="Ajustes y Backup"
                        >
                            <Settings size={24} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => { triggerHaptic && triggerHaptic(); setIsModalOpen(true); }}
                            className="p-3 bg-brand text-slate-900 rounded-2xl shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
                        >
                            <Plus size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* [NEW] UNIFIED RATE CONFIGURATION PANEL */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Settings size={16} className={(!useAutoUsdt || !showCashPrice) ? "text-indigo-500" : "text-slate-400"} />
                            Configuración de Tasas
                        </span>
                        <div className="flex gap-2">
                            {!useAutoUsdt && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-lg text-[10px]">Manual: {formatBs(effectiveUsdtRate)}</span>}
                            {showCashPrice && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-lg text-[10px]">Efectivo: {streetRate} Bs</span>}
                        </div>
                    </button>

                    {isConfigOpen && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2">

                            {/* SECTION 1: USDT RATE */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Banknote size={12} /> Tasa USDT Base</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">{useAutoUsdt ? 'Automática (API)' : 'Manual'}</span>
                                        <button
                                            onClick={() => { triggerHaptic && triggerHaptic(); setUseAutoUsdt(!useAutoUsdt); }}
                                            className={`relative w-9 h-5 rounded-full transition-colors ${useAutoUsdt ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${useAutoUsdt ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                                {!useAutoUsdt && (
                                    <input
                                        type="number"
                                        value={customUsdtPrice}
                                        onChange={(e) => setCustomUsdtPrice(e.target.value)}
                                        onFocus={(e) => e.target.value === '0' && setCustomUsdtPrice('')} // Clear 0 on focus
                                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500"
                                        placeholder="Tasa Manual (Bs)"
                                    />
                                )}
                            </div>

                            <div className="h-px bg-slate-200 dark:bg-slate-700" />

                            {/* SECTION 2: CASH PRICES (Toggle & Calibration) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Zap size={12} /> Precios en Efectivo</span>
                                    <button
                                        onClick={() => { triggerHaptic && triggerHaptic(); setShowCashPrice(!showCashPrice); }}
                                        className={`relative w-9 h-5 rounded-full transition-colors ${showCashPrice ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${showCashPrice ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {showCashPrice && (
                                    <>
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Precio en Calle (Bs)</label>
                                                <input
                                                    type="number"
                                                    value={streetPriceInput}
                                                    onChange={(e) => handleCalibration(e.target.value)}
                                                    placeholder={streetRate || "0.00"}
                                                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-brand"
                                                />
                                            </div>
                                            <button
                                                onClick={applyCalibration}
                                                disabled={!streetPriceInput || parseFloat(streetPriceInput) <= 0}
                                                className="px-4 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 hover:opacity-90 transition-opacity"
                                            >
                                                Aplicar
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-tight px-1">
                                            Vender físico a <strong className="text-slate-600 dark:text-slate-300">{streetPriceInput || streetRate || '...'} Bs</strong> = Valor USDT (Digital).
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 shadow-sm"
                    />
                </div>
            </div>

            {/* Grid Productos */}
            {products.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 space-y-4">
                    <Package size={64} strokeWidth={1} />
                    <p className="text-sm font-medium">No has agregado productos</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <Search size={48} className="opacity-20" />
                    <p className="text-sm">No se encontraron productos</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 scrollbar-hide content-start items-start">
                        {paginatedProducts.map(p => {
                            // --- LÓGICA DE NEGOCIO (CORREGIDA) ---
                            // 1. Monto Real en Bolívares (Precio Base * Tasa USDT)
                            const valBs = p.priceUsdt * effectiveUsdtRate; // [UPDATED] Use effective rate

                            // 2. Referencias Oficiales (Monto Bs / Tasa Oficial)
                            const refBcv = valBs / rates.bcv.price;
                            const refEur = valBs / rates.euro.price;

                            return (
                                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 items-start relative group">
                                    {/* Imagen con Aspect Ratio cuadrado */}
                                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0 overflow-hidden relative">
                                        {p.image ? (
                                            <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Tag size={24} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 leading-tight line-clamp-2 pr-28 h-10">{p.name}</h3>

                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-xl font-black text-brand-dark">{formatUsd(p.priceUsdt)}</span>
                                            <span className="text-xs font-bold text-slate-400">USDT (Digital)</span>
                                        </div>

                                        {/* Costo Efectivo (Condicionado) */}
                                        {showCashPrice && (
                                            <div className="flex items-center gap-1.5 mb-3 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg w-fit border border-emerald-100 dark:border-emerald-900/30">
                                                <Banknote size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                    Efectivo: {(() => {
                                                        if (streetRate <= 0) return `$${p.priceUsdt}`;
                                                        // Parity Logic
                                                        const valBs = p.priceUsdt * effectiveUsdtRate; // [UPDATED] Use effective rate
                                                        const efectivo = valBs / streetRate;
                                                        const final = smartCashRounding(efectivo); // Regla Smart: <=0.2 Down, >0.2 Up
                                                        return `$${final}`;
                                                    })()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Conversiones (Lógica corregida) */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">Total Bs:</span>
                                                <span className="font-black text-slate-600 dark:text-slate-200">{formatBs(valBs)} Bs</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                <span>Ref. Dolar (BCV):</span>
                                                <span className="font-mono text-slate-500">${formatUsd(refBcv).replace('$', '')}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                <span>Ref. Euro (BCV):</span>
                                                <span className="font-mono text-slate-500">€{formatUsd(refEur).replace('$', '').replace('€', '')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botones de Acción (Edit y Delete) */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setShareProduct(p)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all" title="Compartir Cotización">
                                            <Share2 size={16} />
                                        </button>
                                        <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 dark:hover:bg-brand/10 rounded-xl transition-all">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 py-4 shrink-0">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
                            </button>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modal Añadir / Editar */}
            <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? "Editar Producto" : "Nuevo Producto"}>
                <div className="space-y-4">
                    {/* Upload */}
                    <div onClick={() => fileInputRef.current.click()} className="h-32 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors relative overflow-hidden">
                        {image ? <img src={image} className="w-full h-full object-cover" /> : (
                            <>
                                <Camera size={24} className="text-slate-400 mb-2" />
                                <span className="text-xs font-bold text-slate-500">Toca para subir foto</span>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        {image && <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button>}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase">Nombre</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                autoFocus
                                placeholder="Ej: Zapatos Nike"
                                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 capitalize"
                            />
                        </div>

                        {/* Inputs de Precio (Efectivo vs USDT) */}
                        <div className={`grid gap-3 ${showCashPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {showCashPrice && (
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                                        <Banknote size={12} /> Efectivo
                                    </label>
                                    <input
                                        type="number"
                                        value={priceEfectivo} onChange={e => handleEfectivoChange(e.target.value)}
                                        placeholder="42.00"
                                        className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-4 rounded-xl font-black text-emerald-800 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase">Base USDT</label>
                                <input
                                    type="number"
                                    value={priceUsdt} onChange={e => handleUsdtChange(e.target.value)}
                                    placeholder="40.00"
                                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50"
                                />
                            </div>
                        </div>

                        {/* Live Conversion Preview */}
                        {priceUsdt && !isNaN(priceUsdt) && parseFloat(priceUsdt) > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previsualización</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Total Bs:</span>
                                    <span className="font-black text-slate-700 dark:text-white">{formatBs(parseFloat(priceUsdt) * effectiveUsdtRate)} Bs</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Tasa USDT (Efectiva):</span>
                                    <span className="font-mono">{formatBs(effectiveUsdtRate)}</span>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Ref. Dolar (BCV):</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">${formatUsd((parseFloat(priceUsdt) * effectiveUsdtRate) / rates.bcv.price).replace('$', '')}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Ref. Euro (BCV):</span>
                                    <span className="font-mono">€{formatUsd((parseFloat(priceUsdt) * effectiveUsdtRate) / rates.euro.price).replace('$', '').replace('€', '')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={handleSave} className="w-full bg-brand text-slate-900 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-transform">
                        {editingId ? "Actualizar Producto" : "Guardar Producto"}
                    </button>
                </div>
            </Modal>

            {/* Share Modal */}
            <ProductShareModal
                isOpen={!!shareProduct}
                onClose={() => setShareProduct(null)}
                product={shareProduct}
                accounts={accounts}
                streetRate={streetRate}
                rates={{ ...rates, usdt: { ...rates.usdt, price: effectiveUsdtRate } }}
            />

            {/* Modal ELIMINAR PRODCUCTO (Professional Custom) */}
            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar Producto">
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2">
                        <Trash2 size={32} className="text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">¿Estás seguro?</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 px-4">
                            Esta acción eliminará el producto de tu catálogo permanentemente. No se puede deshacer.
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



            {/* Settings Modal (Fixed) */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
