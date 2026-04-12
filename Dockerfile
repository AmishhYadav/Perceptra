# ── Perceptra API — Multi-stage Production Build ──
FROM python:3.9-slim-bullseye

# Prevent .pyc files and enable unbuffered stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ── Layer 1: Dependencies (cached independently) ──
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Layer 2: Source code ──
COPY src/ src/

# ── Layer 3: Pre-trained weights & data ──
COPY data/weights/ data/weights/
COPY data/synthetic/ data/synthetic/

# Expose the API port
EXPOSE 8000

# Launch the inference server
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
