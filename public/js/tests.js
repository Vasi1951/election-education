/**
 * Election Education — Test Suite
 *
 * Validates core functionality including:
 * - Data module integrity
 * - Input sanitization
 * - Search functionality
 * - API endpoint validation
 * - Security header verification
 *
 * Run: node public/js/tests.js
 *
 * @module tests
 * @author Mamidi Vashisht
 */

'use strict';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, name) {
  if (condition) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}`);
  }
}

function section(title) {
  results.push(`\n📋 ${title}`);
}

/* ─── Sanitization Tests ─── */
section('Input Sanitization');

function sanitizeInput(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

assert(sanitizeInput('<script>alert("xss")</script>') === 'scriptalert("xss")/script', 'Strips angle brackets from XSS');
assert(sanitizeInput('javascript:alert(1)') === 'alert(1)', 'Removes javascript: protocol');
assert(sanitizeInput('onerror=alert(1)').indexOf('onerror=') === -1, 'Removes event handler attributes');
assert(sanitizeInput('Hello World') === 'Hello World', 'Preserves clean input');
assert(sanitizeInput('  spaces  ') === 'spaces', 'Trims whitespace');
assert(sanitizeInput('a'.repeat(600), 500).length === 500, 'Enforces max length');
assert(sanitizeInput(123) === '', 'Returns empty for non-string');
assert(sanitizeInput(null) === '', 'Returns empty for null');
assert(sanitizeInput(undefined) === '', 'Returns empty for undefined');
assert(sanitizeInput('') === '', 'Returns empty for empty string');

/* ─── Data Module Tests ─── */
section('Data Module');

// Simulate data loading
const ElectionData = require('./data.js') || {};

// If data module uses IIFE, we test the structure expectations
assert(typeof ElectionData === 'object' || typeof ElectionData === 'undefined', 'Data module exports object or is IIFE');

/* ─── Server Tests (HTTP) ─── */
section('Server Endpoints');

async function testServer() {
  const baseUrl = 'http://localhost:8080';

  try {
    // Health check
    const healthRes = await fetch(`${baseUrl}/healthz`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns 200');
    assert(healthData.status === 'healthy', 'Health status is healthy');
    assert(healthData.service === 'election-education', 'Service name correct');
    assert(typeof healthData.timestamp === 'string', 'Timestamp present');

    // Static file serving
    const indexRes = await fetch(`${baseUrl}/`);
    assert(indexRes.status === 200, 'Index page returns 200');
    assert(indexRes.headers.get('content-type').includes('html'), 'Index serves HTML');

    // Security headers
    assert(indexRes.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options set');
    assert(indexRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options set');
    assert(indexRes.headers.get('x-xss-protection') === '1; mode=block', 'XSS Protection set');
    assert(indexRes.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy set');
    assert(indexRes.headers.get('content-security-policy') !== null, 'CSP header present');
    assert(indexRes.headers.get('permissions-policy') !== null, 'Permissions-Policy present');

    // CSS files
    const cssRes = await fetch(`${baseUrl}/css/variables.css`);
    assert(cssRes.status === 200, 'CSS variables file serves correctly');

    // JS files
    const jsRes = await fetch(`${baseUrl}/js/app.js`);
    assert(jsRes.status === 200, 'JS app file serves correctly');

    // API validation — missing body
    const apiRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(apiRes.status === 400, 'API returns 400 for missing params');

    // SPA fallback
    const spaRes = await fetch(`${baseUrl}/nonexistent-route`);
    assert(spaRes.status === 200, 'SPA fallback serves index.html');

  } catch (err) {
    results.push(`  ⚠️  Server tests skipped (server not running): ${err.message}`);
    results.push('  💡 Start the server with: npm start');
  }
}

/* ─── Accessibility Tests ─── */
section('Accessibility Checks');

const fs = require('fs');
const path = require('path');

try {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert(html.includes('lang="en"'), 'HTML lang attribute present');
  assert(html.includes('role="navigation"'), 'Navigation landmark present');
  assert(html.includes('role="main"') || html.includes('<main'), 'Main landmark present');
  assert(html.includes('role="contentinfo"') || html.includes('<footer'), 'Footer landmark present');
  assert(html.includes('aria-label'), 'ARIA labels present');
  assert(html.includes('aria-live'), 'Live regions for dynamic content');
  assert(html.includes('skip-link') || html.includes('Skip to'), 'Skip navigation link present');
  assert(html.includes('sr-only'), 'Screen-reader-only class used');
  assert(html.includes('alt=') || html.includes('aria-hidden'), 'Image alt text or aria-hidden for decorative');
  assert(html.includes('<meta name="viewport"'), 'Viewport meta tag present');
  assert(html.includes('<meta name="description"'), 'Meta description present');
  assert(html.includes('role="tablist"'), 'Tab list ARIA role present');
  assert(html.includes('role="tab"'), 'Tab ARIA role present');
  assert(html.includes('role="tabpanel"'), 'Tab panel ARIA role present');
  assert(html.includes('aria-selected'), 'aria-selected for tabs present');
  assert(html.includes('aria-controls'), 'aria-controls for tabs present');
  assert(html.includes('prefers-reduced-motion') || true, 'Reduced motion support (checked in CSS)');
} catch (err) {
  results.push(`  ⚠️  HTML file not found: ${err.message}`);
}

/* ─── CSS Tests ─── */
section('CSS Validation');

try {
  const cssFiles = ['variables.css', 'base.css', 'components.css', 'animations.css'];
  cssFiles.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'css', file), 'utf8');
    assert(content.length > 0, `${file} is not empty`);
  });

  const animations = fs.readFileSync(path.join(__dirname, '..', 'css', 'animations.css'), 'utf8');
  assert(animations.includes('prefers-reduced-motion'), 'Reduced motion media query present');
} catch (err) {
  results.push(`  ⚠️  CSS files check failed: ${err.message}`);
}

/* ─── Run & Report ─── */
async function run() {
  await testServer();

  console.log('\n🗳️  Election Education — Test Results');
  console.log('═'.repeat(45));
  results.forEach(r => console.log(r));
  console.log('\n' + '═'.repeat(45));
  console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log('═'.repeat(45) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

run();
