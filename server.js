const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Простое in-memory хранилище (сбрасывается при рестарте Render)
// Для прода — подключи Render Redis или Postgres
let totalClicks = 0;
let submits = 0;
let sessions = {};
let elements = {};

app.post('/api/click', (req, res) => {
    const { sessionId, descr, isSubmit } = req.body;
    
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

app.get('/api/stats', (req, res) => {
    res.json({
        total: totalClicks,
        submits,
        sessions,
        elements,
        lastSeen: new Date().toISOString()
    });
});

// /monitor → monitor.html
app.get('/monitor', (req, res) => {
    res.sendFile(__dirname + '/public/monitor.html');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
