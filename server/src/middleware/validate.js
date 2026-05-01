const { validationResult } = require('express-validator');

/**
 * Middleware that checks for validation errors from express-validator
 * and returns 400 with formatted error messages.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({ errors: formattedErrors });
  }
  next();
};

module.exports = { validate };
