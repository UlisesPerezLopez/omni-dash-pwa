import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icons";
import { api } from "../services/api";
import { db } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";

export const TileColorContext = createContext<string | undefined>(undefined);
export function useTileColorOverride() {
  return useContext(TileColorContext);
}

export function StatusDot({ status }: { status: "healthy" | "watch" | "critical" }) {
  return <span className={`status-dot ${status}`} />;
}

import type { MenuOption, Column } from "../types";
export type { MenuOption, Column };

/** Header dropdown used to toggle a KPI tile between sub-metric datasets on the fly. */
export function TileMenu({ value, options, onChange }: { value: string; options: MenuOption[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(".tile-menu")) setOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  const active = options.find((option) => option.value === value);
  return (
    <div className="tile-menu">
      <button type="button" className="tile-menu-btn" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        {active?.label || value}
        <Icon name="chevron" size={12} />
      </button>
      {open && (
        <div className="tile-menu-pop" role="listbox">
          {options.map((option) => (
            <button key={option.value} type="button" className={`menu-item ${option.value === value ? "selected" : ""}`} role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false); }}>
              {option.label}
              {option.value === value && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WidgetColorPicker({
  widgetId,
  colorOverride,
}: {
  widgetId: string;
  colorOverride?: string;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleSelect = (color: string) => {
    setOpen(false);
    void api.saveWidgets([{ id: widgetId, colorOverride: color, visible: true, pinned: true }]);
  };

  const swatches = [
    { label: "Primary", color: "var(--primary)" },
    { label: "Secondary", color: "var(--secondary)" },
    { label: "Tertiary", color: "var(--tertiary)" },
    { label: "Accent", color: "var(--accent)" },
    { label: "Coral", color: "#F43F5E" },
  ];

  return (
    <div className="tile-color-picker-wrap" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        className="widget-brush-btn"
        title="Customize widget color"
        aria-label="Customize widget color"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "2px 4px",
          fontSize: "12px",
          lineHeight: 1,
          opacity: colorOverride ? 1 : 0.6,
          transition: "opacity 0.2s, transform 0.15s",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🖌️
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="widget-color-popover"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 100,
            marginTop: "6px",
            padding: "6px 8px",
            borderRadius: "8px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--line-strong)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            whiteSpace: "nowrap",
          }}
        >
          {swatches.map((s) => (
            <button
              key={s.label}
              type="button"
              title={s.label}
              onClick={() => handleSelect(s.color)}
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: s.color,
                border: colorOverride === s.color ? "2px solid var(--text-main)" : "1px solid rgba(0, 0, 0, 0.15)",
                cursor: "pointer",
                padding: 0,
                transform: colorOverride === s.color ? "scale(1.15)" : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            />
          ))}
          <button
            type="button"
            title="Reset to default theme"
            aria-label="Reset to default theme"
            onClick={() => handleSelect("")}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              background: "none",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              padding: 0,
            }}
          >
            ↺
          </button>
        </div>
      )}
    </div>
  );
}

export function Tile({ id, eyebrow, title, children, className = "", menu, onExpand, colorOverride: propColorOverride }: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
  menu?: ReactNode;
  onExpand?: () => void;
  colorOverride?: string;
}) {
  const widget = useLiveQuery(() => db.custom_widgets.get(id), [id]);
  const activeColor = propColorOverride || (widget?.colorOverride as string | undefined);

  return (
    <TileColorContext.Provider value={activeColor}>
      <section className={`tile ${className}`} data-tile={id}>
        <div className="tile-heading">
          <div className="tile-heading-text">
            <div className="eyebrow">{eyebrow}</div>
            <h2>{title}</h2>
          </div>
          <div className="tile-controls">
            {menu}
            <WidgetColorPicker widgetId={id} colorOverride={activeColor} />
            {onExpand && <button type="button" className="icon-button" onClick={onExpand} title="Expand" aria-label="Expand tile"><Icon name="expand" size={14} /></button>}
          </div>
        </div>
        {children}
      </section>
    </TileColorContext.Provider>
  );
}

export function ChartTile(props: Parameters<typeof Tile>[0]) {
  return <Tile {...props} className={`chart-tile ${props.className || ""}`} />;
}

export function StatTile({ id, label, value, delta, tone = "positive", footer, icon, onExpand, colorOverride: propColorOverride }: {
  id?: string;
  label: string;
  value: string;
  delta?: string;
  tone?: "positive" | "warning" | "neutral";
  footer?: ReactNode;
  icon?: IconName;
  onExpand?: () => void;
  colorOverride?: string;
}) {
  const widgetId = id || `stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const widget = useLiveQuery(() => db.custom_widgets.get(widgetId), [widgetId]);
  const activeColor = propColorOverride || (widget?.colorOverride as string | undefined);

  return (
    <TileColorContext.Provider value={activeColor}>
      <section className="stat-tile" data-tile={widgetId}>
        <div className="stat-top">
          <span className="eyebrow">{label.toUpperCase()}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <WidgetColorPicker widgetId={widgetId} colorOverride={activeColor} />
            {onExpand
              ? <button type="button" className="circle-action" onClick={onExpand} aria-label="Expand stat"><Icon name="expand" size={14} /></button>
              : icon && <span className="stat-icon"><Icon name={icon} size={15} /></span>}
          </div>
        </div>
        <div className="stat-value" style={activeColor ? { color: activeColor } : undefined}>{value}</div>
        <div className="stat-bottom">
          {delta && <span className={`delta ${tone === "warning" ? "neutral" : tone === "neutral" ? "" : "positive"}`}><Icon name="trend" size={13} />{delta}</span>}
          {footer}
        </div>
      </section>
    </TileColorContext.Provider>
  );
}



export function DataTable<T>({ columns, rows, idFor, emptyMessage }: { columns: Column<T>[]; rows: T[]; idFor: (row: T, index: number) => string; emptyMessage?: string }) {
  return (
    <div className="data-table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} style={column.align === "right" ? { textAlign: "right" } : undefined}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length} className="table-empty">{emptyMessage || "No records match this filter yet — import data or load the demo."}</td></tr>}
          {rows.map((row, index) => (
            <tr key={idFor(row, index)}>
              {columns.map((column) => <td key={column.key} style={column.align === "right" ? { textAlign: "right" } : undefined}>{column.render(row, index)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pill({ label, tone }: { label: string; tone: "good" | "warn" | "bad" | "info" }) {
  return <span className={`table-status tone-${tone}`}>{label}</span>;
}
