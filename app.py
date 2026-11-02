# ============================================================
#   myGov Tracker — Flask backend (с поддержкой доменов)
# ============================================================

import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, 'tracker.db')

app = Flask(__name__, static_folder=None)

# ---------- DB ----------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS events (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            domain     TEXT,
            type       TEXT NOT NULL,
            page       TEXT,
            element    TEXT,
            text       TEXT,
            referrer   TEXT,
            screen     TEXT,
            language   TEXT,
            ip         TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_events_domain  ON events(domain);
        CREATE INDEX IF NOT EXISTS idx_events_type    ON events(type);
        CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    """)
    conn.commit()
    conn.close()

init_db()

# ============================================================
#   CORS — разрешаем ВСЕМ (для тестов)
# ============================================================
@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return resp

@app.route('/api/track', methods=['OPTIONS'])
@app.route('/api/stats/summary', methods=['OPTIONS'])
@app.route('/api/stats/daily', methods=['OPTIONS'])
def options_handler():
    return ('', 200)

# ============================================================
#   STATIC FILES
# ============================================================
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/monitor')
def monitor():
    return send_from_directory(BASE_DIR, 'monitor.html')

@app.route('/<path:filename>')
def static_files(filename):
    full_path = os.path.join(BASE_DIR, filename)
    if not os.path.abspath(full_path).startswith(os.path.abspath(BASE_DIR)):
        return jsonify(error='forbidden'), 403
    if filename == 'tracker.db' or filename.endswith('.db'):
        return jsonify(error='forbidden'), 403
    if not os.path.isfile(full_path):
        if filename.startswith('api/'):
            return jsonify(error='not found'), 404
        return send_from_directory(BASE_DIR, 'index.html')
    return send_from_directory(BASE_DIR, filename)

# ============================================================
#   POST /api/track
# ============================================================
@app.route('/api/track', methods=['POST'])
def track():
    try:
        # Поддерживаем и JSON, и простой текст (sendBeacon)
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict() or {}
            if not data and request.data:
                import json
                try: data = json.loads(request.data)
                except: pass

        ip = request.headers.get('X-Forwarded-For', request.remote_addr or '')
        ip = ip.split(',')[0].strip()
        ua = request.headers.get('User-Agent', '')

        # Определяем домен (приоритет: тело запроса -> Origin -> Referer)
        domain = data.get('domain', '')
        if not domain:
            origin = request.headers.get('Origin') or request.headers.get('Referer') or ''
            if origin:
                try: domain = urlparse(origin).hostname or ''
                except: domain = origin
        if not domain: domain = 'unknown'

        conn = get_db()
        conn.execute("""
            INSERT INTO events
                (domain, type, page, element, text, referrer, screen, language, ip, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(domain)[:100],
            str(data.get('type', 'event'))[:32],
            str(data.get('page', ''))[:500],
            str(data.get('element', ''))[:200],
            str(data.get('text', ''))[:300],
            str(data.get('referrer', ''))[:500],
            str(data.get('screen', ''))[:32],
            str(data.get('language', ''))[:32],
            ip[:64],
            ua[:500],
        ))
        conn.commit()
        conn.close()
        return jsonify(ok=True, domain=domain)
    except Exception as e:
        print('track error:', e)
        return jsonify(ok=False, error=str(e)), 500

# ============================================================
#   GET /api/stats/summary
# ============================================================
@app.route('/api/stats/summary')
def stats_summary():
    try:
        domain = request.args.get('domain')
        
        conn = get_db()
        c = conn.cursor()
        
        # Формируем условие WHERE, если передан фильтр по домену
        where = "WHERE domain = ?" if domain else ""
        params = (domain,) if domain else ()

        total_views  = c.execute(f"SELECT COUNT(*) FROM events {where} {'AND' if domain else 'WHERE'} type='pageview'", params).fetchone()[0]
        total_clicks = c.execute(f"SELECT COUNT(*) FROM events {where} {'AND' if domain else 'WHERE'} type='click'", params).fetchone()[0]
        total_forms  = c.execute(f"SELECT COUNT(*) FROM events {where} {'AND' if domain else 'WHERE'} type='submit'", params).fetchone()[0]
        unique_users = c.execute(f"SELECT COUNT(DISTINCT ip) FROM events {where}", params).fetchone()[0]

        top_pages = [dict(r) for r in c.execute(f"""
            SELECT page AS page, COUNT(*) AS count
            FROM events {where} {'AND' if domain else 'WHERE'} type='pageview' AND page != ''
            GROUP BY page ORDER BY count DESC LIMIT 10
        """, params).fetchall()]

        top_clicks = [dict(r) for r in c.execute(f"""
            SELECT element AS element, COUNT(*) AS count
            FROM events {where} {'AND' if domain else 'WHERE'} type='click' AND element != ''
            GROUP BY element ORDER BY count DESC LIMIT 10
        """, params).fetchall()]

        top_inputs = [dict(r) for r in c.execute(f"""
            SELECT element AS element, COUNT(*) AS count
            FROM events {where} {'AND' if domain else 'WHERE'} type='input' AND element != ''
            GROUP BY element ORDER BY count DESC LIMIT 10
        """, params).fetchall()]

        conn.close()
        return jsonify(
            total_clicks=total_clicks,
            total_views=total_views,
            total_forms=total_forms,
            unique_users=unique_users,
            top_pages=top_pages,
            top_clicks=top_clicks,
            top_inputs=top_inputs,
            domain=domain or 'all'
        )
    except Exception as e:
        print('summary error:', e)
        return jsonify(error='db error'), 500

# ============================================================
#   GET /api/stats/daily
# ============================================================
@app.route('/api/stats/daily')
def stats_daily():
    try:
        domain = request.args.get('domain')
        conn = get_db()
        c = conn.cursor()

        days = []
        for i in range(6, -1, -1):
            days.append((datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d'))
        since = days[0]

        where = "AND domain = ?" if domain else ""
        params_base = (since,) + ((domain,) if domain else ())

        def grouped(t):
            rows = c.execute(f"""
                SELECT substr(created_at,1,10) AS date, COUNT(*) AS count
                FROM events
                WHERE type=? AND created_at >= ? {where}
                GROUP BY date
            """, (t, *params_base)).fetchall()
            return {r['date']: r['count'] for r in rows}

        mv = grouped('pageview')
        mc = grouped('click')
        mf = grouped('submit')

        conn.close()
        return jsonify(
            daily_views=[{'date': d, 'count': mv.get(d, 0)} for d in days],
            daily_clicks=[{'date': d, 'count': mc.get(d, 0)} for d in days],
            daily_forms=[{'date': d, 'count': mf.get(d, 0)} for d in days],
        )
    except Exception as e:
        print('daily error:', e)
        return jsonify(error='db error'), 500

@app.route('/health')
def health():
    return jsonify(ok=True)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)
