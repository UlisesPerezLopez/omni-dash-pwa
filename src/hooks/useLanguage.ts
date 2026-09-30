import { useState, useEffect, useCallback } from "react";
import type { Language } from "../types";

export const SUPPORTED_LANGUAGES: Language[] = ["en", "es", "de", "fr", "it", "zh", "ja"];

/**
 * Custom hook to retrieve and synchronize the active language across OmniDash components.
 * Can be initialized with a specific language or dynamically detect it from HTML, localStorage, or custom events.
 */
export function useLanguage(initialLang?: Language | string) {
  const getInitialLanguage = (): Language => {
    if (initialLang && SUPPORTED_LANGUAGES.includes(initialLang as Language)) {
      return initialLang as Language;
    }
    if (typeof document !== "undefined" && document.documentElement.lang) {
      const htmlLang = document.documentElement.lang as Language;
      if (SUPPORTED_LANGUAGES.includes(htmlLang)) {
        return htmlLang;
      }
    }
    try {
      const stored = localStorage.getItem("omnidash_language") as Language;
      if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
        return stored;
      }
    } catch {
      // LocalStorage might be disabled or restricted
    }
    return "en";
  };

  const [currentLanguage, setCurrentLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    if (initialLang && SUPPORTED_LANGUAGES.includes(initialLang as Language)) {
      setCurrentLanguage(initialLang as Language);
    }
  }, [initialLang]);

  useEffect(() => {
    const handleCustomLangChange = (e: Event) => {
      const customEvt = e as CustomEvent<Language>;
      if (customEvt.detail && SUPPORTED_LANGUAGES.includes(customEvt.detail)) {
        setCurrentLanguage(customEvt.detail);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "omnidash_language" && e.newValue && SUPPORTED_LANGUAGES.includes(e.newValue as Language)) {
        setCurrentLanguage(e.newValue as Language);
      }
    };

    window.addEventListener("omnidash_language_change", handleCustomLangChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("omnidash_language_change", handleCustomLangChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(newLang)) return;
    setCurrentLanguage(newLang);
    try {
      localStorage.setItem("omnidash_language", newLang);
      if (typeof document !== "undefined") {
        document.documentElement.lang = newLang;
      }
      window.dispatchEvent(new CustomEvent("omnidash_language_change", { detail: newLang }));
    } catch {
      // ignore
    }
  }, []);

  return {
    currentLanguage,
    language: currentLanguage,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
  };
}
