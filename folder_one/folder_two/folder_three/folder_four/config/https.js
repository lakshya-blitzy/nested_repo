/**
 * HTTPS Server Configuration Module
 * 
 * Provides secure server creation with TLS/SSL encryption for the Express application.
 * Loads SSL certificates from environment-configured paths and creates HTTPS server
 * instances with modern security settings.
 * 
 * Features:
 * - Certificate loading from SSL_KEY_PATH and SSL_CERT_PATH environment variables
 * - TLS 1.2 minimum version requirement for modern security
 * - Graceful error handling for certificate loading failures
 * - Support for both self-signed (development) and CA-signed (production) certificates
 * 
 * Usage:
 *   const { createSecureServer } = require('./config/https');
 *   const server = createSecureServer(app, 443);
 * 
 * Environment Variables:
 *   SSL_KEY_PATH  - Path to SSL private key file (default: ./certs/server.key)
 *   SSL_CERT_PATH - Path to SSL certificate file (default: ./certs/server.cert)
 * 
 * @module config/https
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Default certificate paths for development environment
 * These paths are used when environment variables are not set
 */
const DEFAULT_KEY_PATH = './certs/server.key';
const DEFAULT_CERT_PATH = './certs/server.cert';

/**
 * Default HTTPS port when not specified
 */
const DEFAULT_HTTPS_PORT = 443;

/**
 * Minimum TLS version for secure connections
 * TLS 1.2 is required for modern security standards and PCI-DSS compliance
 */
const MIN_TLS_VERSION = 'TLSv1.2';

/**
 * Loads SSL/TLS certificates from the file system.
 * 
 * Reads the private key and certificate files from paths specified in
 * environment variables (SSL_KEY_PATH and SSL_CERT_PATH) or falls back
 * to default paths in the ./certs directory.
 * 
 * The function uses synchronous file reading since certificate loading
 * occurs during server startup before any requests are handled.
 * 
 * @returns {Object} Certificate object containing key and cert buffers
 * @returns {Buffer} return.key - Private key content as Buffer
 * @returns {Buffer} return.cert - Certificate content as Buffer
 * 
 * @throws {Error} When certificate files cannot be read (missing, permissions, etc.)
 * 
 * @example
 * try {
 *   const certs = loadCertificates();
 *   console.log('Certificates loaded successfully');
 * } catch (error) {
 *   console.error('Certificate loading failed:', error.message);
 * }
 */
function loadCertificates() {
  // Read certificate paths from environment or use defaults
  const keyPath = process.env.SSL_KEY_PATH || DEFAULT_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH || DEFAULT_CERT_PATH;

  // Resolve paths to absolute paths for reliable file loading
  // This handles both relative and absolute paths correctly
  const resolvedKeyPath = path.resolve(keyPath);
  const resolvedCertPath = path.resolve(certPath);

  try {
    // Verify files exist before attempting to read
    // This provides clearer error messages than just catching ENOENT
    if (!fs.existsSync(resolvedKeyPath)) {
      throw new Error(
        `SSL private key file not found. ` +
        `Please ensure the file exists at the configured path. ` +
        `Set SSL_KEY_PATH environment variable or place key at ${DEFAULT_KEY_PATH}`
      );
    }

    if (!fs.existsSync(resolvedCertPath)) {
      throw new Error(
        `SSL certificate file not found. ` +
        `Please ensure the file exists at the configured path. ` +
        `Set SSL_CERT_PATH environment variable or place certificate at ${DEFAULT_CERT_PATH}`
      );
    }

    // Read certificate files synchronously
    // Using readFileSync is appropriate here as this runs during startup
    const key = fs.readFileSync(resolvedKeyPath);
    const cert = fs.readFileSync(resolvedCertPath);

    // Validate that files are not empty
    if (key.length === 0) {
      throw new Error('SSL private key file is empty');
    }

    if (cert.length === 0) {
      throw new Error('SSL certificate file is empty');
    }

    return {
      key: key,
      cert: cert
    };
  } catch (error) {
    // Re-throw custom errors as-is
    if (error.message.includes('SSL ')) {
      throw error;
    }

    // Handle file system errors with descriptive messages
    // Avoid exposing full file paths in error messages for security
    let errorMessage = 'Failed to load SSL certificates: ';

    switch (error.code) {
      case 'ENOENT':
        errorMessage += 'Certificate file not found. Please check SSL_KEY_PATH and SSL_CERT_PATH environment variables.';
        break;
      case 'EACCES':
        errorMessage += 'Permission denied when reading certificate files. Please check file permissions.';
        break;
      case 'EISDIR':
        errorMessage += 'Certificate path points to a directory instead of a file.';
        break;
      default:
        errorMessage += error.message;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Builds HTTPS server options with loaded certificates and security settings.
 * 
 * Combines the SSL certificates with additional TLS security configurations
 * to create a complete options object for https.createServer().
 * 
 * Security settings include:
 * - Minimum TLS version 1.2 (mitigates POODLE, BEAST, and other legacy vulnerabilities)
 * - Modern cipher suite preferences handled by Node.js defaults
 * 
 * @returns {Object} HTTPS server options object
 * @returns {Buffer} return.key - Private key content
 * @returns {Buffer} return.cert - Certificate content
 * @returns {string} return.minVersion - Minimum TLS version (TLSv1.2)
 * 
 * @throws {Error} When certificate loading fails
 * 
 * @example
 * const options = getHttpsOptions();
 * const server = https.createServer(options, app);
 */
function getHttpsOptions() {
  // Load certificates first - this may throw if certificates are missing
  const certificates = loadCertificates();

  // Build complete HTTPS options object with security settings
  const httpsOptions = {
    // Certificate credentials
    key: certificates.key,
    cert: certificates.cert,

    // Enforce minimum TLS version for security
    // TLS 1.2 is the minimum version recommended by OWASP and required for PCI-DSS
    minVersion: MIN_TLS_VERSION,

    // Additional security settings for production environments
    // These use Node.js secure defaults which include:
    // - Secure cipher suite ordering
    // - Proper certificate chain handling
    // - Session resumption support
  };

  return httpsOptions;
}

/**
 * Creates and starts an HTTPS server with the Express application.
 * 
 * This is the main entry point for enabling HTTPS in the application.
 * It loads certificates, configures TLS settings, creates the HTTPS server,
 * and binds it to the specified port.
 * 
 * The server instance is returned to allow for:
 * - Graceful shutdown handling
 * - Connection tracking
 * - Additional event listeners
 * 
 * @param {Object} app - Express application instance to handle requests
 * @param {number} [port=443] - Port number for HTTPS server (default: 443)
 * 
 * @returns {https.Server} The created HTTPS server instance
 * 
 * @throws {Error} When certificate loading fails
 * @throws {Error} When server cannot bind to the specified port
 * 
 * @example
 * // Basic usage with default HTTPS port (443)
 * const app = require('./app');
 * const httpsServer = createSecureServer(app);
 * 
 * @example
 * // Custom port for development
 * const httpsServer = createSecureServer(app, 8443);
 * 
 * @example
 * // With graceful shutdown handling
 * const httpsServer = createSecureServer(app, 443);
 * process.on('SIGTERM', () => {
 *   httpsServer.close(() => {
 *     console.log('HTTPS Server closed');
 *   });
 * });
 */
function createSecureServer(app, port = DEFAULT_HTTPS_PORT) {
  // Validate port parameter
  const portNumber = parseInt(port, 10);
  
  if (isNaN(portNumber) || portNumber < 0 || portNumber > 65535) {
    throw new Error(`Invalid port number: ${port}. Port must be between 0 and 65535.`);
  }

  // Log that HTTPS server is being initialized
  console.log('Initializing HTTPS server...');

  try {
    // Get HTTPS options including certificates and TLS settings
    const httpsOptions = getHttpsOptions();

    // Create the HTTPS server with the Express app as the request handler
    const server = https.createServer(httpsOptions, app);

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`HTTPS Server Error: Port ${portNumber} is already in use`);
      } else if (error.code === 'EACCES') {
        console.error(`HTTPS Server Error: Permission denied for port ${portNumber}. ` +
          (portNumber < 1024 ? 'Ports below 1024 require elevated privileges.' : ''));
      } else {
        console.error(`HTTPS Server Error: ${error.message}`);
      }
    });

    // Handle TLS/SSL handshake errors
    server.on('tlsClientError', (error, tlsSocket) => {
      // Log TLS errors without exposing sensitive details
      console.error('TLS Client Error: Secure connection failed');
      
      // Destroy the socket to clean up resources
      if (tlsSocket && !tlsSocket.destroyed) {
        tlsSocket.destroy();
      }
    });

    // Start listening on the specified port
    server.listen(portNumber, () => {
      console.log(`HTTPS Server running on port ${portNumber}`);
      console.log(`TLS minimum version: ${MIN_TLS_VERSION}`);
    });

    // Return the server instance for external management
    return server;

  } catch (error) {
    // Log the error for debugging (without exposing sensitive details)
    console.error('Failed to create HTTPS server:', error.message);
    
    // Re-throw to allow caller to handle the error
    throw error;
  }
}

// Export all functions for use by other modules
module.exports = {
  createSecureServer,
  loadCertificates,
  getHttpsOptions
};
