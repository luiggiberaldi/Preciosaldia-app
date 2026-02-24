import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Plus, Trash2, Camera, X, Store, Tag, Pencil, Search, ChevronLeft, ChevronRight, Settings, ChevronDown, Percent, Box, Hash, DollarSign, RefreshCw, Share2, AlertTriangle, Minus } from 'lucide-react';
import { Modal } from '../components/Modal';
import SettingsModal from '../components/SettingsModal';

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════

const fmtBs = (v) => new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.ceil(v));
const fmtUsd = (v) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Redondeo inteligente según modo */
const smartRound = (value, mode) => {
    if (mode === '5') return Math.ceil(value / 5) * 5;
    if (mode === '10') return Math.ceil(value / 10) * 10;
    return Math.ceil(value); // 'integer' default
};

/** Categorías disponibles */
const CATEGORIES = [
    { id: 'todo', label: 'Todo', emoji: '🏪' },
    { id: 'granos', label: 'Granos', emoji: '🌾' },
    { id: 'lacteos', label: 'Lácteos', emoji: '🥛' },
    { id: 'bebidas', label: 'Bebidas', emoji: '🥤' },
    { id: 'snacks', label: 'Snacks', emoji: '🍪' },
    { id: 'limpieza', label: 'Limpieza', emoji: '🧹' },
    { id: 'carnes', label: 'Carnes', emoji: '🥩' },
    { id: 'higiene', label: 'Higiene', emoji: '🧴' },
    { id: 'otros', label: 'Otros', emoji: '📦' },
];

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

    // ─── BÚSQUEDA, FILTROS Y PAGINACIÓN ────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('todo');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    // ─── FORM STATE ─────────────────────────────────────────────────
    const [name, setName] = useState('');
    const [category, setCategory] = useState('otros');
    const [stock, setStock] = useState('');
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

    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = activeCategory === 'todo' || p.category === activeCategory;
        return matchSearch && matchCat;
    });
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeCategory]);

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
            category: category || 'otros',
            stock: stock !== '' ? parseInt(stock) : null,
            sellType,
            costBox: round2(costInUsd),
            unitsPerBox: sellType === 'box' ? (parseInt(unitsPerBox) || 1) : 1,
            pricingMode,
            marginPercent: pricingMode === 'margin' ? (parseFloat(marginPercent) || 0) : 0,
            customSellPrice: pricingMode === 'custom' ? round2(toUsd(parseFloat(customSellPrice) || 0)) : 0,
            customBoxPrice: (pricingMode === 'custom' && sellType === 'box') ? round2(toUsd(parseFloat(customBoxPrice) || 0)) : 0,
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
        setCategory(product.category || 'otros');
        setStock(product.stock != null ? product.stock.toString() : '');
        setSellType(product.sellType || (product.unitsPerBox > 1 ? 'box' : 'unit'));
        setCostBox(round2(product.costBox).toString());
        setUnitsPerBox(product.unitsPerBox?.toString() || '1');
        setPricingMode(product.pricingMode || 'margin');
        setMarginPercent(product.marginPercent?.toString() || '0');
        setCustomBoxPrice(product.customBoxPrice ? round2(product.customBoxPrice).toString() : '');
        setCustomSellPrice(product.customSellPrice ? round2(product.customSellPrice).toString() : '');
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
        setName(''); setCategory('otros'); setStock('');
        setSellType('unit'); setCostBox(''); setUnitsPerBox(''); setMarginPercent('');
        setCustomSellPrice(''); setCustomBoxPrice(''); setPricingMode('margin');
        setCostCurrency('usd'); setSellCurrency('usd');
        setImage(null); setEditingId(null); setIsModalOpen(false);
    };

    const handleStockChange = (id, delta) => {
        triggerHaptic?.();
        setProducts(prev => prev.map(p => {
            if (p.id !== id) return p;
            const current = p.stock ?? 0;
            const next = Math.max(0, current + delta);
            return { ...p, stock: next };
        }));
    };

    // Recalcular todos: actualiza los precios en Bs con la tasa actual
    // (Los precios en USD no cambian, solo la visualización; este botón
    // fuerza un re-render y confirma al usuario que los datos están fresh)
    const handleRecalculate = () => {
        triggerHaptic?.();
        // Forzamos un micro-update para que los useMemo se reevalúen
        setProducts(prev => [...prev]);
    };

    // Exportar lista de precios a WhatsApp
    const handleWhatsApp = () => {
        triggerHaptic?.();
        const date = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
        let msg = `🏪 *LISTA DE PRECIOS* — ${date}\n`;
        msg += `💱 Tasa: ${fmtBs(effectiveRate)} Bs/$\n\n`;

        const allCats = CATEGORIES.filter(c => c.id !== 'todo');
        allCats.forEach(cat => {
            const catProducts = products.filter(p => p.category === cat.id);
            if (catProducts.length === 0) return;
            msg += `${cat.emoji} *${cat.label.toUpperCase()}*\n`;
            catProducts.forEach(p => {
                const { sellUsd, sellBs } = calcPrices(p);
                msg += `• ${p.name}: $${fmtUsd(sellUsd)} / ${fmtBs(sellBs)} Bs`;
                if (p.sellType === 'box' && p.unitsPerBox > 1) {
                    const { sellBoxUsd, sellBoxBs } = calcPrices(p);
                    msg += ` — Caja(${p.unitsPerBox}): $${fmtUsd(sellBoxUsd)} / ${fmtBs(sellBoxBs)} Bs`;
                }
                msg += '\n';
            });
            msg += '\n';
        });

        // Productos sin categoría
        const uncategorized = products.filter(p => !p.category || p.category === 'otros');
        if (uncategorized.length > 0 && allCats.some(c => c.id === 'otros')) {
            // Already included above
        }

        const encoded = encodeURIComponent(msg);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
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
                        <p className="text-xs lg:text-sm text-slate-400 font-medium ml-1">{products.length} producto{products.length !== 1 ? 's' : ''} · {fmtBs(effectiveRate)} Bs/$</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleWhatsApp}
                            disabled={products.length === 0}
                            className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform disabled:opacity-40"
                            title="Compartir lista de precios"
                        >
                            <Share2 size={18} />
                        </button>
                        <button
                            onClick={handleRecalculate}
                            disabled={products.length === 0}
                            className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-105 transition-transform disabled:opacity-40"
                            title="Recalcular todos los precios"
                        >
                            <RefreshCw size={18} />
                        </button>
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

                {/* ──── BÚSQUEDA + CATEGORÍAS ──── */}
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

                {/* Categorías (sólo si hay productos) */}
                {products.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                        {CATEGORIES.map(cat => {
                            const count = cat.id === 'todo' ? products.length : products.filter(p => p.category === cat.id).length;
                            if (count === 0 && cat.id !== 'todo') return null;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => { triggerHaptic?.(); setActiveCategory(cat.id); }}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${activeCategory === cat.id
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                                        }`}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                    <span className={`text-[9px] font-black px-1 py-0.5 rounded-full ${activeCategory === cat.id
                                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
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
                            const { sellUsd, sellBs, sellBoxUsd, sellBoxBs } = calcPrices(p);
                            const catInfo = CATEGORIES.find(c => c.id === p.category) || CATEGORIES.find(c => c.id === 'otros');
                            const lowStock = p.stock != null && p.stock <= 3;
                            return (
                                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group relative flex flex-col">
                                    {/* Imagen */}
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                        {p.image ? (
                                            <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1">
                                                <span className="text-2xl">{catInfo?.emoji || '📦'}</span>
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

                                        {/* Badge: caja o stock bajo */}
                                        <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-1">
                                            {p.sellType === 'box' && p.unitsPerBox > 1 && (
                                                <div className="bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                                    <Box size={10} /> {p.unitsPerBox} uds
                                                </div>
                                            )}
                                            {lowStock && (
                                                <div className="bg-red-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                                    <AlertTriangle size={10} /> {p.stock === 0 ? 'Agotado' : `${p.stock} restante${p.stock !== 1 ? 's' : ''}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-2.5 md:p-3 space-y-1.5 flex-1 flex flex-col">
                                        <h3 className="font-bold text-xs md:text-sm text-slate-800 dark:text-white leading-tight line-clamp-2">{p.name}</h3>

                                        {/* Precio */}
                                        <div className="space-y-1 flex-1">
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

                                        {/* Control de Stock */}
                                        {p.stock != null && (
                                            <div className={`flex items-center justify-between mt-1.5 pt-1.5 border-t ${lowStock ? 'border-red-100 dark:border-red-900/30' : 'border-slate-100 dark:border-slate-800'
                                                }`}>
                                                <button
                                                    onClick={() => handleStockChange(p.id, -1)}
                                                    disabled={p.stock === 0}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-30 transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className={`text-xs font-black ${p.stock === 0 ? 'text-red-500' : lowStock ? 'text-orange-500' : 'text-slate-600 dark:text-slate-400'
                                                    }`}>{p.stock}</span>
                                                <button
                                                    onClick={() => handleStockChange(p.id, +1)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
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
                <div className="space-y-5">
                    {/* Top Row: Foto + Nombre */}
                    <div className="flex gap-4">
                        <div onClick={() => fileInputRef.current.click()} className="shrink-0 w-24 h-24 bg-slate-100 dark:bg-slate-800/80 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors relative overflow-hidden group shadow-inner">
                            {image ? (
                                <img src={image} className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Camera size={26} className="text-slate-400 group-hover:text-brand transition-colors mb-1" />
                                    <span className="text-[9px] font-bold text-slate-400 group-hover:text-brand">FOTO</span>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            {image && <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-1 right-1 p-1 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-red-500 transition-colors"><X size={12} /></button>}
                        </div>

                        <div className="flex-1 flex flex-col justify-end">
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1.5 block uppercase tracking-wider">Nombre del Producto</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                autoFocus
                                placeholder="Ej: Galletas María"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl font-bold text-base text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 capitalize shadow-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* Categoría + Stock (fila compacta) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1.5 block uppercase tracking-wider">Categoría</label>
                            <div className="grid grid-cols-3 gap-1">
                                {CATEGORIES.filter(c => c.id !== 'todo').map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => { triggerHaptic?.(); setCategory(cat.id); }}
                                        title={cat.label}
                                        className={`py-1.5 rounded-xl text-center text-base transition-all border ${category === cat.id
                                                ? 'bg-slate-900 dark:bg-white border-transparent shadow'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                            }`}
                                    >{cat.emoji}</button>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-400 ml-1 mt-1 font-medium">{CATEGORIES.find(c => c.id === category)?.label || 'Otros'}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1.5 block uppercase tracking-wider">Stock Inicial</label>
                            <input
                                type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
                                placeholder="Ej: 24"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                            />
                            <p className="text-[9px] text-slate-400 ml-1 mt-1">Vacío = sin control de stock</p>
                        </div>
                    </div>

                    {/* Section 1: Estrategia - Segmented Controls */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                        {/* Segmented Control 1: Tipo Venta */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Tag size={12} /> Formato de Venta</label>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                                <button type="button" onClick={() => { triggerHaptic?.(); setSellType('unit'); setUnitsPerBox(''); setCustomBoxPrice(''); }} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${sellType === 'unit' ? 'bg-white dark:bg-slate-700 shadow flex-1 text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Solo unidad</button>
                                <button type="button" onClick={() => { triggerHaptic?.(); setSellType('box'); }} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${sellType === 'box' ? 'bg-white dark:bg-slate-700 shadow flex-1 text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Caja + ud.</button>
                            </div>
                        </div>

                        {/* Segmented Control 2: Pricing */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={12} /> Cálculo de Precio</label>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                                <button type="button" onClick={() => { triggerHaptic?.(); setPricingMode('margin'); }} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${pricingMode === 'margin' ? 'bg-white dark:bg-slate-700 shadow flex-1 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Auto (Margen %)</button>
                                <button type="button" onClick={() => { triggerHaptic?.(); setPricingMode('custom'); }} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${pricingMode === 'custom' ? 'bg-white dark:bg-slate-700 shadow flex-1 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Manual (Fijo)</button>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Inputs Monetarios */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                        {/* Costo + Unidades */}
                        <div className={`grid gap-3 ${sellType === 'box' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-wider">{sellType === 'box' ? 'Costo Compra (Caja)' : 'Costo Compra'}</label>
                                <div className="relative">
                                    <input
                                        type="number" value={costBox} onChange={e => setCostBox(e.target.value)} placeholder={costCurrency === 'bs' ? '500' : '1.00'}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 pr-14 rounded-xl font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                                    />
                                    <button type="button" onClick={() => { triggerHaptic?.(); setCostCurrency(c => c === 'usd' ? 'bs' : 'usd'); }} className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors ${costCurrency === 'usd' ? 'bg-brand/20 text-brand-dark dark:text-brand' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>{costCurrency === 'usd' ? 'USD' : 'Bs'}</button>
                                </div>
                            </div>
                            {sellType === 'box' && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-wider"><Hash size={10} className="inline mr-1 -mt-0.5" />Uds por caja</label>
                                    <input type="number" value={unitsPerBox} onChange={e => setUnitsPerBox(e.target.value)} placeholder="12" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-black text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 transition-all" />
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-800/80 w-full" />

                        {/* Mode Inputs */}
                        {pricingMode === 'margin' ? (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-wider flex items-center justify-between">
                                    <span>Margen Deseado (%)</span>
                                    {livePreview?.profitUsd > 0 && <span className="text-emerald-500 font-medium normal-case">Ganancia: ${fmtUsd(livePreview.profitUsd)}/ud</span>}
                                </label>
                                <div className="relative">
                                    <input type="number" value={marginPercent} onChange={e => setMarginPercent(e.target.value)} placeholder="30" className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-3 pr-10 rounded-xl font-black text-lg text-indigo-700 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-center tracking-tight" />
                                    <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                                </div>
                            </div>
                        ) : (
                            <div className={`grid gap-3 ${sellType === 'box' && (parseInt(unitsPerBox) || 0) > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-wider">{sellType === 'box' ? 'Precio Venta (Unidad)' : 'Precio Venta'}</label>
                                    <div className="relative">
                                        <input type="number" value={customSellPrice} onChange={e => setCustomSellPrice(e.target.value)} placeholder={sellCurrency === 'bs' ? '600' : '1.50'} className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-3 pr-14 rounded-xl font-black text-sm text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                                        <button type="button" onClick={() => { triggerHaptic?.(); setSellCurrency(c => c === 'usd' ? 'bs' : 'usd'); }} className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors ${sellCurrency === 'usd' ? 'bg-brand/20 text-brand-dark dark:text-brand' : 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400'}`}>{sellCurrency === 'usd' ? 'USD' : 'Bs'}</button>
                                    </div>
                                </div>
                                {sellType === 'box' && (parseInt(unitsPerBox) || 0) > 1 && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Precio Venta (Caja)</label>
                                        <div className="relative">
                                            <input type="number" value={customBoxPrice} onChange={e => setCustomBoxPrice(e.target.value)} placeholder={sellCurrency === 'bs' ? fmtBs((parseFloat(customSellPrice) || 0) * (parseInt(unitsPerBox) || 1)) : fmtUsd((parseFloat(customSellPrice) || 0) * (parseInt(unitsPerBox) || 1))} className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 pr-14 rounded-xl font-black text-sm text-blue-700 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
                                            <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-black pointer-events-none ${sellCurrency === 'usd' ? 'bg-brand/20 text-brand-dark dark:text-brand' : 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-400'}`}>{sellCurrency === 'usd' ? 'USD' : 'Bs'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Summary / Action Button */}
                    <div className="bg-slate-900 dark:bg-black rounded-2xl p-4 shadow-xl border border-slate-800 relative overflow-hidden">
                        {/* Deco */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 blur-2xl rounded-full translate-x-10 -translate-y-10" />

                        <div className="flex justify-between items-end mb-4 relative z-10">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Precio Final {sellType === 'box' && 'Unidad'}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white tracking-tighter">${livePreview ? fmtUsd(livePreview.sell) : '0.00'}</span>
                                    <span className="text-sm font-bold text-emerald-400">{livePreview ? fmtBs(livePreview.sellBs) : '0.00'} Bs</span>
                                </div>
                            </div>

                            {/* Save Button injected into the dark card for a cohesive checkout feel */}
                            <button onClick={handleSave} className="bg-brand text-brand-dark px-6 py-3 rounded-xl font-black uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-brand">
                                {editingId ? "Guardar" : "Crear"}
                            </button>
                        </div>

                        {sellType === 'box' && livePreview?.units > 1 && (
                            <div className="pt-3 border-t border-slate-800/60 relative z-10 flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Total Caja ({livePreview.units} uds)</span>
                                <div className="text-right">
                                    <span className="font-black text-white mr-2">${fmtUsd(livePreview.sellBox)}</span>
                                    <span className="text-[11px] font-bold text-emerald-500/80">{fmtBs(livePreview.sellBoxBs)} Bs</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-800/60 relative z-10 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                            <span>{rates?.source || rates?.bcv?.source || 'BCV'}</span>
                            <span>{fmtBs(effectiveRate)} Bs/$</span>
                        </div>
                    </div>
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
