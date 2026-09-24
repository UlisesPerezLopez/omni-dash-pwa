import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import { useTileColorOverride } from "./Tiles";

import type { ChartSeries } from "../types";
export type { ChartSeries };


function resolveColor(color: string, targetEl?: HTMLElement | null): string {
  if (typeof window !== "undefined") {
    if (color && color.startsWith("var(")) {
      const varName = color.slice(4, -1).trim();
      const computed = getComputedStyle(targetEl || document.documentElement).getPropertyValue(varName).trim();
      if (computed) return computed;
    }
  }
  return color;
}

function alpha(color: string, value: number): string {
  const resolved = resolveColor(color);
  if (resolved.startsWith("#")) {
    const hex = resolved.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${Number.isNaN(r) ? 194 : r}, ${Number.isNaN(g) ? 115 : g}, ${Number.isNaN(b) ? 88 : b}, ${value})`;
  }
  const match = resolved.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/);
  return match ? `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${value})` : resolved;
}

/** Line and Mixed chart driven by Chart.js. Supports dynamic bar and line series. */
export function LineChart({ labels, series, dark, height = 210, prefix = "", suffix = "", colorOverride }: {
  labels: string[];
  series: ChartSeries[];
  dark: boolean;
  height?: number;
  prefix?: string;
  suffix?: string;
  colorOverride?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);
  const tileOverride = useTileColorOverride();
  const effectiveOverride = colorOverride || tileOverride;

  const hasBar = series.some((s) => s.type === "bar");
  const rootType = hasBar ? "bar" : "line";

  const buildConfig = (): ChartConfiguration => {
    const context = canvasRef.current?.getContext("2d");
    const datasets = series.map((item, idx) => {
      const isPrimary = idx === 0;
      const rawColor = (isPrimary && effectiveOverride)
        ? effectiveOverride
        : (item.color || item.borderColor || item.backgroundColor || "#C27358");
      const isBar = item.type === "bar";

      if (isBar) {
        const bgRaw = (isPrimary && effectiveOverride) ? effectiveOverride : (item.backgroundColor || rawColor);
        const resolvedBg = resolveColor(bgRaw, canvasRef.current);
        const borderRaw = (isPrimary && effectiveOverride) ? effectiveOverride : (item.borderColor || rawColor);
        const resolvedBorder = resolveColor(borderRaw, canvasRef.current);

        return {
          type: "bar" as const,
          label: item.label,
          data: item.data,
          backgroundColor: resolvedBg,
          borderColor: resolvedBorder,
          borderWidth: 1,
          borderRadius: item.borderRadius ?? 4,
          borderSkipped: false,
          barPercentage: 0.65,
          categoryPercentage: 0.75,
          order: 2,
        };
      }

      const borderRaw = (isPrimary && effectiveOverride) ? effectiveOverride : (item.borderColor || rawColor);
      const resolvedBorder = resolveColor(borderRaw, canvasRef.current);

      const config: any = {
        type: "line" as const,
        label: item.label,
        data: item.data,
        borderColor: resolvedBorder,
        borderWidth: 2.2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: resolvedBorder,
        pointBorderColor: dark ? "#292524" : "#FFFFFF",
        pointBorderWidth: 2,
        tension: 0.42,
        fill: !!item.fill,
        order: 1,
      };

      if (item.dash || item.borderDash) {
        config.borderDash = item.borderDash || [4, 5];
      }

      if (item.fill && context && Chart) {
        const bgRaw = (isPrimary && effectiveOverride) ? undefined : item.backgroundColor;
        if (bgRaw) {
          config.backgroundColor = resolveColor(bgRaw, canvasRef.current);
        } else {
          const gradient = context.createLinearGradient(0, 0, 0, 230);
          gradient.addColorStop(0, alpha(resolvedBorder, 0.32));
          gradient.addColorStop(1, alpha(resolvedBorder, 0));
          config.backgroundColor = gradient;
        }
      }

      return config;
    });

    const tickColor = dark ? "#A8A29E" : "#736B63";
    const gridColor = dark ? "rgba(68, 64, 60, 0.45)" : "rgba(231, 227, 217, 0.75)";

    return {
      type: rootType as any,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: "easeOutQuart" },
        interaction: { mode: "index" as const, intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: dark ? "#292524" : "#2D2823",
            titleColor: dark ? "#E7E5E4" : "#F5F3ED",
            bodyColor: dark ? "#E7E5E4" : "#F5F3ED",
            borderColor: dark ? "#44403C" : "#E7E3D9",
            borderWidth: 1,
            padding: 11,
            cornerRadius: 8,
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: ${prefix}${Number(ctx.parsed.y).toLocaleString()}${suffix}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tickColor, font: { size: 10 }, maxTicksLimit: 8 },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              font: { size: 10 },
              callback: (value: string | number) => `${prefix}${Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : value}${suffix}`,
            },
          },
        },
      },
    };
  };

  const signature = JSON.stringify({
    labels,
    series: series.map((s) => ({
      l: s.label,
      d: s.data,
      c: s.color,
      f: !!s.fill,
      dash: !!s.dash,
      bd: s.borderDash,
      t: s.type || "line",
      br: s.borderRadius,
      bg: s.backgroundColor,
      bc: s.borderColor,
    })),
    dark,
    prefix,
    suffix,
    effectiveOverride,
  });

  useEffect(() => {
    let cancelled = false;

    const renderOrUpdate = () => {
      if (cancelled || !canvasRef.current) return;

      const config = buildConfig();
      if (chartRef.current) {
        if (chartRef.current.config.type === rootType) {
          try {
            chartRef.current.data = config.data;
            chartRef.current.options = config.options;
            chartRef.current.update("none");
            return;
          } catch {
            // Recreate if in-place update fails
          }
        }
        try {
          chartRef.current.destroy();
        } catch {
          /* noop */
        }
        chartRef.current = null;
      }

      try {
        chartRef.current = new Chart(canvasRef.current, config);
      } catch {
        setFailed(true);
      }
    };

    renderOrUpdate();

    return () => {
      cancelled = true;
    };
  }, [signature]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {
          /* noop */
        }
        chartRef.current = null;
      }
    };
  }, []);

  if (failed) return <FallbackChart series={series} height={height} colorOverride={effectiveOverride} />;
  return <canvas ref={canvasRef} className="chart-canvas" style={{ height: `${height}px` }} aria-label={`${series.map((s) => s.label).join(", ")} chart`} />;
}

function FallbackChart({ series, height = 210, colorOverride }: { series: ChartSeries[]; height?: number; colorOverride?: string }) {
  const tileOverride = useTileColorOverride();
  const effectiveOverride = colorOverride || tileOverride;
  const mappedSeries = series.map((item, idx) => {
    if (idx === 0 && effectiveOverride) {
      return { ...item, color: effectiveOverride };
    }
    return item;
  });
  const allValues = mappedSeries.flatMap((s) => s.data);
  const max = Math.max(1, ...allValues);
  const pointsFor = (data: number[]) => data.map((value, index) => `${(index / Math.max(1, data.length - 1)) * 300},${150 - (value / max) * 130}`).join(" ");
  const first = mappedSeries.find((s) => s.fill && s.type !== "bar");
  return (
    <svg className="chart-svg" style={{ height: `${height}px` }} viewBox="0 0 300 160" preserveAspectRatio="none" role="img">
      {mappedSeries.filter((s) => s.type === "bar").map((item) => {
        const len = Math.max(1, item.data.length);
        const barWidth = Math.max(3, (280 / len) * 0.65);
        return item.data.map((val, idx) => {
          const barHeight = (val / max) * 130;
          const x = (idx / Math.max(1, len - 1)) * 280 + 10 - barWidth / 2;
          const y = 150 - barHeight;
          return (
            <rect
              key={`${item.label}-${idx}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={item.color}
              rx={item.borderRadius ?? 3}
            />
          );
        });
      })}
      {first && <polygon points={`${pointsFor(first.data)} 300,160 0,160`} fill={alpha(first.color, 0.25)} stroke="none" />}
      {mappedSeries.filter((s) => s.type !== "bar").map((item) => (
        <polyline
          key={item.label}
          points={pointsFor(item.data)}
          fill="none"
          stroke={item.color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={item.dash || item.borderDash ? "4 5" : undefined}
        />
      ))}
    </svg>
  );
}

export function Sparkline({ color = "#C27358", rising = true }: { color?: string; rising?: boolean }) {
  return <svg className="sparkline" viewBox="0 0 84 28" preserveAspectRatio="none"><polyline points={rising ? "0,24 12,21 22,22 34,16 45,18 57,11 68,13 84,3" : "0,4 12,9 22,8 34,13 45,12 57,18 68,16 84,24"} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Donut({ value, color = "#798C7A", label }: { value: number; color?: string; label: string }) {
  const circumference = 2 * Math.PI * 39;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 100 100" className="donut">
        <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" strokeOpacity=".1" strokeWidth="9" />
        <circle cx="50" cy="50" r="39" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${circumference * value} ${circumference}`} transform="rotate(-90 50 50)" />
        <text x="50" y="53" textAnchor="middle" className="donut-value">{Math.round(value * 100)}%</text>
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function Gauge({ value = 0.84, caption = "SLA on track", color = "#C27358" }: { value?: number; caption?: string; color?: string }) {
  const safe = Math.max(0, Math.min(1, value));
  const circumference = Math.PI * 76;
  return (
    <div className="gauge">
      <svg viewBox="0 0 180 106">
        <path d="M17 91a73 73 0 0 1 146 0" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="13" strokeLinecap="round" />
        <path d="M17 91a73 73 0 0 1 146 0" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${circumference * safe} ${circumference}`} />
        <text x="90" y="78" textAnchor="middle" className="gauge-value">{Math.round(safe * 100)}%</text>
        <text x="90" y="98" textAnchor="middle" className="gauge-caption">{caption}</text>
      </svg>
    </div>
  );
}
