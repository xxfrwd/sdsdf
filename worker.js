export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        /* 处理 /api/click */
        if (url.pathname === '/api/click' && request.method === 'POST') {
            try {
                const body = await request.json();
                const total = parseInt(await env.CLICK_KV.get('total') || '0', 10) + 1;
                await env.CLICK_KV.put('total', String(total));
                await env.CLICK_KV.put('lastSeen', new Date().toISOString());
                return new Response(JSON.stringify({ ok: true, total }), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            } catch (e) {
                return new Response(JSON.stringify({ ok: false }), { status: 400 });
            }
        }

        /* 处理 /api/stats */
        if (url.pathname === '/api/stats') {
            const total = parseInt(await env.CLICK_KV.get('total') || '0', 10);
            return new Response(JSON.stringify({ total }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        /* /monitor 重写到 /monitor.html */
        if (url.pathname === '/monitor' || url.pathname === '/monitor/') {
            const assetUrl = new URL(request.url);
            assetUrl.pathname = '/monitor.html';
            return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
        }

        /* 其余交给静态资源 */
        return env.ASSETS.fetch(request);
    }
};
