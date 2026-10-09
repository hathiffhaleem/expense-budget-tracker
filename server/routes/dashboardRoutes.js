const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.get('/', protect, asyncHandler(getDashboard));

module.exports = router;
