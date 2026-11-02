/* ============================================================
   server.js — Express сервер для Render
   Слушает 0.0.0.0, раздаёт статику из ./public,
   хранит счётчики в памяти процесса (с разбивкой по доменам).
   ============================================================ */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- CORS (ДОЛЖЕН БЫТЬ ПЕРВЫМ) ---------- */
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Мгновенно отвечаем на preflight-запросы
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

/* ---------- MIDDLEWARE ---------- */
app.use(express.json({ limit: '32kb' }));
// Добавляем парсер для text/plain на случай, если sendBeacon отправит строку
app.use(express.text({ type: 'text/plain', limit: '32kb' }));

/* ---------- STATIC ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- IN-MEMORY STORAGE ---------- */
let totalClicks = 0;
let submits = 0;
let pageviews = 0;
let uniqueUsers = new Set();
let sessions = {};
let elements = {};
let pages = {};
let inputs = {};
let firstSeen = null;
let lastSeen = null;

/* Хранилище по доменам */
const byDomain = {};

/* Хранилище по дням */
const byDay = {};

function ensureDomain(domain) {
    if (!byDomain[domain]) {
        byDomain[domain] = {
            clicks: 0,
            pageviews: 0,
            submits: 0,
            uniqueUsers: new Set(),
            elements: {},
            pages: {},
            inputs: {},
            firstSeen: null,
            lastSeen: null
        };
    }
    return byDomain[domain];
}

function todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function ensureDay(key) {
    if (!byDay[key]) {
        byDay[key] = { clicks: 0, pageviews: 0, submits: 0 };
    }
    return byDay[key];
}

/* ---------- HEALTH CHECK ---------- */
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

/* ---------- POST /api/track — принимает события от клиентского трекера ---------- */
app.post('/api/track', (req, res) => {
    try {
        // Если пришел text/plain, парсим его вручную
        let data = req.body;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { data = {}; }
        }
        if (!data) data = {};

        const now = new Date().toISOString();

        /* Определяем домен */
        let domain = data.domain || '';
        if (!domain) {
            const origin = req.headers.origin || req.headers.referer || '';
            if (origin) {
                try { domain = new URL(origin).hostname; } catch (e) { domain = origin; }
            }
        }
        if (!domain) domain = 'unknown';

        if (!firstSeen) firstSeen = now;
        lastSeen = now;

        const type = data.type || 'unknown';
        const page = data.page || '/';
        const element = data.element || '';

        const d = ensureDomain(domain);
        if (!d.firstSeen) d.firstSeen = now;
        d.lastSeen = now;

        const day = ensureDay(todayKey());

        if (type === 'pageview') {
            pageviews++;
            d.pageviews++;
            day.pageviews++;
            pages[page] = (pages[page] || 0) + 1;
            d.pages[page] = (d.pages[page] || 0) + 1;

            const uid = (req.ip || '') + '|' + (req.headers['user-agent'] || '');
            uniqueUsers.add(uid);
            d.uniqueUsers.add(uid);
        } else if (type === 'click') {
            totalClicks++;
            d.clicks++;
            day.clicks++;
            if (element) {
                elements[element] = (elements[element] || 0) + 1;
                d.elements[element] = (d.elements[element] || 0) + 1;
            }
        } else if (type === 'submit') {
            submits++;
            d.submits++;
            day.submits++;
        } else if (type === 'input') {
            if (element) {
                inputs[element] = (inputs[element] || 0) + 1;
                d.inputs[element] = (d.inputs[element] || 0) + 1;
            }
        }

        res.json({ ok: true, domain });
    } catch (err) {
        console.error('Track error:', err);
        res.status(500).json({ ok: false });
    }
});

/* ---------- POST /api/click — старый эндпоинт ---------- */
app.post('/api/click', (req, res) => {
    let data = req.body || {};
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { data = {}; }
    }
    
    const { sessionId, tag, descr, isSubmit, domain } = data;
    const now = new Date().toISOString();

    let dom = domain;
    if (!dom) {
        const origin = req.headers.origin || req.headers.referer || '';
        if (origin) {
            try { dom = new URL(origin).hostname; } catch (e) { dom = origin; }
        }
    }
    if (!dom) dom = 'unknown';

    if (!firstSeen) firstSeen = now;
    lastSeen = now;

    totalClicks++;
    if (isSubmit) submits++;

    if (sessionId) sessions[sessionId] = (sessions[sessionId] || 0) + 1;
    if (descr) elements[descr] = (elements[descr] || 0) + 1;

    const d = ensureDomain(dom);
    d.clicks++;
    if (isSubmit) d.submits++;
    if (descr) d.elements[descr] = (d.elements[descr] || 0) + 1;
    if (sessionId) d.uniqueUsers.add(sessionId);

    const day = ensureDay(todayKey());
    day.clicks++;
    if (isSubmit) day.submits++;

    res.json({ ok: true, total: totalClicks, domain: dom });
});

/* ---------- GET /api/stats ---------- */
app.get('/api/stats', (req, res) => {
    const domainFilter = req.query.domain;
    if (domainFilter) {
        const d = byDomain[domainFilter];
        if (!d) return res.json({ total: 0, pageviews: 0, submits: 0, uniqueUsers: 0, elements: {}, pages: {}, inputs: {} });
        return res.json({
            total: d.clicks,
            pageviews: d.pageviews,
            submits: d.submits,
            uniqueUsers: d.uniqueUsers.size,
            elements: d.elements,
            pages: d.pages,
            inputs: d.inputs,
            firstSeen: d.firstSeen,
            lastSeen: d.lastSeen
        });
    }
    res.json({
        total: totalClicks,
        pageviews,
        submits,
        uniqueUsers: uniqueUsers.size,
        sessions,
        elements,
        pages,
        inputs,
        byDomain: Object.keys(byDomain).reduce((acc, k) => {
            const d = byDomain[k];
            acc[k] = {
                clicks: d.clicks,
                pageviews: d.pageviews,
                submits: d.submits,
                uniqueUsers: d.uniqueUsers.size
            };
            return acc;
        }, {}),
        firstSeen,
        lastSeen
    });
});

/* ---------- GET /api/stats/summary ---------- */
app.get('/api/stats/summary', (req, res) => {
    const domainFilter = req.query.domain;

    let clicks = 0, pageviewsCount = 0, submitsCount = 0;
    const uniqueSet = new Set();
    const elementsAgg = {};
    const pagesAgg = {};
    const inputsAgg = {};

    if (domainFilter && byDomain[domainFilter]) {
        const d = byDomain[domainFilter];
        clicks = d.clicks;
        pageviewsCount = d.pageviews;
        submitsCount = d.submits;
        d.uniqueUsers.forEach(u => uniqueSet.add(u));
        Object.assign(elementsAgg, d.elements);
        Object.assign(pagesAgg, d.pages);
        Object.assign(inputsAgg, d.inputs);
    } else if (!domainFilter) {
        clicks = totalClicks;
        pageviewsCount = pageviews;
        submitsCount = submits;
        uniqueUsers.forEach(u => uniqueSet.add(u));
        Object.assign(elementsAgg, elements);
        Object.assign(pagesAgg, pages);
        Object.assign(inputsAgg, inputs);
    }

    res.json({
        clicks: clicks,
        pageviews: pageviewsCount,
        uniqueUsers: uniqueSet.size,
        submissions: submitsCount,
        elements: elementsAgg,
        pages: pagesAgg,
        inputs: inputsAgg
    });
});

/* ---------- GET /api/stats/daily ---------- */
app.get('/api/stats/daily', (req, res) => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        days.push(dt.toISOString().slice(0, 10));
    }

    const result = days.map(date => {
        const d = byDay[date] || { clicks: 0, pageviews: 0, submits: 0 };
        return {
            date: date,
            clicks: d.clicks,
            pageviews: d.pageviews,
            submits: d.submits
        };
    });

    res.json({ daily: result, days: result });
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
