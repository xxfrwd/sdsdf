/* ============================================================
   myGov — клиентский трекер (полный, с доменом)
   ============================================================ */

(function () {
    'use strict';

    /* Бэкенд на Render */
    const API_BASE = 'https://sdsdf-23jy.onrender.com';
    const ENDPOINT = API_BASE + '/api/track';

    /* Домен текущей страницы — отправляется с каждым событием */
    function getDomain() {
        return window.location.hostname || 'unknown';
    }

    function send(payload) {
        try {
            /* Всегда добавляем домен, если его нет */
            if (!payload.domain) {
                payload.domain = getDomain();
            }
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

    /* ========== PAGEVIEW ========== */
    function pageview() {
        send({
            type:     'pageview',
            domain:   getDomain(),
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

    /* ========== CLICK ========== */
    document.addEventListener('click', function (e) {
        const d = describe(e.target);
        send({
            type:     'click',
            domain:   getDomain(),
            page:     location.pathname + location.search,
            element:  d.element,
            text:     d.text,
            referrer: document.referrer
        });
    }, true);

    /* ========== SUBMIT ========== */
    document.addEventListener('submit', function (e) {
        const d = describe(e.target);
        send({
            type:     'submit',
            domain:   getDomain(),
            page:     location.pathname + location.search,
            element:  d.element,
            text:     'form-submit',
            referrer: document.referrer
        });
    }, true);

    /* ========== INPUT (debounce 1.5s) ========== */
    let inputTimer = null;
    document.addEventListener('input', function (e) {
        clearTimeout(inputTimer);
        inputTimer = setTimeout(function () {
            const el = e.target;
            if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
            send({
                type:     'input',
                domain:   getDomain(),
                page:     location.pathname,
                element:  'input:' + (el.id || el.name || 'unknown'),
                text:     'typing',
                referrer: document.referrer
            });
        }, 1500);
    }, true);

    /* ========== SCROLL (debounce 5s) ========== */
    let scrollTimer = null;
    window.addEventListener('scroll', function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const depth = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
            send({
                type:     'scroll',
                domain:   getDomain(),
                page:     location.pathname,
                element:  'scroll',
                text:     'depth:' + depth + '%',
                referrer: document.referrer
            });
        }, 5000);
    }, { passive: true });

    /* ========== EXIT ========== */
    window.addEventListener('beforeunload', function () {
        const seconds = Math.round(performance.now() / 1000);
        const body = JSON.stringify({
            type:     'exit',
            domain:   getDomain(),
            page:     location.pathname,
            element:  'exit',
            text:     'time:' + seconds + 's',
            referrer: document.referrer
        });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        }
    });

    console.log('[tracker] active →', API_BASE, '| domain:', getDomain());
})();
