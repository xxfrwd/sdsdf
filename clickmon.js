(function () {
    'use strict';
    const sessionId = Math.random().toString(36).slice(2, 10);

    function send(payload) {
        try {
            const body = JSON.stringify(payload);
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/click', new Blob([body], { type: 'application/json' }));
            } else {
                fetch('/api/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
            }
        } catch (e) {}
    }

    document.addEventListener('click', (ev) => {
        const el = ev.target;
        const descr = (el.tagName || 'unknown').toLowerCase() + (el.id ? '#' + el.id : '');
        send({ sessionId, tag: el.tagName, descr, isSubmit: false });
    }, true);

    document.addEventListener('submit', (ev) => {
        send({ sessionId, tag: 'submit', descr: 'submit ' + (ev.target.id || ''), isSubmit: true });
    }, true);
})();
