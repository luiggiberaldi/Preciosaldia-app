import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Plus, Trash2, Camera, X, Store, Tag, Pencil, Search, ChevronLeft, ChevronRight, Settings, ChevronDown, Percent, Box, Hash, DollarSign } from 'lucide-react';
import { Modal } from '../components/Modal';
import SettingsModal from '../components/SettingsModal';

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════

const fmtBs = (v) => new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.ceil(v));
const fmtUsd = (v) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

/** Redondeo inteligente según modo */
const smartRound = (value, mode) => {
    if (mode === '5') return Math.ceil(value / 5) * 5;
    if (mode === '10') return Math.ceil(value / 10) * 10;
    return Math.ceil(value); // 'integer' default
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function BodegaView({ rates, triggerHaptic }) {

    // ─── PRODUCTOS ──────────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // ─── CONFIGURACIÓN DE TASA ──────────────────────────────────────
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [useAutoRate, setUseAutoRate] = useState(() => {
        const s = localStorage.getItem('bodega_auto_rate');
        return s !== null ? JSON.parse(s) : true;
    });
    const [manualRate, setManualRate] = useState(() => {
        const s = localStorage.getItem('bodega_manual_rate');
        return s && parseFloat(s) > 0 ? s : '';
    });
    const [rateAdjust, setRateAdjust] = useState(() => {
        const s = localStorage.getItem('bodega_rate_adjust');
        return s ? s : '';
    });
    const [roundMode, setRoundMode] = useState(() => {
        return localStorage.getItem('bodega_round_mode') || 'integer';
    });

    // ─── TASA EFECTIVA (Corazón del sistema) ────────────────────────
    const effectiveRate = useMemo(() => {
        const base = useAutoRate
            ? (rates?.bcv?.price || 0)
            : (parseFloat(manualRate) > 0 ? parseFloat(manualRate) : (rates?.bcv?.price || 0));
        const adjust = parseFloat(rateAdjust) || 0;
        const raw = base + adjust;
        return raw > 0 ? smartRound(raw, roundMode) : 0;
    }, [useAutoRate, manualRate, rateAdjust, roundMode, rates?.usdt?.price]);

    // ─── BÚSQUEDA Y PAGINACIÓN ──────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // ─── FORM STATE ─────────────────────────────────────────────────
    const [name, setName] = useState('');
    const [sellType, setSellType] = useState('unit'); // 'unit' | 'box'
    const [costBox, setCostBox] = useState('');
    const [costCurrency, setCostCurrency] = useState('usd'); // 'usd' | 'bs'
    const [unitsPerBox, setUnitsPerBox] = useState('');
    const [pricingMode, setPricingMode] = useState('margin'); // 'margin' | 'custom'
    const [marginPercent, setMarginPercent] = useState('');
    const [customSellPrice, setCustomSellPrice] = useState('');  // precio unidad
    const [customBoxPrice, setCustomBoxPrice] = useState('');    // precio caja
    const [sellCurrency, setSellCurrency] = useState('usd'); // 'usd' | 'bs'
    const [image, setImage] = useState(null);
    const fileInputRef = useRef(null);

    // ═══════════════════════════════════════════════════════════════
    // PERSISTENCIA
    // ═══════════════════════════════════════════════════════════════

    useEffect(() => {
        const saved = localStorage.getItem('bodega_products_v1');
        if (saved) {
            try { setProducts(JSON.parse(saved)); } catch { }
        }
    }, []);

    useEffect(() => {
        if (products.length > 0) localStorage.setItem('bodega_products_v1', JSON.stringify(products));
        else localStorage.removeItem('bodega_products_v1');
    }, [products]);

    useEffect(() => {
        localStorage.setItem('bodega_auto_rate', JSON.stringify(useAutoRate));
        if (manualRate) localStorage.setItem('bodega_manual_rate', manualRate);
        if (rateAdjust) localStorage.setItem('bodega_rate_adjust', rateAdjust);
        else localStorage.removeItem('bodega_rate_adjust');
        localStorage.setItem('bodega_round_mode', roundMode);
    }, [useAutoRate, manualRate, rateAdjust, roundMode]);

    // ═══════════════════════════════════════════════════════════════
    // CÁLCULOS DERIVADOS
    // ═══════════════════════════════════════════════════════════════

    const calcPrices = (product) => {
        const units = product.unitsPerBox || 1;
        const costPerUnit = product.costBox / units;
        let sellUsd;
        if (product.pricingMode === 'custom' && product.customSellPrice > 0) {
            sellUsd = product.customSellPrice;
        } else {
            const margin = (product.marginPercent || 0) / 100;
            sellUsd = costPerUnit * (1 + margin);
        }
        // Precio de caja: independiente o calculado
        let sellBoxUsd;
        if (product.pricingMode === 'custom' && product.customBoxPrice > 0) {
            sellBoxUsd = product.customBoxPrice;
        } else {
            sellBoxUsd = sellUsd * units;
        }
        const sellBs = sellUsd * effectiveRate;
        const sellBsRounded = smartRound(sellBs, roundMode);
        const sellBoxBs = smartRound(sellBoxUsd * effectiveRate, roundMode);
        return { costPerUnit, sellUsd, sellBs: sellBsRounded, sellBoxUsd, sellBoxBs };
    };

    // ═══════════════════════════════════════════════════════════════
    // FILTRADO Y PAGINACIÓN
    // ═══════════════════════════════════════════════════════════════

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    // ═══════════════════════════════════════════════════════════════
    // IMAGEN (Compresor WebP 400×400 70%)
    // ═══════════════════════════════════════════════════════════════

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
                const MAX = 400;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                setImage(canvas.toDataURL('image/webp', 0.7));
            };
        };
    };

    // ═══════════════════════════════════════════════════════════════
    // CRUD
    // ═══════════════════════════════════════════════════════════════

    const handleSave = () => {
        triggerHaptic?.();
        if (!name || !costBox) return;

        const formatted = name.replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
        const toUsd = (val) => sellCurrency === 'bs' && effectiveRate > 0 ? val / effectiveRate : val;

        // Convertir costo a USD si está en Bs
        const rawCost = parseFloat(costBox) || 0;
        const costInUsd = costCurrency === 'bs' && effectiveRate > 0 ? rawCost / effectiveRate : rawCost;

        const data = {
            name: formatted,
            sellType,
            costBox: costInUsd,
            unitsPerBox: sellType === 'box' ? (parseInt(unitsPerBox) || 1) : 1,
            pricingMode,
            marginPercent: pricingMode === 'margin' ? (parseFloat(marginPercent) || 0) : 0,
            customSellPrice: pricingMode === 'custom' ? toUsd(parseFloat(customSellPrice) || 0) : 0,
            customBoxPrice: (pricingMode === 'custom' && sellType === 'box') ? toUsd(parseFloat(customBoxPrice) || 0) : 0,
            image,
        };

        if (editingId) {
            setProducts(products.map(p => p.id === editingId ? { ...p, ...data } : p));
        } else {
            setProducts([{ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() }, ...products]);
        }
        handleCloseModal();
    };

    const handleEdit = (product) => {
        triggerHaptic?.();
        setEditingId(product.id);
        setName(product.name);
        setSellType(product.sellType || (product.unitsPerBox > 1 ? 'box' : 'unit'));
        setCostBox(product.costBox.toString());
        setUnitsPerBox(product.unitsPerBox?.toString() || '1');
        setPricingMode(product.pricingMode || 'margin');
        setMarginPercent(product.marginPercent?.toString() || '0');
        setCustomBoxPrice(product.customBoxPrice?.toString() || '');
        setCustomSellPrice(product.customSellPrice?.toString() || '');
        setImage(product.image);
        setIsModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            setProducts(products.filter(p => p.id !== deleteId));
            setDeleteId(null);
            triggerHaptic?.();
        }
    };

    const handleCloseModal = () => {
        setName(''); setSellType('unit'); setCostBox(''); setUnitsPerBox(''); setMarginPercent('');
        setCustomSellPrice(''); setCustomBoxPrice(''); setPricingMode('margin');
        setCostCurrency('usd'); setSellCurrency('usd');
        setImage(null); setEditingId(null); setIsModalOpen(false);
    };

    // ═══════════════════════════════════════════════════════════════
    // PREVIEW EN VIVO (dentro del modal)
    // ═══════════════════════════════════════════════════════════════

    const livePreview = useMemo(() => {
        const rawCost = parseFloat(costBox) || 0;
        const units = parseInt(unitsPerBox) || 1;
        if (rawCost <= 0) return null;

        const toUsd = (val) => sellCurrency === 'bs' && effectiveRate > 0 ? val / effectiveRate : val;
        const costUsd = costCurrency === 'bs' && effectiveRate > 0 ? rawCost / effectiveRate : rawCost;
        const perUnit = costUsd / units;

        let sell;
        if (pricingMode === 'custom' && parseFloat(customSellPrice) > 0) {
            sell = toUsd(parseFloat(customSellPrice));
        } else {
            const margin = parseFloat(marginPercent) || 0;
            sell = perUnit * (1 + margin / 100);
        }

        // Precio caja independiente
        let sellBox;
        if (pricingMode === 'custom' && parseFloat(customBoxPrice) > 0) {
            sellBox = toUsd(parseFloat(customBoxPrice));
        } else {
            sellBox = sell * units;
        }

        const sellBs = smartRound(sell * effectiveRate, roundMode);
        const sellBoxBs = smartRound(sellBox * effectiveRate, roundMode);
        const profitUsd = sell - perUnit;
        const profitPercent = perUnit > 0 ? ((sell / perUnit) - 1) * 100 : 0;
        return { perUnit, sell, sellBs, sellBox, sellBoxBs, profitUsd, profitPercent, units };
    }, [costBox, costCurrency, unitsPerBox, marginPercent, customSellPrice, customBoxPrice, sellCurrency, pricingMode, effectiveRate, roundMode]);

    // Tasa base antes de ajuste (para preview)
    const baseRate = useAutoRate
        ? (rates?.bcv?.price || 0)
        : (parseFloat(manualRate) > 0 ? parseFloat(manualRate) : (rates?.bcv?.price || 0));

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 lg:p-8 overflow-hidden max-w-7xl mx-auto w-full">

            {/* ──── HEADER ──── */}
            <div className="shrink-0 mb-4 space-y-3">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            <Store size={24} className="text-brand" /> Mi Bodega
                        </h2>
                        <p className="text-xs lg:text-sm text-slate-400 font-medium ml-1">Catálogo de precios bimoneda</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { triggerHaptic?.(); setIsSettingsOpen(true); }}
                            className="p-2.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:scale-105 transition-transform"
                            title="Backup"
                        >
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={() => { triggerHaptic?.(); setIsModalOpen(true); }}
                            className="p-2.5 bg-brand text-slate-900 rounded-xl shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
                        >
                            <Plus size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* ──── PANEL DE TASA (Colapsable) ──── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Settings size={14} className={effectiveRate !== baseRate ? "text-brand" : "text-slate-400"} />
                            Tasa de Cambio
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="bg-brand/10 text-brand-dark dark:text-brand px-2.5 py-1 rounded-lg text-xs font-black">
                                {fmtBs(effectiveRate)} Bs/$
                            </span>
                            <ChevronDown size={14} className={`transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {isConfigOpen && (
                        <div className="p-3 pt-0 space-y-3 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">

                            {/* Auto / Manual toggle */}
                            <div className="flex items-center justify-between pt-3">
                                <span className="text-xs font-bold text-slate-500">Fuente de Tasa</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">{useAutoRate ? 'Automática (API)' : 'Manual'}</span>
                                    <button
                                        onClick={() => { triggerHaptic?.(); setUseAutoRate(!useAutoRate); }}
                                        className={`relative w-9 h-5 rounded-full transition-colors ${useAutoRate ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${useAutoRate ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {!useAutoRate && (
                                <input
                                    type="number"
                                    value={manualRate}
                                    onChange={(e) => setManualRate(e.target.value)}
                                    placeholder="Ej: 350"
                                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-brand"
                                />
                            )}

                            {/* Ajuste de tasa y Redondeo (solo con tasa automática) */}
                            {useAutoRate && (
                                <>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                                    {/* Ajuste de tasa */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                            <Plus size={12} /> Ajuste a la tasa (Bs)
                                        </label>
                                        <input
                                            type="number"
                                            value={rateAdjust}
                                            onChange={(e) => setRateAdjust(e.target.value)}
                                            placeholder="Ej: 55"
                                            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500"
                                        />
                                        {(parseFloat(rateAdjust) > 0) && (
                                            <p className="text-[10px] text-slate-400 px-1">
                                                {fmtBs(baseRate)} + {rateAdjust} = <strong className="text-slate-600 dark:text-slate-300">{fmtBs(effectiveRate)} Bs/$</strong>
                                            </p>
                                        )}
                                    </div>

                                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                                    {/* Redondeo */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500">Redondeo de precios</label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {[
                                                { id: 'integer', label: 'Entero ↑' },
                                                { id: '5', label: '×5' },
                                                { id: '10', label: '×10' },
                                            ].map(r => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => { triggerHaptic?.(); setRoundMode(r.id); }}
                                                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${roundMode === r.id
                                                        ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                                >
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ──── BÚSQUEDA ──── */}
                <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 shadow-sm"
                    />
                </div>
            </div>

            {/* ──── GRID PRODUCTOS ──── */}
            {products.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 space-y-3">
                    <Package size={56} strokeWidth={1} />
                    <p className="text-sm font-medium">Tu bodega está vacía</p>
                    <p className="text-xs text-slate-400">Toca <strong>+</strong> para agregar tu primer producto</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <Search size={44} className="opacity-20" />
                    <p className="text-sm">No se encontraron productos</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3 lg:gap-4 scrollbar-hide content-start items-start">
                        {paginatedProducts.map(p => {
                            const { costPerUnit, sellUsd, sellBs, sellBoxUsd, sellBoxBs } = calcPrices(p);
                            return (
                                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group relative">
                                    {/* Imagen */}
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                        {p.image ? (
                                            <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                <Tag size={28} />
                                            </div>
                                        )}

                                        {/* Acciones hover */}
                                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(p)} className="p-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-brand rounded-lg backdrop-blur-sm">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => { triggerHaptic?.(); setDeleteId(p.id); }} className="p-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-red-500 rounded-lg backdrop-blur-sm">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Badge unidades */}
                                        {p.sellType === 'box' && p.unitsPerBox > 1 && (
                                            <div className="absolute bottom-1.5 left-1.5 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                                <Box size={10} /> {p.unitsPerBox} uds
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-2.5 md:p-3 space-y-1.5">
                                        <h3 className="font-bold text-xs md:text-sm text-slate-800 dark:text-white leading-tight line-clamp-2 min-h-[2rem]">{p.name}</h3>

                                        {/* Precio */}
                                        <div className="space-y-1">
                                            {p.sellType === 'box' && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Unidad</p>}
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-base font-black text-brand-dark dark:text-brand">${fmtUsd(sellUsd)}</span>
                                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{fmtBs(sellBs)} Bs</span>
                                            </div>
                                        </div>

                                        {/* Precio por Caja */}
                                        {p.sellType === 'box' && p.unitsPerBox > 1 && (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded-lg space-y-0.5 border border-slate-100 dark:border-slate-700/50">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Caja × {p.unitsPerBox}</p>
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-sm font-black text-brand-dark dark:text-brand">${fmtUsd(sellBoxUsd)}</span>
                                                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">{fmtBs(sellBoxBs)} Bs</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 py-3 shrink-0">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50"
                            >
                                <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
                            </button>
                            <span className="text-xs font-bold text-slate-500">{currentPage} / {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50"
                            >
                                <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════
               MODAL: AGREGAR / EDITAR
            ═══════════════════════════════════════════════════════════ */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Editar Producto" : "Nuevo Producto"}>
                <div className="space-y-4 md:space-y-5">

                    {/* Foto */}
                    <div onClick={() => fileInputRef.current.click()} className="h-28 md:h-36 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors relative overflow-hidden">
                        {image ? <img src={image} className="w-full h-full object-cover" /> : (
                            <>
                                <Camera size={22} className="text-slate-400 mb-1" />
                                <span className="text-[10px] font-bold text-slate-500">Toca para subir foto</span>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        {image && <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button>}
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase">Nombre</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            autoFocus
                            placeholder="Ej: Galletas María"
                            className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl font-bold text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 capitalize"
                        />
                    </div>

                    {/* Tipo de venta */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <button
                            type="button"
                            onClick={() => { triggerHaptic?.(); setSellType('unit'); setUnitsPerBox(''); setCustomBoxPrice(''); }}
                            className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${sellType === 'unit'
                                ? 'bg-brand text-white border-brand shadow-md'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                        >
                            <Tag size={12} /> Solo unidad
                        </button>
                        <button
                            type="button"
                            onClick={() => { triggerHaptic?.(); setSellType('box'); }}
                            className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${sellType === 'box'
                                ? 'bg-brand text-white border-brand shadow-md'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                        >
                            <Box size={12} /> Caja + unidad
                        </button>
                    </div>

                    {/* Costo + Unidades */}
                    <div className={`grid gap-3 ${sellType === 'box' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                                <DollarSign size={10} /> {sellType === 'box' ? 'Costo Caja' : 'Costo'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={costBox}
                                    onChange={e => setCostBox(e.target.value)}
                                    placeholder={costCurrency === 'bs' ? '500' : '1.00'}
                                    className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 pr-14 rounded-xl font-black text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => { triggerHaptic?.(); setCostCurrency(c => c === 'usd' ? 'bs' : 'usd'); }}
                                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${costCurrency === 'usd'
                                        ? 'bg-brand/20 text-brand-dark dark:text-brand'
                                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        }`}
                                >
                                    {costCurrency === 'usd' ? 'USD' : 'Bs'}
                                </button>
                            </div>
                        </div>
                        {sellType === 'box' && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                                    <Hash size={10} /> Uds por caja
                                </label>
                                <input
                                    type="number"
                                    value={unitsPerBox}
                                    onChange={e => setUnitsPerBox(e.target.value)}
                                    placeholder="12"
                                    className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl font-black text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50"
                                />
                            </div>
                        )}
                    </div>

                    {/* Modo de precio: Margen % o Precio personalizado */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => { triggerHaptic?.(); setPricingMode('margin'); }}
                                className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${pricingMode === 'margin'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                            >
                                <Percent size={12} /> Margen %
                            </button>
                            <button
                                type="button"
                                onClick={() => { triggerHaptic?.(); setPricingMode('custom'); }}
                                className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${pricingMode === 'custom'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                            >
                                <DollarSign size={12} /> Precio directo
                            </button>
                        </div>

                        {pricingMode === 'margin' ? (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                                    <Percent size={10} /> Margen de Ganancia (%)
                                </label>
                                <input
                                    type="number"
                                    value={marginPercent}
                                    onChange={e => setMarginPercent(e.target.value)}
                                    placeholder="30"
                                    className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl font-bold text-sm text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Precio por Unidad */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                                        <DollarSign size={10} /> {sellType === 'box' ? 'Precio Unidad' : 'Precio de Venta'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={customSellPrice}
                                            onChange={e => setCustomSellPrice(e.target.value)}
                                            placeholder={sellCurrency === 'bs' ? '600' : '1.50'}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 pr-14 rounded-xl font-bold text-sm text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { triggerHaptic?.(); setSellCurrency(c => c === 'usd' ? 'bs' : 'usd'); }}
                                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${sellCurrency === 'usd'
                                                ? 'bg-brand/20 text-brand-dark dark:text-brand'
                                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                }`}
                                        >
                                            {sellCurrency === 'usd' ? 'USD' : 'Bs'}
                                        </button>
                                    </div>
                                </div>

                                {/* Precio por Caja (solo en modo caja+unidad) */}
                                {sellType === 'box' && (parseInt(unitsPerBox) || 0) > 1 && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                                            <Box size={10} /> Precio Caja ({unitsPerBox} uds)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={customBoxPrice}
                                                onChange={e => setCustomBoxPrice(e.target.value)}
                                                placeholder={sellCurrency === 'bs'
                                                    ? fmtBs((parseFloat(customSellPrice) || 0) * (parseInt(unitsPerBox) || 1))
                                                    : fmtUsd((parseFloat(customSellPrice) || 0) * (parseInt(unitsPerBox) || 1))}
                                                className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 pr-14 rounded-xl font-bold text-sm text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                            <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-black ${sellCurrency === 'usd'
                                                ? 'bg-brand/20 text-brand-dark dark:text-brand'
                                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                }`}>
                                                {sellCurrency === 'usd' ? 'USD' : 'Bs'}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 ml-1 mt-0.5">Vacío = unidad × {unitsPerBox}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Preview en vivo */}
                    {livePreview && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Previsualización</p>

                            {sellType === 'box' && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Costo/unidad:</span>
                                    <span className="font-bold text-slate-600 dark:text-slate-300">${fmtUsd(livePreview.perUnit)}</span>
                                </div>
                            )}

                            <div className="h-px bg-slate-200 dark:bg-slate-700" />

                            {/* Ganancia calculada */}
                            {livePreview.profitUsd > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Ganancia/ud:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        ${fmtUsd(livePreview.profitUsd)} ({livePreview.profitPercent.toFixed(0)}%)
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">{sellType === 'box' ? 'Venta Unidad:' : 'Venta:'}</span>
                                <div className="text-right">
                                    <span className="font-black text-brand-dark dark:text-brand text-base">${fmtUsd(livePreview.sell)}</span>
                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 ml-2">{fmtBs(livePreview.sellBs)} Bs</span>
                                </div>
                            </div>
                            {sellType === 'box' && livePreview.units > 1 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Venta Caja:</span>
                                    <div className="text-right">
                                        <span className="font-black text-blue-600 dark:text-blue-400 text-base">${fmtUsd(livePreview.sellBox)}</span>
                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 ml-2">{fmtBs(livePreview.sellBoxBs)} Bs</span>
                                    </div>
                                </div>
                            )}

                            <div className="h-px bg-slate-200 dark:bg-slate-700" />

                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span>Tasa efectiva:</span>
                                <span className="font-mono font-bold">{fmtBs(effectiveRate)} Bs/$</span>
                            </div>
                        </div>
                    )}

                    {/* Guardar */}
                    <button onClick={handleSave} className="w-full bg-brand text-slate-900 py-3.5 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-transform">
                        {editingId ? "Actualizar" : "Guardar Producto"}
                    </button>
                </div>
            </Modal >

            {/* ═══════════════════════════════════════════════════════════
               MODAL: ELIMINAR
            ═══════════════════════════════════════════════════════════ */}
            < Modal isOpen={!!deleteId
            } onClose={() => setDeleteId(null)} title="Eliminar Producto" >
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <Trash2 size={28} className="text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">¿Eliminar este producto?</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Esta acción no se puede deshacer.</p>
                    </div>
                    <div className="flex gap-3 w-full pt-2">
                        <button onClick={() => setDeleteId(null)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button onClick={confirmDelete} className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all">
                            ¡Sí, eliminar!
                        </button>
                    </div>
                </div>
            </Modal >

            {/* Settings Modal */}
            < SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div >
    );
}
