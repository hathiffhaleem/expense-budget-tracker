const express = require('express');
const { body, param, query } = require('express-validator');
const { allCategories, categories } = require('../constants/transactionCategories');
const {
  getCategories,
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction
} = require('../controllers/transactionController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const types = ['income', 'expense'];

router.use(protect);

router.get(
  '/categories',
  [query('type').optional().isIn(types).withMessage('Type must be income or expense'), validate],
  getCategories
);

router.get(
  '/',
  [
    query('search').optional().trim().isLength({ max: 100 }).withMessage('Search is too long'),
    query('type').optional().isIn(types).withMessage('Type must be income or expense'),
    query('category').optional().isIn(allCategories).withMessage('Choose a valid category'),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('endDate must be a valid date')
      .bail()
      .custom((endDate, { req }) => !req.query.startDate || new Date(endDate) >= new Date(req.query.startDate))
      .withMessage('endDate must be on or after startDate'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    validate
  ],
  asyncHandler(listTransactions)
);

router.post(
  '/',
  [
    body('type').isIn(types).withMessage('Type must be income or expense'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero').toFloat(),
    body('category')
      .isString()
      .withMessage('Category must be text')
      .bail()
      .trim()
      .isIn(allCategories)
      .withMessage('Choose a valid category')
      .bail()
      .custom((category, { req }) => {
        const type = req.body.type;
        return types.includes(type) && categories[type].includes(category);
      })
      .withMessage('Category must match the transaction type'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be text')
      .bail()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or fewer'),
    body('date').optional().isISO8601().withMessage('Date must be valid').bail().toDate(),
    validate
  ],
  asyncHandler(createTransaction)
);

const idRule = param('id').isMongoId().withMessage('Invalid transaction ID');

router.get('/:id', [idRule, validate], asyncHandler(getTransaction));

router.patch(
  '/:id',
  [
    idRule,
    body('type').optional().isIn(types).withMessage('Type must be income or expense'),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be greater than zero').toFloat(),
    body('category')
      .optional()
      .isString()
      .withMessage('Category must be text')
      .bail()
      .trim()
      .isIn(allCategories)
      .withMessage('Choose a valid category'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be text')
      .bail()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or fewer'),
    body('date').optional().isISO8601().withMessage('Date must be valid').bail().toDate(),
    validate
  ],
  asyncHandler(updateTransaction)
);

router.delete('/:id', [idRule, validate], asyncHandler(deleteTransaction));

module.exports = router;
