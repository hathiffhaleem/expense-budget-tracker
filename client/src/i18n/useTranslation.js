import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { locales, translations } from './translations.js';

export default function useTranslation() {
  const { user, updateLanguage } = useAuth();
  const language = user?.language || 'en';
  const locale = locales[language] || locales.en;
  const dictionary = translations[language] || translations.en;
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const t = (key, values = {}) => {
    let text = dictionary[key] || translations.en[key] || key;
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, value);
    return text;
  };
  return { language, locale, updateLanguage, t };
}
