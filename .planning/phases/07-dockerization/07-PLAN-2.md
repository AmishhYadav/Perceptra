---
phase: 7
plan: 2
title: "Multi-stage Containerization"
wave: 2
depends_on: ["07-PLAN-1"]
files_modified:
  - Dockerfile
  - frontend/Dockerfile
autonomous: true
requirements: []
---

# Plan 2: Multi-stage Containerization

## Goal
Establish distinct optimal Dockerfiles executing explicit separation of concerns: separating Python/ML execution logic entirely from Vite/Nginx frontend static routing mechanisms.

## must_haves
- Python `Dockerfile` executing `pip install` against `requirements.txt` independently guaranteeing distinct dependency layer caching over the backend. Implements copying bindings spanning `data/` weights and scripts.
- React `frontend/Dockerfile` leveraging native intermediate logic: compiling Javascript entirely through a `node` image, then copying the explicit `.dist/` footprint purely into an `nginx:alpine` runner saving hundreds of Mbs.

## Tasks

<task id="7.2.1">
<title>Backend Python Dockerfile</title>
<action>
1. Create root `Dockerfile`.
2. Specify explicit `FROM python:3.9-slim-bullseye`.
3. Force generic environment optimizations (`PYTHONDONTWRITEBYTECODE`, `PYTHONUNBUFFERED`).
4. Execute strictly caching dependency mechanisms utilizing `COPY requirements.txt .`.
5. Run `pip install`.
6. Copy `src/`, `data/weights/`, and core configurations natively.
7. Wrap explicitly on `CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]`.
</action>
<acceptance_criteria>
- The backend mounts safely ignoring local `.venv` dependencies utilizing clean isolated Python binaries mapping solely against ML inference specifications.
</acceptance_criteria>
</task>

<task id="7.2.2">
<title>Frontend Static Image Construction</title>
<action>
1. Create `frontend/Dockerfile`.
2. Establish stage 1: `FROM node:18-alpine AS builder`. Execute the dependency and `/npm run build` pipelines wrapping native output internally inside `/app/dist`.
3. Establish stage 2: `FROM nginx:alpine` inheriting minimal runtime context.
4. Purge standard unneeded default configuration assets blocking `nginx`.
5. Map specific mappings passing `COPY --from=builder /app/dist /usr/share/nginx/html`.
6. Final execution matching standard daemon behavior on port 80.
</action>
<acceptance_criteria>
- Multi-stage image construction completely shields final Nginx containers from Node/JS dependency pollution directly.
</acceptance_criteria>
</task>

## Verification
```bash
# Verify the build syntaxes locally execute without parsing overlap conflicts.
```
