"""Sentence-BERT embeddings (all-MiniLM-L6-v2) from whichever backend is installed.

fastembed (ONNX Runtime) is preferred: same model, a fraction of PyTorch's memory,
so it fits on small free servers. sentence-transformers is the fallback.
"""

import os
from pathlib import Path

import numpy as np

from .preprocess import clean_text

MODEL = "sentence-transformers/all-MiniLM-L6-v2"
MAX_CHARS = 1000  # MiniLM reads ~256 tokens; trimming keeps encoding fast
CACHE = os.getenv("FASTEMBED_CACHE", str(Path(__file__).resolve().parents[1] / "models" / "fastembed"))


def prepare(texts):
    return [clean_text(t)[:MAX_CHARS] or "empty" for t in texts]


class _FastEmbed:
    backend = "onnx"

    def __init__(self):
        from fastembed import TextEmbedding
        self.m = TextEmbedding(MODEL, cache_dir=CACHE, threads=int(os.getenv("EMBED_THREADS", "1")))

    def encode(self, texts, batch_size=64):
        v = np.asarray(list(self.m.embed(prepare(texts), batch_size=batch_size)), dtype=np.float32)
        n = np.linalg.norm(v, axis=1, keepdims=True)
        n[n == 0] = 1
        return v / n


class _SentenceTransformers:
    backend = "torch"

    def __init__(self):
        from sentence_transformers import SentenceTransformer
        self.m = SentenceTransformer("all-MiniLM-L6-v2")

    def encode(self, texts, batch_size=64):
        return self.m.encode(prepare(texts), batch_size=batch_size, show_progress_bar=False,
                             normalize_embeddings=True)


def available() -> bool:
    for mod in ("fastembed", "sentence_transformers"):
        try:
            __import__(mod)
            return True
        except ImportError:
            continue
    return False


def load():
    try:
        return _FastEmbed()
    except ImportError:
        return _SentenceTransformers()
