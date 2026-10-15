const express = require('express');
const { query } = require('express-validator');
const { getDashboard } = require('../controllers/dashboardController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.get(
  '/',
  protect,
  query('startDate').optional().isISO8601({ strict: true }).withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601({ strict: true }).withMessage('End date must be a valid ISO date'),
  query('endDate').custom((endDate, { req }) => {
    const startDate = req.query.startDate;
    if (Boolean(startDate) !== Boolean(endDate)) throw new Error('Start and end dates must be provided together');
    if (startDate && Date.parse(endDate) < Date.parse(startDate)) throw new Error('End date must not be before start date');
    return true;
  }),
  validate,
  asyncHandler(getDashboard)
);

module.exports = router;
