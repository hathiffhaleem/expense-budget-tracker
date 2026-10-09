const express = require('express');
const { body, param, query } = require('express-validator');
const { categories } = require('../constants/transactionCategories');
const {
  listBudgets,
  createBudget,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetProgress
} = require('../controllers/budgetController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const monthRule = (field) =>
  field('month')
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('Month must use YYYY-MM format');
const categoryRule = (field) =>
  field('category')
    .optional({ nullable: true })
    .isIn(categories.expense)
    .withMessage('Choose a valid expense category');
const idRule = param('id').isMongoId().withMessage('Invalid budget ID');

router.use(protect);

router.get(
  '/progress',
  [query('month').matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must use YYYY-MM format'), validate],
  asyncHandler(getBudgetProgress)
);

router.get(
  '/',
  [query('month').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must use YYYY-MM format'), validate],
  asyncHandler(listBudgets)
);

router.post(
  '/',
  [
    body('month')
      .isString()
      .withMessage('Month must use YYYY-MM format')
      .bail()
      .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
      .withMessage('Month must use YYYY-MM format'),
    categoryRule(body),
    body('limit').isFloat({ gt: 0 }).withMessage('Limit must be greater than zero').toFloat(),
    validate
  ],
  asyncHandler(createBudget)
);

router.get('/:id', [idRule, validate], asyncHandler(getBudget));

router.patch(
  '/:id',
  [
    idRule,
    monthRule(body).optional(),
    categoryRule(body),
    body('limit').optional().isFloat({ gt: 0 }).withMessage('Limit must be greater than zero').toFloat(),
    validate
  ],
  asyncHandler(updateBudget)
);

router.delete('/:id', [idRule, validate], asyncHandler(deleteBudget));

module.exports = router;
