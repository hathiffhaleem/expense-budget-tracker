const categories = {
  income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'],
  expense: [
    'Housing',
    'Food',
    'Transport',
    'Utilities',
    'Healthcare',
    'Shopping',
    'Entertainment',
    'Education',
    'Travel',
    'Other'
  ]
};

const allCategories = [...new Set([...categories.income, ...categories.expense])];

module.exports = { categories, allCategories };
