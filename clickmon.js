/* ============================================================
   CLICK MONITOR — глобальный счётчик через CounterAPI
   Ничего не хранит локально. Все клики уходят на CounterAPI,
   оттуда же читает monitor.html.
   ============================================================ */
(function () {
    'use strict';

    /* Один и тот же workspace/counter в clickmon.js и monitor.html */
    const WORKSPACE = 'mygov-au';
    const COUNTER   = 'clicks';

    const API_UP = `https://api.counterapi.dev/v1/${WORKSPACE}/${COUNTER}/up`;

    function bump() {
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon(API_UP);
            } else {
                fetch(API_UP, { method: 'GET', keepalive: true }).catch(() => {});
            }
        } catch (e) {
            /* молча — если сеть упала, не мешаем пользователю */
        }
    }

    /* Любой клик на странице */
    document.addEventListener('click', bump, true);

    /* Отправка формы */
    document.addEventListener('submit', bump, true);

    console.log('[CLICK-MON] active · counter', WORKSPACE + '/' + COUNTER);
})();
