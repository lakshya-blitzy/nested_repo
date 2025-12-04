/**
 * Middleware Aggregation Module
 * 
 * This module serves as the central entry point for all security middleware
 * components in the application. It imports and re-exports middleware from
 * individual modules, providing a single location for app.js to import all
 * middleware requirements.
 * 
 * Architecture:
 * - Centralizes all middleware exports for clean imports in app.js
 * - Provides individual middleware exports for granular control
 * - Provides aggregated middleware array for bulk application
 * 
 * Security Middlewares Included:
 * - Rate Limiting: Prevents abuse, brute force, and DDoS attacks
 * - Input Validation: Sanitizes and validates user inputs to prevent injection attacks
 * 
 * @module middleware
 * @see module:middleware/rateLimiter
 * @see module:middleware/validation
 */

'use strict';

// =============================================================================
// IMPORTS FROM RATE LIMITER MODULE
// =============================================================================

/**
 * Import rate limiting middleware from the rateLimiter module.
 * 
 * - rateLimiter: Standard rate limiter (15-min window, 100 requests/window)
 *   Use as the first middleware in the chain for general API protection.
 * 
 * - strictRateLimiter: Aggressive rate limiter (15-min window, 5 requests/window)
 *   Use for sensitive endpoints like authentication, password reset, etc.
 * 
 * @see module:middleware/rateLimiter
 */
const { rateLimiter, strictRateLimiter } = require('./rateLimiter');

// =============================================================================
// IMPORTS FROM VALIDATION MODULE
// =============================================================================

/**
 * Import validation middleware from the validation module.
 * 
 * - validateRequest: Factory function to create validation middleware from rules.
 *   Returns an async middleware that runs validations and handles errors.
 * 
 * - sanitizeInput: Middleware array that trims and escapes all request body
 *   and query parameters. Provides baseline XSS protection.
 * 
 * - validationErrorHandler: Middleware that catches validation errors and
 *   returns standardized 400 error responses with detailed field information.
 * 
 * @see module:middleware/validation
 */
const { validateRequest, sanitizeInput, validationErrorHandler } = require('./validation');

// =============================================================================
// AGGREGATED MIDDLEWARE ARRAY
// =============================================================================

/**
 * Pre-configured array of core security middlewares for easy bulk application.
 * 
 * This array contains the essential security middleware that should be applied
 * globally to all routes. The order is optimized for security and performance:
 * 
 * 1. rateLimiter - First line of defense, blocks excessive requests early
 * 
 * Usage:
 * Apply all security middlewares at once in app.js:
 * ```
 * const { securityMiddlewares } = require('./middleware');
 * securityMiddlewares.forEach(middleware => app.use(middleware));
 * ```
 * 
 * Or spread into app.use() calls:
 * ```
 * const { securityMiddlewares } = require('./middleware');
 * app.use(...securityMiddlewares);
 * ```
 * 
 * Note: This array contains only the rateLimiter by default. The sanitizeInput
 * and validationErrorHandler are not included because:
 * - sanitizeInput modifies request data and should be applied selectively
 * - validationErrorHandler requires validation chains to precede it
 * 
 * For route-specific validation, use validateRequest() with custom rules.
 * 
 * @type {Array<Function>}
 * 
 * @example
 * // Apply all security middlewares globally
 * const { securityMiddlewares } = require('./middleware');
 * securityMiddlewares.forEach(mw => app.use(mw));
 * 
 * @example
 * // Combine with route-specific middleware
 * const { rateLimiter, validateRequest, body } = require('./middleware');
 * app.post('/api/data',
 *   rateLimiter,
 *   validateRequest([body('input').trim().notEmpty()]),
 *   handleData
 * );
 */
const securityMiddlewares = [
  rateLimiter
];

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Export all middleware components for centralized access.
 * 
 * This module provides two ways to use the middleware:
 * 
 * 1. Individual Exports - For granular control over which middleware to apply:
 *    ```
 *    const { rateLimiter, validateRequest } = require('./middleware');
 *    app.use(rateLimiter);
 *    app.post('/api/users', validateRequest([...rules]), handler);
 *    ```
 * 
 * 2. Aggregated Array - For applying core security middleware in bulk:
 *    ```
 *    const { securityMiddlewares } = require('./middleware');
 *    securityMiddlewares.forEach(mw => app.use(mw));
 *    ```
 * 
 * Rate Limiting Exports:
 * @property {Function} rateLimiter - Standard rate limiter (100 req/15min)
 * @property {Function} strictRateLimiter - Strict rate limiter (5 req/15min)
 * 
 * Validation Exports:
 * @property {Function} validateRequest - Factory for validation middleware chains
 * @property {Array} sanitizeInput - Global sanitization middleware array
 * @property {Function} validationErrorHandler - Validation error handler middleware
 * 
 * Aggregated Exports:
 * @property {Array<Function>} securityMiddlewares - Array of core security middlewares
 * 
 * @example
 * // In app.js - Import all needed middleware from single location:
 * const {
 *   rateLimiter,
 *   strictRateLimiter,
 *   validateRequest,
 *   sanitizeInput,
 *   validationErrorHandler,
 *   securityMiddlewares
 * } = require('./middleware');
 * 
 * // Apply global security middleware
 * app.use(rateLimiter);
 * 
 * // Apply strict rate limiting to sensitive endpoints
 * app.post('/api/auth/login', strictRateLimiter, loginHandler);
 * 
 * // Apply validation to specific routes
 * const { body } = require('express-validator');
 * app.post('/api/data',
 *   validateRequest([body('input').trim().notEmpty()]),
 *   dataHandler
 * );
 * 
 * @example
 * // Using sanitizeInput for global XSS protection:
 * const { sanitizeInput, validationErrorHandler } = require('./middleware');
 * app.use(sanitizeInput);
 * app.use(validationErrorHandler);
 */
module.exports = {
  // Rate limiting middleware
  rateLimiter,
  strictRateLimiter,
  
  // Validation middleware
  validateRequest,
  sanitizeInput,
  validationErrorHandler,
  
  // Aggregated middleware array for bulk application
  securityMiddlewares
};
