const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { currencyCodes } = require('../constants/currencies');
const { languageCodes } = require('../constants/languages');

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function userResponse(user) {
  return { id: user.id, name: user.name, email: user.email, currency: user.currency || 'USD', language: user.language || 'en' };
}

async function register(req, res) {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  try {
    const user = await User.create({ name, email: normalizedEmail, password: hashedPassword });
    return res.status(201).json({ user: userResponse(user), token: createToken(user.id) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already registered' });
    throw error;
  }
}

async function login(req, res) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  return res.json({ user: userResponse(user), token: createToken(user.id) });
}

function getMe(req, res) {
  return res.json({ user: userResponse(req.user) });
}

async function updateCurrency(req, res) {
  if (!currencyCodes.includes(req.body.currency)) {
    return res.status(400).json({ message: 'Choose a supported currency' });
  }
  req.user.currency = req.body.currency;
  await req.user.save();
  return res.json({ user: userResponse(req.user) });
}

async function updateLanguage(req, res) {
  if (!languageCodes.includes(req.body.language)) {
    return res.status(400).json({ message: 'Choose a supported language' });
  }
  req.user.language = req.body.language;
  await req.user.save();
  return res.json({ user: userResponse(req.user) });
}

async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await bcrypt.compare(req.body.currentPassword, user.password))) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }
  if (req.body.currentPassword === req.body.newPassword) {
    return res.status(400).json({ message: 'Choose a new password different from your current one' });
  }

  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  return res.json({ message: 'Password changed successfully' });
}

module.exports = { register, login, getMe, updateCurrency, updateLanguage, changePassword };
