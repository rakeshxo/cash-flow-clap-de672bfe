import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { languages, resources } from "./resources";

export const STORAGE_KEY = "sp-language";

export const applyDocumentLanguage = (code: string) => {
  const meta = languages.find((l) => l.code === code) ?? languages[0];
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: languages.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

applyDocumentLanguage(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", (lng) => applyDocumentLanguage(lng));

export default i18n;
