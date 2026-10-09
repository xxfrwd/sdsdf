/* ============================================================
   Cloudflare Worker — 全局点击计数器
   - POST /api/click  → 记录一次点击
   - GET  /api/stats  → 返回全局统计
   - /monitor         → 重写到 /monitor.html
   ============================================================ */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        /* CORS */
        const cors = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: cors });
        }

        /* ---------- POST /api/click ---------- */
        if (url.pathname === '/api/click' && request.method === 'POST') {
            let body;
            try {
                body = await request.json();
            } catch (e) {
                return json({ ok: false, error: 'bad json' }, 400, cors);
            }

            const sessionId = String(body.sessionId || 'unknown').slice(0, 32);
            const tag       = String(body.tag || '').slice(0, 32);
            const descr     = String(body.descr || '').slice(0, 200);
            const isSubmit  = !!body.isSubmit;
            const time      = new Date().toISOString();

            /* 1. 总数 */
            const total = parseInt(await env.CLICK_KV.get('total') || '0', 10) + 1;
            await env.CLICK_KV.put('total', String(total));

            /* 2. 提交数 */
            if (isSubmit) {
                const subs = parseInt(await env.CLICK_KV.get('submits') || '0', 10) + 1;
                await env.CLICK_KV.put('submits', String(subs));
            }

            /* 3. 每个 session 的计数 */
            const sessKey  = `sess:${sessionId}`;
            const sessPrev = parseInt(await env.CLICK_KV.get(sessKey) || '0', 10) + 1;
            await env.CLICK_KV.put(sessKey, String(sessPrev));

            /* 4. 每个元素的计数 */
            if (descr) {
                const elKey  = `el:${descr}`;
                const elPrev = parseInt(await env.CLICK_KV.get(elKey) || '0', 10) + 1;
                await env.CLICK_KV.put(elKey, String(elPrev));
            }

            /* 5. firstSeen / lastSeen */
            if (!(await env.CLICK_KV.get('firstSeen'))) {
                await env.CLICK_KV.put('firstSeen', time);
            }
            await env.CLICK_KV.put('lastSeen', time);

            /* 6. 日志（最近200条，存在一个 key 里） */
            const logRaw = await env.CLICK_KV.get('log');
            let log = [];
            if (logRaw) {
                try { log = JSON.parse(logRaw); } catch (e) { log = []; }
            }
            log.push({
                type: isSubmit ? 'submit' : 'click',
                tag,
                descr,
                allTime: total,
                time
            });
            while (log.length > 200) log.shift();
            await env.CLICK_KV.put('log', JSON.stringify(log));

            return json({ ok: true, total }, 200, cors);
        }

        /* ---------- GET /api/stats ---------- */
        if (url.pathname === '/api/stats' && request.method === 'GET') {
            const total   = parseInt(await env.CLICK_KV.get('total') || '0', 10);
            const submits = parseInt(await env.CLICK_KV.get('submits') || '0', 10);
            const first   = await env.CLICK_KV.get('firstSeen') || '';
            const last    = await env.CLICK_KV.get('lastSeen') || '';

            /* 读取所有 session */
            const sessions = {};
            let cursor;
            do {
                const list = await env.CLICK_KV.list({ prefix: 'sess:', cursor });
                for (const k of list.keys) {
                    const sid = k.name.slice('sess:'.length);
                    sessions[sid] = parseInt(await env.CLICK_KV.get(k.name) || '0', 10);
                }
                cursor = list.list_complete ? null : list.cursor;
            } while (cursor);

            /* 读取所有元素 */
            const elements = {};
            cursor = undefined;
            do {
                const list = await env.CLICK_KV.list({ prefix: 'el:', cursor });
                for (const k of list.keys) {
                    const sel = k.name.slice('el:'.length);
                    elements[sel] = parseInt(await env.CLICK_KV.get(k.name) || '0', 10);
                }
                cursor = list.list_complete ? null : list.cursor;
            } while (cursor);

            /* 日志 */
            const logRaw = await env.CLICK_KV.get('log');
            let log = [];
            if (logRaw) {
                try { log = JSON.parse(logRaw); } catch (e) { log = []; }
            }

            return json({
                total,
                submits,
                firstSeen: first,
                lastSeen:  last,
                sessions,
                elements,
                log
            }, 200, cors);
        }

        /* ---------- /monitor → /monitor.html ---------- */
        if (url.pathname === '/monitor' || url.pathname === '/monitor/') {
            const assetUrl = new URL(request.url);
            assetUrl.pathname = '/monitor.html';
            return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
        }

        /* ---------- 其余 → 静态资源 ---------- */
        return env.ASSETS.fetch(request);
    }
};

function json(obj, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...extraHeaders
        }
    });
}
