import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Icon, type IconName } from "./Icons";
import { api } from "../services/api";
import type { DataEntry, ActionQueueRecord, Screen, ActionItem } from "../types";

export interface SearchActionItem {
  id: string;
  title: string;
  subtitle: string;
  priority: "critical" | "high" | "medium";
  kind: "email" | "invoice" | "stock";
  entryId?: string;
  entryHint?: Record<string, unknown>;
  due?: string;
  raw?: ActionQueueRecord;
}

export interface SearchRecordItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  meta: string;
  raw: DataEntry;
}

export interface SearchNavigationItem {
  id: Screen | "staging";
  label: string;
  tagline: string;
  emoji: string;
  icon: IconName;
}

export interface GroupedSearchResults {
  navigation: SearchNavigationItem[];
  actions: SearchActionItem[];
  records: SearchRecordItem[];
  total: number;
}

/**
 * Custom search hook querying IndexedDB in real time across entries,
 * action queue, and workspace navigation.
 */
export function useGlobalSearch(query: string) {
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [queue, setQueue] = useState<ActionQueueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedEntries, fetchedQueue, _pendingSync] = await Promise.all([
        api.getEntries(),
        api.getQueue(),
        api.getPendingSyncQueue(),
      ]);
      setEntries(fetchedEntries || []);
      setQueue(fetchedQueue || []);
    } catch (err) {
      console.warn("[useGlobalSearch] Failed to load search index:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const results: GroupedSearchResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Static Navigation items
    const navItems: SearchNavigationItem[] = [
      { id: "all", label: "All Overview", tagline: "Global telemetry & priority queue", emoji: "⚡", icon: "zap" },
      { id: "sales", label: "Sales & Commercial", tagline: "Orders, pipelines, deals", emoji: "📈", icon: "trend" },
      { id: "purchasing", label: "Purchasing & Spend", tagline: "Vendors, procurement, contracts", emoji: "💼", icon: "cart" },
      { id: "finance", label: "Finance & Cashflow", tagline: "Invoices, revenue, receivables", emoji: "💰", icon: "bank" },
      { id: "ops", label: "Operations & Logistics", tagline: "Inventory, fulfillment, delays", emoji: "📦", icon: "ops" },
      { id: "hr", label: "Human Resources", tagline: "Headcount, reviews, workforce", emoji: "👥", icon: "users" },
      { id: "quality", label: "Quality Management", tagline: "SLA compliance, escalations", emoji: "🛡️", icon: "shield" },
      { id: "studio", label: "Studio & Settings", tagline: "Branding, themes, colors, storage", emoji: "🎨", icon: "palette" },
      { id: "staging", label: "Smart Staging Inbox", tagline: "Ingested documents & AI validation", emoji: "📥", icon: "upload" },
    ];

    if (!q) {
      const activeActions: SearchActionItem[] = queue
        .filter((item) => !item.resolved)
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          priority: item.priority || "medium",
          kind: item.kind,
          entryId: item.entryId,
          entryHint: item.entryHint,
          due: item.due,
          raw: item,
        }));

      return {
        navigation: navItems.slice(0, 5),
        actions: activeActions,
        records: [],
        total: navItems.slice(0, 5).length + activeActions.length,
      };
    }

    // 1. Navigation items matching query
    const matchedNav = navItems.filter(
      (nav) =>
        nav.label.toLowerCase().includes(q) ||
        nav.id.toLowerCase().includes(q) ||
        nav.tagline.toLowerCase().includes(q)
    );

    // 2. Action Queue items matching query (title, subtitle, body)
    const matchedActions: SearchActionItem[] = queue
      .filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const subtitleMatch = item.subtitle?.toLowerCase().includes(q);
        const bodyMatch = item.body?.toLowerCase().includes(q);
        return titleMatch || subtitleMatch || bodyMatch;
      })
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        priority: item.priority || "medium",
        kind: item.kind,
        entryId: item.entryId,
        entryHint: item.entryHint,
        due: item.due,
        raw: item,
      }));

    // 3. Data Entries matching query (sourceName, customer, vendor, sku, invoiceId, orderId, role)
    const matchedRecords: SearchRecordItem[] = entries
      .filter((entry) => {
        const sourceMatch = entry.sourceName?.toLowerCase().includes(q);
        const customerMatch = entry.customer?.toLowerCase().includes(q);
        const vendorMatch = entry.vendor?.toLowerCase().includes(q);
        const skuMatch = entry.sku?.toLowerCase().includes(q);
        const invoiceMatch = entry.invoiceId ? String(entry.invoiceId).toLowerCase().includes(q) : false;
        const orderMatch = entry.orderId ? String(entry.orderId).toLowerCase().includes(q) : false;
        const employeeMatch = entry.role?.toLowerCase().includes(q) || (entry.employeeId ? String(entry.employeeId).toLowerCase().includes(q) : false);
        const siteMatch = entry.site?.toLowerCase().includes(q);
        const statusMatch = entry.status?.toLowerCase().includes(q);
        return (
          sourceMatch ||
          customerMatch ||
          vendorMatch ||
          skuMatch ||
          invoiceMatch ||
          orderMatch ||
          employeeMatch ||
          siteMatch ||
          statusMatch
        );
      })
      .slice(0, 16)
      .map((entry) => {
        let title = entry.customer || entry.vendor || entry.sku || entry.sourceName || entry.id;
        let subtitle = "";
        let meta = "";

        if (entry.category === "sales") {
          title = entry.customer || `Order #${entry.orderId || entry.id}`;
          subtitle = `${entry.dealType || "Order"} · ${entry.site || entry.region || "Direct"}`;
          meta = entry.revenue ? `$${Number(entry.revenue).toLocaleString()}` : "";
        } else if (entry.category === "expenses") {
          title = entry.vendor || `Invoice #${entry.invoiceId || entry.id}`;
          subtitle = `Invoice #${entry.invoiceId || entry.id} · ${entry.status || "Pending"}`;
          meta = entry.amount ? `$${Number(entry.amount).toLocaleString()}` : "";
        } else if (entry.category === "inventory") {
          title = entry.sku || "Inventory SKU";
          subtitle = `${entry.site || "DC"} · ${entry.shipmentStatus || "In Stock"}`;
          meta = entry.units ? `${entry.units} units` : "";
        } else if (entry.category === "employees") {
          title = entry.role || entry.employeeId || "Team Member";
          subtitle = `${entry.department || "Operations"} · ID: ${entry.employeeId || "—"}`;
          meta = entry.tenureMonths ? `${(entry.tenureMonths / 12).toFixed(1)}y tenure` : "";
        } else if (entry.category === "tasks") {
          title = entry.taskId || "Task";
          subtitle = `${entry.queue || "Support"} · Priority: ${entry.priority || "Standard"}`;
          meta = entry.sla ? `${Math.round(entry.sla * 100)}% SLA` : "";
        } else {
          subtitle = entry.sourceName || entry.category;
          meta = entry.date || "";
        }

        return {
          id: entry.id,
          title: String(title),
          subtitle,
          category: entry.category,
          meta,
          raw: entry,
        };
      });

    return {
      navigation: matchedNav,
      actions: matchedActions,
      records: matchedRecords,
      total: matchedNav.length + matchedActions.length + matchedRecords.length,
    };
  }, [entries, queue, query]);

  return { results, isLoading, reload: loadData };
}

export interface OmniSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onOpenStaging?: () => void;
  onSelectAction?: (item: ActionItem) => void;
  onSelectRecord?: (record: DataEntry) => void;
  t: (key: string) => string;
}

export function OmniSearch({
  isOpen,
  onClose,
  onNavigate,
  onOpenStaging,
  onSelectAction,
  onSelectRecord,
  t,
}: OmniSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading, reload } = useGlobalSearch(query);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Reload search index whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setHighlightedIndex(0);
      void reload();
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reload]);

  // Flatten results for unified index-based keyboard navigation
  const flatItems = useMemo(() => {
    const list: Array<
      | { type: "nav"; item: SearchNavigationItem }
      | { type: "action"; item: SearchActionItem }
      | { type: "record"; item: SearchRecordItem }
    > = [];
    results.navigation.forEach((item) => list.push({ type: "nav", item }));
    results.actions.forEach((item) => list.push({ type: "action", item }));
    results.records.forEach((item) => list.push({ type: "record", item }));
    return list;
  }, [results]);

  // Keep highlighted index in bounds
  useEffect(() => {
    if (highlightedIndex >= flatItems.length) {
      setHighlightedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, highlightedIndex]);

  const handleSelectIndex = useCallback(
    (index: number) => {
      const selected = flatItems[index];
      if (!selected) return;

      onClose();

      if (selected.type === "nav") {
        if (selected.item.id === "staging") {
          if (onOpenStaging) onOpenStaging();
        } else {
          onNavigate(selected.item.id);
        }
      } else if (selected.type === "action") {
        if (onSelectAction) {
          const raw = selected.item.raw;
          const actionItem: ActionItem = {
            id: selected.item.id,
            kind: selected.item.kind,
            priority: selected.item.priority,
            title: selected.item.title,
            subtitle: selected.item.subtitle,
            due: selected.item.due || "Due today",
            body: raw?.body || "",
            meta: raw?.meta || [],
            entryId: selected.item.entryId,
            entryHint: selected.item.entryHint,
            owner: raw?.owner || "Operations",
            created: raw?.created || new Date().toISOString(),
          };
          onSelectAction(actionItem);
        }
      } else if (selected.type === "record") {
        if (onSelectRecord) {
          onSelectRecord(selected.item.raw);
        }
      }
    },
    [flatItems, onClose, onNavigate, onOpenStaging, onSelectAction, onSelectRecord]
  );

  // Global keydown listeners for Escape, Arrow keys, Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (flatItems.length > 0 ? (prev + 1) % flatItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (flatItems.length > 0 ? (prev - 1 + flatItems.length) % flatItems.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelectIndex(highlightedIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems.length, highlightedIndex, handleSelectIndex, onClose]);

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div
      className="omnisearch-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="OmniSearch Command Palette"
    >
      <div className="omnisearch-dialog">
        {/* Search Input Bar */}
        <div className="omnisearch-input-wrap">
          <Icon name="search" size={20} className="omnisearch-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="omnisearch-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            placeholder={t("common.searchPlaceholder") || "Search records, actions, navigation..."}
            aria-autocomplete="list"
          />
          {query ? (
            <button
              type="button"
              className="omnisearch-clear-btn"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          ) : (
            <kbd className="omnisearch-esc-kbd">ESC</kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="omnisearch-body">
          {flatItems.length === 0 && !isLoading && (
            <div className="omnisearch-empty">
              <Icon name="search" size={32} />
              <strong>{t("common.noResults") || "No results found"}</strong>
              <p>No matching records, actions, or destinations for "{query}".</p>
            </div>
          )}

          {/* Section 1: Navigation */}
          {results.navigation.length > 0 && (
            <div className="omnisearch-section">
              <div className="omnisearch-section-title">
                <span>{t("common.searchNavigation") || "Navigation"}</span>
                <span className="omnisearch-count-badge">{results.navigation.length}</span>
              </div>
              <div className="omnisearch-list" role="listbox">
                {results.navigation.map((nav) => {
                  const itemIndex = currentIndex++;
                  const isSelected = highlightedIndex === itemIndex;
                  return (
                    <button
                      key={nav.id}
                      type="button"
                      className={`omnisearch-row ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectIndex(itemIndex)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="omnisearch-item-emoji">{nav.emoji}</span>
                      <div className="omnisearch-item-content">
                        <strong>{nav.label}</strong>
                        <small>{nav.tagline}</small>
                      </div>
                      <span className="omnisearch-enter-pill">Jump ↵</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Actions & Tasks */}
          {results.actions.length > 0 && (
            <div className="omnisearch-section">
              <div className="omnisearch-section-title">
                <span>{t("common.searchActions") || "Actions & Tasks"}</span>
                <span className="omnisearch-count-badge">{results.actions.length}</span>
              </div>
              <div className="omnisearch-list" role="listbox">
                {results.actions.map((act) => {
                  const itemIndex = currentIndex++;
                  const isSelected = highlightedIndex === itemIndex;
                  const priorityClass = act.priority === "critical" ? "tone-bad" : act.priority === "high" ? "tone-warn" : "tone-info";
                  return (
                    <button
                      key={act.id}
                      type="button"
                      className={`omnisearch-row ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectIndex(itemIndex)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className={`omnisearch-priority-dot ${priorityClass}`} />
                      <div className="omnisearch-item-content">
                        <strong>{act.title}</strong>
                        <small>{act.subtitle}</small>
                      </div>
                      <span className={`omnisearch-badge ${priorityClass}`}>
                        {act.priority.toUpperCase()}
                      </span>
                      <span className="omnisearch-enter-pill">Open ↵</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Records */}
          {results.records.length > 0 && (
            <div className="omnisearch-section">
              <div className="omnisearch-section-title">
                <span>{t("common.searchRecords") || "Data Records"}</span>
                <span className="omnisearch-count-badge">{results.records.length}</span>
              </div>
              <div className="omnisearch-list" role="listbox">
                {results.records.map((rec) => {
                  const itemIndex = currentIndex++;
                  const isSelected = highlightedIndex === itemIndex;
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      className={`omnisearch-row ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectIndex(itemIndex)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="omnisearch-record-icon">
                        <Icon name="file" size={14} />
                      </span>
                      <div className="omnisearch-item-content">
                        <strong>{rec.title}</strong>
                        <small>{rec.subtitle}</small>
                      </div>
                      {rec.meta && <span className="omnisearch-record-meta">{rec.meta}</span>}
                      <span className="omnisearch-category-pill">{rec.category}</span>
                      <span className="omnisearch-enter-pill">View ↵</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="omnisearch-footer">
          <div className="omnisearch-footer-hints">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> to navigate
            </span>
            <span>
              <kbd>↵</kbd> to select
            </span>
            <span>
              <kbd>esc</kbd> to close
            </span>
          </div>
          <div className="omnisearch-footer-brand">
            <span>OmniSearch Engine</span> · IndexedDB Live
          </div>
        </div>
      </div>
    </div>
  );
}
