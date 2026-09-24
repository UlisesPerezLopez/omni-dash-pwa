import { useState, useCallback, useMemo } from "react";
import { getTranslator, flatLocales, locales } from "../locales";
import type { Language } from "../types";

export const languages: Language[] = ["en", "es", "de", "fr", "it", "zh", "ja"];

/**
 * Custom hook for i18n translation support across OmniDash.
 * Resolves both nested keys ("nav.sales", "drawer.customer") and flat keys ("sales", "customer").
 */
export function useTranslation(initialLang?: Language) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(initialLang || "en");

  // Allow sync with external language state if provided
  const activeLang = initialLang !== undefined ? initialLang : currentLanguage;

  const translator = useMemo(() => getTranslator(activeLang), [activeLang]);

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      return translator(key, defaultText);
    },
    [translator]
  );

  return {
    t,
    language: activeLang,
    setLanguage: setCurrentLanguage,
    languages,
  };
}

export { getTranslator, flatLocales, locales };
