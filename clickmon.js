(function () {
    'use strict';

    // 你的 CounterAPI 工作区名字，随便起一个，比如 mygov-au
    const WORKSPACE = 'mygov-au';
    // 计数器名字，就叫 clicks
    const COUNTER   = 'clicks';

    function send(payload) {
        // 拼出 CounterAPI 的 +1 地址
        const url = `https://api.counterapi.dev/v1/${WORKSPACE}/${COUNTER}/up`;

        // 用 sendBeacon 保证就算页面马上跳走也能发出去
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url);
        } else {
            fetch(url, { method: 'GET', keepalive: true }).catch(() => {});
        }
    }

    document.addEventListener('click', (ev) => {
        const el = ev.target;
        const descr = (el.tagName || 'unknown').toLowerCase() + (el.id ? '#' + el.id : '');
        send({ descr, isSubmit: false });
    }, true);

    document.addEventListener('submit', (ev) => {
        send({ descr: 'submit', isSubmit: true });
    }, true);
})();
