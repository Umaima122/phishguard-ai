# ── 1. Build the React frontend ──
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── 2. Python API (TF-IDF + Sentence-BERT via ONNX) that also serves the frontend ──
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
    FASTEMBED_CACHE=/app/backend/models/fastembed \
    BERT_TRAIN_ON_BOOT=0
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY . .
COPY --from=web /web/dist frontend/dist
RUN mkdir -p backend/data

# Download MiniLM and train the BERT classifier once, at build time, so the small
# free server only has to run predictions. If this step fails the app still
# deploys with the TF-IDF engine.
RUN EMBED_THREADS=$(nproc) python backend/scripts/train.py --bert-only --csv "backend/data/emails_part*.csv.gz" \
    || echo "BERT training skipped; TF-IDF only"

# Render provides $PORT; falls back to 7860 locally
CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-7860}"]
