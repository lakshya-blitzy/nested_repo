/**
 * HTTP/HTTPS Server Entry Point
 * 
 * This module initializes and starts the HTTP and optional HTTPS servers
 * using the Express application configured in app.js. It provides secure
 * server infrastructure with the following features:
 * 
 * - HTTP server on configurable port (default: 3000)
 * - Optional HTTPS server with TLS encryption (when ENABLE_HTTPS=true)
 * - Environment-based configuration via dotenv
 * - Graceful shutdown handling
 * 
 * Environment Variables:
 *   PORT           - HTTP server port (default: 3000)
 *   HTTPS_PORT     - HTTPS server port (default: 443)
 *   ENABLE_HTTPS   - Enable HTTPS server (default: false)
 *   HOST           - Server bind address (default: 127.0.0.1)
 * 
 * @module server
 * @requires http
 * @requires ./app
 * @requires ./config/https
 * @requires dotenv
 */

'use strict';

// Load environment variables from .env file
// This must be done before importing app.js to ensure all config is available
require('dotenv').config();

// Import core modules
const http = require('http');

// Import the Express application with all security middleware
const app = require('./app');

// Import HTTPS server creation utility
// This is only used when ENABLE_HTTPS=true
const { createSecureServer } = require('./config/https');

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

/**
 * Server hostname/bind address
 * @constant {string}
 */
const hostname = process.env.HOST || '127.0.0.1';

/**
 * HTTP server port
 * @constant {number}
 */
const port = parseInt(process.env.PORT, 10) || 3000;

/**
 * HTTPS server port (only used when ENABLE_HTTPS=true)
 * @constant {number}
 */
const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 443;

/**
 * Flag to determine if HTTPS should be enabled
 * @constant {boolean}
 */
const enableHttps = process.env.ENABLE_HTTPS === 'true';

// =============================================================================
// HTTP SERVER
// =============================================================================

/**
 * HTTP server instance
 * Uses the Express application as the request handler
 * @type {http.Server}
 */
const httpServer = http.createServer(app);

/**
 * Handle HTTP server errors
 */
httpServer.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

/**
 * Start the HTTP server
 */
httpServer.listen(port, hostname, () => {
  console.log(`HTTP Server running at http://${hostname}:${port}/`);
  console.log('Security features enabled:');
  console.log('  - Rate limiting (express-rate-limit)');
  console.log('  - Security headers (helmet)');
  console.log('  - CORS protection');
  console.log('  - Body parsing with size limits');
});

// =============================================================================
// HTTPS SERVER (Optional)
// =============================================================================

/**
 * HTTPS server instance
 * Only created when ENABLE_HTTPS environment variable is set to 'true'
 * @type {https.Server|null}
 */
let httpsServer = null;

if (enableHttps) {
  try {
    // Create HTTPS server using the same Express app
    // This provides TLS/SSL encryption for secure communication
    httpsServer = createSecureServer(app, httpsPort);
    
    console.log(`HTTPS Server running on port ${httpsPort}`);
    console.log('TLS encryption enabled');
  } catch (error) {
    // HTTPS is optional, so log the error but continue running HTTP
    console.error('Warning: Failed to start HTTPS server:', error.message);
    console.log('Continuing with HTTP server only...');
    console.log('To enable HTTPS, ensure SSL certificates are in place:');
    console.log('  - Set SSL_KEY_PATH environment variable');
    console.log('  - Set SSL_CERT_PATH environment variable');
    console.log('  - Or place certificates in ./certs/server.key and ./certs/server.cert');
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Handles graceful shutdown of all servers.
 * Closes HTTP and HTTPS servers to allow existing connections to complete.
 * 
 * @param {string} signal - The signal that triggered shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP Server closed');
    
    // Close HTTPS server if it was started
    if (httpsServer) {
      httpsServer.close(() => {
        console.log('HTTPS Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  
  // Force shutdown after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Register shutdown handlers for common signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Export server instances for testing and external management
 * 
 * @exports httpServer - The HTTP server instance
 * @exports httpsServer - The HTTPS server instance (null if HTTPS is disabled)
 * @exports app - The Express application instance
 */
module.exports = {
  httpServer,
  httpsServer,
  app
};
