import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useDatePeriod, { getPeriodDateRange } from '../context/DatePeriodContext.jsx';
import useTranslation from '../i18n/useTranslation.js';
import useAccessibleDialog from '../hooks/useAccessibleDialog.js';

const emptyForm = { type: 'expense', amount: '', category: '', description: '', date: '' };

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function serverMessage(error, t) {
  return error.response?.data?.errors?.map((item) => item.message).join(' ') ||
    error.response?.data?.message ||
    t('Could not connect to the server.');
}

export default function Transactions() {
  const { user } = useAuth();
  const { locale, t } = useTranslation();
  const { period, setPeriod } = useDatePeriod();
  const currency = user?.currency || 'USD';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency }), [currency, locale]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [filters, setFilters] = useState({ search: '', type: '', category: '', startDate: '', endDate: '' });
  const periodDates = useMemo(() => getPeriodDateRange(period), [period]);
  const effectiveDateFilters = useMemo(() => {
    if (filters.startDate || filters.endDate) {
      return {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };
    }
    return periodDates;
  }, [filters.startDate, filters.endDate, periodDates]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dialogRef = useAccessibleDialog(showForm, closeForm);

  useEffect(() => {
    api.get('/transactions/categories')
      .then(({ data }) => setCategories(data.data))
      .catch((error) => toast.error(serverMessage(error, t)));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = { page, limit: 10 };
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'startDate' || key === 'endDate') continue;
        if (value) params[key] = value;
      }
      Object.assign(params, effectiveDateFilters);

      setLoading(true);
      api.get('/transactions', { params })
        .then(({ data }) => {
          setTransactions(data.data);
          setTotal(data.total);
          setPages(data.pages);
        })
        .catch((error) => toast.error(serverMessage(error, t)))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [filters, page, refreshKey, effectiveDateFilters]);

  useEffect(() => {
    if (!showForm) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showForm]);

  function changeFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value, ...(name === 'type' ? { category: '' } : {}) }));
    setPage(1);
  }

  function changePeriod(event) {
    setPeriod(event.target.value);
    setFilters((current) => ({ ...current, startDate: '', endDate: '' }));
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, date: today() });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(transaction) {
    setEditing(transaction);
    setForm({
      type: transaction.type,
      amount: String(transaction.amount),
      category: transaction.category,
      description: transaction.description || '',
      date: transaction.date.slice(0, 10)
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError('');
  }

  function changeForm(event) {
    const { name, value } = event.target;
    setForm((current) => {
      if (name === 'type') {
        const options = categories[value] || [];
        return { ...current, type: value, category: options.includes(current.category) ? current.category : options[0] || '' };
      }
      return { ...current, [name]: value };
    });
  }

  async function saveTransaction(event) {
    event.preventDefault();
    setFormError('');

    if (!form.category) return setFormError(t('Choose a category.'));
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      return setFormError(t('Amount must be greater than zero.'));
    }
    if (!form.date) return setFormError(t('Choose a date.'));
    if (form.description.length > 500) return setFormError(t('Description must be 500 characters or fewer.'));

    setSaving(true);
    const payload = { ...form, amount: Number(form.amount), date: new Date(`${form.date}T12:00:00`).toISOString() };

    try {
      if (editing) await api.patch(`/transactions/${editing._id}`, payload);
      else await api.post('/transactions', payload);
      toast.success(t(editing ? 'Transaction updated' : 'Transaction added'));
      closeForm();
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setFormError(serverMessage(error, t));
    } finally {
      setSaving(false);
    }
  }

  async function removeTransaction(transaction) {
    if (!window.confirm(t('Delete this {category} transaction?', { category: t(transaction.category) }))) return;

    try {
      await api.delete(`/transactions/${transaction._id}`);
      toast.success(t('Transaction deleted'));
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast.error(serverMessage(error, t));
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = {
        limit: 100,
        ...Object.fromEntries(Object.entries(filters).filter(([key, value]) => value && key !== 'startDate' && key !== 'endDate')),
        ...effectiveDateFilters
      };
      const firstPage = await api.get('/transactions', { params: { ...params, page: 1 } });
      const rows = [...firstPage.data.data];
      for (let currentPage = 2; currentPage <= firstPage.data.pages; currentPage += 1) {
        const { data } = await api.get('/transactions', { params: { ...params, page: currentPage } });
        rows.push(...data.data);
      }

      const csvValue = (value) => {
        const safeValue = String(value ?? '').replace(/^[=+\-@]/, (match) => `'${match}`);
        return `"${safeValue.replaceAll('"', '""')}"`;
      };
      const lines = [
        [t('Date'), t('Type'), t('Category'), t('Description'), `${t('Amount')} (${currency})`],
        ...rows.map((item) => [new Date(item.date).toLocaleDateString(locale), t(item.type === 'income' ? 'Income' : 'Expense'), t(item.category), item.description, item.amount])
      ];
      const blob = new Blob([`\uFEFF${lines.map((line) => line.map(csvValue).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${effectiveDateFilters.startDate || 'all'}-to-${effectiveDateFilters.endDate || 'dates'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('CSV exported'));
    } catch (error) {
      toast.error(serverMessage(error, t));
    } finally {
      setExporting(false);
    }
  }

  const filterCategories = filters.type
    ? categories[filters.type] || []
    : [...new Set([...categories.income, ...categories.expense])];
  const formCategories = categories[form.type] || [];

  return (
    <section>
      <div className="mb-7 flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t('Your activity')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t('Transactions')}</h1>
          <p className="mt-2 text-slate-500">{t('Add and organize your income and expenses.')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={exportCsv} disabled={exporting || loading || total === 0} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto">
            {exporting ? t('Exporting') : t('Export CSV')}
          </button>
          <button onClick={openCreate} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
            {t('Add transaction')}
          </button>
        </div>
      </div>

      <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 sm:p-4 xl:grid-cols-3 2xl:grid-cols-6">
        <select value={period} onChange={changePeriod} aria-label={t('Time period')} className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="day">{t('Today')}</option>
          <option value="week">{t('This week')}</option>
          <option value="month">{t('This month')}</option>
          <option value="year">{t('This year')}</option>
          <option value="all">{t('All time')}</option>
        </select>
        <input name="search" value={filters.search} onChange={changeFilter} placeholder={t('Search transactions')} aria-label={t('Search transactions')} className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        <select name="type" value={filters.type} onChange={changeFilter} aria-label={t('Filter by type')} className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">{t('All types')}</option>
          <option value="income">{t('Income')}</option>
          <option value="expense">{t('Expense')}</option>
        </select>
        <select name="category" value={filters.category} onChange={changeFilter} aria-label={t('Filter by category')} className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">{t('All categories')}</option>
          {filterCategories.map((category) => <option key={category} value={category}>{t(category)}</option>)}
        </select>
        <input type="date" name="startDate" value={filters.startDate} onChange={changeFilter} aria-label={t('Start date')} className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        <input type="date" name="endDate" value={filters.endDate} onChange={changeFilter} aria-label={t('End date')} className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 text-sm text-slate-500">{t(total === 1 ? '{count} transaction' : '{count} transactions', { count: total })}</div>
        {loading ? (
          <p role="status" aria-live="polite" className="p-6 text-sm text-slate-500">{t('Loading transactions…')}</p>
        ) : transactions.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">{t('No transactions found.')}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{t('Transactions')}</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th scope="col" className="px-5 py-3">{t('Date')}</th><th scope="col" className="px-5 py-3">{t('Details')}</th><th scope="col" className="px-5 py-3">{t('Type')}</th><th scope="col" className="px-5 py-3 text-right">{t('Amount')}</th><th scope="col" className="px-5 py-3 text-right">{t('Actions')}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((item) => (
                    <tr key={item._id}>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Date(item.date).toLocaleDateString(locale)}</td>
                      <td className="px-5 py-4"><p className="font-medium text-slate-900">{t(item.category)}</p><p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{item.description || t('No description')}</p></td>
                      <td className="px-5 py-4 capitalize text-slate-600">{t(item.type === 'income' ? 'Income' : 'Expense')}</td>
                      <td className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${item.type === 'income' ? 'text-emerald-700' : 'text-slate-900'}`}>{item.type === 'income' ? '+' : '−'}{money.format(item.amount)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <button onClick={() => openEdit(item)} aria-label={`${t('Edit')} ${t(item.category)}`} className="mr-3 font-medium text-emerald-700 hover:text-emerald-900">{t('Edit')}</button>
                        <button onClick={() => removeTransaction(item)} aria-label={`${t('Delete')} ${t(item.category)}`} className="font-medium text-rose-600 hover:text-rose-800">{t('Delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 xl:hidden">
              {transactions.map((item) => (
                <li key={item._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-medium text-slate-900">{t(item.category)}</p><p className="mt-1 truncate text-xs text-slate-500">{item.description || t('No description')} · {new Date(item.date).toLocaleDateString(locale)}</p></div>
                    <span className={`whitespace-nowrap text-sm font-semibold ${item.type === 'income' ? 'text-emerald-700' : 'text-slate-900'}`}>{item.type === 'income' ? '+' : '−'}{money.format(item.amount)}</span>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm"><button onClick={() => openEdit(item)} aria-label={`${t('Edit')} ${t(item.category)}`} className="font-medium text-emerald-700">{t('Edit')}</button><button onClick={() => removeTransaction(item)} aria-label={`${t('Delete')} ${t(item.category)}`} className="font-medium text-rose-600">{t('Delete')}</button></div>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-xs text-slate-500">{t('Page')} {pages ? page : 0} {t('of')} {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40">{t('Previous')}</button>
            <button disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40">{t('Next')}</button>
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 sm:grid sm:place-items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <form
            ref={dialogRef}
            onSubmit={saveTransaction}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-form-title"
            aria-busy={saving}
            className="flex h-dvh w-full flex-col bg-white shadow-xl sm:h-auto sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <h2 id="transaction-form-title" className="text-xl font-bold text-slate-950">
                {t(editing ? 'Edit transaction' : 'Add transaction')}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label={t('Close form')}
                className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <label className="block text-sm font-medium text-slate-700">
                {t('Type')}
                <select
                  name="type"
                  value={form.type}
                  onChange={changeForm}
                  className="mt-1.5 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <option value="expense">{t('Expense')}</option>
                  <option value="income">{t('Income')}</option>
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t('Amount')}
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={changeForm}
                    className="mt-1.5 block w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {t('Category')}
                  <select
                    name="category"
                    value={form.category}
                    onChange={changeForm}
                    className="mt-1.5 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <option value="">{t('Choose category')}</option>
                    {formCategories.map((category) => (
                      <option key={category} value={category}>{t(category)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                {t('Date')}
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={changeForm}
                  className="mt-1.5 block w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                {t('Description (optional)')}
                <textarea
                  name="description"
                  maxLength="500"
                  rows="3"
                  value={form.description}
                  onChange={changeForm}
                  className="mt-1.5 block w-full min-w-0 resize-y rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              {formError && (
                <p id="transaction-form-error" role="alert" className="rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                  {formError}
                </p>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-100 bg-white p-4 sm:flex sm:justify-end sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={closeForm}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 sm:w-auto"
              >
                {t('Cancel')}
              </button>
              <button
                disabled={saving}
                className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
              >
                {saving ? t('Saving') : t(editing ? 'Save changes' : 'Add transaction')}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
