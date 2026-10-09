function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const status = error.status || (error.code === 11000 ? 409 : error.name === 'ValidationError' ? 400 : 500);
  const message = error.code === 11000 ? 'A budget already exists for this month and category' : error.message;
  if (status >= 500) console.error(error);
  res.status(status).json({
    message: status >= 500 ? 'Server error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
}

module.exports = { notFound, errorHandler };
