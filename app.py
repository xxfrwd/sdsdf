# ============================================================
#   myGov Tracker — Flask backend
#   Принимает события с сайта и отдаёт статистику в монитор.
# ============================================================

import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, 'tracker.db')

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

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
        CREATE INDEX IF NOT EXISTS idx_events_type    ON events(type);
        CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    """)
    conn.commit()
    conn.close()

init_db()

# ---------- CORS ----------
@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin']  = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp

@app.route('/api/track', methods=['OPTIONS'])
@app.route('/api/stats/summary', methods=['OPTIONS'])
@app.route('/api/stats/daily', methods=['OPTIONS'])
def options_handler():
    return ('', 204)

# ============================================================
#   POST /api/track — приём событий
# ============================================================
@app.route('/api/track', methods=['POST'])
def track():
    try:
        data = request.get_json(silent=True) or {}
        ip   = request.headers.get('X-Forwarded-For', request.remote_addr or '')
        ip   = ip.split(',')[0].strip()
        ua   = request.headers.get('User-Agent', '')

        conn = get_db()
        conn.execute("""
            INSERT INTO events
                (type, page, element, text, referrer, screen, language, ip, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
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
        return jsonify(ok=True)
    except Exception as e:
        print('track error:', e)
        return jsonify(ok=False), 500

# ============================================================
#   GET /api/stats/summary
# ============================================================
@app.route('/api/stats/summary')
def stats_summary():
    try:
        conn = get_db()
        c = conn.cursor()

        total_views  = c.execute("SELECT COUNT(*) FROM events WHERE type='pageview'").fetchone()[0]
        total_clicks = c.execute("SELECT COUNT(*) FROM events WHERE type='click'").fetchone()[0]
        total_forms  = c.execute("SELECT COUNT(*) FROM events WHERE type='submit'").fetchone()[0]
        unique_users = c.execute("SELECT COUNT(DISTINCT ip) FROM events").fetchone()[0]

        top_pages = [dict(r) for r in c.execute("""
            SELECT page AS page, COUNT(*) AS count
            FROM events
            WHERE type='pageview' AND page != ''
            GROUP BY page
            ORDER BY count DESC
            LIMIT 10
        """).fetchall()]

        top_clicks = [dict(r) for r in c.execute("""
            SELECT element AS element, COUNT(*) AS count
            FROM events
            WHERE type='click' AND element != ''
            GROUP BY element
            ORDER BY count DESC
            LIMIT 10
        """).fetchall()]

        top_inputs = [dict(r) for r in c.execute("""
            SELECT element AS element, COUNT(*) AS count
            FROM events
            WHERE type='input' AND element != ''
            GROUP BY element
            ORDER BY count DESC
            LIMIT 10
        """).fetchall()]

        conn.close()
        return jsonify(
            total_clicks=total_clicks,
            total_views=total_views,
            total_forms=total_forms,
            unique_users=unique_users,
            top_pages=top_pages,
            top_clicks=top_clicks,
            top_inputs=top_inputs,
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
        conn = get_db()
        c = conn.cursor()

        days = []
        for i in range(6, -1, -1):
            days.append((datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d'))

        since = days[0]

        def grouped(t):
            rows = c.execute("""
                SELECT substr(created_at,1,10) AS date, COUNT(*) AS count
                FROM events
                WHERE type=? AND created_at >= ?
                GROUP BY date
            """, (t, since)).fetchall()
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

# ============================================================
#   /monitor → monitor.html
# ============================================================
@app.route('/monitor')
def monitor():
    return send_from_directory(BASE_DIR, 'monitor.html')

# ---------- HEALTH ----------
@app.route('/health')
def health():
    return jsonify(ok=True)

# ---------- START ----------
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)
