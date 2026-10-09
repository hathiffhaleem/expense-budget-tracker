import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data }) => setDashboard(data))
      .catch((error) => toast.error(error.response?.data?.message || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const stats = dashboard
    ? [
        { label: 'Total income', value: dashboard.totalIncome },
        { label: 'Total expenses', value: dashboard.totalExpense },
        { label: 'Balance', value: dashboard.balance }
      ]
    : [];

  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-medium text-emerald-700">Your finances</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Overview</h1>
        <p className="mt-2 text-slate-500">A quick look at your income and spending.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading dashboard…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map(({ label, value }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-2xl font-bold text-slate-950">{money.format(value || 0)}</p>
              </article>
            ))}
          </section>
          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Recent transactions</h2>
              {dashboard?.lastTransactions?.length ? (
                <ul className="mt-4 divide-y divide-slate-100">
                  {dashboard.lastTransactions.map((item) => (
                    <li key={item._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="truncate text-slate-600">{item.description || item.category}</span>
                      <span className={item.type === 'income' ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-900'}>
                        {money.format(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-4 text-sm text-slate-500">No transactions yet.</p>}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Expenses by category</h2>
              {dashboard?.expenseByCategory?.length ? (
                <ul className="mt-4 space-y-3">
                  {dashboard.expenseByCategory.map((item) => (
                    <li key={item.category} className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-600">{item.category}</span>
                      <span className="font-semibold text-slate-900">{money.format(item.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-4 text-sm text-slate-500">No expenses yet.</p>}
            </article>
          </section>
        </>
      )}
    </>
  );
}
