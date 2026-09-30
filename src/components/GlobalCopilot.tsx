import { useState, useRef, useEffect, type FormEvent } from "react";
import { Icon } from "./Icons";
import { generateGlobalAIResponse, getCopilotGreeting } from "../services/ai";
import { useLanguage } from "../hooks/useLanguage";

export interface GlobalCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export function GlobalCopilot({ isOpen, onClose, language: propLanguage }: GlobalCopilotProps) {
  const { currentLanguage } = useLanguage(propLanguage);
  const [prompt, setPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [chatHistory, setChatHistory] = useState<CopilotMessage[]>(() => [
    {
      id: "msg_welcome",
      role: "assistant",
      text: getCopilotGreeting(currentLanguage),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Dynamically update the welcome greeting when the active app language changes
  useEffect(() => {
    setChatHistory((prev) => {
      if (prev.length === 1 && prev[0].id === "msg_welcome") {
        return [
          {
            ...prev[0],
            text: getCopilotGreeting(currentLanguage),
          },
        ];
      }
      return prev;
    });
  }, [currentLanguage]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, chatHistory, isTyping]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? prompt).trim();
    if (!query || isTyping) return;

    const userMessage: CopilotMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsTyping(true);

    try {
      // Pass context (null), user prompt, and current language as 3rd parameter
      const response = await generateGlobalAIResponse(null, query, currentLanguage);
      const assistantMessage: CopilotMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatHistory((prev) => [...prev, assistantMessage]);
    } catch {
      const errText =
        currentLanguage === "de"
          ? "Entschuldigung, beim Abfragen des Unternehmens-Repositorys ist ein Fehler aufgetreten."
          : currentLanguage === "en"
          ? "Sorry, an error occurred while querying the enterprise repository."
          : "Lo siento, ocurrió un error al consultar el repositorio empresarial.";

      setChatHistory((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: errText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSendMessage();
  };

  const samplePromptsByLang: Record<string, string[]> = {
    de: [
      "📊 Umsatzübersicht",
      "📦 Inventarstatus",
      "🛡️ SLA-Einhaltung",
      "👥 Personalbericht",
    ],
    en: [
      "📊 Revenue Summary",
      "📦 Inventory Status",
      "🛡️ SLA Compliance",
      "👥 Workforce Report",
    ],
    fr: [
      "📊 Résumé des revenus",
      "📦 État des stocks",
      "🛡️ Respect des SLA",
      "👥 Rapport des effectifs",
    ],
    it: [
      "📊 Riepilogo entrate",
      "📦 Stato inventario",
      "🛡️ Conformità SLA",
      "👥 Report personale",
    ],
    zh: [
      "📊 收入概览",
      "📦 库存状态",
      "🛡️ SLA 履约情况",
      "👥 人员报告",
    ],
    ja: [
      "📊 収益サマリー",
      "📦 在庫ステータス",
      "🛡️ SLA 達成状況",
      "👥 人員レポート",
    ],
    es: [
      "📊 Resumen de ingresos",
      "📦 Estado de inventario",
      "🛡️ Cumplimiento de SLA",
      "👥 Reporte de plantilla",
    ],
  };

  const samplePrompts = samplePromptsByLang[currentLanguage] || samplePromptsByLang.es;

  const placeholderText =
    currentLanguage === "de"
      ? "Fragen zu Umsatz ($136k), Inventar, SLAs..."
      : currentLanguage === "en"
      ? "Ask about revenue ($136k), inventory, SLAs..."
      : currentLanguage === "fr"
      ? "Poser une question sur les revenus (136 k$), stocks..."
      : currentLanguage === "it"
      ? "Chiedi su entrate ($136k), inventario, SLA..."
      : currentLanguage === "zh"
      ? "询问关于收入 ($136k)、库存、SLA..."
      : currentLanguage === "ja"
      ? "収益 ($136k)、在庫、SLA について質問..."
      : "Preguntar sobre ingresos ($136k), inventario, SLAs...";

  const typingText =
    currentLanguage === "de"
      ? "Omni fragt das Unternehmens-Repository ab..."
      : currentLanguage === "en"
      ? "Omni is querying enterprise repository..."
      : "Omni consultando repositorio empresarial...";

  return (
    <>
      {/* Semi-transparent Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Global Omni Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-96 max-w-[100vw] bg-[var(--surface)] shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-[var(--line)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Omni Enterprise Assistant"
        style={{
          background: "var(--surface, #FFFFFF)",
          color: "var(--ink, #2D2823)",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]"
          style={{
            borderBottom: "1px solid var(--line, #E7E3D9)",
            background: "var(--surface-alt, #EFECE4)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <img
              src="/avatar_asistente.png"
              alt="Omni"
              className="omni-avatar"
              style={{ width: "30px", height: "30px" }}
            />
            <div>
              <h3 className="text-base font-bold m-0 leading-tight" style={{ color: "var(--ink, #2D2823)" }}>
                Omni
              </h3>
              <span className="text-[11px] font-medium" style={{ color: "var(--muted, #736B63)" }}>
                Enterprise Assistant · Zero-Cloud ({currentLanguage.toUpperCase()})
              </span>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors text-[var(--muted)] hover:text-[var(--ink)]"
            onClick={onClose}
            title="Cerrar Omni"
            aria-label="Cerrar Omni"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Suggested Quick Action Prompts */}
        <div
          className="flex flex-wrap gap-2 mb-4 px-4 pt-3 pb-2 border-b border-[var(--line)]"
          style={{
            borderBottom: "1px solid var(--line, #E7E3D9)",
            background: "color-mix(in srgb, var(--surface) 95%, var(--bg))",
          }}
        >
          {samplePrompts.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void handleSendMessage(item.replace(/^[^\w\s]+/, "").trim())}
              disabled={isTyping}
              className="px-2.5 py-1 text-xs rounded-full transition-colors"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "9999px",
                border: "1px solid var(--line, #E7E3D9)",
                background: "var(--surface, #FFFFFF)",
                color: "var(--muted, #736B63)",
                cursor: isTyping ? "not-allowed" : "pointer",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Scrollable Conversation History */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflowY: "auto",
          }}
        >
          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${
                  msg.role === "user"
                    ? "bg-neutral-200 dark:bg-neutral-800 text-[var(--ink)]"
                    : "bg-brand-info/10 border-l-4 border-brand-info text-[var(--ink)]"
                }`}
                style={
                  msg.role === "user"
                    ? {
                        maxWidth: "85%",
                        borderRadius: "16px 16px 4px 16px",
                        padding: "10px 14px",
                        fontSize: "13px",
                        background: "var(--surface-alt, #EFECE4)",
                        color: "var(--ink, #2D2823)",
                      }
                    : {
                        maxWidth: "85%",
                        borderRadius: "4px 16px 16px 16px",
                        padding: "12px 14px",
                        fontSize: "13px",
                        background: "color-mix(in srgb, var(--info, #2B4C59) 12%, transparent)",
                        borderLeft: "4px solid var(--info, #2B4C59)",
                        color: "var(--ink, #2D2823)",
                      }
                }
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                  <div className="flex items-center gap-1.5 font-bold">
                    {msg.role === "assistant" && (
                      <img
                        src="/avatar_asistente.png"
                        alt="Omni"
                        className="omni-avatar"
                        style={{ width: "16px", height: "16px" }}
                      />
                    )}
                    <span>{msg.role === "user" ? "Tú" : "Omni"}</span>
                  </div>
                  <span>{msg.timestamp}</span>
                </div>
                <div>{msg.text}</div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start" style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                className="rounded-2xl px-4 py-2.5 text-xs text-[var(--muted)] flex items-center gap-2 animate-pulse"
                style={{
                  borderRadius: "4px 16px 16px 16px",
                  background: "color-mix(in srgb, var(--info, #2B4C59) 8%, transparent)",
                  borderLeft: "4px solid var(--info, #2B4C59)",
                }}
              >
                <img
                  src="/avatar_asistente.png"
                  alt="Omni"
                  className="omni-avatar"
                  style={{ width: "18px", height: "18px" }}
                />
                <span>{typingText}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Form at the bottom */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-[var(--line)] flex gap-2 items-center"
          style={{
            borderTop: "1px solid var(--line, #E7E3D9)",
            background: "var(--surface, #FFFFFF)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholderText}
            disabled={isTyping}
            className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1"
            style={{
              flex: 1,
              borderRadius: "10px",
              padding: "10px 14px",
              border: "1px solid var(--line, #E7E3D9)",
              background: "var(--surface-alt, #EFECE4)",
              color: "var(--ink, #2D2823)",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isTyping}
            className="px-4 py-2.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: "var(--primary, #C27358)",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              cursor: prompt.trim() && !isTyping ? "pointer" : "not-allowed",
              opacity: prompt.trim() && !isTyping ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="arrow" size={15} style={{ transform: "rotate(180deg)" }} />
          </button>
        </form>
      </aside>
    </>
  );
}
