<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Click Monitor — Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            background: #0f1115;
            color: #e6e6e6;
            min-height: 100vh;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .container { width: 100%; max-width: 880px; }

        h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
            letter-spacing: -0.3px;
            background: linear-gradient(90deg, #4ade80, #38bdf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle { font-size: 14px; color: #8a8f98; margin-bottom: 32px; }

        .counter-card {
            background: linear-gradient(135deg, #1a1f2e 0%, #151922 100%);
            border: 1px solid #232836;
            border-radius: 14px;
            padding: 36px 40px;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
        }

        .counter-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, #4ade80, #38bdf8, #a78bfa);
        }

        .counter-label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #6b7280;
            margin-bottom: 12px;
            font-weight: 600;
        }

        .counter-value {
            font-size: 96px;
            font-weight: 800;
            line-height: 1;
            color: #fff;
            font-variant-numeric: tabular-nums;
            letter-spacing: -4px;
            text-shadow: 0 0 40px rgba(74, 222, 128, 0.35);
        }

        .counter-meta {
            margin-top: 16px;
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            font-size: 13px;
            color: #8a8f98;
        }

        .counter-meta span b { color: #c4c8cf; font-weight: 600; }

        .actions { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }

        button {
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid #2a3140;
            background: #1a1f2e;
            color: #e6e6e6;
            cursor: pointer;
            transition: all 0.15s ease;
            letter-spacing: 0.2px;
        }

        button:hover { background: #232836; border-color: #3a4255; }

        button.primary {
            background: linear-gradient(135deg, #4ade80, #38bdf8);
            color: #0f1115;
            border: none;
        }

        button.primary:hover { filter: brightness(1.1); }

        button.danger {
            background: #2a1415;
            border-color: #4a1f22;
            color: #f87171;
        }

        button.danger:hover { background: #3a1a1c; border-color: #5a2628; }

        .panel {
            background: #151922;
            border: 1px solid #232836;
            border-radius: 12px;
            padding: 24px 28px;
            margin-bottom: 20px;
        }

        .panel-title {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1.6px;
            color: #6b7280;
            margin-bottom: 18px;
            font-weight: 600;
        }

        .kv {
            display: grid;
            grid-template-columns: 180px 1fr;
            row-gap: 12px;
            column-gap: 20px;
            font-size: 14px;
        }

        .kv .k { color: #8a8f98; }

        .kv .v {
            color: #e6e6e6;
            font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
            word-break: break-all;
        }

        .kv .v code {
            background: #0f1115;
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 13px;
            color: #38bdf8;
        }

        .bars { display: flex; flex-direction: column; gap: 10px; }

        .bar-row {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
        }

        .bar-label {
            width: 110px;
            color: #8a8f98;
            font-family: ui-monospace, 'Consolas', monospace;
            font-size: 12px;
        }

        .bar-track {
            flex: 1;
            height: 8px;
            background: #0f1115;
            border-radius: 4px;
            overflow: hidden;
        }

        .bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #4ade80, #38bdf8);
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .bar-value {
            width: 60px;
            text-align: right;
            color: #c4c8cf;
            font-variant-numeric: tabular-nums;
            font-weight: 600;
        }

        .log {
            max-height: 400px;
            overflow-y: auto;
            font-family: ui-monospace, 'Consolas', monospace;
            font-size: 12.5px;
            line-height: 1.6;
        }

        .log-entry {
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 4px;
            background: #0f1115;
            border-left: 3px solid #2a3140;
            display: flex;
            gap: 10px;
            align-items: flex-start;
        }

        .log-entry:hover { background: #171c26; }
        .log-entry.click  { border-left-color: #38bdf8; }
        .log-entry.submit { border-left-color: #a78bfa; }

        .log-idx { color: #6b7280; flex-shrink: 0; min-width: 50px; }
        .log-tag { color: #4ade80; flex-shrink: 0; font-weight: 600; }
        .log-body { color: #c4c8cf; flex: 1; word-break: break-word; }
        .log-time { color: #6b7280; flex-shrink: 0; font-size: 11px; }

        .log::-webkit-scrollbar { width: 8px; }
        .log::-webkit-scrollbar-track { background: #0f1115; border-radius: 4px; }
        .log::-webkit-scrollbar-thumb { background: #2a3140; border-radius: 4px; }
        .log::-webkit-scrollbar-thumb:hover { background: #3a4255; }

        .empty { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; }

        @keyframes pulse {
            0%   { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5); }
            70%  { box-shadow: 0 0 0 14px rgba(74, 222, 128, 0); }
            100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }

        .pulse { animation: pulse 0.6s ease-out; }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #8a8f98;
            margin-left: auto;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4ade80;
            box-shadow: 0 0 8px #4ade80;
            animation: blink 2s infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.4; }
        }

        .header-row {
            display: flex;
            align-items: center;
            margin-bottom: 32px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .header-row .titles { flex: 1; min-width: 200px; }

        @media (max-width: 600px) {
            .counter-value { font-size: 64px; letter-spacing: -2px; }
            .kv { grid-template-columns: 120px 1fr; font-size: 13px; }
            .bar-label { width: 80px; font-size: 11px; }
            .counter-card { padding: 24px; }
        }
    </style>
</head>
<body>

    <div class="container">

        <div class="header-row">
            <div class="titles">
                <h1>🖱 Click Monitor</h1>
                <div class="subtitle">Local stats · AUS LOG 🇦🇺🌏</div>
            </div>
            <div class="status">
                <span class="status-dot"></span>
                <span id="statusText">Reading localStorage…</span>
            </div>
        </div>

        <div class="counter-card" id="counterCard">
            <div class="counter-label">Total clicks (all-time)</div>
            <div class="counter-value" id="totalValue">0</div>
            <div class="counter-meta">
                <span>Session: <b id="sessionId">—</b></span>
                <span>Submits: <b id="submitsCount">0</b></span>
                <span>Last event: <b id="lastEvent">—</b></span>
            </div>
        </div>

        <div class="actions">
            <button class="primary" id="refreshBtn">🔄 Refresh</button>
            <button id="copyBtn">📋 Copy stats</button>
            <button class="danger" id="resetBtn">🗑 Reset counter</button>
        </div>

        <div class="panel">
            <div class="panel-title">Overview</div>
            <div class="kv">
                <div class="k">Total clicks</div>
                <div class="v"><code id="kvTotal">0</code></div>

                <div class="k">Total submits</div>
                <div class="v"><code id="kvSubmits">0</code></div>

                <div class="k">Session ID</div>
                <div class="v" id="kvSession">—</div>

                <div class="k">First seen</div>
                <div class="v" id="kvFirst">—</div>

                <div class="k">Last seen</div>
                <div class="v" id="kvLast">—</div>

                <div class="k">Storage keys</div>
                <div class="v"><code>clickmon.*</code></div>

                <div class="k">Origin</div>
                <div class="v" id="kvOrigin">—</div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-title">Clicks by session</div>
            <div class="bars" id="sessionBars">
                <div class="empty">No sessions yet</div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-title">Top clicked elements</div>
            <div class="bars" id="elementBars">
                <div class="empty">No elements yet</div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-title">Recent events (last 50)</div>
            <div class="log" id="logList">
                <div class="empty">No events yet</div>
            </div>
        </div>

    </div>

    <script>
    (function () {
        'use strict';

        const KEY_TOTAL    = 'clickmon.total';
        const KEY_SUBMITS  = 'clickmon.submits';
        const KEY_SESSION  = 'clickmon.session';
        const KEY_FIRST    = 'clickmon.firstSeen';
        const KEY_LAST     = 'clickmon.lastSeen';
        const KEY_LOG      = 'clickmon.log';
        const KEY_SESSIONS = 'clickmon.sessions';
        const KEY_ELEMENTS = 'clickmon.elements';

        const LOG_SHOW = 50;
        const TOP_SHOW = 8;

        function lsGet(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : v;
            } catch (e) { return fallback; }
        }
        function lsGetNum(key, fallback) {
            const v = parseInt(lsGet(key, '0'), 10);
            return isNaN(v) ? (fallback || 0) : v;
        }
        function lsGetJSON(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                if (!v) return fallback;
                return JSON.parse(v);
            } catch (e) { return fallback; }
        }
        function lsRemove(key) {
            try { localStorage.removeItem(key); } catch (e) {}
        }

        function esc(s) {
            if (s === undefined || s === null) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function fmtTime(iso) {
            if (!iso) return '—';
            try {
                const d = new Date(iso);
                return d.toLocaleString('ru-RU', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            } catch (e) { return iso; }
        }

        function fmtShortTime(iso) {
            if (!iso) return '';
            try {
                const d = new Date(iso);
                return d.toLocaleTimeString('ru-RU', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            } catch (e) { return ''; }
        }

        function topEntries(obj, limit) {
            return Object.entries(obj || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit);
        }

        function readAll() {
            return {
                total:    lsGetNum(KEY_TOTAL, 0),
                submits:  lsGetNum(KEY_SUBMITS, 0),
                session:  lsGet(KEY_SESSION, '—'),
                first:    lsGet(KEY_FIRST, ''),
                last:     lsGet(KEY_LAST, ''),
                log:      lsGetJSON(KEY_LOG, []),
                sessions: lsGetJSON(KEY_SESSIONS, {}),
                elements: lsGetJSON(KEY_ELEMENTS, {})
            };
        }

        let lastRenderedTotal = -1;

        function render() {
            const data = readAll();

            const totalEl = document.getElementById('totalValue');
            if (data.total !== lastRenderedTotal) {
                totalEl.textContent = data.total;
                const card = document.getElementById('counterCard');
                card.classList.remove('pulse');
                void card.offsetWidth;
                card.classList.add('pulse');
                lastRenderedTotal = data.total;
            }

            document.getElementById('sessionId').textContent    = data.session || '—';
            document.getElementById('submitsCount').textContent = data.submits;
            document.getElementById('lastEvent').textContent    = fmtTime(data.last);

            document.getElementById('kvTotal').textContent    = data.total;
            document.getElementById('kvSubmits').textContent  = data.submits;
            document.getElementById('kvSession').textContent  = data.session || '—';
            document.getElementById('kvFirst').textContent    = fmtTime(data.first);
            document.getElementById('kvLast').textContent     = fmtTime(data.last);
            document.getElementById('kvOrigin').textContent   = location.origin;

            const sessionBars = document.getElementById('sessionBars');
            const sessionTop  = topEntries(data.sessions, TOP_SHOW);
            if (!sessionTop.length) {
                sessionBars.innerHTML = '<div class="empty">No sessions yet</div>';
            } else {
                const maxVal = Math.max(...sessionTop.map(x => x[1]));
                sessionBars.innerHTML = sessionTop.map(([sid, count]) => {
                    const pct = maxVal ? (count / maxVal) * 100 : 0;
                    return `
                        <div class="bar-row">
                            <div class="bar-label">${esc(sid)}</div>
                            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                            <div class="bar-value">${count}</div>
                        </div>
                    `;
                }).join('');
            }

            const elementBars = document.getElementById('elementBars');
            const elementTop  = topEntries(data.elements, TOP_SHOW);
            if (!elementTop.length) {
                elementBars.innerHTML = '<div class="empty">No elements yet</div>';
            } else {
                const maxVal = Math.max(...elementTop.map(x => x[1]));
                elementBars.innerHTML = elementTop.map(([sel, count]) => {
                    const pct = maxVal ? (count / maxVal) * 100 : 0;
                    const short = sel.length > 15 ? sel.slice(0, 15) + '…' : sel;
                    return `
                        <div class="bar-row">
                            <div class="bar-label" title="${esc(sel)}">${esc(short)}</div>
                            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                            <div class="bar-value">${count}</div>
                        </div>
                    `;
                }).join('');
            }

            const logList  = document.getElementById('logList');
            const logItems = (data.log || []).slice(-LOG_SHOW).reverse();
            if (!logItems.length) {
                logList.innerHTML = '<div class="empty">No events yet</div>';
            } else {
                logList.innerHTML = logItems.map(entry => {
                    const kind = entry.type === 'submit' ? 'submit' : 'click';
                    return `
                        <div class="log-entry ${kind}">
                            <span class="log-idx">#${entry.allTime || '?'}</span>
                            <span class="log-tag">${esc(entry.tag || kind)}</span>
                            <span class="log-body">${esc(entry.descr || '')}</span>
                            <span class="log-time">${fmtShortTime(entry.time)}</span>
                        </div>
                    `;
                }).join('');
            }
        }

        document.getElementById('refreshBtn').addEventListener('click', () => {
            render();
            const btn = document.getElementById('refreshBtn');
            const old = btn.textContent;
            btn.textContent = '✓ Refreshed';
            setTimeout(() => btn.textContent = old, 800);
        });

        document.getElementById('copyBtn').addEventListener('click', async () => {
            const data = readAll();
            const text = [
                'Click Monitor stats',
                '====================',
                `Total:   ${data.total}`,
                `Submits: ${data.submits}`,
                `Session: ${data.session}`,
                `First:   ${fmtTime(data.first)}`,
                `Last:    ${fmtTime(data.last)}`,
                `Origin:  ${location.origin}`,
                '',
                'Top elements:',
                ...topEntries(data.elements, 10).map(([k, v]) => `  ${v}  ${k}`)
            ].join('\n');

            try {
                await navigator.clipboard.writeText(text);
                const btn = document.getElementById('copyBtn');
                const old = btn.textContent;
                btn.textContent = '✓ Copied';
                setTimeout(() => btn.textContent = old, 800);
            } catch (e) {
                console.error('copy failed', e);
            }
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            if (!confirm('Reset ALL click-monitor data?')) return;
            [KEY_TOTAL, KEY_SUBMITS, KEY_SESSION, KEY_FIRST, KEY_LAST,
             KEY_LOG, KEY_SESSIONS, KEY_ELEMENTS].forEach(lsRemove);
            lastRenderedTotal = -1;
            render();
        });

        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('clickmon.')) render();
        });

        setInterval(render, 1000);
        render();
    })();
    </script>

</body>
</html>
