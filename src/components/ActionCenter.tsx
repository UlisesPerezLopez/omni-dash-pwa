import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icons";
import { countWhere, num } from "../lib/departments";
import type { ActionKind, ActionPriority, ActionItem, DataEntry } from "../types";
export type { ActionKind, ActionPriority, ActionItem };


const kindIcons: Record<ActionKind, IconName> = { email: "mail", invoice: "file", stock: "truck" };
const priorityWeight: Record<ActionPriority, number> = { critical: 3, high: 2, medium: 1 };
const owners = ["M. Alvarez", "S. Chen", "J. Okafor", "A. Rossi", "L. Weber"];
const money = (value: number) => `$${value.toLocaleString()}`;

/** Derive the urgent operational queue ("Wichtig") from the live IndexedDB record state. */
export function buildActionItems(records: DataEntry[]): ActionItem[] {
  const items: ActionItem[] = [];
  const push = (item: ActionItem) => items.push(item);
  const createdAgo = (entry: DataEntry) => {
    const stamp = Date.parse(String(entry.ingestedAt || entry.date || ""));
    if (Number.isNaN(stamp)) return "Recently";
    const hours = Math.max(1, Math.round((Date.now() - stamp) / 3600000));
    return hours >= 24 ? `${Math.round(hours / 24)}d ago` : `${hours}h ago`;
  };

  records.filter((entry) => entry.category === "sales" && entry.status === "At risk").forEach((entry, index) => {
    push({
      id: `mail_${entry.id}`,
      kind: "email",
      priority: num(entry.revenue) > 5000 ? "critical" : "high",
      title: `Reply needed — ${String(entry.customer)}`,
      subtitle: `${String(entry.orderId)} · ${String(entry.region)}`,
      due: "Escalated today",
      body: `Client escalated the ${String(entry.orderId)} rollout and flagged ${String(entry.site)}. They need a confirmed timeline and the revised shipment window before the next milestone review.`,
      meta: [["Customer", String(entry.customer)], ["Order", String(entry.orderId)], ["Value", money(num(entry.revenue))], ["Site", String(entry.site)]],
      entryId: entry.id,
      entryHint: { status: "On track" },
      owner: owners[index % owners.length],
      created: createdAgo(entry),
    });
  });

  records.filter((entry) => entry.category === "expenses" && entry.approved === false).forEach((entry, index) => {
    push({
      id: `inv_${entry.id}`,
      kind: "invoice",
      priority: num(entry.amount) > 5000 ? "critical" : "high",
      title: `Overdue invoice ${String(entry.invoiceId)}`,
      subtitle: `${String(entry.vendor)} · awaiting approval`,
      due: "Overdue 2d",
      body: `Invoice ${String(entry.invoiceId)} from ${String(entry.vendor)} is past its approval window. Releasing it avoids a carrier hold on the next inbound wave for ${String(entry.site)}.`,
      meta: [["Invoice", String(entry.invoiceId)], ["Vendor", String(entry.vendor)], ["Amount", money(num(entry.amount))], ["Region", String(entry.region)]],
      entryId: entry.id,
      entryHint: { approved: true },
      owner: owners[(index + 2) % owners.length],
      created: createdAgo(entry),
    });
  });

  records.filter((entry) => entry.category === "inventory" && entry.shipmentStatus === "Delayed").forEach((entry, index) => {
    push({
      id: `stock_${entry.id}`,
      kind: "stock",
      priority: num(entry.units) < 200 ? "critical" : "high",
      title: `Delivery delay — ${String(entry.sku)}`,
      subtitle: `${String(entry.site)} · ${num(entry.units).toLocaleString()} units`,
      due: num(entry.units) < 200 ? "Stockout risk" : "Late 1d",
      body: `Shipment for ${String(entry.sku)} at ${String(entry.site)} missed its dock appointment. Current fill rate leaves ${num(entry.units).toLocaleString()} units exposed to stockout during the evening wave.`,
      meta: [["SKU", String(entry.sku)], ["Units", num(entry.units).toLocaleString()], ["Fill rate", `${Math.round(num(entry.fillRate) * 100)}%`], ["Site", String(entry.site)]],
      entryId: entry.id,
      entryHint: { shipmentStatus: "In transit" },
      owner: owners[(index + 4) % owners.length],
      created: createdAgo(entry),
    });
  });

  records.filter((entry) => entry.category === "tasks" && entry.priority === "High" && entry.resolved === false).forEach((entry, index) => {
    push({
      id: `task_${entry.id}`,
      kind: "invoice",
      priority: "high",
      title: `Approval request ${String(entry.taskId)}`,
      subtitle: `${String(entry.queue)} queue · SLA review`,
      due: "Due today",
      body: `${String(entry.taskId)} in the ${String(entry.queue)} queue is blocking release. Approving the exception keeps the service level above target for ${String(entry.region)}.`,
      meta: [["Ticket", String(entry.taskId)], ["Queue", String(entry.queue)], ["SLA", `${Math.round(num(entry.sla) * 100)}%`], ["Region", String(entry.region)]],
      entryId: entry.id,
      entryHint: { resolved: true },
      owner: owners[(index + 1) % owners.length],
      created: createdAgo(entry),
    });
  });

  return items.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]).slice(0, 8);
}

export function ActionRail({ items, t, onSelect }: { items: ActionItem[]; t: (key: string) => string; onSelect: (item: ActionItem) => void }) {
  const criticalCount = countWhere(items, (item) => item.priority === "critical");
  return (
    <aside className="rail-card" data-tour="action-center">
      <div className="rail-head">
        <div>
          <div className="eyebrow">{t("urgentQueue").toUpperCase()}</div>
          <h2>{t("actionCenter")}</h2>
        </div>
        <span className={`rail-count ${criticalCount ? "hot" : ""}`}>{items.length}</span>
      </div>
      <div className="rail-sub">{t("actionSub")} · {t("liveDb")}</div>
      <div className="rail-list">
        {items.length === 0 && (
          <div className="rail-empty">
            <span className="rail-empty-icon"><Icon name="check" size={18} /></span>
            <strong>{t("healthy")}</strong>
            <p>{t("emptyQueue")}</p>
          </div>
        )}
        {items.map((item) => (
          <button key={item.id} type="button" className={`action-item prio-${item.priority}`} onClick={() => onSelect(item)}>
            <span className={`action-icon kind-${item.kind}`}><Icon name={kindIcons[item.kind]} size={15} /></span>
            <span className="action-body">
              <span className="action-title">{item.title}</span>
              <span className="action-sub">{item.subtitle}</span>
              <span className="action-meta"><span className={`prio-badge prio-${item.priority}`}>{t(item.priority)}</span>{item.due}</span>
            </span>
            <Icon name="chevron" size={13} />
          </button>
        ))}
      </div>
    </aside>
  );
}

export function ActionDrawer({ item, t, onClose, onResolve, onSnooze, onReassign }: {
  item: ActionItem;
  t: (key: string) => string;
  onClose: () => void;
  onResolve: (item: ActionItem) => void;
  onSnooze: (item: ActionItem) => void;
  onReassign: (item: ActionItem, owner: string) => void;
}) {
  const [ownerIndex, setOwnerIndex] = useState(0);
  useEffect(() => { setOwnerIndex(Math.max(0, owners.indexOf(item.owner))); }, [item.id, item.owner]);
  const currentOwner = owners[ownerIndex % owners.length] || item.owner;
  const kindLabel = item.kind === "email" ? t("flaggedEmail") : item.kind === "invoice" ? t("invoiceApproval") : t("stockAlert");

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={item.title}>
        <div className="drawer-head">
          <span className={`action-icon large kind-${item.kind}`}><Icon name={kindIcons[item.kind]} size={19} /></span>
          <div className="drawer-head-text">
            <div className="drawer-kicker">{kindLabel} · <span className={`prio-text prio-${item.priority}`}>{t(item.priority)}</span></div>
            <h3>{item.title}</h3>
            <p>{item.subtitle}</p>
          </div>
          <button type="button" className="icon-button large" onClick={onClose} aria-label={t("close")}><Icon name="close" size={18} /></button>
        </div>
        <div className="drawer-body">
          <div className="drawer-flags">
            <span><Icon name="alert" size={13} />{item.due}</span>
            <span><Icon name="bell" size={13} />{t("responseNeeded")}</span>
            <span><Icon name="database" size={13} />{item.created}</span>
          </div>
          <div className="drawer-section">
            <div className="eyebrow">{t("details").toUpperCase()}</div>
            <p className="drawer-copy">{item.body}</p>
          </div>
          <div className="field-grid">
            {item.meta.map(([label, value]) => {
              const normKey = label.toLowerCase().replace(/[\s_\-]+/g, "");
              const translatedLabel = t(`drawer.${normKey}`) || t(normKey) || t(label) || label;
              return (
                <div className="field" key={label}><span>{translatedLabel}</span><strong>{value}</strong></div>
              );
            })}
          </div>
          <div className="drawer-section source-section">
            <div className="eyebrow">{t("sourceRecord").toUpperCase()}</div>
            <div className="source-row">
              <span className="mono-key">{t("recordId")}</span>
              <span className="mono-value">{item.entryId || "synthetic-preview"}</span>
            </div>
            <div className="source-row">
              <span className="mono-key">{t("assignedTo")}</span>
              <span className="mono-value"><span className="owner-avatar">{currentOwner.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>{currentOwner}</span>
            </div>
          </div>
        </div>
        <div className="drawer-actions">
          <button type="button" className="primary-button grow" onClick={() => onResolve(item)}><Icon name="check" size={15} />{t("resolveNow")}</button>
          <button type="button" className="secondary-button" onClick={() => onSnooze(item)}><Icon name="bell" size={14} />{t("snooze")}</button>
          <button type="button" className="secondary-button" onClick={() => { const next = (ownerIndex + 1) % owners.length; setOwnerIndex(next); onReassign(item, owners[next]); }}><Icon name="users" size={14} />{t("reassign")}</button>
        </div>
      </div>
    </div>
  );
}
