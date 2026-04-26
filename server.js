/**
 * Election Process Education — Express Server
 *
 * Serves the Election Education single-page application with:
 * - Security headers (CSP, HSTS, X-Content-Type-Options, etc.)
 * - Static file serving with cache control
 * - Health check endpoint for Cloud Run
 * - API endpoint for Gemini AI integration
 * - Structured error handling & input sanitization
 *
 * @module server
 * @author Mamidi Vashisht
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

/* ─── Input Sanitization Utility ─── */

/**
 * Sanitizes user input to prevent XSS and injection attacks.
 * Strips HTML tags and limits string length.
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length (default 500)
 * @returns {string} Sanitized string
 */
function sanitizeInput(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')          // Strip angle brackets
    .replace(/javascript:/gi, '')  // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')    // Remove event handlers
    .trim()
    .slice(0, maxLength);
}

/* ─── Security Middleware ─── */

/**
 * Sets protective HTTP headers to mitigate XSS, clickjacking,
 * MIME sniffing, and enforce HTTPS.
 */
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://maps.googleapis.com https://generativelanguage.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://*.googleapis.com https://*.gstatic.com",
      "connect-src 'self' https://*.googleapis.com https://generativelanguage.googleapis.com https://www.google-analytics.com",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

/* ─── Body Parser ─── */
app.use(express.json({ limit: '10kb' }));

/* ─── Health Check ─── */

/**
 * Health check endpoint for Google Cloud Run.
 * @route GET /healthz
 */
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'election-education',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/* ─── API: AI Chat Proxy ─── */

/**
 * Proxies chat requests to Google Gemini API.
 * Validates and sanitizes user input before forwarding.
 * @route POST /api/chat
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, apiKey } = req.body;

    if (!message || !apiKey) {
      return res.status(400).json({ error: 'Message and API key are required.' });
    }

    const sanitized = sanitizeInput(message, 1000);
    if (sanitized.length === 0) {
      return res.status(400).json({ error: 'Invalid message content.' });
    }

    // Forward to Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert election process educator. You help people understand democratic election processes, timelines, voter registration, voting methods, election phases, and civic participation. Be clear, accurate, and educational. Answer in a structured, easy-to-understand way with bullet points where helpful. If the question is not related to elections or civic processes, politely redirect the user.\n\nUser question: ${sanitized}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[GEMINI ERROR] ${response.status}:`, errorData);
      return res.status(502).json({ error: 'AI service temporarily unavailable.' });
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.';

    res.json({ reply });
  } catch (err) {
    console.error(`[API ERROR] ${new Date().toISOString()} — ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/* ─── Static Files ─── */

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  })
);

/* ─── SPA Fallback ─── */

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ─── Global Error Handler ─── */

app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${new Date().toISOString()} — ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

/* ─── Start Server ─── */

app.listen(PORT, () => {
  console.log(`🗳️  Election Education is running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/healthz`);
});
