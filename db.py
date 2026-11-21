"""SQLite history. Rows are written only when the user opts in per analysis.
The full email body is never stored: only subject, sender, a short preview and the result."""

import json
import os
import sqlite3
import threading
from pathlib import Path

DB_PATH = Path(os.getenv("PHISHGUARD_DB", Path(__file__).resolve().parents[1] / "data" / "history.db"))
_lock = threading.Lock()


def _conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _lock, _conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL, subject TEXT, sender TEXT, preview TEXT,
            classification TEXT NOT NULL, score REAL NOT NULL, threat_level TEXT NOT NULL,
            engine TEXT NOT NULL, url_count INTEGER, warning_count INTEGER, result_json TEXT NOT NULL)""")


def save(result: dict, subject: str, sender: str, body: str):
    preview = " ".join(body.split())[:140]
    with _lock, _conn() as c:
        c.execute("INSERT OR REPLACE INTO analyses VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (
            result["id"], result["timestamp"], (subject or "")[:200], (sender or "")[:200], preview,
            result["classification"], result["score"], result["threat_level"], result["engine"]["key"],
            len(result["urls"]), len(result["warnings"]), json.dumps(result)))


def _row(r, full=False):
    d = {k: r[k] for k in ("id", "created_at", "subject", "sender", "preview", "classification",
                           "score", "threat_level", "engine", "url_count", "warning_count")}
    if full:
        d["result"] = json.loads(r["result_json"])
    return d


def list_(q: str = "", classification: str = "", level: str = "", limit: int = 200):
    sql, args = "SELECT * FROM analyses WHERE 1=1", []
    if q:
        sql += " AND (subject LIKE ? OR sender LIKE ? OR preview LIKE ?)"
        args += [f"%{q}%"] * 3
    if classification:
        sql += " AND classification = ?"
        args.append(classification)
    if level:
        sql += " AND threat_level = ?"
        args.append(level)
    sql += " ORDER BY created_at DESC LIMIT ?"
    args.append(limit)
    with _conn() as c:
        return [_row(r) for r in c.execute(sql, args)]


def get(id_: str):
    with _conn() as c:
        r = c.execute("SELECT * FROM analyses WHERE id = ?", (id_,)).fetchone()
        return _row(r, True) if r else None


def delete(id_: str | None = None):
    with _lock, _conn() as c:
        if id_:
            return c.execute("DELETE FROM analyses WHERE id = ?", (id_,)).rowcount
        return c.execute("DELETE FROM analyses").rowcount


def stats():
    with _conn() as c:
        total = c.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
        phish = c.execute("SELECT COUNT(*) FROM analyses WHERE classification='Potential Phishing'").fetchone()[0]
        levels = {r[0]: r[1] for r in c.execute("SELECT threat_level, COUNT(*) FROM analyses GROUP BY threat_level")}
        daily = [{"date": r[0], "phishing": r[1], "legitimate": r[2]} for r in c.execute(
            """SELECT substr(created_at,1,10) d, SUM(classification='Potential Phishing'),
               SUM(classification!='Potential Phishing') FROM analyses GROUP BY d ORDER BY d DESC LIMIT 14""")][::-1]
        urls = c.execute("SELECT COALESCE(SUM(url_count),0) FROM analyses").fetchone()[0]
        warn_counts: dict[str, int] = {}
        for (rj,) in c.execute("SELECT result_json FROM analyses ORDER BY created_at DESC LIMIT 500"):
            for w in json.loads(rj)["warnings"]:
                warn_counts[w["title"]] = warn_counts.get(w["title"], 0) + 1
        top = sorted(warn_counts.items(), key=lambda kv: -kv[1])[:6]
        return {"total": total, "phishing": phish, "legitimate": total - phish, "urls_inspected": urls,
                "by_level": levels, "daily": daily, "top_warnings": [{"title": k, "count": v} for k, v in top]}
