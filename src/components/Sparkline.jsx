import React, { useMemo } from 'react';

/**
 * Sparkline — lightweight SVG mini-chart
 * @param {number[]} data - Array of numeric values
 * @param {number} width - SVG width (default 80)
 * @param {number} height - SVG height (default 28)
 * @param {string} color - Stroke color (default #22c55e)
 * @param {boolean} showArea - Show gradient fill (default true)
 */
export default function Sparkline({
    data = [],
    width = 80,
    height = 28,
    color = '#22c55e',
    showArea = true,
    className = '',
}) {
    const { path, areaPath, trend } = useMemo(() => {
        if (!data || data.length < 2) return { path: '', areaPath: '', trend: 0 };

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const padding = 2;
        const usableH = height - padding * 2;
        const stepX = (width - padding * 2) / (data.length - 1);

        const points = data.map((v, i) => ({
            x: padding + i * stepX,
            y: padding + usableH - ((v - min) / range) * usableH,
        }));

        const linePath = points.map((p, i) =>
            i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
        ).join(' ');

        const area = `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

        const t = data[data.length - 1] >= data[0] ? 1 : -1;

        return { path: linePath, areaPath: area, trend: t };
    }, [data, width, height]);

    if (!data || data.length < 2) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
                <span className="text-[8px] text-slate-400 font-medium">Sin datos</span>
            </div>
        );
    }

    const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;
    const strokeColor = trend >= 0 ? (color || '#22c55e') : '#ef4444';

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={`overflow-visible ${className}`}
            style={{ opacity: 0, animation: 'sparkFadeIn 0.6s ease-out forwards' }}
        >
            <style>{`
                @keyframes sparkFadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {showArea && (
                <>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#${gradientId})`} />
                </>
            )}

            <path
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Current value dot */}
            {data.length > 0 && (() => {
                const min = Math.min(...data);
                const max = Math.max(...data);
                const range = max - min || 1;
                const padding = 2;
                const usableH = height - padding * 2;
                const lastX = padding + (data.length - 1) * ((width - padding * 2) / (data.length - 1));
                const lastY = padding + usableH - ((data[data.length - 1] - min) / range) * usableH;
                return (
                    <circle
                        cx={lastX}
                        cy={lastY}
                        r="2.5"
                        fill={strokeColor}
                        stroke="white"
                        strokeWidth="1"
                    />
                );
            })()}
        </svg>
    );
}
