# PhishGuard AI

> Render free-tier build: TF-IDF plus Sentence-BERT running on ONNX Runtime (fastembed), trained during the Docker build.

**Think Before You Click. Let AI Investigate.**
An AI-powered phishing email detection and cybersecurity awareness platform.

Developed by Umaima Qureshi.

## What it does

- **Two ML engines** trained on the same 80/20 split:
  - TF-IDF + Logistic Regression (ships pre-trained, explains its score word by word)
  - Sentence-BERT (`all-MiniLM-L6-v2`) + Logistic Regression (trains on first boot)
  - **Compare** mode runs both side by side
- **Rule-based warning indicators**: urgency, credential requests, prize bait, attachments, secrecy
- **Static URL inspection**: look-alike domains, IP hosts, punycode, shorteners, risky TLDs. Links are never opened
- **Sender analysis**: brands on free webmail, look-alike domains, sender/link domain mismatch
- **Downloadable HTML security reports**
- **Threat Intelligence dashboard** with charts and live model metrics (confusion matrix, precision, recall, F1)
- **History** in SQLite, opt-in per analysis; stores a short preview only, never the full email
- **Awareness Center** with lessons and a scored quiz

## Model performance (TF-IDF, held-out test set)

Dataset: `Phishing_Email.csv` (Kaggle), 18,650 rows → 17,105 after removing empty rows and 982 duplicates.
Duplicates are removed **before** splitting so no email appears in both train and test.

| Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|
| 98.57% | 97.76% | 98.45% | 98.10% | 99.87% |

Tested on 3,421 emails: 29 false positives, 20 false negatives. BERT metrics appear in the dashboard once it finishes training.

## Project structure

```
backend/
  app/
    main.py          FastAPI routes; also serves the React build
    engines.py       TF-IDF + BERT engines, per-word explanations
    training.py      Training for both engines
    dataset.py       Loading, cleaning, de-duplication
    preprocess.py    Shared text normalisation
    indicators.py    Rules, sender analysis, threat level, explanations
    url_checker.py   Static URL inspection
    db.py            SQLite history
  models/            tfidf.joblib + metrics (bert.joblib created at runtime)
  scripts/train.py   Retrain from the command line
frontend/            React + Vite + TypeScript + Tailwind + Framer Motion + Recharts
Dockerfile           Builds the frontend, then runs the API on port 7860
Phishing_Email.csv   Training data
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status and metrics for each engine |
| POST | `/api/analyze` | `{subject, sender, body, engine: "tfidf" \| "bert" \| "compare", save_to_history}` |
| POST | `/api/url` | `{url}` static inspection |
| GET | `/api/history?q=&classification=&level=` | Saved analyses |
| GET/DELETE | `/api/history/{id}` | One record |
| DELETE | `/api/history` | Clear all |
| GET | `/api/stats` | Dashboard aggregates |

Interactive docs: `/docs`.

## Run locally

```bash
# Backend
python -m venv venv && venv\Scripts\activate          # Windows (source venv/bin/activate on Mac/Linux)
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --port 7860 --reload

# Frontend (second terminal; proxies /api to :7860)
cd frontend && npm install && npm run dev
```

Retrain: `python backend/scripts/train.py` (add `--bert` for the Sentence-BERT model too).

If the backend is unreachable, the frontend switches to a clearly labelled **Demo mode** that uses a browser heuristic, never the ML model.

## Notes

- Model scores are estimates, not guaranteed probabilities.
- Free Spaces storage is reset on restart, so history is cleared too. For persistent history, enable Persistent Storage and set the variable `PHISHGUARD_DB=/data/history.db`.
- Set `DISABLE_BERT=1` to run with the TF-IDF engine only.

## Deploy free on Render

1. Push this folder to a GitHub repo.
2. render.com → **New** → **Blueprint** → pick the repo (uses `render.yaml`), or **New** → **Web Service** → pick the repo → Runtime **Docker** → Instance **Free**.
3. Deploy. Your app will be at `https://<name>.onrender.com`.

The free tier sleeps after 15 minutes without traffic (about a minute to wake) and its storage resets on restart, so saved history is temporary.
