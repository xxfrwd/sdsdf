const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

/* 1. CORS (пропускает всё) */
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

/* 2. Парсеры для любых типов данных */
app.use(express.json({ limit: '32kb' }));
app.use(express.text({ type: '*/*', limit: '32kb' }));

app.use(express.static(path.join(__dirname, 'public')));

/* 3. Хранилище */
let totalClicks = 0;
let pageviews = 0;
let submits = 0;
const byDomain = {};
const elements = {};
const pages = {};

function getDomain(req, data) {
    if (data && data.domain) return data.domain;
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
        try { return new URL(origin).hostname; } catch(e) { return origin; }
    }
    return 'unknown';
}

/* 4. Эндпоинт трекинга */
app.post('/api/track', (req, res) => {
    try {
        let data = req.body;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { data = {}; }
        }
        if (!data) data = {};

        const domain = getDomain(req, data);
        const type = data.type || 'unknown';
        
        if (!byDomain[domain]) {
            byDomain[domain] = { clicks: 0, pageviews: 0, submits: 0, elements: {}, pages: {} };
        }
        const d = byDomain[domain];

        if (type === 'pageview') {
            pageviews++; d.pageviews++;
            if (data.page) {
                pages[data.page] = (pages[data.page] || 0) + 1;
                d.pages[data.page] = (d.pages[data.page] || 0) + 1;
            }
        } else if (type === 'click') {
            totalClicks++; d.clicks++;
            if (data.element) {
                elements[data.element] = (elements[data.element] || 0) + 1;
                d.elements[data.element] = (d.elements[data.element] || 0) + 1;
            }
        } else if (type === 'submit') {
            submits++; d.submits++;
        }

        res.json({ ok: true, domain });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

/* 5. API для монитора */
app.get('/api/stats/summary', (req, res) => {
    let clicks = 0, pviews = 0, subs = 0;
    const els = {}, pgs = {};

    if (req.query.domain && byDomain[req.query.domain]) {
        const d = byDomain[req.query.domain];
        clicks = d.clicks; pviews = d.pageviews; subs = d.submits;
        Object.assign(els, d.elements); Object.assign(pgs, d.pages);
    } else {
        clicks = totalClicks; pviews = pageviews; subs = submits;
        Object.assign(els, elements); Object.assign(pgs, pages);
    }

    res.json({
        clicks, pageviews: pviews, uniqueUsers: pviews, submissions: subs,
        elements: els, pages: pgs, inputs: {}
    });
});

app.get('/api/stats/daily', (req, res) => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        days.push(dt.toISOString().slice(0, 10));
    }
    res.json({ daily: days.map(date => ({ date, clicks: totalClicks, pageviews, submits })) });
});

/* 6. Раздача страниц */
app.get('/monitor', (req, res) => res.sendFile(path.join(__dirname, 'public', 'monitor.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
