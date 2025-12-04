/**
 * Centralized Security Configuration Module
 * 
 * This module provides comprehensive security configuration for the Express.js application,
 * including helmet.js options for HTTP security headers and CORS whitelist settings.
 * 
 * Security Features:
 * - Content-Security-Policy (CSP) directives
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options (clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing prevention)
 * - X-XSS-Protection (legacy browser XSS filter)
 * - Referrer-Policy
 * - Cross-Origin policies (Embedder, Opener, Resource)
 * - CORS whitelist with configurable origins
 * 
 * @module config/security
 */

'use strict';

/**
 * Environment detection for configuration adjustments
 * Production environments receive stricter security settings
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Helmet.js Configuration Object
 * 
 * Configures 15+ security-focused HTTP headers to protect against common
 * web vulnerabilities including XSS, clickjacking, and MIME sniffing.
 * 
 * @type {Object}
 * @property {Object} contentSecurityPolicy - CSP directives configuration
 * @property {Object} hsts - HTTP Strict Transport Security settings
 * @property {Object} frameguard - X-Frame-Options configuration
 * @property {boolean} noSniff - X-Content-Type-Options: nosniff
 * @property {boolean} xssFilter - X-XSS-Protection header (legacy)
 * @property {Object} referrerPolicy - Referrer-Policy header settings
 * @property {boolean} crossOriginEmbedderPolicy - COEP header
 * @property {Object} crossOriginOpenerPolicy - COOP header settings
 * @property {Object} crossOriginResourcePolicy - CORP header settings
 */
const helmetConfig = {
  /**
   * Content-Security-Policy Configuration
   * 
   * Defines trusted sources for various content types to prevent XSS attacks
   * by restricting where resources can be loaded from.
   */
  contentSecurityPolicy: {
    directives: {
      /**
       * Default source for all content types not explicitly specified
       * Restricts to same origin only
       */
      defaultSrc: ["'self'"],
      
      /**
       * Script sources - only allow scripts from same origin
       * This prevents injection of external malicious scripts
       */
      scriptSrc: ["'self'"],
      
      /**
       * Style sources - allow same origin and inline styles
       * 'unsafe-inline' needed for some CSS frameworks, but use sparingly
       */
      styleSrc: ["'self'", "'unsafe-inline'"],
      
      /**
       * Image sources - allow same origin and data URIs
       * Data URIs needed for inline images (base64 encoded)
       */
      imgSrc: ["'self'", 'data:'],
      
      /**
       * Font sources - restrict to same origin
       */
      fontSrc: ["'self'"],
      
      /**
       * Object sources (plugins) - completely disabled
       * This blocks Flash and other potentially dangerous plugins
       */
      objectSrc: ["'none'"],
      
      /**
       * Upgrade insecure requests
       * Instructs browser to upgrade HTTP requests to HTTPS
       */
      upgradeInsecureRequests: []
    }
  },

  /**
   * HTTP Strict Transport Security (HSTS) Configuration
   * 
   * Forces browsers to only connect via HTTPS for the specified duration,
   * protecting against protocol downgrade attacks and cookie hijacking.
   */
  hsts: {
    /**
     * Maximum age in seconds (1 year = 31536000 seconds)
     * Browsers will remember to only use HTTPS for this duration
     */
    maxAge: 31536000,
    
    /**
     * Apply HSTS to all subdomains
     * Ensures comprehensive protection across all subdomain resources
     */
    includeSubDomains: true,
    
    /**
     * Allow inclusion in browser HSTS preload lists
     * Enables protection even on first visit to the site
     */
    preload: true
  },

  /**
   * X-Frame-Options Configuration (frameguard)
   * 
   * Protects against clickjacking attacks by controlling whether the page
   * can be embedded in iframes.
   */
  frameguard: {
    /**
     * Action 'sameorigin' allows framing only from same origin
     * Prevents malicious sites from embedding this application
     */
    action: 'sameorigin'
  },

  /**
   * X-Content-Type-Options Configuration
   * 
   * When set to true, sends X-Content-Type-Options: nosniff header
   * Prevents browsers from MIME-sniffing a response away from the declared content-type
   */
  noSniff: true,

  /**
   * X-XSS-Protection Configuration (Legacy)
   * 
   * Note: This header is deprecated and modern browsers no longer support it.
   * However, it's kept for compatibility with older browsers.
   * Modern XSS protection is better achieved through CSP.
   */
  xssFilter: true,

  /**
   * Referrer-Policy Configuration
   * 
   * Controls how much referrer information is included with requests.
   * 'strict-origin-when-cross-origin' sends full URL for same-origin,
   * origin only for cross-origin HTTPS, and nothing for cross-origin to HTTP.
   */
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  /**
   * Cross-Origin-Embedder-Policy (COEP) Configuration
   * 
   * When enabled, prevents the document from loading any cross-origin
   * resources that don't explicitly grant permission (via CORS or CORP).
   * Required for SharedArrayBuffer and performance.measureUserAgentSpecificMemory()
   */
  crossOriginEmbedderPolicy: true,

  /**
   * Cross-Origin-Opener-Policy (COOP) Configuration
   * 
   * Isolates the browsing context from other origins, preventing
   * cross-origin attacks like window.opener exploitation.
   */
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },

  /**
   * Cross-Origin-Resource-Policy (CORP) Configuration
   * 
   * Controls which origins can read this resource, providing protection
   * against speculative side-channel attacks (Spectre).
   */
  crossOriginResourcePolicy: {
    policy: 'same-origin'
  }
};

/**
 * Parse CORS allowed origins from environment variable
 * 
 * Parses the ALLOWED_ORIGINS environment variable, which can be a
 * comma-separated list of origins, and returns an array of trimmed origins.
 * Falls back to development defaults if not specified.
 * 
 * @returns {string[]} Array of allowed origin URLs
 */
const parseAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
  }
  
  // Default origins for development
  // In production, ALLOWED_ORIGINS should always be explicitly set
  return ['http://localhost:3000', 'http://localhost:8080'];
};

/**
 * CORS (Cross-Origin Resource Sharing) Configuration Object
 * 
 * Controls which origins can access this API and what HTTP methods
 * and headers are permitted in cross-origin requests.
 * 
 * @type {Object}
 * @property {string[]|Function} origin - Allowed origins whitelist
 * @property {string[]} methods - Allowed HTTP methods
 * @property {string[]} allowedHeaders - Allowed request headers
 * @property {boolean} credentials - Allow credentials (cookies, auth headers)
 * @property {number} maxAge - Preflight cache duration in seconds
 * @property {number} optionsSuccessStatus - Status code for successful OPTIONS requests
 */
const corsOptions = {
  /**
   * Allowed Origins
   * 
   * Specifies which origins are permitted to make cross-origin requests.
   * Loaded from ALLOWED_ORIGINS environment variable (comma-separated).
   * Defaults to localhost development origins if not specified.
   */
  origin: parseAllowedOrigins(),

  /**
   * Allowed HTTP Methods
   * 
   * Specifies which HTTP methods are permitted in cross-origin requests.
   * Includes all standard RESTful API methods plus OPTIONS for preflight.
   */
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  /**
   * Allowed Request Headers
   * 
   * Specifies which headers can be included in cross-origin requests.
   * - Content-Type: Required for JSON/form submissions
   * - Authorization: Required for authenticated requests (JWT, Bearer tokens)
   * - X-Requested-With: Common header for AJAX identification
   */
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

  /**
   * Credentials Support
   * 
   * When true, allows cookies and authorization headers to be included
   * in cross-origin requests. Required for authenticated API calls.
   */
  credentials: true,

  /**
   * Preflight Cache Duration (seconds)
   * 
   * How long browsers should cache preflight (OPTIONS) request results.
   * 86400 seconds = 24 hours, reducing preflight request overhead.
   */
  maxAge: 86400,

  /**
   * OPTIONS Success Status Code
   * 
   * Status code for successful OPTIONS (preflight) requests.
   * 204 (No Content) is used as no response body is needed.
   * Some legacy browsers may require 200 instead.
   */
  optionsSuccessStatus: 204
};

/**
 * Security Configuration Wrapper
 * 
 * Provides a structured wrapper around the helmet configuration
 * for consistent access pattern in the application.
 * 
 * @type {Object}
 * @property {Object} helmet - Helmet.js configuration object
 */
const securityConfig = {
  helmet: helmetConfig
};

/**
 * Get Helmet Configuration
 * 
 * Factory function that returns the current helmet configuration.
 * Useful for scenarios where fresh configuration is needed or
 * for testing purposes where configuration might be modified.
 * 
 * @returns {Object} The complete helmet.js configuration object
 */
const getHelmetConfig = () => {
  return helmetConfig;
};

/**
 * Get CORS Options
 * 
 * Factory function that returns the current CORS configuration.
 * Re-parses allowed origins from environment to capture any runtime changes.
 * Useful for scenarios where fresh configuration is needed or
 * for testing purposes.
 * 
 * @returns {Object} The complete CORS configuration object with current origins
 */
const getCorsOptions = () => {
  // Return a fresh copy with potentially updated origins from environment
  return {
    ...corsOptions,
    origin: parseAllowedOrigins()
  };
};

/**
 * Module Exports
 * 
 * Exports all security configuration objects and factory functions
 * for use by the Express application middleware setup.
 */
module.exports = {
  /**
   * Structured security configuration with helmet settings
   * Use: securityConfig.helmet for helmet middleware options
   */
  securityConfig,
  
  /**
   * CORS configuration options for cors middleware
   * Use: cors(corsOptions)
   */
  corsOptions,
  
  /**
   * Direct access to helmet configuration
   * Use: helmet(helmetConfig)
   */
  helmetConfig,
  
  /**
   * Factory function to get helmet configuration
   * Use: helmet(getHelmetConfig())
   */
  getHelmetConfig,
  
  /**
   * Factory function to get CORS options (with fresh origins)
   * Use: cors(getCorsOptions())
   */
  getCorsOptions
};
