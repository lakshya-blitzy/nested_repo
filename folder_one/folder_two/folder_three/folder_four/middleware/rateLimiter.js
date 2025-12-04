/**
 * Rate Limiting Middleware Configuration
 * 
 * This module provides IP-based rate limiting middleware using express-rate-limit.
 * It is the first line of defense against:
 * - Brute force attacks
 * - DDoS attacks
 * - API abuse
 * 
 * Place this middleware first in the middleware chain for maximum protection.
 * 
 * Configuration is driven by environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 900000 = 15 minutes)
 * - RATE_LIMIT_MAX: Maximum requests per window per IP (default: 100)
 * 
 * @module middleware/rateLimiter
 */

'use strict';

const { rateLimit } = require('express-rate-limit');

/**
 * Default rate limit window in milliseconds (15 minutes)
 * @constant {number}
 */
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 900000ms = 15 minutes

/**
 * Default maximum requests per window
 * @constant {number}
 */
const DEFAULT_MAX_REQUESTS = 100;

/**
 * Default maximum requests for strict rate limiting (authentication endpoints)
 * @constant {number}
 */
const DEFAULT_STRICT_MAX_REQUESTS = 5;

/**
 * Parses an environment variable as an integer with a fallback default value.
 * Returns the default if the environment variable is not set, empty, or not a valid number.
 * 
 * @param {string} envValue - The environment variable value to parse
 * @param {number} defaultValue - The fallback default value
 * @returns {number} The parsed integer or default value
 */
const parseIntWithDefault = (envValue, defaultValue) => {
  if (envValue === undefined || envValue === null || envValue === '') {
    return defaultValue;
  }
  
  const parsed = parseInt(envValue, 10);
  
  // Return default if parsing failed or resulted in NaN
  if (isNaN(parsed)) {
    return defaultValue;
  }
  
  // Ensure the value is positive
  return parsed > 0 ? parsed : defaultValue;
};

/**
 * Standard rate limiter middleware for general API protection.
 * 
 * Configures IP-based rate limiting with the following defaults:
 * - 15-minute window (configurable via RATE_LIMIT_WINDOW_MS)
 * - 100 requests per window (configurable via RATE_LIMIT_MAX)
 * - Uses draft-8 standard headers (RateLimit-Policy, RateLimit)
 * - Returns 429 Too Many Requests when limit is exceeded
 * 
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 * 
 * @example
 * // In app.js - Apply as first middleware
 * const { rateLimiter } = require('./middleware/rateLimiter');
 * app.use(rateLimiter);
 */
const rateLimiter = rateLimit({
  // Time window in milliseconds
  // Default: 15 minutes (900000ms)
  // Configurable via RATE_LIMIT_WINDOW_MS environment variable
  windowMs: parseIntWithDefault(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
  
  // Maximum number of requests allowed per window per IP address
  // Default: 100 requests
  // Configurable via RATE_LIMIT_MAX environment variable
  limit: parseIntWithDefault(process.env.RATE_LIMIT_MAX, DEFAULT_MAX_REQUESTS),
  
  // Use draft-8 standard headers for rate limit information
  // Sends RateLimit-Policy and RateLimit headers in responses
  // See: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
  standardHeaders: 'draft-8',
  
  // Disable legacy X-RateLimit-* headers
  // Modern clients should use the standard draft-8 headers
  legacyHeaders: false,
  
  // Custom error message returned when rate limit is exceeded
  // This provides a consistent JSON response for API consumers
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.'
  },
  
  // Count all requests toward the limit, including successful ones
  // Set to true to only count failed requests (useful for login endpoints)
  skipSuccessfulRequests: false,
  
  // Skip counting failed requests
  // Set to true to only count successful requests
  skipFailedRequests: false,
  
  // Custom handler function when rate limit is exceeded
  // Ensures consistent JSON response format with proper status code
  handler: (req, res, next, options) => {
    // Log the rate limit event for monitoring purposes
    // In production, this could be connected to a monitoring system
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const requestPath = req.originalUrl || req.url || '/';
    
    console.warn(
      `[Rate Limit] Exceeded - IP: ${clientIP}, Path: ${requestPath}, ` +
      `Limit: ${options.limit}, Window: ${options.windowMs}ms`
    );
    
    // Set the proper status code and send JSON response
    res.status(429).json(options.message);
  },
  
  // Key generator function for identifying clients
  // By default, uses req.ip which respects trust proxy settings
  // You can customize this to use other identifiers (API keys, user IDs, etc.)
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind a proxy, otherwise use connection IP
    // Note: Ensure trust proxy is configured in Express if behind a reverse proxy
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  
  // Request property name to store rate limit info
  // The rate limit info will be available at req.rateLimit
  requestPropertyName: 'rateLimit'
});

/**
 * Strict rate limiter middleware for sensitive endpoints (authentication, password reset, etc.).
 * 
 * Provides more aggressive rate limiting for endpoints that are commonly targeted:
 * - Login endpoints
 * - Password reset endpoints
 * - API key generation endpoints
 * - Account registration endpoints
 * 
 * Configuration:
 * - 15-minute window (fixed)
 * - 5 requests per window per IP (very restrictive)
 * - Uses draft-8 standard headers
 * - Returns 429 with specific error message for auth attempts
 * 
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 * 
 * @example
 * // In routes - Apply to specific sensitive endpoints
 * const { strictRateLimiter } = require('./middleware/rateLimiter');
 * app.post('/api/auth/login', strictRateLimiter, loginController);
 * app.post('/api/auth/reset-password', strictRateLimiter, resetPasswordController);
 */
const strictRateLimiter = rateLimit({
  // Fixed 15-minute window for strict limiting
  // Not configurable via environment to maintain security
  windowMs: DEFAULT_WINDOW_MS,
  
  // Very restrictive: only 5 attempts per 15-minute window
  // Prevents brute force attacks on authentication endpoints
  limit: DEFAULT_STRICT_MAX_REQUESTS,
  
  // Use draft-8 standard headers
  standardHeaders: 'draft-8',
  
  // Disable legacy headers
  legacyHeaders: false,
  
  // Specific error message for authentication attempts
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later.'
  },
  
  // Count all requests for strict limiting
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  
  // Custom handler for strict rate limiting
  handler: (req, res, next, options) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const requestPath = req.originalUrl || req.url || '/';
    
    // Log strict rate limit violations at warning level
    // These could indicate an active attack
    console.warn(
      `[Strict Rate Limit] EXCEEDED - IP: ${clientIP}, Path: ${requestPath}, ` +
      `Limit: ${options.limit}, Window: ${options.windowMs}ms - Potential brute force attempt`
    );
    
    res.status(429).json(options.message);
  },
  
  // Key generator for client identification
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  
  // Store rate limit info on request object
  requestPropertyName: 'rateLimit'
});

/**
 * Factory function to create a custom rate limiter with specific configuration.
 * 
 * Use this when you need rate limiting with custom settings for specific routes.
 * 
 * @param {Object} options - Rate limiter configuration options
 * @param {number} [options.windowMs=900000] - Time window in milliseconds
 * @param {number} [options.limit=100] - Maximum requests per window
 * @param {string} [options.message='Too many requests'] - Error message when limit exceeded
 * @param {boolean} [options.skipSuccessfulRequests=false] - Whether to skip counting successful requests
 * @param {boolean} [options.skipFailedRequests=false] - Whether to skip counting failed requests
 * @returns {import('express-rate-limit').RateLimitRequestHandler} Configured rate limiter middleware
 * 
 * @example
 * // Create custom rate limiter for a specific API endpoint
 * const { createRateLimiter } = require('./middleware/rateLimiter');
 * const apiRateLimiter = createRateLimiter({
 *   windowMs: 60 * 1000, // 1 minute
 *   limit: 30, // 30 requests per minute
 *   message: 'API rate limit exceeded'
 * });
 * app.use('/api/heavy-endpoint', apiRateLimiter);
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    limit = DEFAULT_MAX_REQUESTS,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      status: 429,
      error: 'Too Many Requests',
      message
    },
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res, next, opts) => {
      const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
      const requestPath = req.originalUrl || req.url || '/';
      
      console.warn(
        `[Custom Rate Limit] Exceeded - IP: ${clientIP}, Path: ${requestPath}, ` +
        `Limit: ${opts.limit}, Window: ${opts.windowMs}ms`
      );
      
      res.status(429).json(opts.message);
    },
    keyGenerator: (req) => {
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
    requestPropertyName: 'rateLimit'
  });
};

// Export rate limiters for use in the application
module.exports = {
  rateLimiter,
  strictRateLimiter,
  createRateLimiter
};
