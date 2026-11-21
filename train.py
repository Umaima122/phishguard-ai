"""Train the PhishGuard models.

    python backend/scripts/train.py                 # TF-IDF (fast, seconds)
    python backend/scripts/train.py --bert          # also Sentence-BERT (needs sentence-transformers)
    python backend/scripts/train.py --csv path.csv  # custom dataset
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.training import train_bert, train_tfidf  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("--csv")
p.add_argument("--bert", action="store_true")
a = p.parse_args()
train_tfidf(a.csv)
if a.bert:
    train_bert(a.csv)
