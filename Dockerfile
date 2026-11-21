# ── 1. Build the React frontend ──
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── 2. Python API (TF-IDF engine) that also serves the frontend ──
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 DISABLE_BERT=1
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY . .
COPY --from=web /web/dist frontend/dist
RUN mkdir -p backend/data
# Render provides $PORT; falls back to 7860 locally
CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-7860}"]
