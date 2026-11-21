"""Load and clean the labelled email dataset used by both training scripts."""

from pathlib import Path

import pandas as pd

from .preprocess import clean_text

ROOT = Path(__file__).resolve().parents[2]  # repo root
CANDIDATES = ["Phishing_Email.csv", "backend/data/emails_part*.csv.gz", "phishing_email.csv", "emails.csv", "data/Phishing_Email.csv",
              "backend/data/Phishing_Email.csv", "data/emails.csv"]
TEXT_COLS = ["Email Text", "email_text", "text", "body", "Body", "content"]
LABEL_COLS = ["Email Type", "label", "Label", "type", "class"]
LABEL_MAP = {"phishing email": 1, "phishing": 1, "spam": 1, "1": 1,
             "safe email": 0, "safe": 0, "legitimate": 0, "ham": 0, "0": 0}


def find_dataset(explicit: str | None = None) -> Path | None:
    for c in ([explicit] if explicit else CANDIDATES):
        p = Path(c) if Path(c).is_absolute() or explicit else ROOT / c
        if "*" in p.name:
            if sorted(p.parent.glob(p.name)):
                return p
        elif p.exists():
            return p
    return None


def _read(path: Path) -> pd.DataFrame:
    """Read one CSV, or every file matching a glob like emails_part*.csv.gz."""
    files = sorted(path.parent.glob(path.name)) if "*" in path.name else [path]
    frames = []
    for f in files:
        try:
            frames.append(pd.read_csv(f, on_bad_lines="skip"))
        except UnicodeDecodeError:
            frames.append(pd.read_csv(f, on_bad_lines="skip", encoding="latin-1"))
    return pd.concat(frames, ignore_index=True)


def load(path: Path) -> tuple[pd.DataFrame, dict]:
    df = _read(path)
    text_col = next((c for c in TEXT_COLS if c in df.columns), None)
    label_col = next((c for c in LABEL_COLS if c in df.columns), None)
    if not text_col or not label_col:
        raise ValueError(f"Need a text and a label column; found {list(df.columns)}. "
                         "(Feature-only files like email_phishing_data.csv can't train a text model.)")
    raw_rows = len(df)
    df = pd.DataFrame({"text": df[text_col].fillna("").astype(str),
                       "label": df[label_col].astype(str).str.strip().str.lower().map(LABEL_MAP)})
    df = df.dropna(subset=["label"])
    df["label"] = df["label"].astype(int)
    df["clean"] = df["text"].map(clean_text)
    # Drop empty / placeholder rows (the Kaggle file has many literal "empty" emails)
    df = df[(df["clean"].str.len() >= 15) & (df["clean"] != "empty")]
    before = len(df)
    # Exact duplicates after normalisation would leak between train and test
    df = df.drop_duplicates(subset="clean").reset_index(drop=True)
    info = {"file": path.name, "raw_rows": raw_rows, "usable_rows": len(df),
            "duplicates_removed": before - len(df),
            "phishing": int(df["label"].sum()), "legitimate": int((df["label"] == 0).sum())}
    return df, info
