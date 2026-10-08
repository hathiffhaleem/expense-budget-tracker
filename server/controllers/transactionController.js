const Transaction = require('../models/Transaction');
const { categories } = require('../constants/transactionCategories');

const searchableFields = ['type', 'amount', 'category', 'description', 'date'];

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilter(req) {
  const filter = { user: req.user._id };
  const { search, type, category, startDate, endDate } = req.query;

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ category: expression }, { description: expression }];
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  return filter;
}

function getCategories(req, res) {
  const data = req.query.type ? categories[req.query.type] : categories;
  return res.json({ data });
}

async function listTransactions(req, res) {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const filter = buildFilter(req);
  const [data, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter)
  ]);

  return res.json({ data, total, page, limit, pages: Math.ceil(total / limit) });
}

async function createTransaction(req, res) {
  const { type, amount, category, description, date } = req.body;
  if (!categories[type].includes(category)) {
    throw httpError('Category must match the transaction type', 400);
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    type,
    amount,
    category,
    description,
    date
  });

  return res.status(201).json({ data: transaction });
}

async function getTransaction(req, res) {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id
  });
  if (!transaction) throw httpError('Transaction not found', 404);
  return res.json({ data: transaction });
}

async function updateTransaction(req, res) {
  const filter = { _id: req.params.id, user: req.user._id };
  const transaction = await Transaction.findOne(filter);
  if (!transaction) throw httpError('Transaction not found', 404);

  const updates = {};
  for (const field of searchableFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
  }

  const type = updates.type || transaction.type;
  const category = updates.category || transaction.category;
  if (!categories[type].includes(category)) {
    throw httpError('Category must match the transaction type', 400);
  }

  Object.assign(transaction, updates);
  await transaction.save();
  return res.json({ data: transaction });
}

async function deleteTransaction(req, res) {
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });
  if (!transaction) throw httpError('Transaction not found', 404);
  return res.json({ message: 'Transaction deleted' });
}

module.exports = {
  getCategories,
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction
};
