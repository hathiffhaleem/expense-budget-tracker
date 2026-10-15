import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useTranslation from '../i18n/useTranslation.js';

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const emptyForm = { category: '', limit: '' };

function message(error, t) {
  return error.response?.data?.errors?.map((item) => item.message).join(' ') || error.response?.data?.message || t('Could not complete the request.');
}

export default function Budgets() {
  const { user } = useAuth();
  const { locale, t } = useTranslation();
  const currency = user?.currency || 'USD';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency }), [currency, locale]);
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadBudgets(selectedMonth = month) {
    setLoading(true);
    try {
      const { data } = await api.get('/budget/progress', { params: { month: selectedMonth } });
      setBudgets(data.data);
    } catch (error) {
      toast.error(message(error, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get('/transactions/categories', { params: { type: 'expense' } })
      .then(({ data }) => setCategories(data.data))
      .catch((error) => toast.error(message(error, t)));
  }, []);

  useEffect(() => {
    loadBudgets(month);
  }, [month]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(budget) {
    setEditing(budget);
    setForm({ category: budget.category || '', limit: String(budget.limit) });
    setFormError('');
    setShowForm(true);
  }

  async function saveBudget(event) {
    event.preventDefault();
    setFormError('');
    if (!Number.isFinite(Number(form.limit)) || Number(form.limit) <= 0) {
      setFormError(t('Budget limit must be greater than zero.'));
      return;
    }

    setSaving(true);
    const payload = { month, category: form.category || null, limit: Number(form.limit) };
    try {
      if (editing) await api.patch(`/budget/${editing._id}`, payload);
      else await api.post('/budget', payload);
      toast.success(t(editing ? 'Budget updated' : 'Budget added'));
      setShowForm(false);
      setEditing(null);
      await loadBudgets(month);
    } catch (error) {
      setFormError(message(error, t));
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(budget) {
    if (!window.confirm(`${t('Delete')} ${t(budget.category || 'Overall spending')} ${t('budget for')} ${month}?`)) return;
    try {
      await api.delete(`/budget/${budget._id}`);
      toast.success(t('Budget deleted'));
      await loadBudgets(month);
    } catch (error) {
      toast.error(message(error, t));
    }
  }

  return (
    <section>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t('Plan your spending')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t('Budgets')}</h1>
          <p className="mt-2 text-slate-500">{t('Set monthly limits and keep track of your spending.')}</p>
        </div>
        <button onClick={openCreate} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
          {t('Set budget')}
        </button>
      </div>

      <label className="mb-5 block max-w-xs text-sm font-medium text-slate-700">
        {t('Month')}
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />
      </label>

      {loading ? <p className="text-sm text-slate-500">{t('Loading budgets…')}</p> : budgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium text-slate-900">{t('No budgets for this month yet.')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('Set an overall or category budget to get started.')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => {
            const percent = budget.percent || 0;
            const color = percent >= 100 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-400' : 'bg-emerald-500';
            const textColor = percent >= 100 ? 'text-rose-700' : percent >= 75 ? 'text-amber-700' : 'text-emerald-700';
            return (
              <article key={budget._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-950">{t(budget.category || 'Overall spending')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{money.format(budget.spent)} {t('spent of')} {money.format(budget.limit)}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${textColor}`}>{percent}%</span>
                </div>
                <div role="progressbar" aria-label={`${t(budget.category || 'Overall spending')} ${t('budget used')}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(percent, 100)} className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
                <div className="mt-2 flex justify-between gap-2 text-xs text-slate-500">
                  <span>{percent >= 100 ? t('Budget reached') : `${money.format(budget.remaining)} ${t('remaining')}`}</span>
                  <span>{percent >= 100 ? t('Over limit') : t('Left')}</span>
                </div>
                <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-sm">
                  <button onClick={() => openEdit(budget)} className="font-medium text-emerald-700 hover:text-emerald-900">{t('Edit')}</button>
                  <button onClick={() => deleteBudget(budget)} className="font-medium text-rose-600 hover:text-rose-800">{t('Delete')}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}>
          <form onSubmit={saveBudget} role="dialog" aria-modal="true" aria-labelledby="budget-form-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 id="budget-form-title" className="text-xl font-bold text-slate-950">{t(editing ? 'Edit budget' : 'Set budget')}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label={t('Close form')} className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <p className="mt-1 text-sm text-slate-500">{t('For')} {month}</p>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              {t('Category')}
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <option value="">{t('Overall spending')}</option>
                {categories.map((category) => <option key={category} value={category}>{t(category)}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {t('Monthly limit')}
              <input type="number" min="0.01" step="0.01" required value={form.limit} onChange={(event) => setForm((current) => ({ ...current, limit: event.target.value }))} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            {formError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{formError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">{t('Cancel')}</button>
              <button disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? t('Saving') : t(editing ? 'Save changes' : 'Set budget')}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
