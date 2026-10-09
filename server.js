const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

/* Парсинг JSON */
app.use(express.json({ limit: '32kb' }));

/* Раздача статики из ./public */
app.use(express.static(path.join(__dirname, 'public')));

/* In-memory счётчик (сбрасывается при рестарте Render) */
let totalClicks = 0;
let submits = 0;
let sessions = {};
let elements = {};
let firstSeen = null;
let lastSeen = null;

/* POST /api/click — +1 к счётчику */
app.post('/api/click', (req, res) => {
    const { sessionId, tag, descr, isSubmit } = req.body || {};

    const now = new Date().toISOString();
    if (!firstSeen) firstSeen = now;
    lastSeen = now;

    totalClicks++;
    if (isSubmit) submits++;

    if (sessionId) sessions[sessionId] = (sessions[sessionId] || 0) + 1;
    if (descr)     elements[descr]     = (elements[descr]     || 0) + 1;

    res.json({ ok: true, total: totalClicks });
});

/* GET /api/stats — отдать статистику */
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

/* /monitor → monitor.html */
app.get('/monitor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

/* Фолбэк на index.html */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
