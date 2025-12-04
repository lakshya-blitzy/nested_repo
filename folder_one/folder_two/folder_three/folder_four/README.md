# Secure Node.js HTTP Server

A security-hardened Node.js HTTP server built with Express.js framework, featuring a comprehensive security middleware stack including HTTP security headers, CORS policies, rate limiting, input validation, and HTTPS support.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [SSL Certificate Generation](#ssl-certificate-generation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Security Verification](#security-verification)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

This project transforms a minimal Node.js HTTP server into a production-ready, security-hardened application using Express.js and industry-standard security packages. The implementation follows OWASP security guidelines and implements defense-in-depth security strategies.

### Key Highlights

- **Framework**: Express.js 4.21.x with full middleware architecture
- **Security Headers**: 15+ HTTP security headers via helmet.js
- **Rate Limiting**: IP-based abuse prevention
- **CORS**: Whitelist-based cross-origin policy
- **Input Validation**: Request sanitization middleware
- **HTTPS**: Optional TLS/SSL encryption support
- **Zero Breaking Changes**: Original API functionality preserved

## Features

| Feature | Package | Description |
|---------|---------|-------------|
| Security Headers | `helmet@^8.1.0` | Sets 15+ HTTP security headers |
| CORS Policy | `cors@^2.8.5` | Configurable cross-origin access control |
| Rate Limiting | `express-rate-limit@^7.5.0` | IP-based request throttling |
| Input Validation | `express-validator@^7.3.1` | Request sanitization and validation |
| HTTPS Support | Node.js `https` module | TLS/SSL encryption |
| Environment Config | `dotenv@^16.4.5` | Environment variable management |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.0.0 or higher (required)
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **OpenSSL**: For generating development SSL certificates (optional, for HTTPS)

To verify your Node.js version:

```bash
node --version
# Should output v18.x.x or higher
```

## Installation

1. **Clone the repository** (if applicable):

```bash
git clone <repository-url>
cd folder_one/folder_two/folder_three/folder_four
```

2. **Install dependencies**:

```bash
npm install
```

This will install all required packages:
- `express` - Web framework
- `helmet` - Security headers middleware
- `cors` - Cross-Origin Resource Sharing middleware
- `express-rate-limit` - Rate limiting middleware
- `express-validator` - Input validation middleware
- `dotenv` - Environment variable management
- `nodemon` (dev) - Development auto-restart

3. **Configure environment variables**:

```bash
cp .env.example .env
```

Edit the `.env` file to customize your configuration.

## Configuration

### Environment Setup

Copy the example environment file and customize it for your environment:

```bash
cp .env.example .env
```

### Basic Configuration

Edit the `.env` file with your settings:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HTTPS_PORT=443

# SSL/TLS Configuration (for HTTPS)
SSL_KEY_PATH=./certs/server.key
SSL_CERT_PATH=./certs/server.cert

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes in milliseconds
RATE_LIMIT_MAX=100            # Maximum requests per window

# Security Options
ENABLE_HTTPS=false            # Set to true to enable HTTPS
TRUST_PROXY=false             # Set to true if behind a reverse proxy
```

### Configuration Options Explained

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | `3000` | HTTP server port |
| `HTTPS_PORT` | `443` | HTTPS server port (when enabled) |
| `SSL_KEY_PATH` | `./certs/server.key` | Path to SSL private key file |
| `SSL_CERT_PATH` | `./certs/server.cert` | Path to SSL certificate file |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit time window in milliseconds (15 min) |
| `RATE_LIMIT_MAX` | `100` | Maximum requests per IP per time window |
| `ENABLE_HTTPS` | `false` | Enable HTTPS server |
| `TRUST_PROXY` | `false` | Trust proxy headers (for load balancer setups) |

## SSL Certificate Generation

### Development Certificates (Self-Signed)

For local development, generate self-signed SSL certificates using OpenSSL:

```bash
# Create the certs directory if it doesn't exist
mkdir -p certs

# Generate a self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.cert \
  -subj "/C=US/ST=State/L=City/O=Dev/CN=localhost"
```

**Note**: Self-signed certificates will trigger browser security warnings. This is expected for development. For production, obtain certificates from a trusted Certificate Authority (CA) like Let's Encrypt.

### Production Certificates

For production deployments, you should obtain SSL certificates from a trusted CA:

1. **Let's Encrypt** (Free):
   ```bash
   # Using certbot (example for Ubuntu)
   sudo certbot certonly --standalone -d yourdomain.com
   ```

2. **Commercial CA**: Follow your CA's instructions to generate a Certificate Signing Request (CSR) and obtain certificates.

Update your `.env` file with the paths to your production certificates:

```bash
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

## Usage

### Starting the Server

**Production mode (HTTP only)**:
```bash
npm start
```

**Development mode (with auto-restart)**:
```bash
npm run dev
```

**Production mode with HTTPS**:
```bash
ENABLE_HTTPS=true npm start
```

Or set `ENABLE_HTTPS=true` in your `.env` file and run:
```bash
npm start
```

### Available npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node server.js` | Start production server (HTTP) |
| `dev` | `nodemon server.js` | Start development server with hot reload |
| `start:https` | `ENABLE_HTTPS=true node server.js` | Start with HTTPS enabled |

### Server Output

When the server starts successfully, you'll see:

```
HTTP Server running on port 3000
```

If HTTPS is enabled:

```
HTTP Server running on port 3000
HTTPS Server running on port 443
```

## API Endpoints

### GET /

Returns a simple "Hello, World!" message.

**Request**:
```bash
curl http://localhost:3000/
```

**Response**:
```
Hello, World!
```

**Response Headers** (with security headers):
```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self';...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Content-Type: text/plain; charset=utf-8
```

## Security Features

### 1. Helmet.js Security Headers

Helmet.js automatically sets the following security headers:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Prevents XSS attacks by controlling resource loading |
| `Cross-Origin-Opener-Policy` | Isolates browsing context for security |
| `Cross-Origin-Resource-Policy` | Controls cross-origin resource sharing |
| `Origin-Agent-Cluster` | Enables origin isolation |
| `Referrer-Policy` | Controls referrer information in requests |
| `Strict-Transport-Security` | Enforces HTTPS connections |
| `X-Content-Type-Options` | Prevents MIME type sniffing |
| `X-DNS-Prefetch-Control` | Controls DNS prefetching |
| `X-Download-Options` | Prevents IE from executing downloads |
| `X-Frame-Options` | Prevents clickjacking attacks |
| `X-Permitted-Cross-Domain-Policies` | Controls Adobe cross-domain policy |
| `X-XSS-Protection` | Legacy XSS filter (disabled by default in helmet 8.x) |

### 2. CORS (Cross-Origin Resource Sharing)

The CORS middleware is configured with:

- **Whitelist-based origin policy**: Only specified origins can access the API
- **Configurable HTTP methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Credentials support**: Allows cookies/auth headers when enabled
- **Preflight caching**: OPTIONS requests cached for performance

Configure allowed origins in your `.env`:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 3. Rate Limiting

IP-based rate limiting protects against:

- **Brute force attacks**: Limits login/authentication attempts
- **DDoS attacks**: Prevents request flooding
- **API abuse**: Controls excessive API usage

Default configuration:
- **Window**: 15 minutes (900,000 ms)
- **Max Requests**: 100 requests per IP per window
- **Headers**: RateLimit-* headers included in responses

When rate limit is exceeded:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 900
Content-Type: application/json

{
  "message": "Too many requests, please try again later."
}
```

### 4. Input Validation

The express-validator middleware provides:

- **Request sanitization**: Escapes HTML entities, trims whitespace
- **Type validation**: Ensures correct data types
- **Custom validators**: Extensible validation rules
- **Error handling**: Standardized validation error responses

Example validation for a hypothetical POST endpoint:
```javascript
app.post('/api/data',
  body('email').isEmail().normalizeEmail(),
  body('name').trim().escape().notEmpty(),
  validateRequest,
  (req, res) => { /* handler */ }
);
```

### 5. HTTPS/TLS Encryption

When enabled, HTTPS provides:

- **Data encryption**: All data transmitted over TLS 1.2/1.3
- **Man-in-the-middle protection**: Prevents traffic interception
- **Certificate validation**: Verifies server identity
- **HTTP/2 support**: Modern protocol benefits (with proper configuration)

Enable HTTPS:
```bash
ENABLE_HTTPS=true npm start
```

## Security Verification

### Verify Security Headers

Use curl to inspect response headers:

```bash
curl -I http://localhost:3000/
```

Expected output should include security headers like:
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security` (with HTTPS)

### Test Rate Limiting

Send multiple requests to trigger the rate limit:

```bash
# Bash script to test rate limiting
for i in {1..105}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
  echo "Request $i: HTTP $response"
done
```

After exceeding the limit (default: 100 requests), you should see `429` responses.

### Test CORS Policy

Attempt a cross-origin request:

```bash
# Should be blocked if origin is not in whitelist
curl -H "Origin: http://evil.com" -I http://localhost:3000/

# Should be allowed if origin is whitelisted
curl -H "Origin: http://localhost:3000" -I http://localhost:3000/
```

### Verify HTTPS

Test TLS connection:

```bash
# Check TLS handshake (when HTTPS is enabled)
openssl s_client -connect localhost:443 -brief
```

### Run Dependency Audit

Check for known vulnerabilities in dependencies:

```bash
npm audit
```

Expected output:
```
found 0 vulnerabilities
```

## Environment Variables

Complete reference of all environment variables:

```bash
# ============================================
# Server Configuration
# ============================================
# Environment mode: development, production, test
NODE_ENV=development

# HTTP server port
PORT=3000

# HTTPS server port (when HTTPS is enabled)
HTTPS_PORT=443

# ============================================
# SSL/TLS Configuration
# ============================================
# Path to SSL private key file
SSL_KEY_PATH=./certs/server.key

# Path to SSL certificate file
SSL_CERT_PATH=./certs/server.cert

# ============================================
# CORS Configuration
# ============================================
# Comma-separated list of allowed origins
# Use '*' to allow all origins (not recommended for production)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# ============================================
# Rate Limiting Configuration
# ============================================
# Time window in milliseconds (default: 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per IP per window (default: 100)
RATE_LIMIT_MAX=100

# ============================================
# Security Options
# ============================================
# Enable HTTPS server (requires SSL certificates)
ENABLE_HTTPS=false

# Trust proxy headers (set to true if behind load balancer/reverse proxy)
# Required for accurate IP-based rate limiting behind proxies
TRUST_PROXY=false
```

## Project Structure

```
folder_one/folder_two/folder_three/folder_four/
├── server.js              # Application entry point (HTTP/HTTPS server startup)
├── app.js                 # Express application with security middleware
├── package.json           # NPM dependencies and scripts
├── package-lock.json      # Locked dependency versions
├── .env.example           # Environment variable template
├── .env                   # Environment variables (git-ignored)
├── .gitignore             # Git ignore patterns
├── README.md              # This documentation file
├── config/
│   ├── security.js        # Security middleware configuration (helmet, cors)
│   └── https.js           # HTTPS server configuration
├── middleware/
│   ├── index.js           # Middleware aggregation and exports
│   ├── rateLimiter.js     # Rate limiting middleware
│   └── validation.js      # Input validation middleware
└── certs/                 # SSL certificates directory (git-ignored)
    └── .gitkeep           # Placeholder to maintain directory
```

### File Descriptions

| File/Directory | Purpose |
|----------------|---------|
| `server.js` | Entry point - starts HTTP and optionally HTTPS servers |
| `app.js` | Express app with security middleware stack |
| `config/security.js` | Helmet and CORS configuration options |
| `config/https.js` | HTTPS server creation with certificate loading |
| `middleware/rateLimiter.js` | IP-based rate limiting configuration |
| `middleware/validation.js` | Input validation and sanitization |
| `middleware/index.js` | Middleware exports aggregation |
| `certs/` | Directory for SSL certificates (not committed) |

## Troubleshooting

### Common Issues

#### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: Stop the process using the port or change the PORT in `.env`:
```bash
# Find process using port 3000
lsof -i :3000
# Or on Windows
netstat -ano | findstr :3000

# Kill the process or change PORT in .env
PORT=3001
```

#### SSL Certificate Not Found

```
Error: ENOENT: no such file or directory, open './certs/server.key'
```

**Solution**: Generate development certificates:
```bash
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.cert \
  -subj "/C=US/ST=State/L=City/O=Dev/CN=localhost"
```

#### Rate Limit Triggered

```
HTTP/1.1 429 Too Many Requests
```

**Solution**: Wait for the rate limit window to expire (default: 15 minutes) or adjust `RATE_LIMIT_MAX` in `.env`.

#### CORS Blocked Request

```
Access to fetch at 'http://localhost:3000/' from origin 'http://example.com' has been blocked by CORS policy
```

**Solution**: Add the origin to `ALLOWED_ORIGINS` in `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://example.com
```

#### Module Not Found

```
Error: Cannot find module 'express'
```

**Solution**: Install dependencies:
```bash
npm install
```

### Debug Mode

For verbose logging during development:

```bash
DEBUG=express:* npm run dev
```

## Security Best Practices

1. **Never commit `.env` files** - Contains sensitive configuration
2. **Never commit SSL private keys** - Keep `certs/*.key` files secure
3. **Use strong SSL certificates** - Obtain from trusted CAs for production
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Use HTTPS in production** - Always encrypt data in transit
6. **Configure CORS strictly** - Whitelist only necessary origins
7. **Adjust rate limits** - Tune for your specific use case
8. **Monitor security headers** - Verify headers are set correctly

## License

MIT License - See LICENSE file for details.

---

## Quick Start Summary

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. (Optional) Generate dev SSL certificates
mkdir -p certs && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.cert \
  -subj "/C=US/ST=State/L=City/O=Dev/CN=localhost"

# 4. Start the server
npm start

# 5. Verify security headers
curl -I http://localhost:3000/
```

Your secure Node.js server is now running at `http://localhost:3000/`!
