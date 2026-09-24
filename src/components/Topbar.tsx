import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { LanguageDropdown } from "./LanguageDropdown";
import { useDashboardData } from "../services/api";
import type { Language } from "../types";

export interface TopbarProps {
  isOnline: boolean;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  onOpenSearch?: () => void;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  pendingStagingCount: number;
  isStagingOpen: boolean;
  onOpenStaging: () => void;
  hasNotifications: boolean;
  onOpenNotifications: () => void;
  isStudioOpen: boolean;
  onToggleStudio: () => void;
  onLogout?: () => void;
  t: (key: string) => string;
  // Optional local fallbacks (for instant optimistic previews before DB commit)
  fallbackBrandName?: string;
  fallbackLogoUrl?: string | null;
  fallbackLogoHeight?: number;
}

export function UserProfileDropdown({
  t,
  onLogout,
}: {
  t: (key: string) => string;
  onLogout?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const userName = t("common.userName") || "Ulises Pérez";
  const userRole = t("common.userRole") || "Quality Control / IT Admin";
  const logoutText = t("common.logout") || "Log out";

  return (
    <div className="user-profile-menu-container" ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="avatar user-avatar-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={`${userName} — ${userRole}`}
      >
        UP
      </button>

      {isOpen && (
        <div className="user-profile-dropdown" role="menu">
          <div className="user-profile-header">
            <div className="user-profile-avatar-large">UP</div>
            <div className="user-profile-details">
              <strong>{userName}</strong>
              <small>{userRole}</small>
              <span className="user-profile-status-badge">
                <span className="status-dot healthy" /> System Verified
              </span>
            </div>
          </div>
          <div className="user-profile-divider" />
          <button
            type="button"
            className="user-profile-item logout-item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              if (onLogout) onLogout();
            }}
          >
            <Icon name="close" size={13} />
            <span>{logoutText}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar({
  isOnline,
  pendingSyncCount,
  onTriggerSync,
  query,
  onQueryChange: _onQueryChange,
  onOpenSearch,
  language,
  onSelectLanguage,
  pendingStagingCount,
  isStagingOpen,
  onOpenStaging,
  hasNotifications,
  onOpenNotifications,
  isStudioOpen,
  onToggleStudio,
  onLogout,
  t,
  fallbackBrandName,
  fallbackLogoUrl,
  fallbackLogoHeight = 32,
}: TopbarProps) {
  const { settings, records } = useDashboardData();

  // Read dynamic branding from IndexedDB settings (reactive via useLiveQuery in useDashboardData)
  const brandName = (settings?.brandName as string) || fallbackBrandName || "OmniDash";
  const brandLogoUrl = (settings?.brandLogoUrl as string) || (settings?.customLogo as string) || fallbackLogoUrl || null;
  const logoHeight = (settings?.logoHeight as number) || fallbackLogoHeight;

  return (
    <header className="topbar">
      {/* Dynamic Left-Aligned Branding */}
      <div className="brand">
        {brandLogoUrl ? (
          <div className="custom-brand-logo">
            <img
              src={brandLogoUrl}
              alt={brandName}
              style={{ height: `${logoHeight}px`, maxHeight: "48px", maxWidth: "190px", objectFit: "contain" }}
            />
            <div className="brand-text">
              <strong>{brandName}</strong>
              <small>Enterprise OS</small>
            </div>
          </div>
        ) : (
          <>
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>
            <div className="brand-text">
              <strong>{brandName}</strong>
              <small>Enterprise OS</small>
            </div>
          </>
        )}
      </div>

      {/* Center Telemetry & Outbox Sync Indicator */}
      <div className="topbar-center">
        <span
          className={`local-status ${isOnline ? "online" : "offline"}`}
          title={isOnline ? "Network connected" : "Working offline - mutations queued locally"}
        >
          <i />
          {isOnline ? t("online") : t("common.offline") || "Offline"}
        </span>
        {pendingSyncCount > 0 && (
          <button
            type="button"
            className="sync-badge"
            onClick={onTriggerSync}
            title="Click to trigger sync to backend"
          >
            🔄 {pendingSyncCount} {t("common.pendingSyncs") || "pending syncs"}
          </button>
        )}
        <span className="topbar-divider" />
        <span className="sync-time">
          {records.length.toLocaleString()} {t("records")} · {t("liveDb")}
        </span>
      </div>

      {/* Topbar Actions */}
      <div className="topbar-actions">
        <button
          type="button"
          className="search-box search-box-trigger"
          onClick={onOpenSearch}
          aria-label={t("common.searchPlaceholder") || "Search workspace (Ctrl+K)"}
          title="Open OmniSearch (Ctrl+K)"
        >
          <Icon name="search" size={15} />
          <span className="search-placeholder-text">
            {query || t("common.searchPlaceholder") || "Search workspace..."}
          </span>
          <kbd className="search-kbd-badge">Ctrl K</kbd>
        </button>

        <LanguageDropdown
          currentLanguage={language}
          onSelectLanguage={onSelectLanguage}
          ariaLabel={t("language")}
        />

        <button
          type="button"
          className={`header-icon ${isStagingOpen ? "active" : ""}`}
          title={`Smart Staging Inbox (${pendingStagingCount} pending)`}
          onClick={onOpenStaging}
          style={{ position: "relative" }}
        >
          <Icon name="shield" size={17} />
          {pendingStagingCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                boxShadow: "0 0 6px #22c55e",
              }}
            />
          )}
        </button>

        <button
          type="button"
          className="header-icon"
          title="Notifications"
          onClick={onOpenNotifications}
        >
          <Icon name="bell" size={17} />
          {hasNotifications && <i className="notify-dot" />}
        </button>

        <button
          type="button"
          className={`header-icon ${isStudioOpen ? "active" : ""}`}
          title={t("studio")}
          onClick={onToggleStudio}
        >
          <Icon name="settings" size={17} />
        </button>

        <UserProfileDropdown t={t} onLogout={onLogout} />
      </div>
    </header>
  );
}
