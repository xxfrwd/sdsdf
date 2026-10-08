/* ============================================================
   CLICK MONITOR — только ЛОКАЛЬНЫЙ учёт в localStorage.
   Ничего не отправляет в Telegram. Только пишет clickmon.*
   ключи, которые читает отдельный файл monitor.html
   ============================================================ */
(function () {
    'use strict';

    /* --- Настройки --- */
    const MAX_TEXT_LEN = 80;

    /* --- Storage keys (общие с monitor.html) --- */
    const KEY_TOTAL    = 'clickmon.total';
    const KEY_SUBMITS  = 'clickmon.submits';
    const KEY_SESSION  = 'clickmon.session';
    const KEY_FIRST    = 'clickmon.firstSeen';
    const KEY_LAST     = 'clickmon.lastSeen';
    const KEY_LOG      = 'clickmon.log';
    const KEY_SESSIONS = 'clickmon.sessions';
    const KEY_ELEMENTS = 'clickmon.elements';

    const LOG_MAX = 200;

    /* --- Хелперы storage --- */
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
    function lsSet(key, value) {
        try { localStorage.setItem(key, String(value)); } catch (e) {}
    }
    function lsSetJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    /* --- Постоянный id сессии --- */
    function getSessionId() {
        try {
            let s = localStorage.getItem(KEY_SESSION);
            if (!s) {
                s = Math.random().toString(36).slice(2, 10);
                localStorage.setItem(KEY_SESSION, s);
            }
            return s;
        } catch (e) {
            return Math.random().toString(36).slice(2, 10);
        }
    }
    const sessionId = getSessionId();

    /* --- Инициализация --- */
    function ensureInit() {
        if (!lsGet(KEY_FIRST, '')) lsSet(KEY_FIRST, new Date().toISOString());
        if (lsGet(KEY_TOTAL, null) === null)    lsSet(KEY_TOTAL, '0');
        if (lsGet(KEY_SUBMITS, null) === null)  lsSet(KEY_SUBMITS, '0');
    }
    ensureInit();

    /* --- Инкременты --- */
    function bumpTotal(by) {
        const next = lsGetNum(KEY_TOTAL, 0) + (by || 1);
        lsSet(KEY_TOTAL, next);
        return next;
    }
    function bumpSubmits(by) {
        const next = lsGetNum(KEY_SUBMITS, 0) + (by || 1);
        lsSet(KEY_SUBMITS, next);
        return next;
    }
    function touchLast() {
        lsSet(KEY_LAST, new Date().toISOString());
    }

    /* --- Сессии --- */
    function bumpSession(sid, by) {
        const sessions = lsGetJSON(KEY_SESSIONS, {}) || {};
        sessions[sid] = (sessions[sid] || 0) + (by || 1);
        lsSetJSON(KEY_SESSIONS, sessions);
    }

    /* --- Элементы --- */
    function bumpElement(selector, by) {
        const elements = lsGetJSON(KEY_ELEMENTS, {}) || {};
        elements[selector] = (elements[selector] || 0) + (by || 1);
        lsSetJSON(KEY_ELEMENTS, elements);
    }

    /* --- Лог --- */
    function pushLog(entry) {
        const log = lsGetJSON(KEY_LOG, []) || [];
        log.push(entry);
        while (log.length > LOG_MAX) log.shift();
        lsSetJSON(KEY_LOG, log);
    }

    /* --- Описание элемента --- */
    function describeElement(el) {
        if (!el || el === document || el === document.documentElement) {
            return { tag: 'html', id: '', cls: '', text: '', href: '', name: '', type: '' };
        }
        const tag  = el.tagName ? el.tagName.toLowerCase() : 'unknown';
        const id   = el.id || '';
        const cls  = (typeof el.className === 'string' ? el.className : '')
                        .split(/\s+/).filter(Boolean).slice(0, 4).join('.');
        const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT_LEN);
        const href = el.getAttribute ? (el.getAttribute('href') || '') : '';
        const name = el.getAttribute ? (el.getAttribute('name') || '') : '';
        const type = el.getAttribute ? (el.getAttribute('type') || '') : '';
        return { tag, id, cls, text, href, name, type };
    }

    /* --- Селектор для группировки --- */
    function selectorOf(info) {
        const parts = [info.tag];
        if (info.id)   parts.push('#' + info.id);
        if (info.cls)  parts.push('.' + info.cls.split('.')[0]);
        if (info.type) parts.push('[type=' + info.type + ']');
        return parts.join('');
    }

    /* --- Клик --- */
    function onClick(ev) {
        touchLast();

        const totalAllTime = bumpTotal(1);
        bumpSession(sessionId, 1);

        const info = describeElement(ev.target);
        const selector = selectorOf(info);
        bumpElement(selector, 1);

        pushLog({
            type: 'click',
            tag: info.tag,
            descr: selector + (info.text ? ' — "' + info.text + '"' : ''),
            allTime: totalAllTime,
            time: new Date().toISOString()
        });
    }

    document.addEventListener('click', onClick, true);

    /* --- Submit --- */
    document.addEventListener('submit', function (ev) {
        touchLast();
        const totalAllTime = bumpTotal(1);
        bumpSubmits(1);
        bumpSession(sessionId, 1);

        const info = describeElement(ev.target);
        const selector = 'form' + (info.id ? '#' + info.id : '');
        bumpElement(selector, 1);

        pushLog({
            type: 'submit',
            tag: 'submit',
            descr: selector + ' — action=' + (ev.target.getAttribute('action') || ''),
            allTime: totalAllTime,
            time: new Date().toISOString()
        });
    }, true);

    /* --- Скрытый маркер --- */
    const marker = document.createElement('meta');
    marker.name = 'click-monitor';
    marker.content = 'active';
    marker.style.display = 'none';
    document.head.appendChild(marker);

    console.log('[CLICK-MON] active · session', sessionId,
                '· total so far', lsGetNum(KEY_TOTAL, 0),
                '· submits', lsGetNum(KEY_SUBMITS, 0));
})();
