/**
 * Express.js Application Module
 * 
 * This module creates and configures the Express application with a comprehensive
 * security middleware stack. It serves as the core application module that is
 * imported by server.js for starting the HTTP/HTTPS servers.
 * 
 * Security Features:
 * - Rate limiting (express-rate-limit) - First line of defense against brute force/DDoS
 * - HTTP security headers (helmet.js) - 15+ security headers for XSS, clickjacking protection
 * - CORS policy (cors) - Cross-origin resource sharing with whitelist configuration
 * - Body parsing with size limits - Prevents large payload attacks
 * - Input validation ready - validateRequest imported for route-level validation
 * 
 * Middleware Execution Order (security-first):
 * 1. Rate Limiter - Blocks excessive requests before processing
 * 2. Helmet - Sets security response headers
 * 3. CORS - Validates cross-origin requests
 * 4. Body Parser - Parses JSON/URL-encoded bodies with size limits
 * 5. Routes - Application endpoints with validation as needed
 * 6. 404 Handler - Catches unknown routes
 * 7. Error Handler - Global error handling
 * 
 * @module app
 * @requires express
 * @requires helmet
 * @requires cors
 * @requires ./config/security
 * @requires ./middleware/rateLimiter
 * @requires ./middleware/validation
 */

'use strict';

// =============================================================================
// EXTERNAL IMPORTS
// =============================================================================

/**
 * Express.js web framework
 * Provides middleware architecture, routing, and HTTP utility methods
 * @see https://expressjs.com/
 */
const express = require('express');

/**
 * Helmet.js security middleware
 * Sets 15+ HTTP security headers to protect against common web vulnerabilities
 * @see https://helmetjs.github.io/
 */
const helmet = require('helmet');

/**
 * CORS (Cross-Origin Resource Sharing) middleware
 * Configures cross-origin access control with whitelist-based policies
 * @see https://www.npmjs.com/package/cors
 */
const cors = require('cors');

// =============================================================================
// INTERNAL IMPORTS
// =============================================================================

/**
 * Security configuration module
 * Provides helmet options and CORS whitelist configuration
 */
const { securityConfig, corsOptions } = require('./config/security');

/**
 * Rate limiting middleware
 * IP-based rate limiting with configurable thresholds
 */
const { rateLimiter } = require('./middleware/rateLimiter');

/**
 * Input validation middleware factory
 * Creates validation middleware chains for route-level protection
 * Note: Imported for use in future route definitions requiring input validation
 */
const { validateRequest } = require('./middleware/validation');

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Express application instance
 * Central application object that will be configured with middleware and routes
 * @type {express.Application}
 */
const app = express();

// =============================================================================
// TRUST PROXY CONFIGURATION
// =============================================================================

/**
 * Trust Proxy Setting
 * 
 * When running behind a reverse proxy (nginx, AWS ELB, Cloudflare, etc.),
 * this setting is required for:
 * - Correct client IP detection (req.ip)
 * - Proper rate limiting by actual client IP
 * - Accurate X-Forwarded-* header processing
 * 
 * Set TRUST_PROXY=true in production when behind a proxy.
 * The 'trust proxy' setting can also be set to specific values:
 * - true: Trust all proxies
 * - 1: Trust first proxy
 * - 'loopback': Trust loopback addresses
 */
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// =============================================================================
// SECURITY MIDDLEWARE STACK (Order Matters!)
// =============================================================================

/**
 * 1. RATE LIMITER - First Line of Defense
 * 
 * Applied first to block excessive requests before any other processing.
 * This protects all subsequent middleware from abuse.
 * 
 * Default configuration:
 * - 15-minute window
 * - 100 requests per IP per window
 * - Returns 429 Too Many Requests when exceeded
 * 
 * Configuration via environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds
 * - RATE_LIMIT_MAX: Maximum requests per window
 */
app.use(rateLimiter);

/**
 * 2. HELMET - HTTP Security Headers
 * 
 * Helmet sets various HTTP headers to secure the application:
 * - Content-Security-Policy: Prevents XSS by controlling resource sources
 * - X-Frame-Options: Prevents clickjacking by controlling iframe embedding
 * - X-Content-Type-Options: Prevents MIME sniffing attacks
 * - Strict-Transport-Security: Forces HTTPS connections
 * - X-XSS-Protection: Legacy XSS filter for older browsers
 * - Referrer-Policy: Controls referrer information in requests
 * - Cross-Origin-Embedder-Policy: Prevents unauthorized cross-origin embedding
 * - Cross-Origin-Opener-Policy: Isolates browsing context
 * - Cross-Origin-Resource-Policy: Protects against speculative attacks
 * 
 * Configuration is loaded from config/security.js (securityConfig.helmet)
 */
app.use(helmet(securityConfig.helmet));

/**
 * 3. CORS - Cross-Origin Resource Sharing
 * 
 * Controls which origins can access this API.
 * Configuration includes:
 * - Whitelist of allowed origins (from ALLOWED_ORIGINS env var)
 * - Allowed HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
 * - Allowed headers (Content-Type, Authorization, X-Requested-With)
 * - Credentials support (cookies, auth headers)
 * - Preflight cache duration (24 hours)
 * 
 * Configuration is loaded from config/security.js (corsOptions)
 */
app.use(cors(corsOptions));

/**
 * 4. BODY PARSING - Request Body Processing
 * 
 * Parses incoming request bodies with security-conscious limits:
 * 
 * express.json() - Parses JSON bodies (Content-Type: application/json)
 * - Limit: 10kb - Prevents large payload attacks
 * - Only parses when Content-Type header matches
 * 
 * express.urlencoded() - Parses URL-encoded bodies (Content-Type: application/x-www-form-urlencoded)
 * - extended: true - Allows rich objects and arrays using qs library
 * - Limit: 10kb - Prevents large payload attacks
 * 
 * Security Note: These limits help prevent denial-of-service attacks
 * that could overwhelm the server with excessively large payloads.
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Root Route - Health Check / Hello World
 * 
 * GET /
 * 
 * Preserved from the original server.js implementation.
 * Returns "Hello, World!" with proper security headers applied by the middleware stack.
 * 
 * This route serves as:
 * - A health check endpoint for load balancers
 * - A simple verification that the server is running
 * - Backward compatibility with the original implementation
 * 
 * Security Protections Applied:
 * - Rate limited (via rateLimiter middleware)
 * - Security headers set (via helmet middleware)
 * - CORS policy enforced (via cors middleware)
 * 
 * @route GET /
 * @returns {string} "Hello, World!\n"
 * @status 200 - Success
 * 
 * @example
 * // Request
 * curl http://localhost:3000/
 * 
 * // Response
 * Hello, World!
 * 
 * // Response Headers (via helmet)
 * Content-Security-Policy: default-src 'self'; ...
 * X-Frame-Options: SAMEORIGIN
 * X-Content-Type-Options: nosniff
 * Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
 */
app.get('/', (req, res) => {
  res.status(200).type('text/plain').send('Hello, World!\n');
});

/**
 * Health Check Route
 * 
 * GET /health
 * 
 * Dedicated health check endpoint for monitoring systems, load balancers,
 * and container orchestration platforms (Kubernetes, Docker Swarm).
 * 
 * Returns JSON with application status information.
 * 
 * @route GET /health
 * @returns {Object} Health status object
 * @status 200 - Application is healthy
 * 
 * @example
 * // Request
 * curl http://localhost:3000/health
 * 
 * // Response
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-01-15T10:30:00.000Z",
 *   "uptime": 3600
 * }
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

/**
 * 404 Not Found Handler
 * 
 * Catches all requests that don't match any defined routes.
 * Returns a standardized JSON error response.
 * 
 * Note: This must be placed after all route definitions.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (not used, but required signature)
 * @returns {Object} JSON error response with 404 status
 * 
 * @example
 * // Request
 * curl http://localhost:3000/nonexistent
 * 
 * // Response (404)
 * {
 *   "status": 404,
 *   "error": "Not Found",
 *   "message": "The requested resource could not be found",
 *   "path": "/nonexistent"
 * }
 */
app.use((req, res, next) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: 'The requested resource could not be found',
    path: req.originalUrl
  });
});

/**
 * Global Error Handler
 * 
 * Catches all errors thrown in route handlers or middleware.
 * Returns a standardized JSON error response.
 * 
 * In development mode, includes the error stack trace for debugging.
 * In production mode, hides sensitive error details.
 * 
 * Security Note: Never expose stack traces or internal error details
 * in production as they may reveal sensitive application information.
 * 
 * Note: This must be the last middleware (4 parameters required).
 * 
 * @param {Error} err - Error object thrown by previous middleware/route
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (required for error middleware signature)
 * @returns {Object} JSON error response with appropriate status code
 * 
 * @example
 * // Development Response (500)
 * {
 *   "status": 500,
 *   "error": "Internal Server Error",
 *   "message": "Something went wrong",
 *   "stack": "Error: Something went wrong\n    at ..."
 * }
 * 
 * // Production Response (500)
 * {
 *   "status": 500,
 *   "error": "Internal Server Error",
 *   "message": "An unexpected error occurred"
 * }
 */
app.use((err, req, res, next) => {
  // Log the error for monitoring and debugging purposes
  // In production, this should be connected to a logging service
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);

  // Determine the status code (use error's status or default to 500)
  const statusCode = err.status || err.statusCode || 500;
  
  // Determine if we're in production environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Build error response
  const errorResponse = {
    status: statusCode,
    error: statusCode === 500 ? 'Internal Server Error' : 'Error',
    message: isProduction && statusCode === 500 
      ? 'An unexpected error occurred' 
      : err.message || 'An unexpected error occurred'
  };
  
  // Include stack trace only in development for debugging
  if (!isProduction && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  // Send the error response
  res.status(statusCode).json(errorResponse);
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Export the configured Express application
 * 
 * The exported app can be:
 * - Used by server.js to create HTTP/HTTPS servers
 * - Used in testing to make requests via supertest
 * - Extended with additional routes as needed
 * 
 * @example
 * // In server.js:
 * const app = require('./app');
 * const http = require('http');
 * http.createServer(app).listen(3000);
 * 
 * @example
 * // In tests:
 * const app = require('./app');
 * const request = require('supertest');
 * request(app).get('/').expect(200);
 */
module.exports = app;
