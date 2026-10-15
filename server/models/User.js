const mongoose = require('mongoose');
const { currencyCodes } = require('../constants/currencies');
const { languageCodes } = require('../constants/languages');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    currency: { type: String, enum: currencyCodes, default: 'USD' },
    language: { type: String, enum: languageCodes, default: 'en' },
    password: { type: String, required: true, select: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
