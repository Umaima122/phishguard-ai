"""Model engines. TF-IDF ships pre-trained; BERT loads if present, else trains in the background."""

import json
import logging
import os
import threading

import joblib
import numpy as np

from .preprocess import clean_text
from .training import MODELS, train_bert

log = logging.getLogger("phishguard")


class TfidfEngine:
    key = "tfidf"
    name = "TF-IDF + Logistic Regression"

    def __init__(self):
        self.model, self.metrics, self.status, self.error = None, None, "unavailable", None
        path = MODELS / "tfidf.joblib"
        if path.exists():
            try:
                self.model = joblib.load(path)
                self.metrics = json.loads((MODELS / "tfidf_metrics.json").read_text())
                self.status = "ready"
            except Exception as e:  # noqa: BLE001
                self.status, self.error = "error", str(e)

    def predict(self, text: str) -> dict:
        prob = float(self.model.predict_proba([text])[0][1])
        return {"score": prob * 100, "top_terms": self.top_terms(text)}

    def top_terms(self, text: str, k: int = 8) -> list[dict]:
        """Per-email contribution of each term: tfidf value x model coefficient."""
        vec = self.model.named_steps["tfidf"]
        coef = self.model.named_steps["clf"].coef_[0]
        row = vec.transform([text])
        names = vec.get_feature_names_out()
        contrib = row.multiply(coef).tocsr()
        idx, vals = contrib.indices, contrib.data
        order = np.argsort(-np.abs(vals))[: k * 2]
        out = []
        for i in order:
            term = names[idx[i]]
            if "token" in term:
                term = term.replace("urltoken", "[link]").replace("emailtoken", "[email]") \
                    .replace("moneytoken", "[amount]").replace("cardtoken", "[card no.]").replace("numtoken", "[number]")
            out.append({"term": term, "weight": round(float(vals[i]), 4)})
        pos = [t for t in out if t["weight"] > 0][:k]
        neg = [t for t in out if t["weight"] < 0][:4]
        return pos + neg


class BertEngine:
    key = "bert"
    name = "Sentence-BERT (MiniLM-L6) + Logistic Regression"

    def __init__(self):
        self.clf, self.embedder, self.metrics = None, None, None
        self.status, self.error = "unavailable", None
        self._lock = threading.Lock()
        if os.getenv("DISABLE_BERT") == "1":
            self.error = "Disabled by DISABLE_BERT=1"
            return
        try:
            import sentence_transformers  # noqa: F401
        except ImportError:
            self.error = "Not included in this deployment (lite build, needs more RAM)"
            return
        threading.Thread(target=self._boot, daemon=True).start()

    def _boot(self):
        from sentence_transformers import SentenceTransformer
        try:
            self.status = "loading"
            self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
            path = MODELS / "bert.joblib"
            if not path.exists():
                self.status = "training"
                train_bert(log=log.info, embedder=self.embedder)
            self.clf = joblib.load(path)
            self.metrics = json.loads((MODELS / "bert_metrics.json").read_text())
            self.status = "ready"
            log.info("BERT engine ready")
        except Exception as e:  # noqa: BLE001
            self.status, self.error = "error", str(e)
            log.exception("BERT engine failed")

    def predict(self, text: str) -> dict:
        with self._lock:
            emb = self.embedder.encode([clean_text(text)[:2000]], normalize_embeddings=True)
        return {"score": float(self.clf.predict_proba(emb)[0][1]) * 100, "top_terms": []}


class Engines:
    def __init__(self):
        self.tfidf = TfidfEngine()
        self.bert = BertEngine()

    def get(self, key: str):
        return {"tfidf": self.tfidf, "bert": self.bert}.get(key)

    def describe(self) -> list[dict]:
        return [{"key": e.key, "name": e.name, "status": e.status, "error": e.error, "metrics": e.metrics}
                for e in (self.tfidf, self.bert)]
