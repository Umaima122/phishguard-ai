"""Train the PhishGuard models.

    python backend/scripts/train.py               # TF-IDF (seconds)
    python backend/scripts/train.py --bert        # TF-IDF + Sentence-BERT
    python backend/scripts/train.py --bert-only   # Sentence-BERT only (used in the Docker build)
    python backend/scripts/train.py --csv path    # custom dataset
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.training import train_bert, train_tfidf  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("--csv")
p.add_argument("--bert", action="store_true")
p.add_argument("--bert-only", action="store_true")
a = p.parse_args()
if not a.bert_only:
    train_tfidf(a.csv)
if a.bert or a.bert_only:
    train_bert(a.csv)
