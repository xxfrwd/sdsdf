/* ============================================================
   server.js — Express сервер для Render
   Слушает 0.0.0.0, раздаёт статику из ./public,
   хранит счётчики в памяти процесса.
   ============================================================ */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- MIDDLEWARE ---------- */
app.use(express.json({ limit: '32kb' }));

/* ---------- STATIC ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- IN-MEMORY STORAGE ---------- */
let totalClicks = 0;
let submits = 0;
let sessions = {};
let elements = {};
let firstSeen = null;
let lastSeen = null;

/* ---------- HEALTH CHECK ---------- */
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

/* ---------- POST /api/click ---------- */
app.post('/api/click', (req, res) => {
    const { sessionId, tag, descr, isSubmit } = req.body || {};

    const now = new Date().toISOString();
    if (!firstSeen) firstSeen = now;
    lastSeen = now;

    totalClicks++;
    if (isSubmit) submits++;

    if (sessionId) {
        sessions[sessionId] = (sessions[sessionId] || 0) + 1;
    }
    if (descr) {
        elements[descr] = (elements[descr] || 0) + 1;
    }

    res.json({ ok: true, total: totalClicks });
});

/* ---------- GET /api/stats ---------- */
app.get('/api/stats', (req, res) => {
    res.json({
        total: totalClicks,
        submits,
        sessions,
        elements,
        firstSeen,
        lastSeen
    });
});

/* ---------- /monitor → monitor.html ---------- */
app.get('/monitor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

/* ---------- FALLBACK → index.html ---------- */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ---------- LISTEN ---------- */
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
