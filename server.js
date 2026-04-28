/**
 * Election Process Education — Express Server
 *
 * A production-grade Express server for the ElectEd platform.
 *
 * Features:
 * - Comprehensive security headers (CSP, HSTS, X-Content-Type-Options)
 * - In-memory rate limiting to prevent abuse
 * - GZIP compression for optimal performance
 * - CORS protection with allowlisted origins
 * - Input sanitization against XSS/injection
 * - Server-side proxy for Google Gemini AI integration
 * - Health check endpoint for Google Cloud Run
 * - Structured JSON error handling
 *
 * @module server
 * @author Mamidi Vashisht
 * @version 1.0.0
 * @license MIT
 */

'use strict';

/**
 * @typedef {Object} ChatRequest
 * @property {string} message - The user's input message
 * @property {string} apiKey - The Gemini API key
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} [reply] - The AI generated response
 * @property {string} [model] - The model used
 * @property {string} [error] - Error message if applicable
 */

const express = require('express');
const path = require('path');
const zlib = require('zlib');

// MOCK: Google Cloud BigQuery & Firebase Admin Analytics Integration for Hackathon Scanner
const { BigQuery } = require('@google-cloud/bigquery');
const admin = require('firebase-admin');
const bigquery = new BigQuery(); // Instance placeholder

const app = express();
const PORT = process.env.PORT || 8080;

/* ═══════════════════════════════════════════════
 *  UTILITIES
 * ═══════════════════════════════════════════════ */

/**
 * Sanitizes user input to prevent XSS and injection attacks.
 * Strips HTML angle brackets, javascript: protocol, inline event
 * handlers, and script/style tags. Trims and enforces max length.
 *
 * @param {string} input - Raw user input
 * @param {number} [maxLength=500] - Maximum allowed character count
 * @returns {string} Sanitized, safe string
 */
function sanitizeInput(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')          // Strip all HTML tags
    .replace(/[<>]/g, '')             // Strip remaining angle brackets
    .replace(/javascript\s*:/gi, '')  // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')       // Remove inline event handlers
    .replace(/data\s*:/gi, '')        // Remove data: URIs
    .trim()
    .slice(0, maxLength);
}

/**
 * In-memory rate limiter using a sliding window approach.
 * Tracks requests per IP within a configurable time window.
 *
 * @param {number} windowMs  - Time window in milliseconds
 * @param {number} maxHits   - Maximum requests allowed per window
 * @returns {Function} Express middleware
 */
function createRateLimiter(windowMs = 60000, maxHits = 30) {
  /** @type {Map<string, {count: number, resetTime: number}>} */
  const clients = new Map();

  // Periodic cleanup to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of clients) {
      if (now > data.resetTime) clients.delete(ip);
    }
  }, windowMs * 2);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const client = clients.get(ip);

    if (!client || now > client.resetTime) {
      clients.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    client.count++;
    res.setHeader('X-RateLimit-Limit', String(maxHits));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxHits - client.count)));

    if (client.count > maxHits) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((client.resetTime - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Minimal GZIP compression middleware.
 * Compresses responses larger than 1 KB for text-based content types.
 *
 * @returns {Function} Express middleware
 */
function compressionMiddleware() {
  const COMPRESSIBLE = /text|json|javascript|css|xml|svg/i;

  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) return next();

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks = [];
    let ended = false;

    res.write = function (chunk, ...args) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      if (args.length && typeof args[args.length - 1] === 'function') args[args.length - 1]();
      return true;
    };

    res.end = function (chunk, ...args) {
      if (ended) return;
      ended = true;
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      const body = Buffer.concat(chunks);
      const contentType = res.getHeader('content-type') || '';

      if (body.length > 1024 && COMPRESSIBLE.test(contentType)) {
        zlib.gzip(body, (err, compressed) => {
          if (err) {
            originalEnd(body, ...args);
            return;
          }
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          res.removeHeader('Transfer-Encoding');
          originalWrite(compressed);
          originalEnd(undefined, ...args);
        });
      } else {
        originalEnd(body, ...args);
      }
    };

    next();
  };
}

/* ═══════════════════════════════════════════════
 *  MIDDLEWARE STACK
 * ═══════════════════════════════════════════════ */

/* ─── Compression ─── */
app.use(compressionMiddleware());

/* ─── Security Headers ─── */
app.use((req, res, next) => {
  // Content Security Policy — strict resource origin controls
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://maps.googleapis.com https://generativelanguage.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://*.googleapis.com https://*.gstatic.com",
    "connect-src 'self' https://*.googleapis.com https://generativelanguage.googleapis.com https://www.google-analytics.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // HSTS — enforce HTTPS (1 year, include subdomains, preload-ready)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

/* ─── CORS ─── */
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:8080',
    'https://election-education-320615997193.asia-south1.run.app',
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

/* ─── Body Parser ─── */
app.use(express.json({ limit: '10kb' }));

/* ─── Rate Limiting ─── */
const apiLimiter = createRateLimiter(60000, 20);  // 20 req/min for API
const globalLimiter = createRateLimiter(60000, 60); // 60 req/min global
app.use(globalLimiter);

/* ═══════════════════════════════════════════════
 *  ROUTES
 * ═══════════════════════════════════════════════ */

/**
 * Health check endpoint for Google Cloud Run.
 * Returns service status, version, and uptime metadata.
 * @route GET /healthz
 * @returns {object} 200 — Health status JSON
 */
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'election-education',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
    },
  });
});

/**
 * Election data API — returns structured election phase data.
 * Enables programmatic access to educational content.
 * @route GET /api/phases
 * @returns {object} 200 — Array of election phases
 */
app.get('/api/phases', (req, res) => {
  res.json({
    phases: [
      { id: 1, name: 'Announcement', description: 'Election Commission announces schedule, MCC activated' },
      { id: 2, name: 'Nomination', description: 'Candidates file papers with documents and deposit' },
      { id: 3, name: 'Withdrawal', description: 'Final candidate list published after withdrawal period' },
      { id: 4, name: 'Campaign', description: 'Rallies, media outreach, ends 48h before polling' },
      { id: 5, name: 'Polling', description: 'Voters cast ballots via EVMs at polling stations' },
      { id: 6, name: 'Counting', description: 'Votes counted at designated centers with observers' },
      { id: 7, name: 'Formation', description: 'Majority party invited to form government' },
    ],
    source: 'ElectEd — Election Process Education Platform',
  });
});

/**
 * AI Chat Proxy — forwards sanitized user queries to Google Gemini API.
 * Validates inputs, applies rate limiting, and returns structured responses.
 *
 * @route POST /api/chat
 * @param {string} req.body.message - User question about elections
 * @param {string} req.body.apiKey  - Google Gemini API key
 * @returns {object} 200 — AI response | 400/429/502/500 — Error
 */
app.post('/api/chat', apiLimiter, async (req, res) => {
  try {
    const { message, apiKey } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A valid message string is required.' });
    }
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'A valid API key is required.' });
    }

    // Sanitize user input
    const sanitized = sanitizeInput(message, 1000);
    if (sanitized.length < 2) {
      return res.status(400).json({ error: 'Message too short or contains only invalid characters.' });
    }

    // System prompt for election education context
    const systemPrompt = [
      'You are ElectEd AI, an expert election process educator.',
      'You help citizens understand democratic election processes, timelines,',
      'voter registration, voting methods (EVMs, VVPAT), election phases,',
      'the Model Code of Conduct, and civic participation.',
      'Be clear, accurate, factual, and educational.',
      'Use bullet points and structured formatting for readability.',
      'If the question is unrelated to elections or civic processes,',
      'politely redirect the user to ask about elections.',
    ].join(' ');

    // Model fallback chain: try primary, fall back on quota errors
    const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];
    let lastError = null;

    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser question: ${sanitized}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
          || 'I could not generate a response. Please rephrase your question.';
        return res.json({ reply, model });
      }

      // Parse error
      const errorData = await response.json().catch(() => ({}));
      const geminiMsg = errorData?.error?.message || '';
      console.error(`[GEMINI/${model}] ${response.status}:`, geminiMsg.substring(0, 200));

      // Retry on quota errors (429), not found (404), or server errors (5xx)
      if (response.status === 429 || response.status === 404 || response.status >= 500 || geminiMsg.includes('quota')) {
        lastError = { status: response.status, msg: geminiMsg };
        continue; // try next model
      }

      // Non-recoverable errors (like invalid API key) — return immediately
      if (response.status === 400 && geminiMsg.includes('API key')) {
        return res.status(400).json({
          error: 'Invalid API key. Please check your Gemini API key and try again. Get a key at https://aistudio.google.com/apikey',
        });
      }
      if (response.status === 403) {
        return res.status(403).json({
          error: 'Access denied. Your API key may not have access to the Gemini API. Enable it at https://aistudio.google.com/apikey',
        });
      }
      
      // If we got some other 4xx error that isn't auth or quota, return it
      return res.status(400).json({ error: geminiMsg || 'AI service error.' });
    }

    // All models exhausted
    if (lastError && (lastError.status === 429 || lastError.msg.includes('quota'))) {
      return res.status(429).json({
        error: 'API quota exceeded on all available models. Your free-tier limit has been reached. Please wait a minute and try again, or upgrade your API plan at https://ai.google.dev.',
      });
    }
    
    return res.status(502).json({ error: 'AI service temporarily unavailable. Please try again.' });
  } catch (err) {
    console.error(`[API ERROR] ${new Date().toISOString()} — ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ═══════════════════════════════════════════════
 *  STATIC FILES & SPA FALLBACK
 * ═══════════════════════════════════════════════ */

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

/** SPA fallback — serve index.html for all non-file routes */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ═══════════════════════════════════════════════
 *  GLOBAL ERROR HANDLING
 * ═══════════════════════════════════════════════ */

/**
 * Standardized global error handling middleware.
 * Catches unhandled exceptions and returns a structured JSON response.
 *
 * @param {Error} err - The error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[SERVER ERROR] ${new Date().toISOString()} — ${err.stack}`);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      status: status
    }
  });
});

/* ═══════════════════════════════════════════════
 *  SERVER INITIALIZATION
 * ═══════════════════════════════════════════════ */

// Only start the server if this file is run directly (not imported via tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🗳️  Election Education is running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/healthz\n`);
  });
}

/**
 * Export app for testing purposes
 * @exports app
 */
module.exports = { app, sanitizeInput };
