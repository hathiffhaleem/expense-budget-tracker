import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import useTranslation from '../i18n/useTranslation.js';
import MoneyMapLogo from './MoneyMapLogo.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validate() {
    const nextErrors = {};
    if (isRegister && !form.name.trim()) nextErrors.name = t('Enter your name.');
    if (isRegister && form.name.trim().length > 80) nextErrors.name = t('Name must be 80 characters or fewer.');
    if (!emailPattern.test(form.email.trim())) nextErrors.email = t('Enter a valid email address.');
    if (isRegister && (form.password.length < 8 || form.password.length > 72)) {
      nextErrors.password = t('Password must be 8 to 72 characters.');
    }
    if (!isRegister && !form.password) nextErrors.password = t('Enter your password.');
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setServerError('');
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const credentials = {
        email: form.email.trim(),
        password: form.password,
        ...(isRegister && { name: form.name.trim() })
      };
      if (isRegister) await register(credentials);
      else await login(credentials);
      toast.success(t(isRegister ? 'Account created' : 'Welcome back toast'));
      navigate('/', { replace: true });
    } catch (error) {
      const response = error.response?.data;
      setServerError(
        response?.errors?.map((item) => item.message).join(' ') ||
        response?.message ||
        t('Could not connect to the server. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  const inputClass = (field, margin = true) => `${margin ? 'mt-1.5 ' : ''}w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition focus:ring-4 ${errors[field] ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'}`;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
        <Link to="/login" className="mb-8 flex items-center gap-3">
          <MoneyMapLogo dark iconClassName="size-11" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {t(isRegister ? 'Create your account' : 'Welcome back')}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t(isRegister ? 'Start organizing your money today.' : 'Sign in to manage your money.')}
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <label className="block text-sm font-medium text-slate-700">
              {t('Name')}
              <input name="name" value={form.name} onChange={updateField} autoComplete="name" className={inputClass('name')} />
              {errors.name && <span className="mt-1 block text-xs text-rose-600">{errors.name}</span>}
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
              {t('Email')}
            <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" className={inputClass('email')} />
            {errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            {t('Password')}
            <div className="relative mt-1.5">
              <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} autoComplete={isRegister ? 'new-password' : 'current-password'} className={`${inputClass('password', false)} pr-12`} />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={t(showPassword ? 'Hide password' : 'Show password')} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {showPassword ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.3 4 9.5 6.2a1.7 1.7 0 010 1.6 14 14 0 01-3.1 3.8M6.2 6.2a14 14 0 00-3.7 5 1.7 1.7 0 000 1.6A10.8 10.8 0 0012 19c1 0 2-.2 2.9-.5" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password}</span>}
          </label>

          {serverError && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{serverError}</p>}

          <button disabled={submitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
            {submitting ? t('Please wait…') : t(isRegister ? 'Create account' : 'Sign in')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t(isRegister ? 'Already have an account?' : 'New to MoneyMap?')}{' '}
          <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-emerald-700 hover:text-emerald-800">
            {t(isRegister ? 'Sign in' : 'Create account')}
          </Link>
        </p>
      </section>
    </main>
  );
}
