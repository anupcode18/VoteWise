/**
 * ElectEase AI — Backend Server
 *
 * PURPOSE: Minimal Node HTTP server for Cloud Run deployment.
 * RESPONSIBILITIES:
 *   - Serve static frontend files (with security blocklist)
 *   - Proxy /explain requests to Gemini API (with timeout + rate limiting)
 *   - Expose /health for container orchestration health checks
 * SECURITY:
 *   - Dotfiles, .env, package.json etc. are blocked from static serving
 *   - Gemini API key lives in env vars, never exposed to client
 *   - Rate limiting prevents abuse of /explain endpoint
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);

// ═══ Security: Blocked static paths ═══
const BLOCKED_PATTERNS = [
    /^\.env/i,
    /^\.git/i,
    /^\.gitignore/i,
    /^\.dockerignore/i,
    /^package\.json$/i,
    /^package-lock\.json$/i,
    /^Dockerfile$/i,
    /^backend\//i,
    /^node_modules\//i,
];

function isBlockedPath(urlPath) {
    const cleaned = decodeURIComponent((urlPath || '/').split('?')[0]).replace(/^\/+/, '');
    const segments = cleaned.split('/').filter(Boolean);

    // Block any hidden segment (e.g. /.env, /foo/.secret, /.git/config)
    if (segments.some((segment) => segment.startsWith('.'))) return true;

    return BLOCKED_PATTERNS.some((pattern) => pattern.test(cleaned));
}

// ═══ Rate Limiting: /explain endpoint ═══
const rateLimitMap = new Map();
const RATE_LIMIT = 10;       // max requests
const RATE_WINDOW = 60000;   // per 60 seconds

function isRateLimited(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now - record.start > RATE_WINDOW) {
        rateLimitMap.set(ip, { count: 1, start: now });
        return false;
    }
    record.count++;
    return record.count > RATE_LIMIT;
}

// Minimal .env support for local runs; Cloud Run should use env vars.
function loadLocalEnv() {
    const envPath = path.join(ROOT_DIR, '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && process.env[key] === undefined) process.env[key] = value;
    }
}

loadLocalEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, code, payload) {
    res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    res.end(JSON.stringify(payload));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            if (data.length > 1_000_000) reject(new Error('Request body too large'));
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

async function handleExplain(req, res) {
    if (!GEMINI_API_KEY) return sendJson(res, 500, { error: 'Missing GEMINI_API_KEY' });

    let text = '';
    try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        text = (body.text || '').trim();
    } catch {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
    }

    if (!text) return sendJson(res, 400, { error: 'Missing required field: text' });

    const prompt = `Provide a simple, clear, and helpful expansion of this civic instruction in 2-3 sentences. Do not change the meaning. Instruction: "${text}"`;

    try {
        // Timeout protection: abort Gemini call after 5 seconds
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        let geminiRes;
        try {
            geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        const raw = await geminiRes.text();
        let data = null;
        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = null;
        }

        if (!geminiRes.ok) {
            const msg = data?.error?.message || raw || 'Gemini request failed';
            const authFail = geminiRes.status === 401 || geminiRes.status === 403;
            return sendJson(res, authFail ? 401 : 502, { error: msg });
        }

        const result = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('').trim();
        if (!result) return sendJson(res, 502, { error: 'Empty Gemini response' });

        return sendJson(res, 200, { result });
    } catch (error) {
        if (error.name === 'AbortError') {
            return sendJson(res, 504, { error: 'Gemini API timed out. Please try again.' });
        }
        return sendJson(res, 500, { error: `Backend failure: ${error.message}` });
    }
}

function safeFilePath(urlPath) {
    const cleaned = decodeURIComponent(urlPath.split('?')[0]);
    const relative = cleaned === '/' ? '/index.html' : cleaned;
    const filePath = path.normalize(path.join(ROOT_DIR, relative));
    if (!filePath.startsWith(ROOT_DIR)) return null;
    return filePath;
}

function serveStatic(req, res) {
    // SECURITY: Block sensitive files before any filesystem access
    if (isBlockedPath(req.url || '/')) {
        return sendJson(res, 403, { error: 'Forbidden' });
    }
    const filePath = safeFilePath(req.url || '/');
    if (!filePath) return sendJson(res, 400, { error: 'Invalid path' });
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return sendJson(res, 404, { error: 'Not found' });
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    if (req.method === 'GET' && req.url === '/health') return sendJson(res, 200, { ok: true });
    if (req.method === 'POST' && req.url === '/explain') {
        // Rate limit by client IP
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        if (isRateLimited(clientIp)) {
            return sendJson(res, 429, { error: 'Too many requests. Please wait before trying again.' });
        }
        return handleExplain(req, res);
    }
    if (req.method === 'GET') return serveStatic(req, res);
    return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`ElectEase server running on :${PORT}`);
});
