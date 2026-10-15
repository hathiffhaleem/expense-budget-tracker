import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useDatePeriod, { getPeriodDateRange } from '../context/DatePeriodContext.jsx';
import useTranslation from '../i18n/useTranslation.js';

const colors = ['#10b981', '#0f172a', '#f59e0b', '#3b82f6', '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316', '#64748b', '#84cc16'];

function monthLabel(value, locale) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { locale, t } = useTranslation();
  const { period, setPeriod } = useDatePeriod();
  const currency = user?.currency || 'USD';
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency }), [currency, locale]);
  const compactMoney = useMemo(() => new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }), [currency, locale]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const periodDates = useMemo(() => getPeriodDateRange(period), [period]);

  useEffect(() => {
    const controller = new AbortController();
    setDashboard(null);
    setLoading(true);
    api.get('/dashboard', { params: periodDates, signal: controller.signal })
      .then(({ data }) => setDashboard(data))
      .catch((error) => {
        if (!controller.signal.aborted) toast.error(error.response?.data?.message || t('Could not load dashboard'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [periodDates]);

  const stats = dashboard
    ? [
        { label: t('Total income'), value: dashboard.totalIncome },
        { label: t('Total expenses'), value: dashboard.totalExpense },
        { label: t('Balance'), value: dashboard.balance }
      ]
    : [];
  const categoryData = (dashboard?.expenseByCategory || []).map((item, index) => ({
    ...item,
    category: t(item.category),
    color: colors[index % colors.length]
  }));
  const categoryTotal = categoryData.reduce((total, item) => total + item.total, 0);

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t('Your finances')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t('Overview')}</h1>
          <p className="mt-2 text-slate-500">{t('A quick look at your income and spending.')}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>{t('Time period')}</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="day">{t('Today')}</option>
            <option value="week">{t('This week')}</option>
            <option value="month">{t('This month')}</option>
            <option value="year">{t('This year')}</option>
            <option value="all">{t('All time')}</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t('Loading dashboard…')}</p>
      ) : dashboard && (
        <>
          <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map(({ label, value }) => (
              <article key={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 break-words text-xl font-bold text-slate-950 sm:text-2xl">{money.format(value || 0)}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">{t('Expenses by category')}</h2>
              {categoryData.length ? (
                <div className="mt-4 grid min-w-0 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.9fr)]">
                  <div className="relative h-60 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius="58%" outerRadius="88%" paddingAngle={3} cornerRadius={5} stroke="white" strokeWidth={3}>
                          {categoryData.map((item, index) => <Cell key={`${item.category}-${index}`} fill={item.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => money.format(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-medium text-slate-500">{t('Total expenses')}</span>
                      <span className="mt-1 max-w-[90%] truncate text-sm font-bold text-slate-900">{compactMoney.format(categoryTotal)}</span>
                    </div>
                  </div>
                  <ul className="max-h-60 min-w-0 space-y-1.5 overflow-y-auto pr-1">
                    {categoryData.map((item, index) => (
                      <li key={`${item.category}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="min-w-0 flex-1 truncate text-slate-600">{item.category}</span>
                        <span className="shrink-0 text-xs font-semibold text-slate-900">{categoryTotal ? `${Math.round(item.total / categoryTotal * 100)}%` : '0%'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <p className="mt-4 text-sm text-slate-500">{t('No expenses yet.')}</p>}
            </article>

            <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">{t('Income vs expenses')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('Last 6 months')}</p>
              <div className="mt-4 h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.monthlyIncomeVsExpense || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={(value) => monthLabel(value, locale)} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => compactMoney.format(value)} tickLine={false} axisLine={false} width={64} />
                    <Tooltip labelFormatter={(value) => monthLabel(value, locale)} formatter={(value) => money.format(value)} />
                    <Legend />
                    <Bar dataKey="income" name={t('Income')} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name={t('Expenses')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">{t('Recent transactions')}</h2>
              {dashboard.lastTransactions?.length ? (
                <ul className="mt-4 divide-y divide-slate-100">
                  {dashboard.lastTransactions.map((item) => (
                    <li key={item._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="truncate text-slate-600">{item.description || t(item.category)}</span>
                      <span className={item.type === 'income' ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-900'}>
                        {money.format(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-4 text-sm text-slate-500">{t('No transactions yet.')}</p>}
            </article>
          </section>
        </>
      )}
    </>
  );
}
