/* ============================================================
   CLICK MONITOR — 发送点击到 /api/click
   ============================================================ */
(function () {
    'use strict';

    const API_CLICK   = '/api/click';
    const MAX_TEXT_LEN = 80;

    /* 每个浏览器会话一个随机 ID（刷新不变） */
    const sessionId = Math.random().toString(36).slice(2, 10);

    function describeElement(el) {
        if (!el || el === document || el === document.documentElement) {
            return { tag: 'html', descr: 'html' };
        }
        const tag  = el.tagName ? el.tagName.toLowerCase() : 'unknown';
        const id   = el.id || '';
        const cls  = (typeof el.className === 'string' ? el.className : '')
                        .split(/\s+/).filter(Boolean).slice(0, 4).join('.');
        const type = el.getAttribute ? (el.getAttribute('type') || '') : '';
        const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT_LEN);

        const parts = [tag];
        if (id)   parts.push('#' + id);
        if (cls)  parts.push('.' + cls.split('.')[0]);
        if (type) parts.push('[type=' + type + ']');
        const selector = parts.join('');

        const descr = selector + (text ? ' — "' + text + '"' : '');
        return { tag, descr };
    }

    function send(payload) {
        try {
            const body = JSON.stringify(payload);
            if (navigator.sendBeacon) {
                const blob = new Blob([body], { type: 'application/json' });
                navigator.sendBeacon(API_CLICK, blob);
            } else {
                fetch(API_CLICK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    keepalive: true
                }).catch(() => {});
            }
        } catch (e) { /* 静默 */ }
    }

    /* 所有点击 */
    document.addEventListener('click', (ev) => {
        const info = describeElement(ev.target);
        send({
            sessionId,
            tag: info.tag,
            descr: info.descr,
            isSubmit: false
        });
    }, true);

    /* 表单提交 */
    document.addEventListener('submit', (ev) => {
        const info = describeElement(ev.target);
        send({
            sessionId,
            tag: 'submit',
            descr: 'submit ' + info.descr,
            isSubmit: true
        });
    }, true);

    console.log('[CLICK-MON] active · session', sessionId);
})();
