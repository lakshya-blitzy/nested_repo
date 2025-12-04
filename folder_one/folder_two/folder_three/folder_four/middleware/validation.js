/**
 * Input Validation Middleware Module
 * 
 * Provides comprehensive request validation and sanitization using express-validator.
 * This module is a critical security component that prevents injection attacks
 * (XSS, SQL injection) by sanitizing all user-provided data before it reaches
 * route handlers.
 * 
 * Features:
 * - validateRequest: Factory function for creating validation middleware chains
 * - validationErrorHandler: Standardized error response middleware
 * - sanitizeInput: Global sanitization middleware for all inputs
 * - commonValidations: Pre-built validation chains for common patterns
 * 
 * Security Standards:
 * - OWASP Input Validation Guidelines
 * - Defense-in-depth approach with multiple validation layers
 * 
 * @module middleware/validation
 * @requires express-validator
 */

'use strict';

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Import express-validator components for request validation and sanitization.
 * 
 * - body: Validates/sanitizes fields in request body (POST/PUT/PATCH)
 * - param: Validates/sanitizes URL parameters (/:id, /:slug)
 * - query: Validates/sanitizes query string parameters (?page=1&sort=asc)
 * - validationResult: Collects validation errors from request
 * - matchedData: Extracts only validated/sanitized data from request
 */
const { body, param, query, validationResult, matchedData } = require('express-validator');

// =============================================================================
// VALIDATION ERROR HANDLER MIDDLEWARE
// =============================================================================

/**
 * Middleware to handle validation errors consistently across all routes.
 * 
 * This middleware should be placed after validation chains to catch any
 * validation errors and return a standardized error response. It prevents
 * invalid data from reaching route handlers and provides clear feedback
 * to API consumers about what went wrong.
 * 
 * Response Format (400 Bad Request):
 * {
 *   status: 400,
 *   error: 'Validation Error',
 *   details: [
 *     { field: 'email', message: 'Invalid email address', value: 'invalid' }
 *   ]
 * }
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|Object} Returns JSON error response or calls next()
 * 
 * @example
 * // Use after validation chains:
 * app.post('/api/users',
 *   body('email').isEmail(),
 *   validationErrorHandler,
 *   (req, res) => { // handler only runs if validation passes }
 * );
 */
const validationErrorHandler = (req, res, next) => {
  // Collect all validation errors from the request
  const errors = validationResult(req);
  
  // If there are validation errors, return standardized error response
  if (!errors.isEmpty()) {
    // Map errors to a consistent format with field, message, and value
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,           // Field name that failed validation
      message: err.msg,          // Validation error message
      value: err.value           // The invalid value submitted
    }));
    
    // Return 400 Bad Request with detailed error information
    return res.status(400).json({
      status: 400,
      error: 'Validation Error',
      details: formattedErrors
    });
  }
  
  // No validation errors - proceed to next middleware/handler
  next();
};

// =============================================================================
// COMMON SANITIZATION MIDDLEWARE
// =============================================================================

/**
 * Global sanitization middleware array for common input fields.
 * 
 * Applies trim() and escape() to ALL fields in request body and query string.
 * This provides a baseline level of protection against XSS attacks by:
 * - Trimming whitespace from start/end of strings
 * - Escaping HTML special characters (&, <, >, ", ')
 * 
 * Use this middleware early in your route definitions for broad protection.
 * For more specific validation, use validateRequest() with custom rules.
 * 
 * Security Note: This middleware uses wildcard matching ('*') to sanitize
 * all fields. For routes with specific validation needs, consider using
 * validateRequest() instead for more granular control.
 * 
 * @type {Array<ValidationChain>}
 * 
 * @example
 * // Apply to all routes:
 * app.use(sanitizeInput);
 * 
 * // Or apply to specific routes:
 * app.post('/api/data', sanitizeInput, (req, res) => { ... });
 */
const sanitizeInput = [
  // Sanitize all body fields - trim whitespace and escape HTML entities
  body('*')
    .trim()
    .escape(),
  
  // Sanitize all query parameters - trim whitespace and escape HTML entities
  query('*')
    .trim()
    .escape()
];

// =============================================================================
// VALIDATION RULES FACTORY
// =============================================================================

/**
 * Factory function to create validation middleware from validation rules.
 * 
 * This function takes an array of express-validator validation chains and
 * returns an async middleware function that:
 * 1. Runs all validations against the request
 * 2. Collects any validation errors
 * 3. Returns a 400 error response if validation fails
 * 4. Calls next() if all validations pass
 * 
 * This approach provides more flexibility than validationErrorHandler as it
 * combines running validations and error handling in a single middleware.
 * 
 * @param {Array<ValidationChain>} validations - Array of express-validator validation chains
 * @returns {Function} Async Express middleware function
 * 
 * @example
 * // Define validation rules inline:
 * app.post('/api/users',
 *   validateRequest([
 *     body('email').isEmail().normalizeEmail(),
 *     body('name').trim().escape().notEmpty(),
 *     body('age').optional().isInt({ min: 0, max: 150 })
 *   ]),
 *   (req, res) => {
 *     // Request is validated - safe to process
 *     res.json({ success: true });
 *   }
 * );
 * 
 * @example
 * // Using with commonValidations:
 * app.get('/api/users/:id',
 *   validateRequest([commonValidations.idParam]),
 *   (req, res) => { ... }
 * );
 */
const validateRequest = (validations) => {
  /**
   * Async middleware that executes all validation chains and handles errors.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>}
   */
  return async (req, res, next) => {
    // Execute all validation chains concurrently against the request
    // Each validation.run(req) modifies the request with validation results
    await Promise.all(
      validations.map((validation) => validation.run(req))
    );
    
    // Collect all validation errors from the request
    const errors = validationResult(req);
    
    // If there are validation errors, return error response
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        details: errors.array()
      });
    }
    
    // All validations passed - proceed to next middleware/handler
    next();
  };
};

// =============================================================================
// PREDEFINED VALIDATION CHAINS (Common Patterns)
// =============================================================================

/**
 * Collection of predefined validation chains for common use cases.
 * 
 * These validation chains can be used directly with validateRequest() or
 * combined with custom validation rules. They provide tested, reusable
 * validation patterns for frequently validated fields.
 * 
 * @type {Object}
 * @property {ValidationChain} idParam - Validates :id URL parameter as positive integer
 * @property {ValidationChain} email - Validates email field in request body
 * @property {Function} stringInput - Factory for validating required string fields
 * 
 * @example
 * // Using idParam for URL parameter validation:
 * app.get('/api/users/:id',
 *   validateRequest([commonValidations.idParam]),
 *   getUserById
 * );
 * 
 * @example
 * // Using email validation:
 * app.post('/api/subscribe',
 *   validateRequest([commonValidations.email]),
 *   subscribeNewsletter
 * );
 * 
 * @example
 * // Using stringInput factory:
 * app.post('/api/comments',
 *   validateRequest([
 *     commonValidations.stringInput('content'),
 *     commonValidations.stringInput('authorName')
 *   ]),
 *   createComment
 * );
 */
const commonValidations = {
  /**
   * Validates :id URL parameter as a positive integer.
   * 
   * Use this for routes that accept numeric IDs in the URL path.
   * Ensures the ID is an integer >= 1 (no zero or negative IDs).
   * 
   * @type {ValidationChain}
   * 
   * @example
   * // Route: GET /api/users/:id
   * app.get('/api/users/:id',
   *   validateRequest([commonValidations.idParam]),
   *   (req, res) => {
   *     const userId = req.params.id;  // Validated as positive integer
   *   }
   * );
   */
  idParam: param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  /**
   * Validates email field in request body.
   * 
   * Performs two operations:
   * 1. Validates that the value is a properly formatted email address
   * 2. Normalizes the email (lowercase, removes dots from gmail, etc.)
   * 
   * @type {ValidationChain}
   * 
   * @example
   * // Route: POST /api/users
   * app.post('/api/users',
   *   validateRequest([commonValidations.email]),
   *   (req, res) => {
   *     const email = req.body.email;  // Validated and normalized
   *   }
   * );
   */
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  
  /**
   * Factory function for validating required string input fields.
   * 
   * Creates a validation chain that:
   * 1. Trims whitespace from start/end
   * 2. Escapes HTML special characters for XSS prevention
   * 3. Validates that the field is not empty after trimming
   * 
   * @param {string} field - The name of the field to validate in request body
   * @returns {ValidationChain} Configured validation chain for the field
   * 
   * @example
   * // Validate 'username' and 'bio' fields:
   * app.post('/api/profile',
   *   validateRequest([
   *     commonValidations.stringInput('username'),
   *     commonValidations.stringInput('bio')
   *   ]),
   *   updateProfile
   * );
   */
  stringInput: (field) => body(field)
    .trim()
    .escape()
    .notEmpty()
    .withMessage(`${field} is required`)
};

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Export all validation utilities and re-export express-validator functions.
 * 
 * This module serves as the central point for all validation functionality,
 * allowing consumers to import everything they need from a single location:
 * 
 * - Custom middleware (validateRequest, validationErrorHandler, sanitizeInput)
 * - Pre-built validation chains (commonValidations)
 * - Re-exported express-validator functions (body, param, query, validationResult, matchedData)
 * 
 * @example
 * // Import everything needed for validation:
 * const {
 *   validateRequest,
 *   validationErrorHandler,
 *   sanitizeInput,
 *   body,
 *   param,
 *   query,
 *   validationResult,
 *   matchedData,
 *   commonValidations
 * } = require('./middleware/validation');
 * 
 * @example
 * // Minimal import for simple validation:
 * const { validateRequest, body } = require('./middleware/validation');
 * 
 * app.post('/api/data',
 *   validateRequest([body('input').trim().escape().notEmpty()]),
 *   (req, res) => {
 *     // Handle validated request
 *     res.json({ received: req.body.input });
 *   }
 * );
 */
module.exports = {
  // Custom middleware functions
  validateRequest,
  validationErrorHandler,
  sanitizeInput,
  
  // Re-export express-validator functions for convenience
  // This allows consumers to import everything from one module
  validationResult,
  body,
  param,
  query,
  matchedData,
  
  // Predefined validation chains for common patterns
  commonValidations
};
