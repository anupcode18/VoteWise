/**
 * ElectEase AI — Backend Endpoint Tests
 * Categories: Health | Explain | Security | Error Handling
 * Output: TOTAL / PASSED / FAILED summary
 *
 * Usage: Start the backend first, then run:
 *   node test/backend_test.js
 */

const BASE = process.env.TEST_URL || 'http://localhost:8080';
const TEST_HOST = process.env.TEST_HOST || 'http://127.0.0.1';

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition, label, category) {
    total++;
    if (condition) {
        passed++;
        console.log(`  ✓ [${category}] ${label}`);
    } else {
        failed++;
        console.error(`  ✗ [${category}] ${label}`);
    }
}

async function safeFetch(url, opts = {}) {
    try {
        return await fetch(url, opts);
    } catch (err) {
        return { ok: false, status: 0, json: async () => ({ error: err.message }), text: async () => err.message };
    }
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── HEALTH ENDPOINT ───
console.log('\n═══ HEALTH ENDPOINT TESTS ═══');

async function testHealth() {
    const res = await safeFetch(`${BASE}/health`);
    assert(res.ok === true, 'GET /health returns 200', 'HEALTH');

    const data = await res.json();
    assert(data.ok === true, '/health body contains { ok: true }', 'HEALTH');
}

// ─── EXPLAIN ENDPOINT ───
console.log('\n═══ EXPLAIN ENDPOINT TESTS ═══');

async function testExplain() {
    const cat = 'EXPLAIN';

    // Valid request
    const res1 = await safeFetch(`${BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'You must be 18 years old to vote in India.' })
    });
    // Accept 200 (success) or 502/500/401 (API key issue in test env) — NOT 400
    assert(res1.status !== 400, 'Valid payload does not return 400', cat);

    // Missing text field
    const res2 = await safeFetch(`${BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    assert(res2.status === 400, 'Missing text → 400', cat);
    const data2 = await res2.json();
    assert(data2.error && data2.error.includes('text'), 'Error message mentions "text"', cat);

    // Invalid JSON body
    const res3 = await safeFetch(`${BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json at all {{{!'
    });
    assert(res3.status === 400, 'Invalid JSON → 400', cat);

    // Empty text
    const res4 = await safeFetch(`${BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '   ' })
    });
    assert(res4.status === 400, 'Whitespace-only text → 400', cat);
}

// ─── SECURITY TESTS ───
console.log('\n═══ SECURITY TESTS ═══');

async function testSecurity() {
    const cat = 'SECURITY';

    // .env must be blocked
    const res1 = await safeFetch(`${BASE}/.env`);
    assert(res1.status === 403, 'GET /.env → 403 Forbidden', cat);

    // .git must be blocked
    const res2 = await safeFetch(`${BASE}/.git/config`);
    assert(res2.status === 403, 'GET /.git/config → 403 Forbidden', cat);

    // package.json must be blocked
    const res3 = await safeFetch(`${BASE}/package.json`);
    assert(res3.status === 403, 'GET /package.json → 403 Forbidden', cat);

    // backend/server.js must be blocked
    const res4 = await safeFetch(`${BASE}/backend/server.js`);
    assert(res4.status === 403, 'GET /backend/server.js → 403 Forbidden', cat);

    // Dockerfile must be blocked
    const res5 = await safeFetch(`${BASE}/Dockerfile`);
    assert(res5.status === 403, 'GET /Dockerfile → 403 Forbidden', cat);

    // Normal files should still work
    const res6 = await safeFetch(`${BASE}/index.html`);
    assert(res6.status === 200, 'GET /index.html → 200 OK', cat);

    const res7 = await safeFetch(`${BASE}/src/data/flow.json`);
    assert(res7.status === 200, 'GET /src/data/flow.json → 200 OK', cat);
}

// ─── ERROR HANDLING ───
console.log('\n═══ ERROR HANDLING TESTS ═══');

async function testErrors() {
    const cat = 'ERROR';

    // Unknown route
    const res1 = await safeFetch(`${BASE}/nonexistent-page.xyz`);
    assert(res1.status === 404, 'Unknown file → 404', cat);

    // Wrong method on /explain
    const res2 = await safeFetch(`${BASE}/explain`);
    assert(res2.status === 404, 'GET /explain → 404 (POST only)', cat);
}

async function testMissingApiKeySimulation() {
    const cat = 'ERROR';
    const childPort = Number(process.env.TEST_MISSING_KEY_PORT || 8098);
    const { spawn } = await import('node:child_process');

    // Spawn isolated server with API key removed to simulate misconfiguration.
    const child = spawn(process.execPath, ['backend/server.js'], {
        env: { ...process.env, PORT: String(childPort), GEMINI_API_KEY: '' },
        cwd: process.cwd(),
        stdio: 'ignore'
    });

    try {
        await wait(700);
        const res = await safeFetch(`${TEST_HOST}:${childPort}/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'hello' })
        });
        assert(res.status === 500, 'Missing API key simulation → 500 handled safely', cat);
    } finally {
        child.kill();
        await wait(200);
    }
}

// ─── RUN ALL ───
async function runAll() {
    await testHealth();
    console.log('');
    await testExplain();
    console.log('');
    await testSecurity();
    console.log('');
    await testErrors();
    console.log('');
    await testMissingApiKeySimulation();

    console.log('\n══════════════════════════════════');
    console.log(`  TOTAL:  ${total}`);
    console.log(`  PASSED: ${passed}`);
    console.log(`  FAILED: ${failed}`);
    console.log('══════════════════════════════════');

    if (failed > 0) {
        console.log('\n⚠️  SOME TESTS FAILED\n');
        process.exit(1);
    } else {
        console.log('\n✅ ALL BACKEND TESTS PASSED\n');
    }
}

runAll();
