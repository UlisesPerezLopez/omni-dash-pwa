import { useState, useMemo, useEffect, useCallback } from "react";
import { Icon } from "./Icons";
import { api, useEmails, useEmailCounts } from "../services/api";
import { generateAIResponse } from "../services/ai";
import type { EmailRecord, EmailFolder, EmailStatus, EmailAiPriority } from "../types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface InboxProps {
  t?: (key: string, defaultText?: string) => string;
  onNavigateHome?: () => void;
}

export function Inbox({ t, onNavigateHome }: InboxProps) {
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPullingExtension, setIsPullingExtension] = useState(false);

  // Active AI Chat Copilot state (Phase 24)
  const [aiPrompt, setAiPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const translate = useCallback(
    (key: string, fallback: string): string => {
      if (!t) return fallback;
      const res = t(key, fallback);
      return res && res !== key ? res : fallback;
    },
    [t]
  );

  // Live queries from Dexie
  const emails = useEmails(selectedFolder);
  const counts = useEmailCounts();

  // Filtered email list for Column 2
  const filteredEmails = useMemo(() => {
    let result = emails;

    if (unreadOnly) {
      result = result.filter((e) => e.status === "unread");
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => {
        return (
          e.subject.toLowerCase().includes(q) ||
          e.sender.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          e.aiAnalysis.summary.toLowerCase().includes(q) ||
          e.aiAnalysis.extractedTasks.some((task) => task.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [emails, unreadOnly, searchQuery]);

  // Ensure an email is selected when the filtered list changes
  useEffect(() => {
    if (filteredEmails.length > 0) {
      if (!selectedEmailId || !filteredEmails.some((e) => e.id === selectedEmailId)) {
        setSelectedEmailId(filteredEmails[0].id);
      }
    } else {
      setSelectedEmailId(null);
    }
  }, [filteredEmails, selectedEmailId]);

  // Selected email object
  const currentEmail = useMemo(() => {
    if (!selectedEmailId) return null;
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  // Mark email as read when selected (preserve unread state if user is actively in unreadOnly filter)
  const handleSelectEmail = useCallback(
    async (email: EmailRecord) => {
      setSelectedEmailId(email.id);
      if (email.status === "unread" && !unreadOnly) {
        await api.markEmailStatus(email.id, "read");
      }
    },
    [unreadOnly]
  );

  const handleToggleReadStatus = useCallback(
    async (email: EmailRecord) => {
      const nextStatus: EmailStatus = email.status === "unread" ? "read" : "unread";
      await api.markEmailStatus(email.id, nextStatus);
    },
    []
  );

  const handleMoveFolder = useCallback(
    async (emailId: string, targetFolder: EmailFolder) => {
      const currentIndex = filteredEmails.findIndex((e) => e.id === emailId);
      const remaining = filteredEmails.filter((e) => e.id !== emailId);

      await api.moveEmailFolder(emailId, targetFolder);

      // Auto-select next email in list or previous if at the end, or null if list is empty
      if (remaining.length > 0) {
        const nextIndex = currentIndex >= 0 && currentIndex < remaining.length ? currentIndex : remaining.length - 1;
        setSelectedEmailId(remaining[nextIndex].id);
      } else {
        setSelectedEmailId(null);
      }
    },
    [filteredEmails]
  );

  const handleDeletePermanently = useCallback(
    async (emailId: string) => {
      const currentIndex = filteredEmails.findIndex((e) => e.id === emailId);
      const remaining = filteredEmails.filter((e) => e.id !== emailId);

      await api.deleteEmail(emailId);

      if (remaining.length > 0) {
        const nextIndex = currentIndex >= 0 && currentIndex < remaining.length ? currentIndex : remaining.length - 1;
        setSelectedEmailId(remaining[nextIndex].id);
      } else {
        setSelectedEmailId(null);
      }
    },
    [filteredEmails]
  );

  const handleToggleTask = useCallback(
    async (emailId: string, task: string) => {
      await api.toggleEmailTask(emailId, task);
    },
    []
  );

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userText = aiPrompt.trim();
    setChatHistory((prev) => [...prev, { role: 'user', text: userText }]);
    setIsAiTyping(true);
    setAiPrompt("");

    try {
      const aiResponse = await generateAIResponse(currentEmail, userText);
      setChatHistory((prev) => [...prev, { role: 'ai', text: aiResponse }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'ai',
          text: "Error al generar la respuesta con el asistente de IA.",
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSimulateNewEmail = useCallback(async () => {
    setIsSimulating(true);
    try {
      const id = `em_sim_${Date.now()}`;
      const simulated: EmailRecord = {
        id,
        subject: `ESCALATION: High Severity Quality Variance Detected (Batch #${Math.floor(1000 + Math.random() * 9000)})`,
        body: `Hello Quality Control Lead,\n\nOur incoming goods inspection at Harbor Node logged an urgent non-conformance report.\n\nMaterial shipment received from Apex Logistics contains out-of-spec micro-connectors. Defect rate is currently measured at 4.2% across sample pallets.\n\nPlease quarantine this delivery immediately and issue RMA verification to prevent mixing with active production inventory.\n\nAutomated Ingestion Gateway | Harbor Node`,
        sender: "Harbor Inbound QA <harbor-qa@omnidash.internal>",
        recipient: "Ulises Pérez <u.perez@omnidash.internal>",
        date: new Date().toISOString(),
        status: "unread",
        folder: "inbox",
        aiAnalysis: {
          priority: "High",
          summary: "Incoming goods non-conformance detected at Harbor Node (4.2% defect rate). Immediate quarantine required.",
          extractedTasks: [
            "Quarantine Harbor Node batch delivery pallets",
            "Generate supplier RMA claim form for non-conforming connectors",
            "Update ERP material allocation status to Blocked",
          ],
          deadline: "Within 2 Hours",
        },
      };
      await api.saveEmails([simulated]);
      setSelectedFolder("inbox");
      setSelectedEmailId(id);
    } finally {
      setIsSimulating(false);
    }
  }, []);

  const handlePullExtension = useCallback(async () => {
    let targetExtId: string | null = null;
    try {
      targetExtId = localStorage.getItem("omni_ext_id");
    } catch {
      // ignore
    }

    if (!targetExtId || !targetExtId.trim()) {
      alert("Por favor, configura el ID de la extensión en los Ajustes del Espacio.");
      return;
    }

    const chromeObj = typeof window !== "undefined" ? (window as any).chrome : null;
    if (!chromeObj?.runtime?.sendMessage) {
      alert("Esta función requiere un navegador basado en Chromium con soporte para extensiones.");
      return;
    }

    setIsPullingExtension(true);
    try {
      chromeObj.runtime.sendMessage(
        targetExtId.trim(),
        { action: "TRIGGER_EXTRACTION" },
        async (response: any) => {
          setIsPullingExtension(false);
          if (chromeObj.runtime.lastError) {
            console.error("Connection error:", chromeObj.runtime.lastError);
            alert("Error: Asegúrate de que la extensión está instalada, activa y el ID es correcto.");
            return;
          }
          if (response?.error) {
            alert(response.error); // E.g., "No Gmail/Outlook tabs open."
          } else if (response?.success && response.payload) {
            // Successfully pulled the data remotely!
            await api.saveEmails([response.payload]);
            setSelectedFolder("inbox");
            if (response.payload.id) {
              setSelectedEmailId(response.payload.id);
            }
          }
        }
      );
    } catch (err) {
      setIsPullingExtension(false);
      console.error("Connection error:", err);
      alert("Error: Asegúrate de que la extensión está instalada, activa y el ID es correcto.");
    }
  }, []);

  const handleResetDemoEmails = useCallback(async () => {
    await api.seedDemoEmails();
    setSelectedFolder("inbox");
  }, []);

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return isoString;
    }
  };

  const getInitials = (sender: string): string => {
    const clean = sender.replace(/<.*>/, "").trim();
    const parts = clean.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || "EM";
  };

  const getPriorityStyle = (priority: EmailAiPriority) => {
    switch (priority) {
      case "High":
        return {
          color: "var(--accent, #c27358)",
          backgroundColor: "color-mix(in srgb, var(--accent, #c27358) 14%, var(--surface))",
          borderColor: "color-mix(in srgb, var(--accent, #c27358) 40%, transparent)",
        };
      case "Medium":
        return {
          color: "var(--primary, #c27358)",
          backgroundColor: "color-mix(in srgb, var(--primary, #c27358) 12%, var(--surface))",
          borderColor: "color-mix(in srgb, var(--primary, #c27358) 35%, transparent)",
        };
      case "Low":
      default:
        return {
          color: "var(--secondary, #798c7a)",
          backgroundColor: "color-mix(in srgb, var(--secondary, #798c7a) 15%, var(--surface))",
          borderColor: "color-mix(in srgb, var(--secondary, #798c7a) 40%, transparent)",
        };
    }
  };

  return (
    <div className="inbox-module-wrapper">
      {/* Module Title Banner & Controls */}
      <div className="inbox-top-banner">
        <div className="inbox-banner-title">
          <h2>
            <span style={{ marginRight: "8px" }}>📩</span>
            {translate("common.inboxTitle", "Enterprise Inbox & AI Comms")}
          </h2>
          <p>
            {translate(
              "nav.inboxTagline",
              "Local-first email intelligence with offline task extraction & AI summary"
            )}
          </p>
        </div>
        <div className="inbox-banner-actions">
          {onNavigateHome && (
            <button
              type="button"
              className="secondary-button"
              onClick={onNavigateHome}
              title="Back to dashboard"
            >
              <Icon name="arrow" size={14} />
              <span>{translate("common.back", "Back")}</span>
            </button>
          )}
          {/* Phase 32: Remote Extension Pull Trigger Button */}
          <button
            type="button"
            className="primary-button"
            onClick={handlePullExtension}
            disabled={isPullingExtension}
            title="Importar correo desde la pestaña activa mediante la Extensión Chrome"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--primary, #C27358)",
              color: "#FFFFFF",
              padding: "7px 13px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 650,
              border: "none",
              cursor: isPullingExtension ? "not-allowed" : "pointer",
              opacity: isPullingExtension ? 0.7 : 1,
              boxShadow: "0 2px 6px color-mix(in srgb, var(--primary, #C27358) 35%, transparent)",
            }}
          >
            <span style={{ fontSize: "13px" }}>📥</span>
            <span>
              {isPullingExtension
                ? "Importando..."
                : translate("common.pullActiveTab", "Importar Pestaña Activa")}
            </span>
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={handleSimulateNewEmail}
            disabled={isSimulating}
            title="Simulate incoming B2B email"
          >
            <Icon name="plus" size={14} />
            <span>{translate("common.simulateEmail", "Simulate Inbound")}</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleResetDemoEmails}
            title="Reload realistic demo emails"
          >
            <Icon name="refresh" size={14} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* 3-Column Enterprise Inbox Architecture */}
      <div className="inbox-layout-grid">
        {/* ================= COLUMN 1: SIDEBAR (200px) ================= */}
        <aside className="inbox-sidebar-col" aria-label="Mail Folders">
          <div className="inbox-folder-group">
            <span className="inbox-folder-heading">
              {translate("common.inboxFolders", "Folders")}
            </span>

            {/* Folder: Inbox */}
            <button
              type="button"
              className={`inbox-folder-btn ${selectedFolder === "inbox" ? "active" : ""}`}
              onClick={() => setSelectedFolder("inbox")}
            >
              <span className="inbox-folder-icon">📥</span>
              <span className="inbox-folder-label">
                {translate("common.folderInbox", "Inbox")}
              </span>
              {counts.inboxUnread > 0 ? (
                <span className="inbox-badge-unread">{counts.inboxUnread}</span>
              ) : (
                <span className="inbox-badge-count">{counts.inboxTotal}</span>
              )}
            </button>

            {/* Folder: Sent */}
            <button
              type="button"
              className={`inbox-folder-btn ${selectedFolder === "sent" ? "active" : ""}`}
              onClick={() => setSelectedFolder("sent")}
            >
              <span className="inbox-folder-icon">📤</span>
              <span className="inbox-folder-label">
                {translate("common.folderSent", "Sent")}
              </span>
              <span className="inbox-badge-count">{counts.sentTotal}</span>
            </button>

            {/* Folder: Archive */}
            <button
              type="button"
              className={`inbox-folder-btn ${selectedFolder === "archive" ? "active" : ""}`}
              onClick={() => setSelectedFolder("archive")}
            >
              <span className="inbox-folder-icon">📦</span>
              <span className="inbox-folder-label">
                {translate("common.folderArchive", "Archive")}
              </span>
              <span className="inbox-badge-count">{counts.archiveTotal}</span>
            </button>

            {/* Folder: Trash */}
            <button
              type="button"
              className={`inbox-folder-btn ${selectedFolder === "trash" ? "active" : ""}`}
              onClick={() => setSelectedFolder("trash")}
            >
              <span className="inbox-folder-icon">🗑️</span>
              <span className="inbox-folder-label">
                {translate("common.folderTrash", "Trash")}
              </span>
              <span className="inbox-badge-count">{counts.trashTotal}</span>
            </button>
          </div>

          <div className="inbox-sidebar-divider" />

          {/* Quick Filters */}
          <div className="inbox-filter-group">
            <span className="inbox-folder-heading">
              {translate("common.filter", "Filters")}
            </span>
            <button
              type="button"
              className={`inbox-filter-toggle ${unreadOnly ? "active" : ""}`}
              onClick={() => setUnreadOnly(!unreadOnly)}
            >
              <span className="status-dot healthy" />
              <span>{translate("common.unreadOnly", "Unread Only")}</span>
            </button>
          </div>

          {/* Offline local-first badge */}
          <div className="inbox-storage-card">
            <div className="inbox-storage-icon">
              <Icon name="database" size={14} />
            </div>
            <div>
              <strong>Local IndexedDB</strong>
              <small>Volatile offline cache</small>
            </div>
          </div>
        </aside>

        {/* ================= COLUMN 2: LIST VIEW (350px) ================= */}
        <section className="inbox-list-col" aria-label="Message List">
          {/* Search Box in List Column */}
          <div className="inbox-search-wrap">
            <Icon name="search" size={14} className="inbox-search-icon" />
            <input
              type="text"
              className="inbox-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={translate(
                "common.searchEmailsPlaceholder",
                "Search messages, tasks..."
              )}
            />
            {searchQuery && (
              <button
                type="button"
                className="inbox-search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </div>

          {/* Email Item Feed */}
          <div className="inbox-items-scroll">
            {filteredEmails.length === 0 ? (
              <div className="inbox-empty-state">
                <Icon name="mail" size={28} />
                <p>{translate("common.noEmailsFound", "No messages in this folder.")}</p>
              </div>
            ) : (
              filteredEmails.map((email) => {
                const isSelected = email.id === selectedEmailId;
                const isUnread = email.status === "unread";
                const pStyle = getPriorityStyle(email.aiAnalysis.priority);

                return (
                  <button
                    key={email.id}
                    type="button"
                    className={`inbox-email-item ${isSelected ? "selected" : ""} ${
                      isUnread ? "unread" : ""
                    }`}
                    onClick={() => void handleSelectEmail(email)}
                  >
                    <div className="inbox-item-top">
                      <div className="inbox-item-sender-row">
                        {isUnread && (
                          <span
                            className="inbox-unread-dot"
                            title="Unread"
                            style={{ backgroundColor: "var(--info, #2b4c59)" }}
                          />
                        )}
                        <span className="inbox-item-sender">{email.sender.split("<")[0].trim()}</span>
                      </div>
                      <span className="inbox-item-date">{formatDate(email.date)}</span>
                    </div>

                    <div className="inbox-item-subject-row">
                      <span className="inbox-item-subject">{email.subject}</span>
                    </div>

                    <div className="inbox-item-snippet">{email.body.replace(/\n+/g, " ")}</div>

                    <div className="inbox-item-tags">
                      <span
                        className="inbox-priority-pill"
                        style={{
                          color: pStyle.color,
                          backgroundColor: pStyle.backgroundColor,
                          borderColor: pStyle.borderColor,
                        }}
                      >
                        {email.aiAnalysis.priority}
                      </span>
                      {email.aiAnalysis.extractedTasks.length > 0 && (
                        <span className="inbox-task-count-pill">
                          <Icon name="check" size={10} />
                          {email.completedTasks && email.completedTasks.length > 0
                            ? `${email.completedTasks.length}/${email.aiAnalysis.extractedTasks.length} tasks`
                            : `${email.aiAnalysis.extractedTasks.length} tasks`}
                        </span>
                      )}
                      {email.aiAnalysis.deadline && (
                        <span className="inbox-deadline-pill">
                          ⏰ {email.aiAnalysis.deadline}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ================= COLUMN 3: READER VIEW (FLEX) ================= */}
        <section className="inbox-reader-col" aria-label="Message Detail">
          {currentEmail ? (
            <div className="inbox-reader-content">
              {/* Reader Action Toolbar */}
              <div className="inbox-reader-toolbar">
                <div className="inbox-toolbar-left">
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => void handleToggleReadStatus(currentEmail)}
                    title={
                      currentEmail.status === "unread"
                        ? translate("common.markAsRead", "Mark as Read")
                        : translate("common.markAsUnread", "Mark as Unread")
                    }
                  >
                    <Icon name={currentEmail.status === "unread" ? "check" : "mail"} size={14} />
                    <span>
                      {currentEmail.status === "unread"
                        ? translate("common.markAsRead", "Mark as Read")
                        : translate("common.markAsUnread", "Mark as Unread")}
                    </span>
                  </button>

                  {currentEmail.folder !== "archive" && (
                    <button
                      type="button"
                      className="toolbar-btn"
                      onClick={() => void handleMoveFolder(currentEmail.id, "archive")}
                      title={translate("common.moveToArchive", "Archive message")}
                    >
                      <Icon name="box" size={14} />
                      <span>{translate("common.moveToArchive", "Archive")}</span>
                    </button>
                  )}

                  {currentEmail.folder === "archive" && (
                    <button
                      type="button"
                      className="toolbar-btn"
                      onClick={() => void handleMoveFolder(currentEmail.id, "inbox")}
                      title={translate("common.moveToInbox", "Restore to Inbox")}
                    >
                      <Icon name="arrow" size={14} />
                      <span>{translate("common.moveToInbox", "Restore to Inbox")}</span>
                    </button>
                  )}

                  {currentEmail.folder !== "trash" ? (
                    <button
                      type="button"
                      className="toolbar-btn danger"
                      onClick={() => void handleMoveFolder(currentEmail.id, "trash")}
                      title={translate("common.moveToTrash", "Move to Trash")}
                    >
                      <Icon name="close" size={14} />
                      <span>{translate("common.moveToTrash", "Delete")}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => void handleMoveFolder(currentEmail.id, "inbox")}
                        title={translate("common.moveToInbox", "Restore to Inbox")}
                      >
                        <Icon name="arrow" size={14} />
                        <span>{translate("common.moveToInbox", "Restore to Inbox")}</span>
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn danger"
                        onClick={() => void handleDeletePermanently(currentEmail.id)}
                        title={translate("common.deletePermanently", "Delete permanently")}
                      >
                        <Icon name="close" size={14} />
                        <span>{translate("common.deletePermanently", "Delete Permanently")}</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="inbox-toolbar-right">
                  <span className="inbox-folder-pill-indicator">
                    📂 {currentEmail.folder.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Reader Header */}
              <div className="inbox-reader-header">
                <h1 className="inbox-reader-subject">{currentEmail.subject}</h1>

                <div className="inbox-reader-meta-row">
                  <div className="inbox-sender-avatar">
                    {getInitials(currentEmail.sender)}
                  </div>
                  <div className="inbox-sender-info">
                    <div className="inbox-sender-name-wrap">
                      <strong>{currentEmail.sender}</strong>
                      <span className="inbox-recipient-meta">
                        to {currentEmail.recipient}
                      </span>
                    </div>
                    <time className="inbox-timestamp">
                      {new Date(currentEmail.date).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                </div>
              </div>

              {/* ✨ KI-Analyse / AI-Analysis Side-Panel Card */}
              <div className="inbox-ai-panel">
                <div className="inbox-ai-panel-header">
                  <div className="inbox-ai-title-wrap">
                    <img
                      src="/avatar_asistente.png"
                      alt="Omni"
                      className="omni-avatar"
                      style={{ width: "20px", height: "20px" }}
                    />
                    <h3>{translate("common.aiAnalysisTitle", "Omni Intelligence (Local Engine)")}</h3>
                  </div>
                  <div className="inbox-ai-badges">
                    <span
                      className="inbox-priority-badge"
                      style={getPriorityStyle(currentEmail.aiAnalysis.priority)}
                    >
                      {currentEmail.aiAnalysis.priority === "High"
                        ? translate("common.priorityHigh", "High Priority")
                        : currentEmail.aiAnalysis.priority === "Medium"
                        ? translate("common.priorityMedium", "Medium Priority")
                        : translate("common.priorityLow", "Low Priority")}
                    </span>
                    {currentEmail.aiAnalysis.deadline && (
                      <span className="inbox-deadline-badge">
                        ⏰ {translate("common.deadlineLabel", "Deadline")}:{" "}
                        {currentEmail.aiAnalysis.deadline}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Executive Summary */}
                <div className="inbox-ai-summary-block">
                  <span className="inbox-ai-section-label">
                    {translate("common.aiSummary", "TL;DR Summary")}
                  </span>
                  <p className="inbox-ai-summary-text">
                    {currentEmail.aiAnalysis.summary}
                  </p>
                </div>

                {/* Actionable Extracted Tasks */}
                {currentEmail.aiAnalysis.extractedTasks.length > 0 && (
                  <div className="inbox-ai-tasks-block">
                    <span className="inbox-ai-section-label">
                      {translate("common.extractedTasks", "Extracted Action Tasks")} (
                      {currentEmail.aiAnalysis.extractedTasks.length})
                    </span>
                    <div className="inbox-tasks-checklist">
                      {currentEmail.aiAnalysis.extractedTasks.map((task, idx) => {
                        const isDone =
                          currentEmail.completedTasks?.includes(task) ?? false;
                        return (
                          <label
                            key={idx}
                            className={`inbox-task-row ${isDone ? "is-completed" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() =>
                                void handleToggleTask(currentEmail.id, task)
                              }
                              className="inbox-task-checkbox"
                            />
                            <span className="inbox-task-text">{task}</span>
                            {isDone && (
                              <span className="inbox-task-done-badge">
                                {translate("common.taskDone", "Done")}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Full Body */}
              <div className="inbox-reader-body">
                <div className="email-body-content inbox-body-text">
                  {currentEmail.body}
                </div>

                {/* Phase 24: Forced AI Chat Component Injection */}
                <div className="mt-8 border-t border-brand-line pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h4
                      className="text-sm font-semibold tracking-wide flex items-center gap-2"
                      style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}
                    >
                      <img
                        src="/avatar_asistente.png"
                        alt="Omni"
                        className="omni-avatar"
                        style={{ width: "22px", height: "22px" }}
                      />
                      <span>Omni</span>
                    </h4>
                  </div>

                  {/* Chat History */}
                  <div
                    className="space-y-3 mb-4"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginBottom: "16px",
                    }}
                  >
                    {chatHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={item.role === "user" ? "flex justify-end" : "flex justify-start"}
                        style={{
                          display: "flex",
                          justifyContent: item.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          className={
                            item.role === "user"
                              ? "max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                              : "max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm bg-brand-info/10 border-l-4 border-solid border-brand-info text-neutral-900 dark:text-neutral-100"
                          }
                          style={
                            item.role === "user"
                              ? {
                                  maxWidth: "80%",
                                  borderRadius: "8px",
                                  padding: "10px 14px",
                                  fontSize: "13px",
                                  lineHeight: "1.5",
                                  background: "var(--surface-alt, #EFECE4)",
                                  color: "var(--ink, #2D2823)",
                                }
                              : {
                                  maxWidth: "80%",
                                  borderRadius: "0 8px 8px 0",
                                  padding: "10px 14px",
                                  fontSize: "13px",
                                  lineHeight: "1.5",
                                  background:
                                    "color-mix(in srgb, var(--info, #2B4C59) 12%, transparent)",
                                  borderLeft: "4px solid var(--info, #2B4C59)",
                                  color: "var(--ink, #2D2823)",
                                }
                          }
                        >
                          {item.role === "ai" && (
                            <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold opacity-80">
                              <img
                                src="/avatar_asistente.png"
                                alt="Omni"
                                className="omni-avatar"
                                style={{ width: "16px", height: "16px" }}
                              />
                              <span>Omni</span>
                            </div>
                          )}
                          {item.text}
                        </div>
                      </div>
                    ))}

                    {isAiTyping && (
                      <div
                        className="flex items-center gap-2 mb-2"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <img
                          src="/avatar_asistente.png"
                          alt="Omni"
                          className="omni-avatar"
                          style={{ width: "18px", height: "18px" }}
                        />
                        <div
                          className="text-xs text-neutral-500 animate-pulse italic"
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            fontStyle: "italic",
                          }}
                        >
                          Omni is thinking...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form input and submit */}
                  <form
                    onSubmit={handleChatSubmit}
                    className="flex gap-2"
                    style={{ display: "flex", gap: "8px" }}
                  >
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={translate("common.askAi", "Ask Omni...")}
                      disabled={isAiTyping}
                      className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--line, #E7E3D9)",
                        background: "var(--surface, #FFFFFF)",
                        color: "var(--ink, #2D2823)",
                        fontSize: "13px",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!aiPrompt.trim() || isAiTyping}
                      className="rounded-md bg-brand-info px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "6px",
                        background: "var(--primary, #C27358)",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: aiPrompt.trim() && !isAiTyping ? "pointer" : "not-allowed",
                        opacity: aiPrompt.trim() && !isAiTyping ? 1 : 0.6,
                      }}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="inbox-reader-placeholder">
              <div className="inbox-placeholder-icon">
                <Icon name="mail" size={40} />
              </div>
              <h3>{translate("common.inboxTitle", "Enterprise Inbox")}</h3>
              <p>
                {translate(
                  "common.selectEmailPrompt",
                  "Select a message from the list to view its contents and local AI insights."
                )}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
