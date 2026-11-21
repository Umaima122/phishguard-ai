"""Training for both engines. Used by the CLI scripts and by the server's background BERT job."""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from . import dataset
from .preprocess import clean_text

MODELS = Path(__file__).resolve().parents[1] / "models"
MAX_CHARS = 20000
SEED = 42


def _metrics(y_true, y_pred, y_prob) -> dict:
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    return {"accuracy": accuracy_score(y_true, y_pred), "precision": precision_score(y_true, y_pred, zero_division=0),
            "recall": recall_score(y_true, y_pred, zero_division=0), "f1": f1_score(y_true, y_pred, zero_division=0),
            "roc_auc": roc_auc_score(y_true, y_prob), "confusion_matrix": cm.tolist(),
            "false_positives": int(cm[0][1]), "false_negatives": int(cm[1][0])}


def _split(df):
    texts = df["text"].str.slice(0, MAX_CHARS).tolist()
    return train_test_split(texts, df["label"].values, test_size=0.2, random_state=SEED, stratify=df["label"].values)


def _save(name: str, model, metrics: dict):
    MODELS.mkdir(exist_ok=True)
    joblib.dump(model, MODELS / f"{name}.joblib", compress=3)
    (MODELS / f"{name}_metrics.json").write_text(json.dumps(metrics, indent=2))


def train_tfidf(csv: str | None = None, log=print) -> dict:
    path = dataset.find_dataset(csv)
    if not path:
        raise FileNotFoundError("Dataset not found. Put Phishing_Email.csv in the repo root or pass --csv.")
    df, info = dataset.load(path)
    log(f"Dataset {info['file']}: {info['usable_rows']:,} usable rows, {info['duplicates_removed']:,} duplicates removed")
    X_tr, X_te, y_tr, y_te = _split(df)
    t0 = time.time()
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(preprocessor=clean_text, stop_words="english", ngram_range=(1, 2),
                                  min_df=2, max_df=0.9, max_features=60000, sublinear_tf=True)),
        ("clf", LogisticRegression(C=4.0, max_iter=3000, class_weight="balanced", random_state=SEED)),
    ])
    pipe.fit(X_tr, y_tr)
    prob = pipe.predict_proba(X_te)[:, 1]
    m = _metrics(y_te, (prob >= 0.5).astype(int), prob)
    metrics = {"engine": "tfidf", "name": "TF-IDF + Logistic Regression", **m,
               "train_size": len(X_tr), "test_size": len(X_te), "train_seconds": round(time.time() - t0, 1),
               "features": len(pipe.named_steps["tfidf"].vocabulary_),
               "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "dataset": info}
    _save("tfidf", pipe, metrics)
    log(f"TF-IDF: acc {m['accuracy']:.4f}  precision {m['precision']:.4f}  recall {m['recall']:.4f}  f1 {m['f1']:.4f}")
    return metrics


def train_bert(csv: str | None = None, log=print, embedder=None) -> dict:
    """Sentence-BERT (all-MiniLM-L6-v2) embeddings + Logistic Regression, same split as TF-IDF."""
    path = dataset.find_dataset(csv)
    if not path:
        raise FileNotFoundError("Dataset not found.")
    df, info = dataset.load(path)
    if embedder is None:
        from sentence_transformers import SentenceTransformer
        embedder = SentenceTransformer("all-MiniLM-L6-v2")
    X_tr, X_te, y_tr, y_te = _split(df)
    t0 = time.time()
    # MiniLM reads up to 256 tokens; cleaned text keeps the embedding focused on wording
    enc = lambda xs: embedder.encode([clean_text(x)[:2000] for x in xs], batch_size=64,
                                     show_progress_bar=False, normalize_embeddings=True)
    log(f"BERT: encoding {len(X_tr) + len(X_te):,} emails...")
    E_tr, E_te = enc(X_tr), enc(X_te)
    clf = LogisticRegression(C=2.0, max_iter=3000, class_weight="balanced", random_state=SEED)
    clf.fit(E_tr, y_tr)
    prob = clf.predict_proba(E_te)[:, 1]
    m = _metrics(y_te, (prob >= 0.5).astype(int), prob)
    metrics = {"engine": "bert", "name": "Sentence-BERT (MiniLM-L6) + Logistic Regression", **m,
               "train_size": len(X_tr), "test_size": len(X_te), "train_seconds": round(time.time() - t0, 1),
               "features": int(E_tr.shape[1]),
               "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "dataset": info}
    _save("bert", clf, metrics)
    log(f"BERT: acc {m['accuracy']:.4f}  f1 {m['f1']:.4f}")
    return metrics


