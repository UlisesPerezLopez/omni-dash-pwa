import { useState, useEffect, useRef, type FormEvent } from "react";
import { Icon } from "./Icons";

export interface LoginPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (name: string, title: string) => void;
  initialName?: string;
  initialTitle?: string;
  t?: (key: string, defaultText?: string) => string;
}

export function LoginPopover({
  isOpen,
  onClose,
  onLogin,
  initialName = "",
  initialTitle = "",
  t,
}: LoginPopoverProps) {
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setTitle(initialTitle);
    }
  }, [isOpen, initialName, initialTitle]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Use timeout so current click opening popover does not immediately trigger close
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onLogin(trimmedName, title.trim());
    setName("");
    setTitle("");
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-14 right-4 w-80 bg-[var(--surface)] border border-[var(--line)] shadow-xl rounded-lg p-4 z-[100] flex flex-col gap-4 text-left animate-fade-in"
      style={{
        background: "var(--surface, #FFFFFF)",
        borderColor: "var(--line, #E7E3D9)",
        color: "var(--ink, #2D2823)",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.18)",
      }}
      role="dialog"
      aria-label={t ? t("auth.loginTitle", "Iniciar sesión") : "Iniciar sesión"}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: "color-mix(in srgb, var(--primary, #C27358) 15%, var(--surface))",
              color: "var(--primary, #C27358)",
              border: "1px solid color-mix(in srgb, var(--primary, #C27358) 30%, transparent)",
            }}
          >
            <Icon name="users" size={15} />
          </div>
          <div>
            <h3
              className="text-sm font-bold m-0 leading-tight"
              style={{ color: "var(--ink, #2D2823)" }}
            >
              {t ? t("auth.loginTitle", "Iniciar sesión") : "Iniciar sesión"}
            </h3>
            <p
              className="text-[11px] m-0 mt-0.5"
              style={{ color: "var(--muted, #736B63)" }}
            >
              CoreERP Local Auth
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 transition-colors text-[var(--muted)]"
          title={t ? t("actions.close", "Cerrar") : "Cerrar"}
          aria-label={t ? t("actions.close", "Cerrar") : "Cerrar"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Icon name="close" size={15} />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="popover-full-name"
            className="text-xs font-semibold"
            style={{ color: "var(--ink, #2D2823)" }}
          >
            {t ? t("auth.fullName", "Nombre completo") : "Nombre completo"} <span className="text-red-500">*</span>
          </label>
          <input
            id="popover-full-name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ulises Pérez"
            className="w-full px-3 py-1.5 rounded-md text-xs outline-none transition-all"
            style={{
              background: "var(--surface-alt, #EFECE4)",
              border: "1px solid var(--line, #E7E3D9)",
              color: "var(--ink, #2D2823)",
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="popover-job-title"
            className="text-xs font-semibold"
            style={{ color: "var(--ink, #2D2823)" }}
          >
            {t ? t("auth.jobTitle", "Cargo") : "Cargo"}
          </label>
          <input
            id="popover-job-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Quality Control / IT Admin"
            className="w-full px-3 py-1.5 rounded-md text-xs outline-none transition-all"
            style={{
              background: "var(--surface-alt, #EFECE4)",
              border: "1px solid var(--line, #E7E3D9)",
              color: "var(--ink, #2D2823)",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 mt-1 pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              background: "var(--surface-alt, #EFECE4)",
              color: "var(--muted, #736B63)",
              border: "1px solid var(--line, #E7E3D9)",
              cursor: "pointer",
            }}
          >
            {t ? t("common.cancel", "Cancelar") : "Cancelar"}
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs font-semibold rounded-md transition-all"
            style={{
              background: "var(--primary, #C27358)",
              color: "#FFFFFF",
              border: "none",
              cursor: name.trim() ? "pointer" : "not-allowed",
              opacity: name.trim() ? 1 : 0.5,
              boxShadow: name.trim()
                ? "0 2px 6px color-mix(in srgb, var(--primary, #C27358) 40%, transparent)"
                : "none",
            }}
          >
            {t ? t("common.save", "Guardar") : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Export LoginModal as alias for backward compatibility
export const LoginModal = LoginPopover;
export type LoginModalProps = LoginPopoverProps;
