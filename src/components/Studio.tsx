import { useState, useRef, type ChangeEvent } from "react";
import { Icon, type IconName } from "./Icons";
import { LANGUAGES } from "./LanguageDropdown";
import { Pill, StatusDot } from "./Tiles";
import type { Language, ShadowIntensity } from "../types";

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

  // General
  onResetDefaults: () => void;
  t: (key: string) => string;
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
  onResetDefaults,
  t,
}: StudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("brand");
  const logoInputRef = useRef<HTMLInputElement>(null);

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
                    className={`radius-chip ${paletteKey === item.key ? "active" : ""}`}
                    onClick={() => onSelectPalettePreset(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="secondary-button compact-button"
                  style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={() => onSelectPalettePreset("warm")}
                  title="Reset to default Warm Corporate hex codes"
                >
                  <Icon name="refresh" size={13} />
                  <span>{t("common.reset") || "Reset to Warm Corporate"}</span>
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

            <div className="typography-preview" style={{ fontFamily: selectedFont, maxWidth: "440px", marginTop: "14px" }}>
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
                <span>{t("records") || "Records"}</span>
                <strong>{recordsCount.toLocaleString()}</strong>
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
                <p>Parse local CSV, XLSX, PDF, and DOCX files into IndexedDB with automated categorization.</p>
              </div>
            </div>

            <div style={{ maxWidth: "560px" }}>
              <button
                type="button"
                className="drop-zone mini-drop"
                onClick={onOpenImport}
              >
                <Icon name="plus" size={18} />
                <span>{t("import") || "Import Data File"}</span>
                <small>{t("supported") || "Excel, CSV, PDF, Word documents"}</small>
              </button>

              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onOpenStaging}
                  style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}
                >
                  <Icon name="shield" size={15} />
                  <span>{t("staging.title") || "Smart Staging Inbox"}</span>
                  {pendingStagingCount > 0 && (
                    <Pill label={`${pendingStagingCount} ${t("status.pending") || "pending"}`} tone="warn" />
                  )}
                </button>
              </div>

              {importStatus && (
                <div className="status-message" style={{ marginTop: "14px" }}>
                  <StatusDot status="healthy" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
