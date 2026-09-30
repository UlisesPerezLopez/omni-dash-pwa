import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { LanguageDropdown } from "./LanguageDropdown";
import { GlobalCopilot } from "./GlobalCopilot";
import { LoginPopover } from "./LoginModal";
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
  t: (key: string, defaultText?: string) => string;
  // Optional local fallbacks (for instant optimistic previews before DB commit)
  fallbackBrandName?: string;
  fallbackLogoUrl?: string | null;
  fallbackLogoHeight?: number;
  onOpenCopilot?: () => void;
  isCopilotOpen?: boolean;
  onCloseCopilot?: () => void;
}

export interface UserProfile {
  name: string;
  title: string;
  initials: string;
}

function UserIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "UP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserProfileDropdown({
  t,
  onLogout,
}: {
  t: (key: string, defaultText?: string) => string;
  onLogout?: () => void;
}) {
  const [localUser, setLocalUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem("omnidash_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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

  const handleSaveLogin = (name: string, title: string) => {
    const defaultTitle = t("common.userRole") || "Quality Control / IT Admin";
    const initials = getInitialsFromName(name);

    const newUser: UserProfile = {
      name: name.trim(),
      title: (title || defaultTitle).trim(),
      initials,
    };

    try {
      localStorage.setItem("omnidash_user", JSON.stringify(newUser));
    } catch (err) {
      console.error("Failed to save user to localStorage", err);
    }
    setLocalUser(newUser);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("omnidash_user");
    } catch (err) {
      console.error("Failed to remove user from localStorage", err);
    }
    setLocalUser(null);
    setIsOpen(false);
    if (onLogout) onLogout();
  };

  // Logged-out state: show generic standard user icon in gray/neutral circular button
  if (!localUser) {
    return (
      <div className="user-profile-menu-container relative" style={{ position: "relative" }}>
        <button
          type="button"
          className="avatar user-avatar-btn user-avatar-logged-out"
          onClick={() => setIsLoginModalOpen((prev) => !prev)}
          title={t("auth.loginTitle", "Iniciar Sesión")}
          aria-label={t("auth.loginTitle", "Iniciar Sesión")}
          style={{
            background: "var(--surface-alt, #EFECE4)",
            color: "var(--muted, #736B63)",
            border: "1px solid var(--line, #E7E3D9)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <UserIcon size={18} />
        </button>

        <LoginPopover
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleSaveLogin}
          initialName={t("common.userName") || "Ulises Pérez"}
          initialTitle={t("common.userRole") || "Quality Control / IT Admin"}
          t={t}
        />
      </div>
    );
  }

  const logoutText = t("common.logout") || "Log out";

  return (
    <div className="user-profile-menu-container" ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="avatar user-avatar-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={`${localUser.name} — ${localUser.title}`}
      >
        {localUser.initials}
      </button>

      {isOpen && (
        <div className="user-profile-dropdown" role="menu">
          <div className="user-profile-header">
            <div className="user-profile-avatar-large">{localUser.initials}</div>
            <div className="user-profile-details">
              <strong>{localUser.name}</strong>
              <small>{localUser.title}</small>
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
            onClick={handleLogout}
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
  onOpenCopilot,
  isCopilotOpen: propsIsCopilotOpen,
  onCloseCopilot,
}: TopbarProps) {
  const [internalCopilotOpen, setInternalCopilotOpen] = useState(false);
  const isCopilotOpen = propsIsCopilotOpen ?? internalCopilotOpen;
  const setIsCopilotOpen = (val: boolean) => {
    setInternalCopilotOpen(val);
    if (val && onOpenCopilot) onOpenCopilot();
    if (!val && onCloseCopilot) onCloseCopilot();
  };

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

        {/* Distinct Global Omni AI Pill Trigger */}
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-info/10 text-brand-info font-medium border border-brand-info/20 hover:bg-brand-info/20 transition-colors global-copilot-pill-btn"
          title="Open Omni AI"
          aria-label="Open Omni AI"
          onClick={() => setIsCopilotOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "5px 12px",
            borderRadius: "9999px",
            background: "color-mix(in srgb, var(--primary) 12%, var(--surface))",
            color: "var(--primary)",
            border: "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          }}
        >
          <img
            src="/avatar_asistente.png"
            alt="Omni"
            className="omni-avatar"
            style={{ width: "20px", height: "20px" }}
          />
          <span>Omni</span>
        </button>

        <UserProfileDropdown t={t} onLogout={onLogout} />
      </div>

      {/* Fallback Global Drawer if not handled at root layout */}
      {!onOpenCopilot && (
        <GlobalCopilot isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} language={language} />
      )}
    </header>
  );
}
