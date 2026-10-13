/* ============================================================
   myGov — клиентский трекер
   ============================================================ */

(function () {
    'use strict';

    /* Бэкенд на Render */
    const API_BASE = '';
    const ENDPOINT = API_BASE + '/api/track';

    function send(payload) {
        try {
            const body = JSON.stringify(payload);
            if (navigator.sendBeacon) {
                navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
            } else {
                fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    keepalive: true
                }).catch(function () {});
            }
        } catch (e) {}
    }

    function describe(el) {
        if (!el || el === document || el === document.documentElement) {
            return { element: 'html', text: '' };
        }
        const tag = (el.tagName || '').toLowerCase();
        const id  = el.id ? '#' + el.id : '';
        const cls = (typeof el.className === 'string' && el.className)
            ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
            : '';
        const text = (el.innerText || el.textContent || '')
            .trim().replace(/\s+/g, ' ').slice(0, 120);
        return { element: tag + id + cls, text };
    }

    function pageview() {
        send({
            type:     'pageview',
            page:     location.pathname + location.search,
            referrer: document.referrer,
            screen:   screen.width + 'x' + screen.height,
            language: navigator.language
        });
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        pageview();
    } else {
        document.addEventListener('DOMContentLoaded', pageview);
    }

    document.addEventListener('click', function (e) {
        const d = describe(e.target);
        send({
            type: 'click',
            page: location.pathname + location.search,
            element: d.element,
            text: d.text,
            referrer: document.referrer
        });
    }, true);

    document.addEventListener('submit', function (e) {
        const d = describe(e.target);
        send({
            type: 'submit',
            page: location.pathname + location.search,
            element: d.element,
            text: 'form-submit',
            referrer: document.referrer
        });
    }, true);

    let inputTimer = null;
    document.addEventListener('input', function (e) {
        clearTimeout(inputTimer);
        inputTimer = setTimeout(function () {
            const el = e.target;
            if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
            send({
                type: 'input',
                page: location.pathname,
                element: 'input:' + (el.id || el.name || 'unknown'),
                text: 'typing',
                referrer: document.referrer
            });
        }, 1500);
    }, true);

    let scrollTimer = null;
    window.addEventListener('scroll', function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const depth = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
            send({
                type: 'scroll',
                page: location.pathname,
                element: 'scroll',
                text: 'depth:' + depth + '%',
                referrer: document.referrer
            });
        }, 5000);
    }, { passive: true });

    window.addEventListener('beforeunload', function () {
        const seconds = Math.round(performance.now() / 1000);
        const body = JSON.stringify({
            type: 'exit',
            page: location.pathname,
            element: 'exit',
            text: 'time:' + seconds + 's',
            referrer: document.referrer
        });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        }
    });

    console.log('[tracker] active →', API_BASE);
})();
