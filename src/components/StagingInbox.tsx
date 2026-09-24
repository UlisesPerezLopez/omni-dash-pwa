import { useState } from "react";
import { Icon } from "./Icons";
import type { StagingEntry, DataCategory } from "../types";

export interface StagingInboxProps {
  isOpen: boolean;
  onClose: () => void;
  stagingItems: StagingEntry[];
  onApprove: (id: string, overrideCategory?: DataCategory) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  t?: (key: string, defaultText?: string) => string;
}

const defaultCategoryLabels: Record<DataCategory, string> = {
  sales: "Sales & Revenue",
  expenses: "Purchasing & Spend",
  contracts: "Contracts",
  inventory: "Inventory & Logistics",
  tasks: "Operations & Tasks",
  employees: "People & HR",
};

export function StagingInbox({
  isOpen,
  onClose,
  stagingItems,
  onApprove,
  onReject,
  t,
}: StagingInboxProps) {
  const [selectedCategories, setSelectedCategories] = useState<Record<string, DataCategory>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const translate = (key: string, fallback: string): string => {
    if (!t) return fallback;
    const res = t(key, fallback);
    return res && res !== key ? res : fallback;
  };

  const getCategoryLabel = (cat: DataCategory): string => {
    return translate(`nav.${cat}`, translate(cat, defaultCategoryLabels[cat] || cat));
  };

  const pendingItems = stagingItems.filter((item) => item.status === "pending");

  const handleApprove = async (item: StagingEntry) => {
    setProcessingId(item.id);
    try {
      const category = selectedCategories[item.id] || item.suggestedCategory || "sales";
      await onApprove(item.id, category);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await onReject(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCategoryChange = (id: string, category: DataCategory) => {
    setSelectedCategories((prev) => ({ ...prev, [id]: category }));
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="modal staging-modal p-6 max-w-2xl w-full" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header pb-4 border-b border-[var(--line)]">
          <div>
            <div className="eyebrow flex items-center gap-2">
              <span>{translate("staging.pipeline", "SMART STAGING PIPELINE")}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--surface-alt)] border border-[var(--line)]">
                {pendingItems.length} {translate("status.pending", "PENDING").toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1 text-[var(--ink)]">
              {translate("staging.title", "Staging Inbox & Confidence Engine")}
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {translate("staging.subtitle", "Validate and approve ingested files before merging into active executive metrics.")}
            </p>
          </div>
          <button
            type="button"
            className="icon-button large"
            onClick={onClose}
            aria-label={translate("actions.close", "Close")}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {pendingItems.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400">
                <Icon name="check" size={24} />
              </div>
              <h3 className="font-semibold text-sm text-[var(--ink)]">
                {translate("staging.empty", "Staging Inbox Clean")}
              </h3>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
                {translate("staging.cleanDesc", "No files are waiting for verification. When new data is ingested, it will appear here for validation.")}
              </p>
            </div>
          ) : (
            pendingItems.map((item) => {
              const isHighConfidence = item.confidenceScore >= 85;
              const currentCategory =
                selectedCategories[item.id] || item.suggestedCategory || "sales";
              const recordCount = Array.isArray(item.rawContent)
                ? item.rawContent.length
                : 1;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] space-y-3 transition-all hover:border-[var(--line-strong)]"
                >
                  {/* Item Topbar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--line)]">
                        <Icon name="file" size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
                          <span>{item.originalFileName}</span>
                          <span className="text-[10px] text-[var(--muted)] font-normal">
                            ({recordCount} {recordCount === 1 ? translate("record", "record") : translate("records", "records")})
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {translate("lastIngest", "Ingested")} {new Date(item.ingestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    {/* Confidence Score Pill */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--ink)]">
                        {item.confidenceScore}%
                      </span>
                    </div>
                  </div>

                  {/* Confidence Badge & Category Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]/50">
                    {isHighConfidence ? (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="status-dot healthy" />
                        <span>{translate("staging.highConfidence", "High Confidence - Ready to Approve")}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <span className="status-dot watch" />
                        <span>{translate("staging.reviewRequired", "Manual Review Required")}</span>
                      </div>
                    )}

                    {/* Category Selection Dropdown */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                        {translate("staging.targetCategory", "Target Module:")}
                      </span>
                      <select
                        value={currentCategory}
                        onChange={(e) =>
                          handleCategoryChange(item.id, e.target.value as DataCategory)
                        }
                        className="bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] text-xs rounded-lg px-2.5 py-1 outline-none font-medium focus:border-[var(--accent)]"
                      >
                        {(Object.keys(defaultCategoryLabels) as DataCategory[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      className="secondary-button text-xs py-1.5 px-3"
                      disabled={processingId === item.id}
                      onClick={() => handleReject(item.id)}
                    >
                      <Icon name="close" size={13} />
                      <span>{translate("staging.reject", "Reject")}</span>
                    </button>
                    <button
                      type="button"
                      className="primary-button text-xs py-1.5 px-3.5"
                      disabled={processingId === item.id}
                      onClick={() => handleApprove(item)}
                    >
                      <Icon name="check" size={14} />
                      <span>{translate("staging.approve", "Approve & Merge")}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-divider mt-2 mb-4" />
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>{translate("staging.stagedNotice", "Protected by On-Device Confidence Engine")}</span>
          <button
            type="button"
            className="secondary-button text-xs py-1 px-3"
            onClick={onClose}
          >
            {translate("actions.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
