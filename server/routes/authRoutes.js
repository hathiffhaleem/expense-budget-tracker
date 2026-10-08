const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const emailRule = body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail();
const passwordRule = body('password').isString().isLength({ min: 8, max: 72 })
  .withMessage('Password must be 8 to 72 characters');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 })
    .withMessage('Name must be 80 characters or fewer'),
  emailRule,
  passwordRule,
  validate
], asyncHandler(register));

router.post('/login', [emailRule, body('password').notEmpty().withMessage('Password is required'), validate], asyncHandler(login));
router.get('/me', protect, getMe);

module.exports = router;
