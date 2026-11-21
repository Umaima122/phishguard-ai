"""PhishGuard AI API. Serves the built React app too, so one container runs everything."""

import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db
from .engines import Engines
from .indicators import (analyse_sender, build_explanation, recommendations, scan_rules,
                         threat_level)
from .preprocess import combine
from .url_checker import extract_urls, inspect_url

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
app = FastAPI(title="PhishGuard AI API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])

engines = Engines()
db.init()


class AnalyzeRequest(BaseModel):
    subject: str = Field("", max_length=500)
    sender: str = Field("", max_length=320)
    body: str = Field(..., min_length=10, max_length=50000)
    engine: Literal["tfidf", "bert", "compare"] = "tfidf"
    save_to_history: bool = False


class UrlRequest(BaseModel):
    url: str = Field(..., min_length=3, max_length=2048)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": app.version, "engines": engines.describe()}


@app.get("/api/models")
def models():
    return engines.describe()


def _classify(engine, text):
    pred = engine.predict(text)
    is_phish = pred["score"] >= 50
    return pred, is_phish


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    text = combine(req.subject, req.body)
    primary_key = "tfidf" if req.engine == "compare" else req.engine
    primary = engines.get(primary_key)
    if primary.status != "ready":
        raise HTTPException(503, f"{primary.name} is {primary.status}" + (f": {primary.error}" if primary.error else ""))

    pred, is_phish = _classify(primary, text)
    comparison = []
    if req.engine == "compare":
        for e in (engines.tfidf, engines.bert):
            if e.status == "ready":
                p = pred if e is primary else e.predict(text)
                comparison.append({"engine": e.key, "name": e.name, "score": round(p["score"], 2),
                                   "classification": "Potential Phishing" if p["score"] >= 50 else "Likely Legitimate"})
            else:
                comparison.append({"engine": e.key, "name": e.name, "score": None, "classification": None,
                                   "status": e.status})

    warnings = scan_rules(text)
    urls = [inspect_url(u) for u in extract_urls(text)]
    sender = analyse_sender(req.sender, [u["domain"] for u in urls])
    score = round(pred["score"], 2)
    level = threat_level(score, warnings, urls, sender)
    result = {
        "id": uuid.uuid4().hex[:12],
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "model",
        "classification": "Potential Phishing" if is_phish else "Likely Legitimate",
        "score": score,
        "threat_level": level,
        "engine": {"key": primary.key, "name": primary.name,
                   "trained_at": (primary.metrics or {}).get("trained_at")},
        "warnings": warnings,
        "urls": urls,
        "sender": sender,
        "top_terms": pred["top_terms"],
        "explanation": build_explanation(is_phish, score, warnings, urls, sender, pred["top_terms"]),
        "recommendations": recommendations(is_phish, warnings, urls, sender),
        "comparison": comparison,
        "saved": False,
    }
    if req.save_to_history:
        db.save(result, req.subject, req.sender, req.body)
        result["saved"] = True
    return result


@app.post("/api/url")
def url(req: UrlRequest):
    return inspect_url(req.url)


@app.get("/api/history")
def history(q: str = "", classification: str = "", level: str = "", limit: int = Query(200, le=1000)):
    return db.list_(q, classification, level, limit)


@app.get("/api/history/{id_}")
def history_item(id_: str):
    item = db.get(id_)
    if not item:
        raise HTTPException(404, "Not found")
    return item


@app.delete("/api/history/{id_}")
def history_delete(id_: str):
    return {"deleted": db.delete(id_)}


@app.delete("/api/history")
def history_clear():
    return {"deleted": db.delete()}


@app.get("/api/stats")
def stats():
    return db.stats()


# ── Frontend (built React app) ──
DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = DIST / path
        if path and f.is_file() and DIST in f.resolve().parents:
            return FileResponse(f)
        return FileResponse(DIST / "index.html")
