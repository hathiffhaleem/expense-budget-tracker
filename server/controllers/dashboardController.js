const Transaction = require('../models/Transaction');

async function getDashboard(req, res) {
  const now = new Date();
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const [totals, lastTransactions, categoryTotals, monthlyTotals] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]),
    Transaction.find({ user: req.user._id }).sort({ date: -1, createdAt: -1 }).limit(5),
    Transaction.aggregate([
      { $match: { user: req.user._id, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]),
    Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: firstMonth } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
        }
      }
    ])
  ]);

  const totalsByType = Object.fromEntries(totals.map(({ _id, total }) => [_id, total]));
  const monthlyByKey = new Map(
    monthlyTotals.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, '0')}`, item])
  );
  const monthlyIncomeVsExpense = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const totalsForMonth = monthlyByKey.get(month);
    return { month, income: totalsForMonth?.income || 0, expense: totalsForMonth?.expense || 0 };
  });

  return res.json({
    totalIncome: totalsByType.income || 0,
    totalExpense: totalsByType.expense || 0,
    balance: (totalsByType.income || 0) - (totalsByType.expense || 0),
    lastTransactions,
    expenseByCategory: categoryTotals.map(({ _id, total }) => ({ category: _id, total })),
    monthlyIncomeVsExpense
  });
}

module.exports = { getDashboard };
