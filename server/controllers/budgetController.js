const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

function monthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    $gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
    $lt: new Date(Date.UTC(year, monthNumber, 1))
  };
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listBudgets(req, res) {
  const filter = { user: req.user._id };
  if (req.query.month) filter.month = req.query.month;
  return res.json({ data: await Budget.find(filter).sort({ month: -1, category: 1 }) });
}

async function createBudget(req, res) {
  const budget = await Budget.create({
    user: req.user._id,
    month: req.body.month,
    category: req.body.category || null,
    limit: req.body.limit
  });
  return res.status(201).json({ data: budget });
}

async function getBudget(req, res) {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
  if (!budget) throw httpError('Budget not found', 404);
  return res.json({ data: budget });
}

async function updateBudget(req, res) {
  const updates = {};
  for (const field of ['month', 'category', 'limit']) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = field === 'category' && req.body[field] === '' ? null : req.body[field];
    }
  }
  const budget = await Budget.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!budget) throw httpError('Budget not found', 404);
  return res.json({ data: budget });
}

async function deleteBudget(req, res) {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) throw httpError('Budget not found', 404);
  return res.json({ message: 'Budget deleted' });
}

async function getBudgetProgress(req, res) {
  const { month } = req.query;
  const budgets = await Budget.find({ user: req.user._id, month }).sort({ category: 1 });
  const totals = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        type: 'expense',
        date: monthRange(month)
      }
    },
    { $group: { _id: '$category', spent: { $sum: '$amount' } } }
  ]);
  const spentByCategory = new Map(totals.map(({ _id, spent }) => [_id, spent]));
  const totalSpent = totals.reduce((sum, item) => sum + item.spent, 0);
  const data = budgets.map((budget) => {
    const spent = budget.category ? spentByCategory.get(budget.category) || 0 : totalSpent;
    return {
      ...budget.toObject(),
      spent,
      remaining: Math.max(budget.limit - spent, 0),
      percent: budget.limit ? Math.round((spent / budget.limit) * 100) : 0
    };
  });
  return res.json({ data });
}

module.exports = { listBudgets, createBudget, getBudget, updateBudget, deleteBudget, getBudgetProgress };
