import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { currencies } from '../constants/currencies.js';
import { languages } from '../i18n/translations.js';
import useTranslation from '../i18n/useTranslation.js';

export default function Settings() {
  const { user, updateCurrency, changePassword } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const { language, updateLanguage, t } = useTranslation();
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setCurrency(user?.currency || 'USD');
  }, [user?.currency]);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  async function saveCurrency(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateCurrency(currency);
      toast.success(t('Currency preference saved'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('Could not save currency preference'));
    } finally {
      setSaving(false);
    }
  }

  async function saveLanguage(event) {
    event.preventDefault();
    try {
      await updateLanguage(selectedLanguage);
      toast.success(t('Language preference saved'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('Could not save language preference'));
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordError('');
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError(t('New passwords do not match.'));
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(t('Password changed successfully'));
    } catch (error) {
      const serverMessage = error.response?.data?.errors?.map((item) => item.message).join(' ') || error.response?.data?.message;
      setPasswordError(serverMessage === 'Current password is incorrect' ? t(serverMessage) : serverMessage || t('Could not change password'));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-7">
        <p className="text-sm font-medium text-emerald-700">{t('Personalize your tracker')}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t('Settings')}</h1>
      </div>

      <section className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="font-semibold text-slate-900">{t('Dark mode')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('Use a darker color theme across the app.')}</p>
        </div>
        <button type="button" role="switch" aria-checked={darkMode} aria-label={t('Dark mode')} onClick={() => setDarkMode((enabled) => !enabled)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${darkMode ? 'bg-emerald-500' : 'bg-slate-300'}`}>
          <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </section>

      <form onSubmit={saveLanguage} className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">{t('Language')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('Choose the language used across the app.')}</p>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          {t('Display language')}
          <select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            {languages.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <button disabled={selectedLanguage === language} className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{t('Save language')}</button>
      </form>

      <form onSubmit={saveCurrency} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">{t('Currency')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('Choose how amounts are displayed throughout the app.')}</p>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          {t('Display currency')}
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            {currencies.map(({ code, name }) => <option key={code} value={code}>{code} — {name}</option>)}
          </select>
        </label>
        <p className="mt-3 text-xs text-slate-500">{t('This changes the currency label and number format. It does not convert existing amounts using exchange rates.')}</p>
        <button disabled={saving || currency === (user?.currency || 'USD')} className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
          {saving ? t('Saving') : t('Save currency')}
        </button>
      </form>

      <form onSubmit={savePassword} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">{t('Change password')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('Enter your current password, then choose a new one.')}</p>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {t('Current password')}
            <input type="password" autoComplete="current-password" required value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('New password')}
            <input type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('Confirm new password')}
            <input type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
        </div>
        {passwordError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{passwordError}</p>}
        <button disabled={passwordSaving} className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
          {passwordSaving ? t('Saving') : t('Change password')}
        </button>
      </form>
    </section>
  );
}
