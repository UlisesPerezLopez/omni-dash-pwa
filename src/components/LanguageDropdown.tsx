import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import type { Language } from "../types";

export interface LanguageOption {
  code: Language;
  flagClass: string;
  label: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", flagClass: "fi fi-gb", label: "English" },
  { code: "es", flagClass: "fi fi-es", label: "Español" },
  { code: "de", flagClass: "fi fi-de", label: "Deutsch" },
  { code: "fr", flagClass: "fi fi-fr", label: "Français" },
  { code: "it", flagClass: "fi fi-it", label: "Italiano" },
  { code: "zh", flagClass: "fi fi-cn", label: "简体中文" },
  { code: "ja", flagClass: "fi fi-jp", label: "日本語" },
];

export function LanguageDropdown({
  currentLanguage,
  onSelectLanguage,
  ariaLabel = "Language Selector",
}: {
  currentLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  ariaLabel?: string;
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

  const activeLang = LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0];

  return (
    <div className="lang-menu-container" ref={containerRef}>
      <button
        type="button"
        className="lang-menu-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className={`${activeLang.flagClass} lang-flag-icon`} />
        <span className="lang-btn-text">{activeLang.label}</span>
        <Icon name="chevron" size={11} />
      </button>

      {isOpen && (
        <div className="lang-dropdown-popover" role="listbox">
          <div className="lang-dropdown-header">IDIOMA / LANGUAGE</div>
          <div className="lang-dropdown-list">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={`lang-dropdown-item ${isSelected ? "selected" : ""}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectLanguage(lang.code);
                    setIsOpen(false);
                  }}
                >
                  <span className={`${lang.flagClass} lang-flag-icon`} />
                  <span className="lang-item-label">{lang.label}</span>
                  {isSelected && <Icon name="check" size={13} className="lang-item-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
