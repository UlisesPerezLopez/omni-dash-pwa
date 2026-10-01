import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { Icon, type IconName } from "./Icons";
import { LANGUAGES } from "./LanguageDropdown";
import { Pill, StatusDot } from "./Tiles";
import type { Language, ShadowIntensity } from "../types";
import { ingestDatasetFile, processUploadedJSON } from "../lib/ingestion";

export type StudioTab =
  | "brand"
  | "colors"
  | "surfaces"
  | "typography"
  | "language"
  | "storage"
  | "ingestion";

interface TabItem {
  id: StudioTab;
  label: string;
  icon: IconName;
  emoji: string;
  badge?: string;
}

export interface CustomPaletteItem {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  tertiary?: string;
  accent?: string;
  surface?: string;
  bg?: string;
  line?: string;
  ink?: string;
}

export interface StudioProps {
  // Brand & Header
  brandName: string;
  onBrandNameChange: (name: string) => void;
  brandLogoUrl: string | null;
  onLogoUpload: (file: File) => void;
  onRemoveLogo: () => void;
  logoHeight: number;
  onLogoHeightChange: (h: number) => void;

  // Color System
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  secondaryColor: string;
  onSecondaryColorChange: (color: string) => void;
  tertiaryColor: string;
  onTertiaryColorChange: (color: string) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  surfaceColor: string;
  onSurfaceColorChange: (color: string) => void;
  canvasColor: string;
  onCanvasColorChange: (color: string) => void;
  lineColor?: string;
  onLineColorChange?: (color: string) => void;
  paletteKey: string;
  onSelectPalettePreset: (key: string) => void;

  // Surfaces & Cards
  borderRadius: number;
  onBorderRadiusChange: (r: number) => void;
  shadowIntensity: ShadowIntensity;
  onShadowIntensityChange: (shadow: ShadowIntensity) => void;

  // Typography
  typography: string;
  onTypographyChange: (typo: string) => void;
  selectedFont: string;

  // Language
  language: Language;
  onLanguageChange: (lang: Language) => void;

  // Storage & Backup
  recordsCount: number;
  emailsCount?: number;
  sourcesCount: number;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  onExportSnapshot: () => void;
  onRestoreClick: () => void;
  onClearDb: () => void;

  // Ingestion
  onOpenImport: () => void;
  onOpenStaging: () => void;
  pendingStagingCount: number;
  importStatus: string;
  onFileIngested?: (message: string) => void;

  // General
  onResetDefaults: () => void;
  t: (key: string, defaultText?: string) => string;
}

export function Studio({
  brandName,
  onBrandNameChange,
  brandLogoUrl,
  onLogoUpload,
  onRemoveLogo,
  logoHeight,
  onLogoHeightChange,
  primaryColor,
  onPrimaryColorChange,
  secondaryColor,
  onSecondaryColorChange,
  tertiaryColor,
  onTertiaryColorChange,
  accentColor,
  onAccentColorChange,
  surfaceColor,
  onSurfaceColorChange,
  canvasColor,
  onCanvasColorChange,
  lineColor,
  onLineColorChange,
  paletteKey,
  onSelectPalettePreset,
  borderRadius,
  onBorderRadiusChange,
  shadowIntensity,
  onShadowIntensityChange,
  typography,
  onTypographyChange,
  selectedFont,
  language,
  onLanguageChange,
  recordsCount,
  emailsCount = 0,
  sourcesCount,
  pendingSyncCount,
  onTriggerSync,
  onExportSnapshot,
  onRestoreClick,
  onClearDb,
  onOpenImport,
  onOpenStaging,
  pendingStagingCount,
  importStatus,
  onFileIngested,
  onResetDefaults,
  t,
}: StudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("brand");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const dataFileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion drag-drop and staging states
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [localImportMessage, setLocalImportMessage] = useState<string | null>(null);
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  // Custom Theme Palettes (Phase 30)
  const [customPalettes, setCustomPalettes] = useState<CustomPaletteItem[]>(() => {
    try {
      const stored = localStorage.getItem("omnidash_custom_palettes");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [newPaletteName, setNewPaletteName] = useState("");
  const [activeCustomPaletteId, setActiveCustomPaletteId] = useState<string | null>(null);

  // Chrome Extension Connector ID (Phase 32)
  const [extId, setExtId] = useState<string>(() => {
    try {
      return localStorage.getItem("omni_ext_id") || "";
    } catch {
      return "";
    }
  });
  const [isExtIdSaved, setIsExtIdSaved] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("omni_ext_id");
    } catch {
      return false;
    }
  });
  const [extSaveFeedback, setExtSaveFeedback] = useState<string | null>(null);

  const handleSaveExtId = () => {
    const trimmed = extId.trim();
    try {
      if (trimmed) {
        localStorage.setItem("omni_ext_id", trimmed);
        setIsExtIdSaved(true);
        setExtSaveFeedback(t("studio.ingest.linked") || "Vinculado");
      } else {
        localStorage.removeItem("omni_ext_id");
        setIsExtIdSaved(false);
        setExtSaveFeedback("");
      }
      setTimeout(() => setExtSaveFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to save extension ID:", err);
    }
  };

  // Typography Text Color Control (Phase 31)
  const [textColor, setTextColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("omnidash_text_color");
      if (saved) return saved;
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      const computed = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
      if (computed && computed.startsWith("#")) return computed;
    }
    return "#2D2823";
  });

  const handleTextColorChange = (hex: string) => {
    setTextColor(hex);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--ink", hex);
      root.style.setProperty("--text-main", hex);
      root.style.setProperty("--color-text-main", hex);
      root.style.setProperty("--ink-secondary", `color-mix(in srgb, ${hex} 75%, transparent)`);
      root.style.setProperty("--muted", `color-mix(in srgb, ${hex} 60%, transparent)`);
      root.style.setProperty("--faint", `color-mix(in srgb, ${hex} 40%, transparent)`);
    }
    try {
      localStorage.setItem("omnidash_text_color", hex);
    } catch (e) {
      console.error("Failed to save text color", e);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnidash_text_color_change", { detail: hex }));
    }
  };

  const handleSaveCustomPalette = () => {
    const trimmed = newPaletteName.trim();
    if (!trimmed) return;

    const computed = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
    const currentPrimary = primaryColor || computed?.getPropertyValue("--primary").trim() || "#C27358";
    const currentSecondary = secondaryColor || computed?.getPropertyValue("--secondary").trim() || "#798C7A";
    const currentTertiary = tertiaryColor || computed?.getPropertyValue("--tertiary").trim() || "#2B4C59";
    const currentAccent = accentColor || computed?.getPropertyValue("--accent").trim() || "#D4A373";
    const currentSurface = surfaceColor || computed?.getPropertyValue("--surface").trim() || "#FFFFFF";
    const currentBg = canvasColor || computed?.getPropertyValue("--bg").trim() || "#F5F3ED";
    const currentLine = lineColor || computed?.getPropertyValue("--line").trim() || "#E7E3D9";

    const newPalette: CustomPaletteItem = {
      id: `pal_${Date.now()}`,
      name: trimmed,
      primary: currentPrimary,
      secondary: currentSecondary,
      tertiary: currentTertiary,
      accent: currentAccent,
      surface: currentSurface,
      bg: currentBg,
      line: currentLine,
      ink: textColor,
    };

    const updated = [...customPalettes, newPalette];
    setCustomPalettes(updated);
    try {
      localStorage.setItem("omnidash_custom_palettes", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save custom palette", e);
    }
    setNewPaletteName("");
    setActiveCustomPaletteId(newPalette.id);
  };

  const handleSelectCustomPalette = (palette: CustomPaletteItem) => {
    setActiveCustomPaletteId(palette.id);
    if (palette.primary) onPrimaryColorChange(palette.primary);
    if (palette.secondary) onSecondaryColorChange(palette.secondary);
    if (palette.tertiary && onTertiaryColorChange) onTertiaryColorChange(palette.tertiary);
    if (palette.accent && onAccentColorChange) onAccentColorChange(palette.accent);
    if (palette.surface && onSurfaceColorChange) onSurfaceColorChange(palette.surface);
    if (palette.bg && onCanvasColorChange) onCanvasColorChange(palette.bg);
    if (palette.line && onLineColorChange) onLineColorChange(palette.line);
    if (palette.ink) handleTextColorChange(palette.ink);
  };

  const handleDeleteCustomPalette = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customPalettes.filter((p) => p.id !== id);
    setCustomPalettes(updated);
    if (activeCustomPaletteId === id) setActiveCustomPaletteId(null);
    try {
      localStorage.setItem("omnidash_custom_palettes", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to update custom palettes", err);
    }
  };

  const totalRecords = recordsCount + emailsCount;

  const handleProcessFile = async (file: File) => {
    setIsProcessingFile(true);
    setLocalImportMessage(`Reading ${file.name}...`);
    try {
      let resMessage = "";
      if (file.name.toLowerCase().endsWith(".json")) {
        const res = await processUploadedJSON(file);
        resMessage = res.message;
      } else {
        const res = await ingestDatasetFile(file);
        resMessage = res.message;
      }
      setLocalImportMessage(resMessage);
      if (onFileIngested) {
        onFileIngested(resMessage);
      }
      alert(resMessage);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error processing file";
      setLocalImportMessage(errMsg);
      alert(`Import error: ${errMsg}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        await handleProcessFile(file);
      }
    }
  };

  const tabs: TabItem[] = [
    { id: "brand", label: t("studio.tabs.brand") || "Brand & Identity", icon: "zap", emoji: "🏷️" },
    { id: "colors", label: t("studio.tabs.colors") || "Color System", icon: "palette", emoji: "🎨" },
    { id: "surfaces", label: t("studio.tabs.surfaces") || "Surfaces & Depth", icon: "grid", emoji: "🪟" },
    { id: "typography", label: t("studio.tabs.typography") || "Typography", icon: "file", emoji: "📝" },
    { id: "language", label: t("language") || "Language", icon: "globe", emoji: "🌐" },
    { id: "storage", label: t("storage") || "Data & Storage", icon: "database", emoji: "💾" },
    {
      id: "ingestion",
      label: t("studio.tabs.ingestion") || "Ingestion & Inbox",
      icon: "upload",
      badge: pendingStagingCount > 0 ? `${pendingStagingCount}` : undefined,
      emoji: "📥",
    },
  ];

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLogoUpload(file);
      e.target.value = "";
    }
  };

  return (
    <div className="hierarchical-studio">
      {/* Column 1: Left-Side Navigation Menu */}
      <aside className="studio-sidebar" aria-label="Studio Navigation">
        <div className="studio-sidebar-header">
          <h3>{t("settings") || "Studio Config"}</h3>
          <p>{t("studio.sidebarDesc") || "White-Label Brand & Engine"}</p>
        </div>

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`studio-nav-pill ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-emoji" style={{ fontSize: "14px", lineHeight: 1 }}>{tab.emoji}</span>
              <span>{tab.label}</span>
              {tab.badge && <span className="studio-nav-badge">{tab.badge}</span>}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={onResetDefaults}
            style={{ width: "100%", justifyContent: "center" }}
            title="Revert all brand overrides to Warm Corporate defaults"
          >
            <Icon name="refresh" size={13} />
            <span>{t("common.reset") || "Reset Defaults"}</span>
          </button>
        </div>
      </aside>

      {/* Column 2: Right-Side Configuration Area */}
      <main className="studio-content-pane">
        {/* TAB 1: Brand & Header */}
        {activeTab === "brand" && (
          <section className="studio-tab-section">
            <div className="studio-pane-header">
              <div>
                <h2>{t("studio.tabs.brand") || "Brand & Identity"}</h2>
                <p>Configure company name and corporate mark rendered globally across the top navigation.</p>
              </div>
            </div>

            <div className="studio-form-group">
              <label htmlFor="company-name-input" className="studio-form-label">
                {t("studio.companyName") || "Company Name"}
              </label>
              <input
                id="company-name-input"
                type="text"
                className="studio-form-input"
                value={brandName}
                onChange={(e) => onBrandNameChange(e.target.value)}
                placeholder="e.g. Acme Enterprise"
              />
              <span className="studio-form-help">
                Appears in the header brand block and browser document titles in real time.
              </span>
            </div>

            <div className="studio-form-group">
              <label className="studio-form-label">
                {t("studio.companyLogo") || "Company Logo"}
              </label>

              <input
                ref={logoInputRef}
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                style={{ display: "none" }}
                onChange={handleFileInputChange}
              />

              {brandLogoUrl ? (
                <div className="logo-preview-card" style={{ maxWidth: "480px" }}>
                  <div className="logo-preview-box">
                    <img
                      src={brandLogoUrl}
                      alt="Brand Logo Preview"
                      style={{ height: `${logoHeight}px`, maxHeight: "48px", maxWidth: "160px", objectFit: "contain" }}
                    />
                  </div>
                  <div className="logo-controls">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="eyebrow">{t("common.logoHeight") || "DISPLAY HEIGHT"}</span>
                      <span className="mono-value" style={{ fontWeight: 700, color: "var(--primary)" }}>{logoHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="48"
                      value={logoHeight}
                      onChange={(e) => onLogoHeightChange(Number(e.target.value))}
                      className="theme-slider"
                      aria-label="Logo display height slider"
                    />
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <button
                        type="button"
                        className="secondary-button compact-button"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <Icon name="upload" size={13} />
                        {t("common.changeLogo") || "Replace"}
                      </button>
                      <button
                        type="button"
                        className="danger-button compact-button"
                        onClick={onRemoveLogo}
                      >
                        <Icon name="close" size={13} />
                        {t("common.removeLogo") || "Remove Logo"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="logo-upload-drop"
                  style={{ maxWidth: "480px" }}
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Icon name="upload" size={20} />
                  <strong>{t("common.uploadLogo") || "Upload Company Logo"}</strong>
                  <small>Supports SVG or PNG vector marks (saved as Base64 in IndexedDB)</small>
                </button>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: Color System */}
        {activeTab === "colors" && (
          <section className="studio-tab-section">
            <div className="studio-pane-header">
              <div>
                <h2>{t("studio.tabs.colors") || "Color System"}</h2>
                <p>Harmonized Warm Corporate palette with Terracotta, Sage Green, and the new Trust Slate Blue.</p>
              </div>
            </div>

            {/* Live Preview Card */}
            <div
              className="color-live-preview-card"
              style={{
                marginBottom: "20px",
                padding: "16px 20px",
                backgroundColor: surfaceColor || "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: `${borderRadius || 12}px`,
                boxShadow: "var(--card-shadow)",
                maxWidth: "600px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <span className="eyebrow" style={{ color: "var(--muted)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    LIVE PREVIEW / TELEMETRY
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "4px" }}>
                    <strong style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-main)" }}>$128,450</strong>
                    <span className="delta positive" style={{ color: secondaryColor, fontWeight: 700, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <Icon name="trend" size={12} /> +14.2%
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      backgroundColor: tertiaryColor ? `${tertiaryColor}1a` : "rgba(43,76,89,0.1)",
                      color: tertiaryColor,
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: tertiaryColor }} />
                    {t("common.tertiaryColor") || "Active"}
                  </span>
                </div>
              </div>

              {/* Multi-segment Flex-Bar / Progress Bar */}
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)", marginBottom: "5px" }}>
                  <span>{t("common.primaryColor") || "Volume"}: 58%</span>
                  <span>{t("common.secondaryColor") || "Success"}: 28%</span>
                  <span>{t("common.accentColor") || "Alerts"}: 14%</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    height: "8px",
                    width: "100%",
                    borderRadius: "4px",
                    overflow: "hidden",
                    background: "var(--line)",
                    gap: "2px",
                  }}
                >
                  <div style={{ width: "58%", background: primaryColor, transition: "background 0.15s ease" }} title="Primary (Volume)" />
                  <div style={{ width: "28%", background: secondaryColor, transition: "background 0.15s ease" }} title="Secondary (Success)" />
                  <div style={{ width: "14%", background: accentColor, transition: "background 0.15s ease" }} title="Accent (Alert)" />
                </div>
              </div>

              {/* Micro Series Mini Bars Preview */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "36px", marginTop: "14px", paddingTop: "6px", borderTop: "1px dashed var(--line)" }}>
                {[35, 60, 45, 80, 65, 95, 75, 100].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: i % 2 === 0 ? primaryColor : secondaryColor,
                      borderRadius: "3px 3px 0 0",
                      opacity: 0.85 + (i / 10) * 0.15,
                      transition: "background 0.15s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="color-pickers-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              {/* 1. Canvas Background */}
              <label className="color-picker-item" title="Click to pick Canvas Background color">
                <div className="color-preview-swatch" style={{ background: canvasColor, border: "1px solid var(--line)" }}>
                  <input
                    type="color"
                    value={canvasColor}
                    onChange={(e) => onCanvasColorChange(e.target.value)}
                    className="color-picker-native"
                  />
                </div>
                <div className="color-picker-info">
                  <strong>{t("common.canvasColor") || "Canvas Background"}</strong>
                  <span className="mono-value">{canvasColor.toUpperCase()}</span>
                </div>
              </label>

              {/* 2. Card Surface */}
              <label className="color-picker-item" title="Click to pick Card Surface color">
                <div className="color-preview-swatch" style={{ background: surfaceColor, border: "1px solid var(--line)" }}>
                  <input
                    type="color"
                    value={surfaceColor}
                    onChange={(e) => onSurfaceColorChange(e.target.value)}
                    className="color-picker-native"
                  />
                </div>
                <div className="color-picker-info">
                  <strong>{t("common.surfaceColor") || "Card Surface"}</strong>
                  <span className="mono-value">{surfaceColor.toUpperCase()}</span>
                </div>
              </label>

              {/* 3. Primary Accent (Terracotta) */}
              <label className="color-picker-item" title="Click to pick Primary Accent color">
                <div className="color-preview-swatch" style={{ background: primaryColor }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => onPrimaryColorChange(e.target.value)}
                    className="color-picker-native"
                  />
                </div>
                <div className="color-picker-info">
                  <strong>{t("common.primaryColor") || "Primary (Volume)"}</strong>
                  <span className="mono-value">{primaryColor.toUpperCase()}</span>
                </div>
              </label>

              {/* 4. Secondary (Sage) */}
              <label className="color-picker-item" title="Click to pick Secondary color">
                <div className="color-preview-swatch" style={{ background: secondaryColor }}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => onSecondaryColorChange(e.target.value)}
                    className="color-picker-native"
                  />
                </div>
                <div className="color-picker-info">
                  <strong>{t("common.secondaryColor") || "Secondary (Success)"}</strong>
                  <span className="mono-value">{secondaryColor.toUpperCase()}</span>
                </div>
              </label>

              {/* 5. Tertiary (Slate Blue - Trust Anchor) */}
              <label className="color-picker-item" title="Click to pick Tertiary Trust Blue color">
                <div className="color-preview-swatch" style={{ background: tertiaryColor }}>
                  <input
                    type="color"
                    value={tertiaryColor}
                    onChange={(e) => onTertiaryColorChange(e.target.value)}
                    className="color-picker-native"
                  />
                </div>
                <div className="color-picker-info">
                  <strong>{t("common.tertiaryColor") || "Tertiary (Info)"}</strong>
                  <span className="mono-value">{tertiaryColor.toUpperCase()}</span>
                </div>
              </label>

              {/* 6. Accent (Sand) */}
              <label className="color-picker-item" title="Click to pick Warm Sand Accent color">
                <div className="color-preview-swatch" style={{ background: accentColor }}>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => onAccentColorChange(e.target.value)}
                    className="color-picker-native"
                  />
                </div>
                <div className="color-picker-info">
                  <strong>{t("common.accentColor") || "Accent (Warning)"}</strong>
                  <span className="mono-value">{accentColor.toUpperCase()}</span>
                </div>
              </label>

              {/* 7. Card Border Color */}
              {onLineColorChange && (
                <label className="color-picker-item" title="Click to pick Card Border color">
                  <div className="color-preview-swatch" style={{ background: lineColor || "var(--line)", border: "1px solid var(--line)" }}>
                    <input
                      type="color"
                      value={lineColor || "#E7E3D9"}
                      onChange={(e) => onLineColorChange(e.target.value)}
                      className="color-picker-native"
                    />
                  </div>
                  <div className="color-picker-info">
                    <strong>{t("common.lineColor") || "Card Border"}</strong>
                    <span className="mono-value">{(lineColor || "#E7E3D9").toUpperCase()}</span>
                  </div>
                </label>
              )}
            </div>

            <div style={{ marginTop: "24px" }}>
              <div className="studio-subheading">
                <span className="eyebrow">{t("common.presets") || "PRESET PALETTES"}</span>
                <p>Curated architectural schemes tested for optimal contrast and accessibility.</p>
              </div>
              <div className="radius-presets" style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                {[
                  { key: "warm", label: `${t("palettes.warm") || "Warm Corporate"} (Terracotta / Sage / Slate)` },
                  { key: "sage", label: `${t("palettes.sage") || "Sage Earth"} (Salvia / Terracotta)` },
                  { key: "stone", label: `${t("palettes.stone") || "Stone Dark"} (Slate Muted / Warm Black)` },
                  { key: "oceanic", label: `${t("palettes.oceanic") || "Oceanic Amber"} (Teal / Deep Blue / Ochre)` },
                  { key: "cyber", label: `${t("palettes.cyber") || "Cyber Vivid"} (Purple / Cyan / Neon Pink)` },
                  { key: "pastel", label: `${t("palettes.pastel") || "Soft Pastel"} (Powder Blue / Mint / Peach)` },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`radius-chip ${paletteKey === item.key && !activeCustomPaletteId ? "active" : ""}`}
                    onClick={() => {
                      setActiveCustomPaletteId(null);
                      onSelectPalettePreset(item.key);
                    }}
                  >
                    {item.label}
                  </button>
                ))}

                {/* Custom User-Saved Palettes */}
                {customPalettes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`radius-chip ${activeCustomPaletteId === item.id ? "active" : ""}`}
                    onClick={() => handleSelectCustomPalette(item)}
                    style={{
                      borderLeft: `4px solid ${item.primary}`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: item.primary,
                      }}
                    />
                    <span>{item.name}</span>
                    <span
                      onClick={(e) => handleDeleteCustomPalette(e, item.id)}
                      title="Eliminar paleta personalizada"
                      style={{
                        marginLeft: "4px",
                        opacity: 0.6,
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "10px",
                      }}
                    >
                      ✕
                    </span>
                  </button>
                ))}
              </div>

              {/* Inline Save Palette and Reset Row */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--line, #E7E3D9)",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    value={newPaletteName}
                    onChange={(e) => setNewPaletteName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveCustomPalette();
                      }
                    }}
                    placeholder={t("theme.paletteName") || "Nombre de la paleta..."}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--line, #E7E3D9)",
                      background: "var(--surface, #FFFFFF)",
                      color: "var(--ink, #2D2823)",
                      fontSize: "13px",
                      outline: "none",
                      width: "180px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomPalette}
                    disabled={!newPaletteName.trim()}
                    className="primary-button compact-button"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      background: "var(--primary, #C27358)",
                      color: "#FFFFFF",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: newPaletteName.trim() ? "pointer" : "not-allowed",
                      opacity: newPaletteName.trim() ? 1 : 0.6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span>💾 {t("theme.savePalette") || "Guardar Paleta"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="secondary-button compact-button"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => {
                    setActiveCustomPaletteId(null);
                    onSelectPalettePreset("warm");
                  }}
                  title="Restaurar por Defecto"
                >
                  <Icon name="refresh" size={13} />
                  <span>{t("common.reset") || "Restaurar por Defecto"}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: Surfaces & Cards */}
        {activeTab === "surfaces" && (
          <section className="studio-tab-section">
            <div className="studio-pane-header">
              <div>
                <h2>{t("studio.tabs.surfaces") || "Surfaces & Depth"}</h2>
                <p>Refine card curvature and shadow elevation intensity to match your brand's physical aesthetic.</p>
              </div>
            </div>

            {/* Border Radius */}
            <div className="studio-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "440px" }}>
                <label className="studio-form-label" style={{ marginBottom: 0 }}>
                  {t("common.curvature") || "Card Border Radius"}
                </label>
                <span className="mono-value" style={{ fontWeight: 700, color: "var(--primary)" }}>{borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="2"
                value={borderRadius}
                onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
                className="theme-slider"
                style={{ maxWidth: "440px" }}
                aria-label="Border radius slider"
              />
              <div className="radius-presets" style={{ maxWidth: "440px" }}>
                {[0, 6, 12, 18, 24].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`radius-chip ${borderRadius === r ? "active" : ""}`}
                    onClick={() => onBorderRadiusChange(r)}
                  >
                    {r === 0 ? "0px Sharp" : r === 12 ? "12px Default" : `${r}px`}
                  </button>
                ))}
              </div>
            </div>

            {/* Shadow Intensity Dropdown */}
            <div className="studio-form-group" style={{ marginTop: "24px" }}>
              <label htmlFor="shadow-intensity-select" className="studio-form-label">
                {t("studio.shadowIntensity") || "Shadow Intensity"}
              </label>
              <select
                id="shadow-intensity-select"
                className="theme-select"
                style={{ maxWidth: "440px" }}
                value={shadowIntensity}
                onChange={(e) => onShadowIntensityChange(e.target.value as ShadowIntensity)}
              >
                <option value="flat">Flat (Sharp borders, zero elevation)</option>
                <option value="soft">Soft (Subtle warm corporate elevation)</option>
                <option value="deep">Deep (Prominent elevation with high blur)</option>
              </select>
              <span className="studio-form-help">
                Maps directly to dynamic CSS variable <code>--card-shadow</code> applied across all cards.
              </span>
            </div>

            {/* Live Surface Elevation Preview */}
            <div style={{ marginTop: "26px", maxWidth: "440px" }}>
              <span className="eyebrow">ELEVATION PREVIEW</span>
              <div
                style={{
                  marginTop: "8px",
                  padding: "16px 20px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: `${borderRadius}px`,
                  boxShadow: "var(--card-shadow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <strong style={{ fontSize: "12px", display: "block" }}>Card Elevation Model</strong>
                  <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                    Radius: {borderRadius}px · Shadow: {shadowIntensity.toUpperCase()}
                  </span>
                </div>
                <Pill label={shadowIntensity} tone="info" />
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: Typography */}
        {activeTab === "typography" && (
          <section className="studio-tab-section">
            <div className="studio-pane-header">
              <div>
                <h2>{t("studio.tabs.typography") || "Typography System"}</h2>
                <p>Global typography stack applied dynamically to metrics, tables, and telemetry.</p>
              </div>
            </div>

            <div className="studio-form-group" style={{ maxWidth: "440px" }}>
              <label htmlFor="typography-select" className="studio-form-label">
                {t("common.typography") || "Font Family"}
              </label>
              <select
                id="typography-select"
                className="theme-select"
                value={
                  typography === "sans"
                    ? "sans-inter"
                    : typography === "serif"
                    ? "serif-merriweather"
                    : typography === "mono"
                    ? "mono-jetbrains"
                    : typography
                }
                onChange={(e) => onTypographyChange(e.target.value)}
              >
                <option value="sans-inter">Sans-serif (Inter / Modern UI)</option>
                <option value="sans-roboto">Sans-serif (Roboto / Corporate Classic)</option>
                <option value="serif-merriweather">Serif (Merriweather / Editorial)</option>
                <option value="serif-playfair">Serif (Playfair Display / Elegant)</option>
                <option value="mono-jetbrains">Monospace (JetBrains Mono / Data Technical)</option>
              </select>
            </div>

            {/* Text Color Picker */}
            <div style={{ marginTop: "16px", maxWidth: "440px" }}>
              <label className="color-picker-item" title={t("theme.textColor") || "Color del texto"}>
                <div className="color-preview-swatch" style={{ background: textColor, border: "1px solid var(--line)" }}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => handleTextColorChange(e.target.value)}
                    className="color-picker-native"
                  />
                </div>
                <div className="color-picker-info">
                  <strong>{t("theme.textColor") || "Color del texto"}</strong>
                  <span className="mono-value">{textColor.toUpperCase()}</span>
                </div>
              </label>
            </div>

            <div className="typography-preview" style={{ fontFamily: selectedFont, maxWidth: "440px", marginTop: "14px", color: textColor }}>
              <strong>Aa Bb Gg 1234567890</strong>
              <span>OmniDash Enterprise OS — Reactive Edge Architecture</span>
              <small style={{ marginTop: "6px", color: "var(--primary)", fontWeight: 700 }}>
                {typography.includes("inter") || typography === "sans"
                  ? "Modern high-legibility interface font (Inter)"
                  : typography.includes("roboto")
                  ? "Corporate classic enterprise readability (Roboto)"
                  : typography.includes("playfair")
                  ? "Elegant high-contrast display typography (Playfair Display)"
                  : typography.includes("serif")
                  ? "Distinguished executive editorial aesthetic (Merriweather)"
                  : "Precise monospaced technical telemetry (JetBrains Mono)"}
              </small>
            </div>
          </section>
        )}

        {/* TAB 5: Language */}
        {activeTab === "language" && (
          <section className="studio-tab-section">
            <div className="studio-pane-header">
              <div>
                <h2>{t("language") || "Language Selection"}</h2>
                <p>Vector SVG flag buttons for seamless locale switching with zero OS emoji dependency.</p>
              </div>
            </div>

            <div className="language-grid" style={{ maxWidth: "560px", marginTop: "10px" }}>
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={language === item.code ? "language-item selected" : "language-item"}
                  onClick={() => onLanguageChange(item.code)}
                >
                  <span className={`${item.flagClass} lang-flag-icon`} style={{ borderRadius: "2px" }} />
                  <b>{item.label}</b>
                  {language === item.code && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* TAB 6: Data & Storage */}
        {activeTab === "storage" && (
          <section className="studio-tab-section">
            <div className="studio-pane-header">
              <div>
                <h2>{t("storage") || "Data & Storage"}</h2>
                <p>Zero-cloud on-device IndexedDB engine with snapshot backup and background sync outbox.</p>
              </div>
            </div>

            <div className="storage-stats" style={{ maxWidth: "560px", marginTop: "8px" }}>
              <div>
                <span>{t("records") || "Total Records"}</span>
                <strong>{totalRecords.toLocaleString()}</strong>
              </div>
              <div>
                <span>{t("source") || "Files"}</span>
                <strong>{sourcesCount} {t("common.filesUnit") || "files"}</strong>
              </div>
              <div>
                <span>{t("studio.syncOutbox") || "Sync Outbox"}</span>
                <strong>
                  {pendingSyncCount > 0 ? (
                    <button
                      type="button"
                      className="sync-badge"
                      onClick={onTriggerSync}
                      title="Click to flush sync outbox"
                    >
                      🔄 {pendingSyncCount} {t("common.queued") || "queued"}
                    </button>
                  ) : (
                    t("common.upToDate") || "Up to date"
                  )}
                </strong>
              </div>
            </div>

            <div className="settings-actions" style={{ marginTop: "22px" }}>
              <button type="button" className="secondary-button" onClick={onExportSnapshot}>
                <Icon name="download" size={15} />
                <span>{t("backup") || "Export Backup"}</span>
              </button>
              <button type="button" className="secondary-button" onClick={onRestoreClick}>
                <Icon name="refresh" size={15} />
                <span>{t("restore") || "Restore Snapshot"}</span>
              </button>
              <button type="button" className="danger-button" onClick={onClearDb}>
                <Icon name="close" size={14} />
                <span>{t("clear") || "Clear All Data"}</span>
              </button>
            </div>
          </section>
        )}

        {/* TAB 7: Ingestion & Staging */}
        {activeTab === "ingestion" && (
          <section className="studio-tab-section">
            <div className="studio-pane-header">
              <div>
                <h2>{t("studio.tabs.ingestion") || "Ingestion Studio & Smart Inbox"}</h2>
                <p>
                  {t("studio.ingest.desc") || "Import your JSON datasets, emails, or business spreadsheets directly into offline Dexie IndexedDB."}
                </p>
              </div>
            </div>

            <div style={{ maxWidth: "560px" }}>
              <input
                ref={dataFileInputRef}
                type="file"
                multiple
                accept=".json,.csv,.xlsx,.xls,.pdf,.docx,.txt"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    for (const file of Array.from(files)) {
                      await handleProcessFile(file);
                    }
                    e.target.value = "";
                  }
                }}
              />

              {/* Functional Drag-and-Drop Ingestion Zone */}
              <div
                className={`drop-zone mini-drop ${isDragging ? "dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => dataFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              >
                <Icon name="upload" size={22} />
                <strong>{t("import") || "Import Data File (.json, .csv, .xlsx)"}</strong>
                <small>
                  {isProcessingFile
                    ? "Reading and parsing file contents locally..."
                    : isDragging
                    ? "Drop file to ingest into Dexie now!"
                    : (t("studio.ingest.dragDrop") || "Drag & drop .json, .csv, or spreadsheets here, or click to browse")}
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                <button
                  type="button"
                  className="breadcrumb"
                  onClick={onOpenImport}
                  style={{ fontSize: "11px", margin: 0, padding: 0, gap: "5px", cursor: "pointer" }}
                  title="Open batch modal importer"
                >
                  <Icon name="upload" size={12} />
                  <span>{t("studio.ingest.advancedOpts") || t("common.advancedImport") || "Open batch file modal"}</span>
                </button>
              </div>

              {/* Conector de Extensión Chrome (Phase 32) */}
              <div
                className="chrome-extension-connector-card"
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-card, 12px)",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🔌</span>
                    <strong style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 700 }}>
                      {t("studio.ingest.extConnectorTitle") || "Conector de Extensión Chrome"}
                    </strong>
                  </div>
                  {isExtIdSaved && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--secondary, #798C7A)",
                        background: "color-mix(in srgb, var(--secondary, #798C7A) 15%, transparent)",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        border: "1px solid color-mix(in srgb, var(--secondary, #798C7A) 30%, transparent)",
                      }}
                    >
                      ✓ {t("studio.ingest.linked") || "Vinculado"}
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 12px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.45 }}>
                  {t("studio.ingest.extConnectorDesc") || "Configura el ID de la extensión OmniDash para activar extracciones remotas y sincronizar correos con un clic."}
                </p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    value={extId}
                    onChange={(e) => {
                      setExtId(e.target.value);
                      setIsExtIdSaved(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveExtId();
                      }
                    }}
                    placeholder={t("studio.ingest.extIdPlaceholder") || "Pega el ID de la extensión (ej. abcdefghijklmnop...)"}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-alt, #EFECE4)",
                      color: "var(--ink)",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveExtId}
                    className="primary-button compact-button"
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      background: "var(--primary, #C27358)",
                      color: "#FFFFFF",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 650,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span>{t("studio.ingest.linkBtn") || "Vincular"}</span>
                  </button>
                </div>
                {extSaveFeedback && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "11px",
                      color: isExtIdSaved ? "var(--secondary, #798C7A)" : "var(--muted)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{isExtIdSaved ? "✓" : "ℹ"}</span>
                    <span>{extSaveFeedback}</span>
                  </div>
                )}
              </div>

              {/* Smart Staging Pipeline Action Button */}
              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setIsStagingModalOpen(true);
                    onOpenStaging?.();
                  }}
                  style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}
                >
                  <Icon name="shield" size={15} />
                  <span>{t("staging.title") || "Bandeja Smart Staging"}</span>
                  {pendingStagingCount > 0 ? (
                    <Pill label={`${pendingStagingCount} ${t("status.pending") || "pending"}`} tone="warn" />
                  ) : (
                    <span className="inbox-task-done-badge" style={{ marginLeft: "6px" }}>0 Pending</span>
                  )}
                </button>
              </div>

              {/* Ingestion Status Notification Feedback */}
              {(localImportMessage || importStatus) && (
                <div className="status-message" style={{ marginTop: "14px" }}>
                  <StatusDot status="healthy" />
                  <span>{localImportMessage || importStatus}</span>
                </div>
              )}

              {/* Reactive Total Records Counter Card (Datasets + Emails) */}
              <div
                className="studio-record-counter-card"
                style={{
                  marginTop: "18px",
                  padding: "16px 18px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-card, 12px)",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    ⚡ Dexie IndexedDB Store
                  </span>
                  <span className="status-dot healthy" title="Local IndexedDB Active" />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <strong
                    style={{
                      fontSize: "26px",
                      fontWeight: 850,
                      color: "var(--ink)",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {totalRecords.toLocaleString()}
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                    {t("studio.ingest.recordsSaved") || "Records saved"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--line)",
                    fontSize: "11px",
                    color: "var(--muted)",
                  }}
                >
                  <span>
                    📊 <strong>{recordsCount.toLocaleString()}</strong> {t("common.datasets") || "datasets"}
                  </span>
                  <span>
                    📩 <strong>{emailsCount.toLocaleString()}</strong> {t("common.emails") || "emails"}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Staging Interactive Pipeline Modal */}
            {isStagingModalOpen && (
              <div
                className="modal-backdrop"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsStagingModalOpen(false);
                }}
              >
                <div
                  className="modal staging-modal"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-card, 14px)",
                    padding: "24px",
                    maxWidth: "540px",
                    width: "90%",
                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                    <div>
                      <div className="eyebrow" style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 800 }}>
                        PIPELINE / LOCAL STAGING QUEUE
                      </div>
                      <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                        {t("staging.title") || "Bandeja Smart Staging"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setIsStagingModalOpen(false)}
                      title="Close staging view"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>

                  <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.5, margin: "0 0 16px" }}>
                    {pendingStagingCount > 0
                      ? `${pendingStagingCount} incoming dataset batches are staged and waiting for confidence verification before merging into live telemetry.`
                      : "Staging pipeline is completely clean. When external documents or unverified batches are uploaded, they queue here for automated confidence categorization."}
                  </p>

                  <div style={{ padding: "14px", background: "var(--surface-alt)", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "11px", color: "var(--text-main)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span>Ingestion Gateway Status:</span>
                      <strong style={{ color: "var(--primary)" }}>Active (Zero-Cloud / Local Edge)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span>IndexedDB Active Tables:</span>
                      <span><code>data_entries</code>, <code>emails</code>, <code>action_queue</code></span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Pending Queue Batches:</span>
                      <strong>{pendingStagingCount} items</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setIsStagingModalOpen(false)}
                    >
                      <span>Close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
