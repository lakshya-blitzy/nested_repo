/**
 * Server Entry Point Module
 * 
 * This module serves as the application entry point that orchestrates HTTP and HTTPS
 * servers using the Express application configured with the full security middleware stack.
 * 
 * The server.js file has been migrated from a raw Node.js http.createServer() implementation
 * to use Express.js, enabling comprehensive security features including:
 * - Rate limiting (express-rate-limit)
 * - HTTP security headers (helmet.js)
 * - CORS policy enforcement (cors)
 * - Input validation (express-validator)
 * - HTTPS/TLS encryption support
 * 
 * Server Configuration (via environment variables):
 *   PORT         - HTTP server port (default: 3000)
 *   HTTPS_PORT   - HTTPS server port (default: 443)
 *   ENABLE_HTTPS - Enable HTTPS server ('true' to enable)
 * 
 * Usage:
 *   node server.js           # Start HTTP server only
 *   ENABLE_HTTPS=true node server.js  # Start both HTTP and HTTPS servers
 * 
 * @module server
 * @requires dotenv
 * @requires ./app
 * @requires ./config/https
 */

'use strict';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/**
 * Load environment variables from .env file
 * 
 * This MUST be called before importing any other local modules that depend
 * on environment variables. The dotenv package reads the .env file in the
 * project root and loads variables into process.env.
 * 
 * Configuration variables loaded include:
 * - PORT: HTTP server port
 * - HTTPS_PORT: HTTPS server port
 * - ENABLE_HTTPS: Flag to enable/disable HTTPS server
 * - SSL_KEY_PATH: Path to SSL private key
 * - SSL_CERT_PATH: Path to SSL certificate
 * - ALLOWED_ORIGINS: Comma-separated CORS whitelist
 * - RATE_LIMIT_WINDOW_MS: Rate limit time window
 * - RATE_LIMIT_MAX: Maximum requests per window
 * - TRUST_PROXY: Trust proxy setting for Express
 * 
 * @see https://www.npmjs.com/package/dotenv
 */
require('dotenv').config();

// =============================================================================
// APPLICATION IMPORTS
// =============================================================================

/**
 * Express application with full security middleware stack
 * 
 * The app module provides a configured Express application with:
 * - Rate limiting middleware
 * - Helmet security headers
 * - CORS policy enforcement
 * - Body parsing with size limits
 * - Input validation middleware
 * - Routes including the preserved '/' endpoint returning 'Hello, World!'
 * 
 * @type {express.Application}
 */
const app = require('./app');

/**
 * HTTPS server creation function
 * 
 * Creates and starts an HTTPS server with TLS/SSL encryption.
 * Loads SSL certificates from environment-configured paths and
 * binds the Express app to the specified HTTPS port.
 * 
 * @function
 * @param {express.Application} app - Express application instance
 * @param {number} port - HTTPS port number
 * @returns {https.Server} The created HTTPS server instance
 */
const { createSecureServer } = require('./config/https');

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

/**
 * HTTP server port
 * 
 * Defaults to 3000 for development, can be overridden via PORT environment variable.
 * In production, this is typically set to 80 or configured by the hosting platform.
 * 
 * @constant {number}
 */
const PORT = process.env.PORT || 3000;

/**
 * HTTPS server port
 * 
 * Defaults to 443 (standard HTTPS port), can be overridden via HTTPS_PORT environment variable.
 * Note: Ports below 1024 may require elevated privileges on Unix-like systems.
 * 
 * @constant {number}
 */
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

/**
 * HTTPS enable flag
 * 
 * When set to 'true', the server will attempt to start an HTTPS server in addition
 * to the HTTP server. Requires valid SSL certificates configured via:
 * - SSL_KEY_PATH: Path to private key file
 * - SSL_CERT_PATH: Path to certificate file
 * 
 * @constant {boolean}
 */
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';

// =============================================================================
// HTTP SERVER STARTUP
// =============================================================================

/**
 * Start HTTP Server
 * 
 * Starts the Express application on the configured HTTP port.
 * The app.listen() method creates an HTTP server and binds it to the specified port.
 * 
 * The server handles all incoming HTTP requests through the Express middleware stack:
 * 1. Rate Limiter - Blocks excessive requests
 * 2. Helmet - Sets security response headers
 * 3. CORS - Validates cross-origin requests
 * 4. Body Parser - Parses request bodies
 * 5. Routes - Handles application endpoints
 * 
 * Note: In production behind a reverse proxy (nginx, AWS ELB), you may want to
 * bind to '0.0.0.0' or let the platform manage binding. The default Express
 * behavior binds to all available interfaces.
 * 
 * @returns {http.Server} The HTTP server instance
 */
const httpServer = app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Security middleware stack active: helmet, cors, rate-limit`);
  
  // Log helpful information for development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Local access: http://localhost:${PORT}/`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  }
});

/**
 * HTTP Server Error Handler
 * 
 * Handles server-level errors such as:
 * - EADDRINUSE: Port already in use
 * - EACCES: Permission denied (for privileged ports < 1024)
 * - EADDRNOTAVAIL: Address not available
 * 
 * Provides informative error messages and exits gracefully on critical errors.
 */
httpServer.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${PORT} requires elevated privileges`);
      console.error('Try running with sudo or use a port above 1024');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${PORT} is already in use`);
      console.error('Please stop the existing server or use a different port');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// =============================================================================
// HTTPS SERVER STARTUP (CONDITIONAL)
// =============================================================================

/**
 * HTTPS Server Instance
 * 
 * Only created when ENABLE_HTTPS environment variable is set to 'true'.
 * Requires valid SSL certificates to be configured.
 * 
 * @type {https.Server|null}
 */
let httpsServer = null;

if (ENABLE_HTTPS) {
  /**
   * Start HTTPS Server
   * 
   * Creates and starts an HTTPS server with TLS/SSL encryption.
   * The server uses the same Express application as the HTTP server,
   * ensuring identical middleware stack and security protections.
   * 
   * Certificate Configuration:
   * - SSL_KEY_PATH: Path to private key file (default: ./certs/server.key)
   * - SSL_CERT_PATH: Path to certificate file (default: ./certs/server.cert)
   * 
   * TLS Security Features:
   * - Minimum TLS 1.2 version requirement
   * - Modern cipher suite preferences
   * - Proper certificate chain handling
   * 
   * Development Note:
   * For development, generate self-signed certificates with:
   * openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
   *   -keyout certs/server.key \
   *   -out certs/server.cert \
   *   -subj "/C=US/ST=State/L=City/O=Dev/CN=localhost"
   * 
   * Production Note:
   * Use certificates from a trusted Certificate Authority (CA) such as
   * Let's Encrypt, DigiCert, or your organization's internal CA.
   */
  try {
    httpsServer = createSecureServer(app, HTTPS_PORT);
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
    console.log(`TLS encryption enabled with minimum TLS 1.2`);
    
    // Log helpful information for development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Secure access: https://localhost:${HTTPS_PORT}/`);
      console.log(`Note: Browser may show certificate warning for self-signed certs`);
    }
  } catch (error) {
    console.error('Failed to start HTTPS server:', error.message);
    console.error('');
    console.error('Troubleshooting steps:');
    console.error('1. Ensure SSL certificate files exist at configured paths');
    console.error('2. Verify SSL_KEY_PATH and SSL_CERT_PATH environment variables');
    console.error('3. Check file permissions on certificate files');
    console.error('4. For development, generate self-signed certificates');
    console.error('');
    console.error('HTTP server will continue running without HTTPS.');
    console.error('Set ENABLE_HTTPS=false to suppress this message.');
  }
} else {
  console.log('HTTPS disabled. Set ENABLE_HTTPS=true to enable secure server.');
}

// =============================================================================
// GRACEFUL SHUTDOWN HANDLING
// =============================================================================

/**
 * Graceful Shutdown Handler
 * 
 * Handles process termination signals to ensure clean server shutdown.
 * Closes all active connections before exiting to prevent data loss
 * and allow in-flight requests to complete.
 * 
 * Signals handled:
 * - SIGTERM: Standard termination signal (Docker, Kubernetes, systemd)
 * - SIGINT: Interrupt signal (Ctrl+C in terminal)
 * 
 * Shutdown process:
 * 1. Stop accepting new connections
 * 2. Wait for existing connections to complete
 * 3. Close HTTP server
 * 4. Close HTTPS server (if running)
 * 5. Exit process
 * 
 * @param {string} signal - The signal that triggered shutdown
 */
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Track shutdown completion
  let httpClosed = false;
  let httpsClosed = !httpsServer; // If no HTTPS server, consider it already "closed"

  /**
   * Exit when all servers are closed
   */
  function checkAndExit() {
    if (httpClosed && httpsClosed) {
      console.log('All servers closed successfully.');
      console.log('Graceful shutdown complete.');
      process.exit(0);
    }
  }

  // Close HTTP server
  console.log('Closing HTTP server...');
  httpServer.close((err) => {
    if (err) {
      console.error('Error closing HTTP server:', err.message);
    } else {
      console.log('HTTP server closed.');
    }
    httpClosed = true;
    checkAndExit();
  });

  // Close HTTPS server if it exists
  if (httpsServer) {
    console.log('Closing HTTPS server...');
    httpsServer.close((err) => {
      if (err) {
        console.error('Error closing HTTPS server:', err.message);
      } else {
        console.log('HTTPS server closed.');
      }
      httpsClosed = true;
      checkAndExit();
    });
  }

  // Force exit after timeout if graceful shutdown fails
  const SHUTDOWN_TIMEOUT = 10000; // 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
}

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// UNHANDLED REJECTION AND EXCEPTION HANDLERS
// =============================================================================

/**
 * Unhandled Promise Rejection Handler
 * 
 * Catches unhandled promise rejections that would otherwise cause
 * silent failures. Logs the error and exits to prevent unstable state.
 * 
 * Note: In Node.js 15+, unhandled rejections terminate the process by default.
 * This handler ensures consistent behavior across Node.js versions.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
  // Exit with error code to signal failure
  process.exit(1);
});

/**
 * Uncaught Exception Handler
 * 
 * Catches synchronous exceptions that weren't caught by try-catch blocks.
 * These indicate bugs that need to be fixed, so we log and exit.
 * 
 * In production, use a process manager (PM2, systemd) to restart automatically.
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit with error code to signal failure
  process.exit(1);
});

// =============================================================================
// STARTUP SUMMARY
// =============================================================================

/**
 * Log startup summary
 * 
 * Provides a clear summary of the server configuration at startup
 * for easy verification of settings.
 */
console.log('');
console.log('='.repeat(60));
console.log('Server Startup Summary');
console.log('='.repeat(60));
console.log(`HTTP Port:      ${PORT}`);
console.log(`HTTPS Port:     ${HTTPS_PORT}${ENABLE_HTTPS ? '' : ' (disabled)'}`);
console.log(`HTTPS Enabled:  ${ENABLE_HTTPS}`);
console.log(`Environment:    ${process.env.NODE_ENV || 'development'}`);
console.log(`Trust Proxy:    ${process.env.TRUST_PROXY === 'true' ? 'enabled' : 'disabled'}`);
console.log('='.repeat(60));
console.log('');
console.log('Security features active:');
console.log('  ✓ Rate limiting (express-rate-limit)');
console.log('  ✓ Security headers (helmet.js)');
console.log('  ✓ CORS policy (cors)');
console.log('  ✓ Input validation (express-validator)');
console.log('  ✓ Body parsing with size limits');
if (ENABLE_HTTPS) {
  console.log('  ✓ HTTPS/TLS encryption');
}
console.log('');
console.log('Server is ready to accept requests.');
console.log('Press Ctrl+C to stop.');
console.log('');
