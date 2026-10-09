import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const nextErrors = {};
    if (isRegister && !form.name.trim()) nextErrors.name = 'Enter your name.';
    if (isRegister && form.name.trim().length > 80) nextErrors.name = 'Name must be 80 characters or fewer.';
    if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (isRegister && (form.password.length < 8 || form.password.length > 72)) {
      nextErrors.password = 'Password must be 8 to 72 characters.';
    }
    if (!isRegister && !form.password) nextErrors.password = 'Enter your password.';
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
      toast.success(isRegister ? 'Account created' : 'Welcome back');
      navigate('/', { replace: true });
    } catch (error) {
      const response = error.response?.data;
      setServerError(
        response?.errors?.map((item) => item.message).join(' ') ||
        response?.message ||
        'Could not connect to the server. Please try again.'
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

  const inputClass = (field) => `mt-1.5 w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition focus:ring-4 ${errors[field] ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'}`;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
        <Link to="/login" className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-400 font-bold text-slate-950">E</span>
          <span className="font-semibold text-slate-900">Expense Tracker</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isRegister ? 'Start organizing your money today.' : 'Sign in to manage your money.'}
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input name="name" value={form.name} onChange={updateField} autoComplete="name" className={inputClass('name')} />
              {errors.name && <span className="mt-1 block text-xs text-rose-600">{errors.name}</span>}
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" className={inputClass('email')} />
            {errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input name="password" type="password" value={form.password} onChange={updateField} autoComplete={isRegister ? 'new-password' : 'current-password'} className={inputClass('password')} />
            {errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password}</span>}
          </label>

          {serverError && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{serverError}</p>}

          <button disabled={submitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? 'Already have an account?' : 'New to Expense Tracker?'}{' '}
          <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-emerald-700 hover:text-emerald-800">
            {isRegister ? 'Sign in' : 'Create account'}
          </Link>
        </p>
      </section>
    </main>
  );
}
