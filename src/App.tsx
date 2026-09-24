import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { Icon } from "./components/Icons";
import { LineChart, Gauge, Donut } from "./components/charts";
import { Tile, TileMenu, StatTile, StatusDot, DataTable, Pill, useTileColorOverride } from "./components/Tiles";
import { ActionRail, ActionDrawer, buildActionItems } from "./components/ActionCenter";
import { StagingInbox } from "./components/StagingInbox";
import { OmniSearch } from "./components/OmniSearch";
import { Topbar } from "./components/Topbar";
import { Studio } from "./components/Studio";
import { generateDemoEntries } from "./lib/demo";
import { ingestFile, evaluateConfidence } from "./lib/ingestion";
import { useTranslation } from "./hooks/useTranslation";
import {
  departmentList, filterByDepartment, computeStats, bucketTrend, fallbackTrend, dayLabels,
} from "./lib/departments";
import { api, useDashboardData } from "./services/api";
import { useSyncManager } from "./hooks/useSyncManager";
import * as XLSX from "xlsx";
import type {
  Department, Stats, DataEntry, WidgetSetting, ActionItem, ChartSeries, BrandPalette,
  Language, ThemeMode, Mode, FinanceDrill, SalesDrill, MenuOption, Screen, StagingEntry, DataCategory, ShadowIntensity,
} from "./types";

const FONT_MAP: Record<string, string> = {
  "sans-inter": "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  "sans-roboto": "'Roboto', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  "serif-merriweather": "'Merriweather', Georgia, Cambria, 'Times New Roman', Times, serif",
  "serif-playfair": "'Playfair Display', Didot, 'Bodoni MT', 'Cinzel', Georgia, serif",
  "mono-jetbrains": "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
  // Legacy aliases
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "'Merriweather', Georgia, Cambria, 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

function adjustBrightness(hex: string, percent: number): string {
  if (!hex || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) return hex;
  let fullHex = hex;
  if (hex.length === 4) {
    fullHex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  const num = parseInt(fullHex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

const palettes: Record<string, BrandPalette> = {
  warm: { primary: "#C27358", primaryHover: "#AB624B", secondary: "#798C7A", tertiary: "#2B4C59", accent: "#D4A373" },
  sage: { primary: "#798C7A", primaryHover: "#667867", secondary: "#C27358", tertiary: "#2B4C59", accent: "#D4A373" },
  stone: { primary: "#D98A6F", primaryHover: "#E29E87", secondary: "#8EA38F", tertiary: "#608696", accent: "#E5B887" },
  oceanic: { primary: "#0F766E", primaryHover: "#0D5D56", secondary: "#1E3A8A", tertiary: "#0284C7", accent: "#D97706" },
  cyber: { primary: "#8B5CF6", primaryHover: "#7C3AED", secondary: "#06B6D4", tertiary: "#4F46E5", accent: "#EC4899" },
  pastel: { primary: "#60A5FA", primaryHover: "#3B82F6", secondary: "#6EE7B7", tertiary: "#A78BFA", accent: "#FDBA74" },
};

function TileTrendLegend({ series }: { series: ChartSeries[] }) {
  const override = useTileColorOverride();
  return (
    <span className="chart-legend">
      {series.map((item, idx) => {
        const effectiveDotColor = (idx === 0 && override) ? override : item.color;
        return (
          <span key={item.label}>
            <i style={{
              background: effectiveDotColor,
              borderRadius: item.type === "bar" ? "2px" : "50%",
              width: item.type === "bar" ? "7px" : "6px",
              height: item.type === "bar" ? "8px" : "6px",
            }} />
            {item.label}
          </span>
        );
      })}
    </span>
  );
}

const fmtMoney = (value: number) => (Math.abs(value) >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${Math.round(value)}`);
const fmtInt = (value: number) => Math.round(value).toLocaleString();

interface DetailState {
  title: string;
  labels: string[];
  series: ChartSeries[];
  summary: [string, string][];
}

function DrillTile({ id, title, eyebrow, options, value, onChange, drill, labels, dark, onExpand, className = "", prefix = "", suffix = "" }: {
  id: string;
  title: string;
  eyebrow: string;
  options: MenuOption[];
  value: string;
  onChange: (value: string) => void;
  drill: { label: string; data: number[]; color: string; valueText: string; delta: string };
  labels: string[];
  dark: boolean;
  onExpand: () => void;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <Tile id={id} eyebrow={eyebrow} title={title} className={`drill-tile ${className}`} menu={<TileMenu value={value} options={options} onChange={onChange} />} onExpand={onExpand}>
      <div className="drill-meta">
        <strong>{drill.valueText}</strong>
        <span className="delta positive"><Icon name="trend" size={13} />{drill.delta}</span>
        <span className="chart-legend"><i style={{ background: drill.color }} />{drill.label}</span>
      </div>
      <div className="chart-wrap chart-wrap-drill">
        <LineChart labels={labels} series={[{ label: drill.label, data: drill.data, color: drill.color, fill: true }]} dark={dark} height={150} prefix={prefix} suffix={suffix} />
      </div>
    </Tile>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("all");
  const [language, setLanguage] = useState<Language>("en");
  const [mode, setMode] = useState<Mode>("deep");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [paletteKey, setPaletteKey] = useState("warm");
  const [customPalette, setCustomPalette] = useState<BrandPalette | null>(null);

  // Dynamic White-Label Studio state - Warm Corporate defaults
  const [brandName, setBrandName] = useState("OmniDash");
  const [brandPrimary, setBrandPrimary] = useState("#C27358");
  const [brandSecondary, setBrandSecondary] = useState("#798C7A");
  const [brandTertiary, setBrandTertiary] = useState("");
  const [brandAccent, setBrandAccent] = useState("#D4A373");
  const [brandSurface, setBrandSurface] = useState("");
  const [brandBg, setBrandBg] = useState("");
  const [brandLine, setBrandLine] = useState("");
  const [borderRadius, setBorderRadius] = useState(12);
  const [shadowIntensity, setShadowIntensity] = useState<ShadowIntensity>("soft");
  const [typography, setTypography] = useState<string>("sans-inter");
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState(32);

  const [isReady, setIsReady] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [query, setQuery] = useState("");
  const [activeSiteFilter, setActiveSiteFilter] = useState<string>("all");
  const [activeDateFilter, setActiveDateFilter] = useState<string>("30");
  const [drillFinance, setDrillFinance] = useState<FinanceDrill>("revenue");
  const [drillSales, setDrillSales] = useState<SalesDrill>("orders");
  const [activeAction, setActiveAction] = useState<ActionItem | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [isStagingOpen, setIsStagingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Repository hook abstracting IndexedDB / Server state
  const { records, queueRecords, stagingItems } = useDashboardData();
  const pendingStagingCount = stagingItems.filter((item) => item.status === "pending").length;

  // Outbox pattern sync manager hook
  const { isOnline, pendingSyncCount, syncNow } = useSyncManager();

  const { t } = useTranslation(language);
  const dark = theme === "dark";

  const defaultPrimary = dark ? "#D98A6F" : "#C27358";
  const defaultSecondary = dark ? "#8EA38F" : "#798C7A";
  const defaultTertiary = dark ? "#608696" : "#2B4C59";
  const defaultAccent = dark ? "#E5B887" : "#D4A373";
  const defaultSurface = dark ? "#292524" : "#FFFFFF";
  const defaultBg = dark ? "#1C1917" : "#F5F3ED";
  const defaultTextMain = dark ? "#E7E5E4" : "#2D2823";

  const effectivePrimary = brandPrimary || defaultPrimary;
  const effectiveSecondary = brandSecondary || defaultSecondary;
  const effectiveTertiary = brandTertiary || defaultTertiary;
  const effectiveAccent = brandAccent || defaultAccent;
  const effectiveSurface = brandSurface || defaultSurface;
  const effectiveBg = brandBg || defaultBg;
  const effectiveHover = adjustBrightness(effectivePrimary, -15);
  const selectedFont = FONT_MAP[typography] || FONT_MAP.sans;

  const shadowMap: Record<ShadowIntensity, { light: string; dark: string }> = {
    flat: { light: "none", dark: "none" },
    soft: {
      light: "0 4px 20px -2px rgba(139, 120, 109, 0.08), 0 0 2px rgba(139, 120, 109, 0.05)",
      dark: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
    },
    deep: {
      light: "0 14px 34px -4px rgba(139, 120, 109, 0.18), 0 4px 12px rgba(139, 120, 109, 0.08)",
      dark: "0 22px 45px -8px rgba(0, 0, 0, 0.75), 0 0 16px rgba(0, 0, 0, 0.5)",
    },
  };
  const effectiveCardShadow = shadowMap[shadowIntensity]?.[dark ? "dark" : "light"] || shadowMap.soft[dark ? "dark" : "light"];

  const palette: BrandPalette = useMemo(() => ({
    primary: effectivePrimary,
    primaryHover: effectiveHover,
    secondary: effectiveSecondary,
    tertiary: effectiveTertiary,
    accent: effectiveAccent,
    cardBg: effectiveSurface,
  }), [effectivePrimary, effectiveHover, effectiveSecondary, effectiveTertiary, effectiveAccent, effectiveSurface]);

  const rootStyle = {
    "--primary": effectivePrimary,
    "--color-primary": effectivePrimary,
    "--primary-hover": effectiveHover,
    "--color-primary-hover": effectiveHover,
    "--secondary": effectiveSecondary,
    "--color-secondary": effectiveSecondary,
    "--tertiary": effectiveTertiary,
    "--color-tertiary": effectiveTertiary,
    "--info": effectiveTertiary,
    "--color-info": effectiveTertiary,
    "--accent": effectiveAccent,
    "--color-accent": effectiveAccent,
    "--text-main": defaultTextMain,
    "--color-text-main": defaultTextMain,
    "--radius-card": `${borderRadius}px`,
    "--card-shadow": effectiveCardShadow,
    "--font-family": selectedFont,
    "--logo-height": `${logoHeight}px`,
    ...(brandSurface ? { "--surface": brandSurface, "--color-surface": brandSurface, "--card-bg": brandSurface } : {}),
    ...(brandBg ? { "--bg": brandBg, "--color-canvas": brandBg } : {}),
    ...(brandLine ? { "--line": brandLine } : {}),
  } as CSSProperties;

  const notify = (msg: string) => setToast({ id: Date.now(), msg });

  const handleLogoUpload = (file: File) => {
    if (!file.type.includes("svg") && !file.type.includes("png")) {
      notify("Please upload an SVG or PNG file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === "string") {
        setCustomLogo(dataUrl);
        void api.saveSettings({ customLogo: dataUrl, brandLogoUrl: dataUrl });
        notify("Corporate logo updated successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCustomLogo(null);
    void api.saveSettings({ customLogo: null, brandLogoUrl: null });
    notify("Corporate logo removed");
  };

  const handleBrandNameChange = (name: string) => {
    setBrandName(name);
    void api.saveSettings({ brandName: name });
  };

  const resetThemeToDefaults = () => {
    setBrandName("OmniDash");
    setBrandPrimary(dark ? "#D98A6F" : "#C27358");
    setBrandSecondary(dark ? "#8EA38F" : "#798C7A");
    setBrandTertiary(dark ? "#608696" : "#2B4C59");
    setBrandAccent(dark ? "#E5B887" : "#D4A373");
    setBrandSurface("");
    setBrandBg("");
    setBrandLine("");
    setBorderRadius(12);
    setShadowIntensity("soft");
    setTypography("sans-inter");
    setCustomLogo(null);
    setLogoHeight(32);
    void api.saveSettings({
      brandName: "OmniDash",
      brandPrimary: dark ? "#D98A6F" : "#C27358",
      brandSecondary: dark ? "#8EA38F" : "#798C7A",
      brandTertiary: dark ? "#608696" : "#2B4C59",
      brandAccent: dark ? "#E5B887" : "#D4A373",
      brandSurface: "",
      brandBg: "",
      brandLine: "",
      borderRadius: 12,
      shadowIntensity: "soft",
      typography: "sans-inter",
      customLogo: null,
      brandLogoUrl: null,
      logoHeight: 32,
    });
    notify("Theme reset to defaults");
  };

  /* ---------- Bootstrap settings from storage + service worker ---------- */
  useEffect(() => {
    document.title = `${brandName || "OmniDash"} Enterprise OS`;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    let mounted = true;
    Promise.all([api.getSettings(), api.getWidgets()]).then(([settings, widgets]) => {
      if (!mounted) return;
      if (settings.language && ["en", "es", "de", "fr", "it", "zh", "ja"].includes(String(settings.language))) setLanguage(settings.language as Language);
      if (settings.mode === "simple" || settings.mode === "deep") setMode(settings.mode);
      if (settings.theme === "dark" || settings.theme === "light") setTheme(settings.theme);
      if (typeof settings.paletteKey === "string") setPaletteKey(settings.paletteKey);
      if (settings.customPalette && typeof settings.customPalette === "object") setCustomPalette(settings.customPalette as BrandPalette);
      if (typeof settings.brandName === "string") setBrandName(settings.brandName);
      if (typeof settings.brandPrimary === "string") setBrandPrimary(settings.brandPrimary);
      if (typeof settings.brandSecondary === "string") setBrandSecondary(settings.brandSecondary);
      if (typeof settings.brandTertiary === "string") setBrandTertiary(settings.brandTertiary);
      if (typeof settings.brandAccent === "string") setBrandAccent(settings.brandAccent);
      if (typeof settings.brandSurface === "string") setBrandSurface(settings.brandSurface);
      if (typeof settings.brandBg === "string") setBrandBg(settings.brandBg);
      if (typeof settings.brandLine === "string") setBrandLine(settings.brandLine);
      if (typeof settings.borderRadius === "number") setBorderRadius(settings.borderRadius);
      if (typeof settings.shadowIntensity === "string" && ["flat", "soft", "deep"].includes(settings.shadowIntensity)) setShadowIntensity(settings.shadowIntensity as ShadowIntensity);
      if (typeof settings.typography === "string") {
        if (settings.typography === "sans") setTypography("sans-inter");
        else if (settings.typography === "serif") setTypography("serif-merriweather");
        else if (settings.typography === "mono") setTypography("mono-jetbrains");
        else if (FONT_MAP[settings.typography]) setTypography(settings.typography);
      }
      if (typeof settings.brandLogoUrl === "string") setCustomLogo(settings.brandLogoUrl);
      else if (typeof settings.customLogo === "string") setCustomLogo(settings.customLogo);
      if (typeof settings.logoHeight === "number") setLogoHeight(settings.logoHeight);
      const drill = settings.drill as { finance?: FinanceDrill; sales?: SalesDrill } | undefined;
      if (drill?.finance) setDrillFinance(drill.finance);
      if (drill?.sales) setDrillSales(drill.sales);
      if (settings.screen && departmentList.some((dept) => dept.id === settings.screen)) setScreen(settings.screen as Department);
      const lastWidgetFilters = widgets.find((widget) => widget.filters && typeof widget.filters.query === "string");
      if (lastWidgetFilters?.filters) setQuery(String(lastWidgetFilters.filters.query));
      setIsReady(true);
    }).catch(() => setIsReady(true));
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = `${brandName || "OmniDash"} Enterprise OS`;
  }, [brandName]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (isReady) {
      void api.saveSettings({
        language,
        mode,
        theme,
        paletteKey,
        customPalette,
        screen,
        drill: { finance: drillFinance, sales: drillSales },
        brandName,
        brandPrimary,
        brandSecondary,
        brandTertiary,
        brandAccent,
        brandSurface,
        brandBg,
        brandLine,
        borderRadius,
        shadowIntensity,
        typography,
        customLogo,
        brandLogoUrl: customLogo,
        logoHeight,
      });
    }
  }, [
    language, mode, theme, paletteKey, customPalette, screen, drillFinance, drillSales,
    brandName, brandPrimary, brandSecondary, brandTertiary, brandAccent, brandSurface, brandBg, brandLine,
    borderRadius, shadowIntensity, typography, customLogo, logoHeight, isReady
  ]);

  useEffect(() => { document.documentElement.dataset.mode = mode; }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", effectivePrimary);
    root.style.setProperty("--color-primary", effectivePrimary);
    root.style.setProperty("--primary-hover", effectiveHover);
    root.style.setProperty("--color-primary-hover", effectiveHover);
    root.style.setProperty("--secondary", effectiveSecondary);
    root.style.setProperty("--color-secondary", effectiveSecondary);
    root.style.setProperty("--tertiary", effectiveTertiary);
    root.style.setProperty("--color-tertiary", effectiveTertiary);
    root.style.setProperty("--info", effectiveTertiary);
    root.style.setProperty("--color-info", effectiveTertiary);
    root.style.setProperty("--accent", effectiveAccent);
    root.style.setProperty("--color-accent", effectiveAccent);
    root.style.setProperty("--text-main", defaultTextMain);
    root.style.setProperty("--color-text-main", defaultTextMain);
    root.style.setProperty("--card-shadow", effectiveCardShadow);

    if (brandSurface) {
      root.style.setProperty("--surface", brandSurface);
      root.style.setProperty("--color-surface", brandSurface);
      root.style.setProperty("--card-bg", brandSurface);
    } else {
      root.style.removeProperty("--surface");
      root.style.removeProperty("--color-surface");
      root.style.removeProperty("--card-bg");
    }

    if (brandBg) {
      root.style.setProperty("--bg", brandBg);
      root.style.setProperty("--color-canvas", brandBg);
    } else {
      root.style.removeProperty("--bg");
      root.style.removeProperty("--color-canvas");
    }

    if (brandLine) {
      root.style.setProperty("--line", brandLine);
    } else {
      root.style.removeProperty("--line");
    }

    root.style.setProperty("--radius-card", `${borderRadius}px`);
    root.style.setProperty("--font-family", selectedFont);
    root.style.setProperty("--logo-height", `${logoHeight}px`);
  }, [effectivePrimary, effectiveHover, effectiveSecondary, effectiveTertiary, effectiveAccent, effectiveCardShadow, brandSurface, brandBg, brandLine, defaultTextMain, borderRadius, selectedFont, logoHeight, theme]);
  useEffect(() => {
    if (!isReady) return;
    const widget: WidgetSetting = { id: "department-nav", visible: true, pinned: true, filters: { screen, query } };
    void api.saveWidgets([widget]);
  }, [screen, query, isReady]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ---------- Global site & date filters + Department-filtered state ---------- */
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => { if (r.site) set.add(String(r.site)); });
    if (set.size === 0) {
      ["North Hub", "Riverside DC", "West Fulfillment", "Harbor Node", "East Crossdock"].forEach((s) => set.add(s));
    }
    return Array.from(set).sort();
  }, [records]);

  const daysWindow = activeDateFilter === "7" ? 7 : activeDateFilter === "90" ? 90 : 32;

  const filteredRecords = useMemo(() => {
    let list = records;
    if (activeSiteFilter && activeSiteFilter !== "all" && activeSiteFilter !== "allSites") {
      list = list.filter((r) => r.site === activeSiteFilter);
    }
    if (activeDateFilter && activeDateFilter !== "all" && activeDateFilter !== "allTime") {
      const days = parseInt(activeDateFilter, 10);
      if (!isNaN(days) && days > 0) {
        const cutoff = Date.now() - days * 86400000;
        list = list.filter((r) => {
          const ts = Date.parse(String(r.date || r.ingestedAt || ""));
          return isNaN(ts) || ts >= cutoff;
        });
      }
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((r) =>
        String(r.customer || "").toLowerCase().includes(q) ||
        String(r.orderId || "").toLowerCase().includes(q) ||
        String(r.invoiceId || "").toLowerCase().includes(q) ||
        String(r.taskId || "").toLowerCase().includes(q) ||
        String(r.employeeId || "").toLowerCase().includes(q) ||
        String(r.sku || "").toLowerCase().includes(q) ||
        String(r.vendor || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, activeSiteFilter, activeDateFilter, query]);

  const deptScreen: Department = screen === "studio" ? "all" : screen;
  const dept = departmentList.find((item) => item.id === deptScreen) || departmentList[0];
  const currentDeptTitle = t(`nav.${dept.id}`) || t(dept.id) || dept.label;
  const currentDeptTagline = t(`nav.${dept.id}Tagline`) || dept.tagline;
  const financeTitle = t("nav.finance") || t("finance");
  const salesTitle = t("nav.sales") || t("sales");
  const filtered = useMemo(() => filterByDepartment(filteredRecords, deptScreen), [filteredRecords, deptScreen]);
  const stats: Stats = useMemo(() => computeStats(filtered), [filtered]);
  const labels = useMemo(() => dayLabels(8, daysWindow), [daysWindow]);
  const previewEntries = useMemo(() => generateDemoEntries(42), []);
  const actionSource = filteredRecords.length ? filteredRecords : previewEntries;

  // Actions fetched directly from Dexie action_queue table with fallback to in-memory actionSource
  const actions: ActionItem[] = useMemo(() => {
    if (queueRecords.length > 0) {
      return queueRecords
        .filter((item) => !item.resolved && !item.snoozedAt)
        .sort((a, b) => {
          const weight: Record<string, number> = { critical: 3, high: 2, medium: 1 };
          return (weight[b.priority] || 1) - (weight[a.priority] || 1);
        })
        .slice(0, 8);
    }
    return buildActionItems(actionSource);
  }, [queueRecords, actionSource]);

  // Keep action queue synchronized in Dexie if records exist but action queue is empty
  useEffect(() => {
    if (records.length > 0 && queueRecords.length === 0) {
      void api.syncActionQueue(records);
    }
  }, [records.length, queueRecords.length]);


  /* ---------- Trend series per active filter ---------- */
  const trends = useMemo(() => {
    const has = stats.hasData;
    const salesEntries = filtered.filter((entry) => entry.category === "sales");
    const expenseEntries = filtered.filter((entry) => entry.category === "expenses");
    const taskEntries = filtered.filter((entry) => entry.category === "tasks");
    const inventoryEntries = filtered.filter((entry) => entry.category === "inventory");
    const employeeEntries = filtered.filter((entry) => entry.category === "employees");
    const real = <T extends number[]>(arr: T, seed: number) => (has ? arr : fallbackTrend(seed));
    const revenue = real(bucketTrend(salesEntries, "revenue", { days: daysWindow, buckets: 8 }).map((value) => Math.round(value)), 3);
    const expense = real(bucketTrend(expenseEntries, "amount", { days: daysWindow, buckets: 8 }).map((value) => Math.round(value)), 5);
    const quotes = real(bucketTrend(salesEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.dealType === "Quote" }), 2);
    const atRiskByBucket = bucketTrend(salesEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.status === "At risk" });
    const totalByBucket = bucketTrend(salesEntries, null, { days: daysWindow, buckets: 8, predicate: () => true });
    return {
      revenue, expense, quotes,
      orders: real(bucketTrend(salesEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.dealType !== "Quote" }), 4),
      churn: has ? atRiskByBucket.map((value, index) => (totalByBucket[index] ? Math.round((value / totalByBucket[index]) * 100) : 0)) : fallbackTrend(6, 8, 12, 6),
      approvals: real(bucketTrend(expenseEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.approved === false }), 7),
      openTasks: real(bucketTrend(taskEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.resolved === false }), 1),
      doneTasks: real(bucketTrend(taskEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.resolved !== false }), 8),
      escalations: real(bucketTrend(taskEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.priority === "High" && entry.resolved === false }), 9),
      delayed: real(bucketTrend(inventoryEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.shipmentStatus === "Delayed" }), 2),
      units: real(bucketTrend(inventoryEntries, "units", { days: daysWindow, buckets: 8 }).map((value) => Math.round(value)), 4),
      hires: real(bucketTrend(employeeEntries, null, { days: daysWindow, buckets: 8, predicate: () => true }), 3),
      reviews: real(bucketTrend(employeeEntries, null, { days: daysWindow, buckets: 8, predicate: (entry) => entry.status === "Review" }), 6),
    };
  }, [filtered, stats.hasData, daysWindow]);

  /* ---------- Drill configurations ---------- */
  const financeOptions: MenuOption[] = [{ value: "revenue", label: t("revenue") }, { value: "expenses", label: t("expenses") }, { value: "cashflow", label: t("cashflow") }];
  const salesOptions: MenuOption[] = [{ value: "quotes", label: t("quotes") }, { value: "orders", label: t("closedOrders") }, { value: "churn", label: t("churnRisk") }];
  const financeDrills: Record<FinanceDrill, { label: string; data: number[]; color: string; valueText: string; delta: string; prefix: string }> = {
    revenue: { label: t("revenue"), data: trends.revenue, color: palette.accent, valueText: stats.hasData ? fmtMoney(stats.revenue) : "$248.6k", delta: "+12.8%", prefix: "$" },
    expenses: { label: t("expenses"), data: trends.expense, color: palette.primary, valueText: stats.hasData ? fmtMoney(stats.expenses) : "$86.2k", delta: "+3.1%", prefix: "$" },
    cashflow: { label: t("cashflow"), data: trends.revenue.map((value, index) => value - (trends.expense[index] || 0)), color: palette.secondary || "#798C7A", valueText: stats.hasData ? fmtMoney(stats.cashflow) : "$162.4k", delta: "+9.4%", prefix: "$" },
  };
  const salesDrills: Record<SalesDrill, { label: string; data: number[]; color: string; valueText: string; delta: string; suffix?: string }> = {
    quotes: { label: t("quotes"), data: trends.quotes, color: palette.secondary || "#798C7A", valueText: stats.hasData ? fmtInt(stats.quotes) : "46", delta: "+6.2%" },
    orders: { label: t("closedOrders"), data: trends.orders, color: palette.primary, valueText: stats.hasData ? fmtInt(stats.orders) : "181", delta: "+8.4%" },
    churn: { label: t("churnRisk"), data: trends.churn, color: palette.accent, valueText: stats.hasData ? `${(stats.churn * 100).toFixed(1)}%` : "8.6%", delta: "-1.9 pts", suffix: "%" },
  };
  const openDrillDetail = (title: string, drill: { label: string; data: number[]; color: string; valueText: string }) => setDetail({
    title: `${title} — ${drill.label}`,
    labels,
    series: [{ label: drill.label, data: drill.data, color: drill.color, fill: true }],
    summary: [[t("value"), drill.valueText], [t("records"), stats.hasData ? fmtInt(filtered.length) : "0"], [t("source"), t("liveDb")]],
  });

  /* ---------- Action queue handlers (resolve writes back into repository) ---------- */
  const resolveAction = async (item: ActionItem) => {
    await api.resolveAction(item.id, item.entryId, item.entryHint);
    setActiveAction(null);
    notify(t("resolvedToast"));
  };
  const snoozeAction = async (item: ActionItem) => {
    await api.snoozeAction(item.id);
    setActiveAction(null);
    notify(t("snoozedToast"));
  };
  const reassignAction = () => notify(t("reassignedToast"));

  /* ---------- Staging Inbox handlers ---------- */
  const handleApproveStaging = async (id: string, category?: DataCategory) => {
    await api.approveStagingItem(id, category);
    notify("Staging item approved & merged into workspace");
  };

  const handleRejectStaging = async (id: string) => {
    await api.rejectStagingItem(id);
    notify("Staging item rejected");
  };

  /* ---------- Ingestion, demo data, exports ---------- */
  const loadDemo = async () => {
    setImportStatus(t("ingesting"));
    const generated = await api.seedDemoData(1250);
    setImportStatus(`${generated.length.toLocaleString()} ${t("records")} ${t("saved").toLowerCase()}`);
    notify(`${generated.length.toLocaleString()} ${t("records")}`);
  };
  const processFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setImportStatus(t("ingesting"));
    let stagedCount = 0;
    let brand: BrandPalette | undefined;
    const notes: string[] = [];
    for (const file of list) {
      try {
        const result = await ingestFile(file);
        if (result.palette) brand = result.palette;

        if (result.entries.length > 0) {
          const evalResult = evaluateConfidence(file.name, result.entries);
          const stagingItem: StagingEntry = {
            id: `stg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            originalFileName: file.name,
            rawContent: result.entries,
            suggestedCategory: evalResult.suggestedCategory,
            confidenceScore: evalResult.confidenceScore,
            status: "pending",
            ingestedAt: new Date().toISOString(),
          };
          await api.addStagingItem(stagingItem);
          stagedCount += result.entries.length;
          notes.push(`${file.name}: ${result.entries.length} items staged (${evalResult.confidenceScore}% conf)`);
        } else {
          notes.push(`${file.name}: ${result.note}`);
        }
      } catch (error) {
        notes.push(`${file.name}: ${error instanceof Error ? error.message : "Could not parse"}`);
      }
    }
    if (brand) {
      setCustomPalette(brand);
      setPaletteKey("custom");
      await api.saveSettings({ customPalette: brand, paletteKey: "custom" });
    }
    if (stagedCount > 0) {
      setIsImportOpen(false);
      setIsStagingOpen(true);
      setImportStatus(`${stagedCount.toLocaleString()} items sent to Smart Staging Inbox`);
      notify(`${stagedCount.toLocaleString()} records sent to Staging Inbox`);
    } else {
      setImportStatus(notes.join(" | ") || "No records parsed");
    }
    window.setTimeout(() => setImportStatus(notes.join(" | ")), 1500);
  };
  const exportView = () => {
    const sheetRows = filtered.length ? filtered : [{ view: screen, revenue: stats.revenue, expenses: stats.expenses, orders: stats.orders, headquarters: dept.label }];
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "OmniDash view");
    XLSX.writeFile(workbook, `omnidash-${deptScreen}-view.xlsx`);
  };
  const exportSnapshot = async () => {
    const snapshot = await api.createSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "omnidash-workspace-snapshot.json"; anchor.click();
    URL.revokeObjectURL(url);
  };
  const restoreSnapshot = async (file?: File) => {
    if (!file) return;
    try {
      const snapshot = JSON.parse(await file.text());
      if (Array.isArray(snapshot.entries)) {
        await api.clearEntries();
        await api.saveEntries(snapshot.entries);
      }
      if (snapshot.settings && typeof snapshot.settings === "object") {
        await api.saveSettings(snapshot.settings);
        if (["en", "es", "de", "fr", "it", "zh", "ja"].includes(String(snapshot.settings.language))) setLanguage(snapshot.settings.language as Language);
        if (snapshot.settings.theme === "dark" || snapshot.settings.theme === "light") setTheme(snapshot.settings.theme);
        if (snapshot.settings.mode === "simple" || snapshot.settings.mode === "deep") setMode(snapshot.settings.mode);
      }
      notify(t("saved"));
    } catch { notify("Snapshot format not recognized"); }
  };


  /* ---------- Shared building blocks ---------- */
  const pageHeader = (title: string, tagline: string): ReactNode => (
    <div className="page-heading">
      <div>
        <div className="eyebrow">OMNIDASH / {(t("nav." + dept.id) || dept.id).toUpperCase()}</div>
        <h1>{title}</h1>
        <p>{tagline}</p>
      </div>
      <div className="heading-actions">
        <div className="filter-select-wrap" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <span className="status-dot healthy" style={{ position: "absolute", left: "10px", pointerEvents: "none", zIndex: 2 }} />
          <select
            className="select-button"
            value={activeSiteFilter}
            onChange={(e) => setActiveSiteFilter(e.target.value)}
            style={{ paddingLeft: "24px", paddingRight: "26px", appearance: "none", cursor: "pointer", background: "var(--surface)" }}
            aria-label="Filter by site"
          >
            <option value="all">{t("common.allSites") || t("allSites") || "All Sites"}</option>
            {availableSites.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Icon name="chevron" size={12} style={{ position: "absolute", right: "8px", pointerEvents: "none", color: "var(--muted)" }} />
        </div>

        <div className="filter-select-wrap" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <Icon name="filter" size={13} style={{ position: "absolute", left: "10px", pointerEvents: "none", color: "var(--muted)", zIndex: 2 }} />
          <select
            className="select-button"
            value={activeDateFilter}
            onChange={(e) => setActiveDateFilter(e.target.value)}
            style={{ paddingLeft: "28px", paddingRight: "26px", appearance: "none", cursor: "pointer", background: "var(--surface)" }}
            aria-label="Filter by date range"
          >
            <option value="7">{t("common.last7Days") || "Last 7 days"}</option>
            <option value="30">{t("common.last30") || t("last30") || "Last 30 days"}</option>
            <option value="90">{t("common.last90Days") || "Last 90 days"}</option>
            <option value="all">{t("common.allTime") || "All time"}</option>
          </select>
          <Icon name="chevron" size={12} style={{ position: "absolute", right: "8px", pointerEvents: "none", color: "var(--muted)" }} />
        </div>

        <button type="button" className="secondary-button" onClick={exportView}><Icon name="download" size={15} />{t("export")}</button>
        <button type="button" className="primary-button" onClick={() => setIsImportOpen(true)}><Icon name="upload" size={16} />{t("import")}</button>
      </div>
    </div>
  );

  const previewStrip = !records.length && deptScreen === "all" && (
    <div className="preview-strip">
      <div className="preview-mark"><Icon name="zap" size={16} /></div>
      <div className="preview-copy"><strong>{t("preview")}</strong><span>{t("noData")} — {t("common.previewNotice") || "metrics and the priority queue are ready to connect to your local files."}</span></div>
      <button type="button" className="primary-button compact-button" onClick={loadDemo}><Icon name="database" size={15} />{t("demo")}</button>
    </div>
  );

  const rail = <ActionRail items={actions} t={t} onSelect={setActiveAction} />;
  const opsGrid = (content: ReactNode) => (
    <div className="ops-grid">
      <div className="ops-content">{content}</div>
      <div className="ops-rail">{rail}</div>
    </div>
  );

  const financeDrillTile = (className = "") => (
    <DrillTile id="drill-finance" title={financeTitle} eyebrow={t("eyebrows.financeControl") || "FINANCE CONTROL"} className={className}
      options={financeOptions} value={drillFinance} onChange={(value) => setDrillFinance(value as FinanceDrill)}
      drill={financeDrills[drillFinance]} labels={labels} dark={dark}
      prefix={financeDrills[drillFinance].prefix} onExpand={() => openDrillDetail(financeTitle, financeDrills[drillFinance])} />
  );
  const salesDrillTile = (className = "") => (
    <DrillTile id="drill-sales" title={salesTitle} eyebrow={t("eyebrows.salesControl") || "SALES CONTROL"} className={className}
      options={salesOptions} value={drillSales} onChange={(value) => setDrillSales(value as SalesDrill)}
      drill={salesDrills[drillSales]} labels={labels} dark={dark}
      suffix={salesDrills[drillSales].suffix} onExpand={() => openDrillDetail(salesTitle, salesDrills[drillSales])} />
  );

  const mainTrendTile = (id: string, title: string, series: ChartSeries[], prefix = "", suffix = "") => (
    <Tile id={id} eyebrow={t("eyebrows.liveTrend") || "LIVE TREND / 32 DAYS"} title={title} className="chart-tile"
      onExpand={() => setDetail({ title, labels, series, summary: [[t("value"), series[0] ? fmtInt(series[0].data[series[0].data.length - 1] || 0) : "0"], [t("records"), fmtInt(filtered.length)], [t("source"), t("liveDb")]] })}>
      <div className="chart-meta">
        <strong>{series[0] ? prefix + fmtInt(series[0].data[series[0].data.length - 1] || 0) + suffix : "0"}</strong>
        <span className="delta positive"><Icon name="trend" size={13} />+9.2%</span>
        <TileTrendLegend series={series} />
      </div>
      <div className="chart-wrap"><LineChart labels={labels} series={series} dark={dark} height={210} prefix={prefix} suffix={suffix} /></div>
    </Tile>
  );

  /* ---------- Department screens ---------- */
  const renderAll = () => {
    const salesRows = filteredRecords.filter((entry) => entry.category === "sales").slice(0, 6);
    return (
      <>
        {pageHeader(currentDeptTitle, currentDeptTagline)}
        {previewStrip}
        <div className="kpi-deck">
          {financeDrillTile()}
          {salesDrillTile()}
          <StatTile label={t("opsBacklog")} value={stats.hasData ? fmtInt(stats.openTasks) : "23"} delta="+4.1%" tone="warning" icon="ops"
            footer={<span className="stat-note">{stats.hasData ? fmtInt(stats.escalations) : "5"} {t("priority").toLowerCase()}</span>} />
          <StatTile label={t("serviceLevel")} value={stats.hasData ? `${Math.round(stats.sla * 100)}%` : "94%"} delta="+1.2 pts" icon="shield"
            footer={<span className="stat-note"><StatusDot status="healthy" />{t("onTrack")}</span>} />
        </div>
        <div className="deep-only">
          <div className="content-grid">
            {mainTrendTile("trend-revenue", t("revenue"), [
              { label: t("revenue"), data: trends.revenue, color: palette.accent, type: "bar", borderRadius: 4 },
              { label: t("expenses"), data: trends.expense, color: palette.primary, type: "line", dash: true },
            ], "$")}
            <Tile id="pulse" eyebrow={t("eyebrows.serviceLevelLive") || "SERVICE LEVEL / LIVE"} title={t("pulse")} className="pulse-tile">
              <Gauge value={stats.hasData ? stats.sla : 0.94} caption={t("onTrack")} />
              <div className="pulse-list">
                <div><span><StatusDot status="healthy" />{t("onTrack")}</span><strong>{Math.max(50, 100 - Math.round((1 - (stats.hasData ? stats.sla : 0.94)) * 300))}%</strong></div>
                <div><span><StatusDot status="watch" />{t("atRisk")}</span><strong>{stats.hasData ? fmtInt(stats.escalations) : "7"}</strong></div>
                <div><span><StatusDot status="critical" />{t("critical")}</span><strong>{actions.filter((item) => item.priority === "critical").length}</strong></div>
              </div>
            </Tile>
          </div>
          <Tile id="orders-table" eyebrow={t("eyebrows.commercialMotion") || "COMMERCIAL MOTION / LATEST"} title={t("closedOrders")} className="table-tile">
            <DataTable<DataEntry>
              idFor={(row) => row.id}
              rows={salesRows}
              emptyMessage={t("common.emptyTable") || t("emptyTable")}
              columns={[
                { key: "order", label: t("drawer.order") || "Order", render: (row) => <span className="owner-cell"><span className="owner-avatar">{String(row.customer || "?").slice(0, 2).toUpperCase()}</span>{String(row.orderId || row.id)}</span> },
                { key: "customer", label: t("drawer.customer") || "Customer", render: (row) => String(row.customer || "—") },
                { key: "type", label: t("common.type") || t("type") || "Type", render: (row) => <Pill label={String(row.dealType || "Order")} tone="info" /> },
                { key: "value", label: t("value"), align: "right", render: (row) => <span className="table-value">{fmtMoney(Number(row.revenue || 0))}</span> },
                { key: "status", label: t("common.status") || t("status"), align: "right", render: (row) => <Pill label={String(row.status || "On track")} tone={row.status === "At risk" ? "warn" : "good"} /> },
              ]}
            />
          </Tile>
        </div>
      </>
    );
  };

  const renderSales = () => (
    <>
      {pageHeader(currentDeptTitle, currentDeptTagline)}
      <div className="kpi-row">
        <StatTile label={t("revenue")} value={stats.hasData ? fmtMoney(stats.revenue) : "$248.6k"} delta="+12.8%" />
        <StatTile label={t("quotes")} value={stats.hasData ? fmtInt(stats.quotes) : "46"} delta="+6.2%" />
        <StatTile label={t("closedOrders")} value={stats.hasData ? fmtInt(stats.orders) : "181"} delta="+8.4%" />
        <StatTile label={t("churnRisk")} value={stats.hasData ? `${(stats.churn * 100).toFixed(1)}%` : "8.6%"} delta="-1.9 pts" tone="warning" />
      </div>
      <div className="deep-only">
        <div className="content-grid">
          {salesDrillTile("large-drill")}
          {mainTrendTile("trend-orders", t("closedOrders"), [
            { label: t("closedOrders"), data: trends.orders, color: palette.primary, type: "bar", borderRadius: 4 },
            { label: t("quotes"), data: trends.quotes, color: palette.accent, type: "line", dash: true },
          ])}
        </div>
        <Tile id="sales-risk-table" eyebrow={t("eyebrows.atRisk") || "AT RISK / RESPONSE NEEDED"} title={t("churnRisk")} className="table-tile">
          <DataTable<DataEntry>
            idFor={(row) => row.id}
            rows={filteredRecords.filter((entry) => entry.category === "sales" && entry.status === "At risk").slice(0, 7)}
            emptyMessage={t("common.emptyTable") || t("emptyTable")}
            columns={[
              { key: "customer", label: t("drawer.customer") || "Customer", render: (row) => <span className="owner-cell"><span className="owner-avatar">{String(row.customer || "?").slice(0, 2).toUpperCase()}</span>{String(row.customer)}</span> },
              { key: "order", label: t("drawer.order") || "Order", render: (row) => String(row.orderId) },
              { key: "due", label: t("due"), render: () => <span className="warning-text">{t("responseNeeded")}</span> },
              { key: "value", label: t("value"), align: "right", render: (row) => <span className="table-value">{fmtMoney(Number(row.revenue || 0))}</span> },
            ]}
          />
        </Tile>
      </div>
    </>
  );

  const renderPurchasing = () => (
    <>
      {pageHeader(currentDeptTitle, currentDeptTagline)}
      <div className="kpi-row">
        <StatTile label={t("expenses")} value={stats.hasData ? fmtMoney(stats.expenses) : "$86.2k"} delta="+3.1%" />
        <StatTile label={t("invoiceApproval")} value={stats.hasData ? fmtInt(stats.approvals) : "9"} delta="-2" tone="warning" />
        <StatTile label={t("kpis.contracts") || t("contracts") || "Contracts"} value={stats.hasData ? fmtInt(stats.contracts) : "24"} delta={stats.hasData ? `${Math.round(stats.contractHealth * 100)}% ${t("healthy").toLowerCase()}` : "92%"} />
        <StatTile label={t("onTrack")} value={stats.hasData ? `${Math.round((1 - Math.min(0.5, stats.delayed / Math.max(1, stats.units / 100))) * 100)}%` : "96%"} delta="+1.4 pts" />
      </div>
      <div className="deep-only">
        {mainTrendTile("trend-spend", t("expenses"), [
          { label: t("expenses"), data: trends.expense, color: palette.primary, type: "bar", borderRadius: 4 },
          { label: t("pending"), data: trends.approvals, color: palette.secondary || "#798C7A", type: "line", dash: true },
        ], "$")}
        <Tile id="vendor-table" eyebrow={t("eyebrows.approvalPipeline") || "APPROVAL PIPELINE / AGING"} title={t("invoiceApproval")} className="table-tile">
          <DataTable<DataEntry>
            idFor={(row) => row.id}
            rows={filteredRecords.filter((entry) => entry.category === "expenses").slice(0, 7)}
            emptyMessage={t("common.emptyTable") || t("emptyTable")}
            columns={[
              { key: "invoice", label: t("drawer.invoice") || "Invoice", render: (row) => <span className="mono-value">{String(row.invoiceId)}</span> },
              { key: "vendor", label: t("drawer.vendor") || "Vendor", render: (row) => String(row.vendor || "—") },
              { key: "site", label: t("drawer.site") || "Site", render: (row) => String(row.site || "—") },
              { key: "amount", label: t("value"), align: "right", render: (row) => <span className="table-value">{fmtMoney(Number(row.amount || 0))}</span> },
              { key: "status", label: t("common.status") || t("status"), align: "right", render: (row) => <Pill label={row.approved === false ? (t("status.pending") || t("pending")) : (t("status.approved") || "Approved")} tone={row.approved === false ? "warn" : "good"} /> },
            ]}
          />
        </Tile>
      </div>
    </>
  );

  const renderFinance = () => (
    <>
      {pageHeader(currentDeptTitle, currentDeptTagline)}
      <div className="kpi-row">
        <StatTile label={t("revenue")} value={stats.hasData ? fmtMoney(stats.revenue) : "$248.6k"} delta="+12.8%" />
        <StatTile label={t("expenses")} value={stats.hasData ? fmtMoney(stats.expenses) : "$86.2k"} delta="+3.1%" />
        <StatTile label={t("cashflow")} value={stats.hasData ? fmtMoney(stats.cashflow) : "$162.4k"} delta="+9.4%" />
        <StatTile label={t("margin")} value={stats.hasData ? `${(stats.margin * 100).toFixed(1)}%` : "24.6%"} delta="+2.1 pts" />
      </div>
      <div className="deep-only">
        <div className="content-grid">
          {financeDrillTile("large-drill")}
          {mainTrendTile("trend-finance", financeTitle, [
            { label: t("expenses"), data: trends.expense, color: palette.secondary || "#798C7A", type: "bar", borderRadius: 4 },
            { label: t("revenue"), data: trends.revenue, color: palette.accent, type: "line", fill: true },
          ], "$")}
        </div>
        <Tile id="finance-overdue" eyebrow={t("eyebrows.overdueAging") || "OVERDUE / APPROVALS AGING"} title={t("invoiceApproval")} className="table-tile">
          <DataTable<DataEntry>
            idFor={(row) => row.id}
            rows={filteredRecords.filter((entry) => entry.category === "expenses" && entry.approved === false).slice(0, 7)}
            emptyMessage={t("common.emptyTable") || t("emptyTable")}
            columns={[
              { key: "invoice", label: t("drawer.invoice") || "Invoice", render: (row) => <span className="mono-value">{String(row.invoiceId)}</span> },
              { key: "vendor", label: t("drawer.vendor") || "Vendor", render: (row) => String(row.vendor || "—") },
              { key: "due", label: t("due"), render: () => <span className="warning-text">{t("overdue")} 2d</span> },
              { key: "amount", label: t("value"), align: "right", render: (row) => <span className="table-value">{fmtMoney(Number(row.amount || 0))}</span> },
            ]}
          />
        </Tile>
      </div>
    </>
  );

  const renderOps = () => {
    const siteGroups = new Map<string, number[]>();
    filteredRecords.filter((entry) => entry.category === "inventory").forEach((entry) => {
      const list = siteGroups.get(String(entry.site)) || [];
      list.push(Number(entry.fillRate || 0));
      siteGroups.set(String(entry.site), list);
    });
    const sites = [...siteGroups.entries()].map(([site, rates]) => ({ site, rate: rates.reduce((a, b) => a + b, 0) / Math.max(1, rates.length) })).slice(0, 5);
    return (
      <>
        {pageHeader(currentDeptTitle, currentDeptTagline)}
        <div className="kpi-row">
          <StatTile label={t("opsBacklog")} value={stats.hasData ? fmtInt(stats.openTasks) : "23"} delta="+4.1%" tone="warning" />
          <StatTile label={t("priority")} value={stats.hasData ? fmtInt(stats.escalations) : "5"} delta="-2" tone="warning" />
          <StatTile label={t("delayed")} value={stats.hasData ? fmtInt(stats.delayed) : "12"} delta="-18.2%" />
          <StatTile label={t("fulfillment")} value={stats.hasData ? `${Math.round(stats.fillRate * 100)}%` : "92%"} delta="+3.4 pts" />
        </div>
        <div className="deep-only">
          <div className="content-grid">
            {mainTrendTile("trend-ops", t("opsBacklog"), [
              { label: t("delayed"), data: trends.delayed, color: palette.accent, type: "bar", borderRadius: 4 },
              { label: t("priority"), data: trends.escalations, color: effectiveTertiary, type: "line" },
            ])}
            <Tile id="sites" eyebrow={t("eyebrows.siteStatus") || "SITE STATUS / LIVE"} title={t("flow")} className="source-tile">
              <div className="site-list">
                {(sites.length ? sites : [{ site: "North Hub", rate: 0.98 }, { site: "Riverside DC", rate: 0.94 }, { site: "West Fulfillment", rate: 0.87 }]).map(({ site, rate }) => (
                  <div key={site}><span><StatusDot status={rate < 0.9 ? "watch" : "healthy"} />{site}</span><strong>{Math.round(rate * 100)}%</strong></div>
                ))}
              </div>
              <div className="source-total"><span>{t("common.networkScore") || t("networkScore")}</span><strong>{stats.hasData ? Math.round(stats.fillRate * 100) : "94.2"}</strong></div>
            </Tile>
          </div>
          <Tile id="ops-delayed" eyebrow={t("eyebrows.deliveryDelays") || "DELIVERY DELAYS / EXPEDITE"} title={t("delayed")} className="table-tile">
            <DataTable<DataEntry>
              idFor={(row) => row.id}
              rows={filteredRecords.filter((entry) => entry.category === "inventory" && entry.shipmentStatus === "Delayed").slice(0, 7)}
              emptyMessage={t("common.emptyTable") || t("emptyTable")}
              columns={[
                { key: "sku", label: t("drawer.sku") || "SKU", render: (row) => <span className="mono-value">{String(row.sku)}</span> },
                { key: "site", label: t("drawer.site") || "Site", render: (row) => String(row.site || "—") },
                { key: "units", label: t("drawer.units") || "Units", align: "right", render: (row) => <span className="table-value">{fmtInt(Number(row.units || 0))}</span> },
                { key: "fill", label: t("fulfillment"), align: "right", render: (row) => `${Math.round(Number(row.fillRate || 0) * 100)}%` },
                { key: "status", label: t("common.status") || t("status"), align: "right", render: () => <Pill label={t("delayed")} tone="bad" /> },
              ]}
            />
          </Tile>
        </div>
      </>
    );
  };

  const renderHR = () => {
    const deptMix = new Map<string, number>();
    filteredRecords.filter((entry) => entry.category === "employees").forEach((entry) => deptMix.set(String(entry.department), (deptMix.get(String(entry.department)) || 0) + 1));
    const totalMix = Math.max(1, [...deptMix.values()].reduce((a, b) => a + b, 0));
    const mixTop = [...deptMix.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const donutItems: { name: string; value: number }[] = mixTop.length
      ? mixTop.map(([name, count]) => ({ name, value: count / totalMix }))
      : [{ name: t("common.operations") || t("operations"), value: 0.42 }, { name: "Commercial", value: 0.24 }, { name: "Support", value: 0.18 }];
    const donutColors = [palette.primary, palette.secondary || "#798C7A", palette.accent];
    return (
      <>
        {pageHeader(currentDeptTitle, currentDeptTagline)}
        <div className="kpi-row">
          <StatTile label={t("kpis.headcount") || t("headcount")} value={stats.hasData ? fmtInt(stats.headcount) : "247"} delta="+4.2%" />
          <StatTile label={t("kpis.retention") || t("retention")} value={stats.hasData ? `${(100 - Math.min(40, (stats.reviews / Math.max(1, stats.headcount)) * 100)).toFixed(1)}%` : "91.8%"} delta="+1.6 pts" />
          <StatTile label={t("kpis.reviewsDue") || t("reviewsDue")} value={stats.hasData ? fmtInt(stats.reviews) : "18"} delta="+3" tone="warning" />
          <StatTile label={t("kpis.avgTenure") || t("avgTenure")} value={`${stats.hasData ? stats.tenureYears.toFixed(1) : "3.8"}y`} delta="+0.4y" />
        </div>
        <div className="deep-only">
          <div className="content-grid">
            {mainTrendTile("trend-hr", t("common.workforceFlow") || t("workforceFlow"), [
              { label: t("kpis.headcount") || t("headcount"), data: trends.hires, color: palette.primary, type: "bar", borderRadius: 4 },
              { label: t("kpis.reviewsDue") || t("reviewsDue"), data: trends.reviews, color: palette.secondary || "#798C7A", type: "line", dash: true },
            ])}
            <Tile id="hr-mix" eyebrow={t("eyebrows.headcountMix") || "HEADCOUNT / MIX"} title={t("common.workforceMix") || t("workforceMix")} className="source-tile">
              <div className="donut-row">
                {donutItems.map((item, index) => <Donut key={item.name} value={item.value} label={item.name} color={donutColors[index % 3]} />)}
              </div>
              <div className="source-total"><span>{t("common.activeHeadcount") || t("activeHeadcount")}</span><strong>{stats.hasData ? fmtInt(stats.headcount) : "247"}</strong></div>
            </Tile>
          </div>
          <Tile id="hr-reviews" eyebrow={t("eyebrows.reviewQueue") || "REVIEW QUEUE / FOLLOW-UP"} title={t("common.people") || t("people")} className="table-tile">
            <DataTable<DataEntry>
              idFor={(row) => row.id}
              rows={filteredRecords.filter((entry) => entry.category === "employees" && entry.status === "Review").slice(0, 7)}
              emptyMessage={t("common.emptyTable") || t("emptyTable")}
              columns={[
                { key: "employee", label: t("common.employee") || t("hr") || "Employee", render: (row) => <span className="owner-cell"><span className="owner-avatar">{String(row.employeeId || "?").slice(-2)}</span>{String(row.employeeId)}</span> },
                { key: "dept", label: t("common.operations") || t("operations"), render: (row) => String(row.department || "—") },
                { key: "role", label: t("common.role") || t("role"), render: (row) => String(row.role || "—") },
                { key: "tenure", label: t("kpis.avgTenure") || "Tenure", align: "right", render: (row) => `${Math.round(Number(row.tenureMonths || 0) / 12 * 10) / 10}y` },
                { key: "status", label: t("common.status") || t("status"), align: "right", render: () => <Pill label={t("kpis.reviewsDue") || "Review"} tone="warn" /> },
              ]}
            />
          </Tile>
        </div>
      </>
    );
  };

  const renderQuality = () => (
    <>
      {pageHeader(currentDeptTitle, currentDeptTagline)}
      <div className="kpi-row">
        <StatTile label={t("serviceLevel")} value={stats.hasData ? `${Math.round(stats.sla * 100)}%` : "94%"} delta="+1.2 pts" />
        <StatTile label={t("priority")} value={stats.hasData ? fmtInt(stats.escalations) : "5"} delta="-2" tone="warning" />
        <StatTile label={t("urgentQueue")} value={fmtInt(actions.filter((item) => item.priority === "critical").length)} delta="Live" tone="neutral" />
        <StatTile label={t("delayed")} value={stats.hasData ? fmtInt(stats.delayed) : "12"} delta="-18.2%" />
      </div>
      <div className="deep-only">
        <div className="content-grid">
          {mainTrendTile("trend-qm", t("urgentQueue"), [
            { label: t("priority"), data: trends.escalations, color: palette.secondary || "#798C7A", type: "bar", borderRadius: 4 },
            { label: t("delayed"), data: trends.delayed, color: effectiveTertiary, type: "line", dash: true },
          ])}
          <Tile id="qm-gauge" eyebrow={t("eyebrows.slaLive") || "SLA / LIVE"} title={t("serviceLevel")} className="pulse-tile">
            <Gauge value={stats.hasData ? stats.sla : 0.94} caption={t("onTrack")} />
            <div className="pulse-list">
              <div><span><StatusDot status="healthy" />{t("onTrack")}</span><strong>{stats.hasData ? `${Math.round(stats.sla * 100)}%` : "94%"}</strong></div>
              <div><span><StatusDot status="watch" />{t("atRisk")}</span><strong>{stats.hasData ? fmtInt(stats.escalations) : "7"}</strong></div>
              <div><span><StatusDot status="critical" />{t("critical")}</span><strong>{actions.filter((item) => item.priority === "critical").length}</strong></div>
            </div>
          </Tile>
        </div>
        <Tile id="qm-escalations" eyebrow={t("eyebrows.escalations") || "ESCALATIONS / UNBLOCK NOW"} title={t("priority")} className="table-tile">
          <DataTable<DataEntry>
            idFor={(row) => row.id}
            rows={filteredRecords.filter((entry) => entry.category === "tasks" && entry.priority === "High" && entry.resolved === false).slice(0, 7)}
            emptyMessage={t("common.emptyTable") || t("emptyTable")}
            columns={[
              { key: "ticket", label: t("drawer.ticket") || "Ticket", render: (row) => <span className="mono-value">{String(row.taskId)}</span> },
              { key: "queue", label: t("drawer.queue") || "Queue", render: (row) => String(row.queue || "—") },
              { key: "sla", label: t("drawer.sla") || "SLA", align: "right", render: (row) => `${Math.round(Number(row.sla || 0) * 100)}%` },
              { key: "priority", label: t("priority"), align: "right", render: () => <Pill label={t("high")} tone="bad" /> },
            ]}
          />
        </Tile>
      </div>
    </>
  );

  const renderStudio = () => (
    <>
      {pageHeader(t("settings"), t("studio.tagline") || "Hierarchical White-Label Studio & Engine")}
      <Studio
        brandName={brandName}
        onBrandNameChange={handleBrandNameChange}
        brandLogoUrl={customLogo}
        onLogoUpload={handleLogoUpload}
        onRemoveLogo={handleRemoveLogo}
        logoHeight={logoHeight}
        onLogoHeightChange={setLogoHeight}
        primaryColor={effectivePrimary}
        onPrimaryColorChange={setBrandPrimary}
        secondaryColor={effectiveSecondary}
        onSecondaryColorChange={setBrandSecondary}
        tertiaryColor={effectiveTertiary}
        onTertiaryColorChange={setBrandTertiary}
        accentColor={effectiveAccent}
        onAccentColorChange={setBrandAccent}
        surfaceColor={effectiveSurface}
        onSurfaceColorChange={setBrandSurface}
        canvasColor={effectiveBg}
        onCanvasColorChange={setBrandBg}
        lineColor={brandLine}
        onLineColorChange={setBrandLine}
        paletteKey={paletteKey}
        onSelectPalettePreset={(k) => {
          const p = palettes[k];
          if (p) {
            setBrandPrimary(p.primary);
            setBrandSecondary(p.secondary || "#798C7A");
            setBrandTertiary(p.tertiary || (dark ? "#608696" : "#2B4C59"));
            setBrandAccent(p.accent);
            setBrandSurface("");
            setBrandBg("");
            setPaletteKey(k);
            void api.saveSettings({
              brandPrimary: p.primary,
              brandSecondary: p.secondary || "#798C7A",
              brandTertiary: p.tertiary || (dark ? "#608696" : "#2B4C59"),
              brandAccent: p.accent,
              brandSurface: "",
              brandBg: "",
              paletteKey: k,
            });
          }
        }}
        borderRadius={borderRadius}
        onBorderRadiusChange={setBorderRadius}
        shadowIntensity={shadowIntensity}
        onShadowIntensityChange={setShadowIntensity}
        typography={typography}
        onTypographyChange={setTypography}
        selectedFont={selectedFont}
        language={language}
        onLanguageChange={setLanguage}
        recordsCount={records.length}
        sourcesCount={records.length ? [...new Set(records.map((r) => r.sourceName))].length : 0}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={() => void syncNow()}
        onExportSnapshot={exportSnapshot}
        onRestoreClick={() => restoreInputRef.current?.click()}
        onClearDb={async () => { await api.clearEntries(); setImportStatus(t("ready")); }}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenStaging={() => setIsStagingOpen(true)}
        pendingStagingCount={pendingStagingCount}
        importStatus={importStatus}
        onResetDefaults={resetThemeToDefaults}
        t={t}
      />
    </>
  );

  const content = screen === "all" ? renderAll()
    : screen === "sales" ? renderSales()
    : screen === "purchasing" ? renderPurchasing()
    : screen === "finance" ? renderFinance()
    : screen === "ops" ? renderOps()
    : screen === "hr" ? renderHR()
    : screen === "quality" ? renderQuality()
    : renderStudio();

  return (
    <div className={`app-shell ${dark ? "dark" : "light"}`} style={rootStyle} data-theme={theme} data-shadow={shadowIntensity}>
      <Topbar
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={() => void syncNow()}
        query={query}
        onQueryChange={setQuery}
        onOpenSearch={() => setIsSearchOpen(true)}
        language={language}
        onSelectLanguage={setLanguage}
        pendingStagingCount={pendingStagingCount}
        isStagingOpen={isStagingOpen}
        onOpenStaging={() => setIsStagingOpen(true)}
        hasNotifications={actions.length > 0}
        onOpenNotifications={() => actions[0] && setActiveAction(actions[0])}
        isStudioOpen={screen === "studio"}
        onToggleStudio={() => setScreen(screen === "studio" ? "all" : "studio")}
        onLogout={() => notify("User profile: Ulises Pérez (CoreERP Auth ready)")}
        t={t}
        fallbackBrandName={brandName}
        fallbackLogoUrl={customLogo}
        fallbackLogoHeight={logoHeight}
      />

      <nav className="dept-nav" aria-label="Departments">
        {departmentList.map((item) => {
          const count = filterByDepartment(filteredRecords, item.id).length;
          const label = t(`nav.${item.id}`) || t(item.id) || item.label;
          return (
            <button key={item.id} type="button" className={`pill ${deptScreen === item.id && screen !== "studio" ? "active" : ""}`} onClick={() => setScreen(item.id)}>
              {item.emoji && <span className="pill-emoji" style={{ fontSize: "14px", lineHeight: 1 }}>{item.emoji}</span>}
              <span>{label}</span>
              {filteredRecords.length > 0 && <i className="pill-count">{count.toLocaleString()}</i>}
            </button>
          );
        })}
        <div className="nav-spacer" />
        <div className="mode-switch" aria-label="Complexity level">
          <button type="button" className={mode === "simple" ? "selected" : ""} onClick={() => setMode("simple")}>01 {t("simple")}</button>
          <button type="button" className={mode === "deep" ? "selected" : ""} onClick={() => setMode("deep")}>02 {t("deep")}</button>
        </div>
        <button type="button" className="theme-switch" onClick={() => setTheme(dark ? "light" : "dark")} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? <Icon name="sun" size={16} /> : <Icon name="moon" size={16} />}
        </button>
      </nav>

      <main className="workspace">
        {screen !== "all" && <button type="button" className="breadcrumb" onClick={() => setScreen("all")}><Icon name="arrow" size={15} />{t("back")}</button>}
        {screen === "studio" ? content : opsGrid(content)}
      </main>

      {/* Sliding drawer for Wichtig action items */}
      {activeAction && <ActionDrawer item={activeAction} t={t} onClose={() => setActiveAction(null)} onResolve={resolveAction} onSnooze={snoozeAction} onReassign={reassignAction} />}

      {/* Smart Staging Inbox Modal */}
      <StagingInbox
        isOpen={isStagingOpen}
        onClose={() => setIsStagingOpen(false)}
        stagingItems={stagingItems}
        onApprove={handleApproveStaging}
        onReject={handleRejectStaging}
        t={t}
      />

      {/* OmniSearch Command Palette Overlay */}
      <OmniSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(targetScreen) => {
          setScreen(targetScreen);
        }}
        onOpenStaging={() => setIsStagingOpen(true)}
        onSelectAction={(actionItem) => {
          setActiveAction(actionItem);
        }}
        onSelectRecord={(entry) => {
          const label = entry.customer || entry.vendor || entry.sku || entry.sourceName || entry.id;
          const valueText = entry.revenue ? `$${Number(entry.revenue).toLocaleString()}`
            : entry.amount ? `$${Number(entry.amount).toLocaleString()}`
            : entry.units ? `${entry.units} units`
            : "Record";
          setDetail({
            title: `${label} (${entry.category.toUpperCase()})`,
            labels: ["W1", "W2", "W3", "W4"],
            series: [{ label: String(label), data: [12, 18, 14, 22], color: palette.primary, fill: true }],
            summary: [
              ["ID", String(entry.id)],
              ["Category", entry.category],
              ["Source", entry.sourceName || "Local"],
              ["Value / Units", valueText],
              ["Status", String(entry.status || entry.shipmentStatus || "Active")],
            ],
          });
        }}
        t={t}
      />

      {/* Fullscreen drill-down */}
      {detail && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setDetail(null); }}>
          <div className="modal detail-modal">
            <div className="modal-header">
              <div><div className="eyebrow">{t("eyebrows.fullscreen") || "FULL-SCREEN WORKSPACE"}</div><h2>{detail.title}</h2><p>{t("decision")}</p></div>
              <button type="button" className="icon-button large" onClick={() => setDetail(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="detail-summary">
              {detail.summary.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
            <div className="detail-chart"><LineChart labels={detail.labels} series={detail.series} dark={dark} height={300} /></div>
            <div className="detail-footer">
              <span><StatusDot status="healthy" />{t("active")} · {t("saved")}</span>
              <button type="button" className="primary-button" onClick={exportView}><Icon name="download" size={15} />{t("export")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import / ETL modal */}
      {isImportOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setIsImportOpen(false); }}>
          <div className="modal import-modal">
            <div className="modal-header">
              <div><div className="eyebrow">{t("eyebrows.localEtlEngine") || "LOCAL ETL ENGINE"}</div><h2>{t("import")}</h2><p>{t("localOnly")}. Columns are typed, normalized and stored in IndexedDB.</p></div>
              <button type="button" className="icon-button large" onClick={() => setIsImportOpen(false)}><Icon name="close" size={18} /></button>
            </div>
            <div className={`drop-zone ${isDragging ? "dragging" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); void processFiles(event.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}>
              <div className="upload-orb"><Icon name="upload" size={23} /></div>
              <strong>{t("drop")}</strong>
              <span>{t("browse")}</span>
              <small>{t("supported")}</small>
              <input ref={fileInputRef} type="file" multiple hidden accept=".csv,.xlsx,.xls,.pdf,.txt,.md,.docx,.eml,.png,.jpg,.jpeg,.svg" onChange={(event) => { if (event.target.files) void processFiles(event.target.files); }} />
            </div>
            <div className="import-bottom">
              <div className="format-list"><span><Icon name="file" size={14} />Tabular</span><span><Icon name="file" size={14} />Documents</span><span><Icon name="palette" size={14} />Branding</span></div>
              {importStatus && <div className="status-message"><StatusDot status="healthy" />{importStatus}</div>}
            </div>
            <div className="modal-divider" />
            <div className="demo-callout">
              <div className="callout-icon"><Icon name="zap" size={16} /></div>
              <div className="callout-copy"><strong>{t("demo")}</strong><span>Explore a populated enterprise workspace with 1,250 operational records.</span></div>
              <button type="button" className="secondary-button" onClick={async () => { await loadDemo(); setIsImportOpen(false); }}>{t("demo")}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" key={toast.id}><Icon name="check" size={15} />{toast.msg}</div>}
      <input ref={restoreInputRef} type="file" hidden accept=".json" onChange={(event) => void restoreSnapshot(event.target.files?.[0])} />
    </div>
  );
}
