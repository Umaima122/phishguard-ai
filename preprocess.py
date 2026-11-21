"""Text normalisation shared by training and inference.

Keep this module import-stable: the saved model pipeline references
`clean_text` by its import path, so moving or renaming it breaks old models.
"""

import re

_URL = re.compile(r"(https?://\S+|www\.\S+)", re.IGNORECASE)
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_MONEY = re.compile(r"[$£€]\s?\d[\d,]*(\.\d+)?")
_CARD = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")
_NUM = re.compile(r"\b\d+\b")
_NON_ALPHA = re.compile(r"[^a-z_\s]")
_SPACES = re.compile(r"\s+")


def clean_text(text) -> str:
    if not isinstance(text, str):
        text = "" if text is None else str(text)
    text = text.lower()
    text = _URL.sub(" urltoken ", text)
    text = _EMAIL.sub(" emailtoken ", text)
    text = _CARD.sub(" cardtoken ", text)
    text = _MONEY.sub(" moneytoken ", text)
    text = _NUM.sub(" numtoken ", text)
    text = _NON_ALPHA.sub(" ", text)
    return _SPACES.sub(" ", text).strip()


def combine(subject: str | None, body: str | None) -> str:
    """Model input: subject and body joined, so both carry signal."""
    return f"{subject or ''}\n{body or ''}".strip()
