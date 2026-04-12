---
phase: 7
plan: 3
title: "Compose Orchestration"
wave: 3
depends_on: ["07-PLAN-2"]
files_modified:
  - docker-compose.yml
autonomous: true
requirements: []
---

# Plan 3: Compose Orchestration

## Goal
Bind isolated Docker configurations under strict Docker Compose coordination. Manage volume overrides natively passing dynamic network routing variables across the ecosystem connecting Nginx and Uvicorn logic seamlessly.

## must_haves
- Execute creation of root `docker-compose.yml`.
- Bridge generic backend API constraints matching exactly `8000:8000`.
- Setup dedicated explicit `.env` file parameters routing natively onto the frontend application.
- Expose exactly `5173:80` for immediate parallel backward-compatibility.

## Tasks

<task id="7.3.1">
<title>Docker Compose Bridge</title>
<action>
1. Establish root `docker-compose.yml`.
2. Define explicit `services`:
   - `api`:
     - Pulling build context against `.` directly.
     - Port 8000 exposure mapped internally.
   - `ui`:
     - Context pointing entirely into `/frontend`.
     - Environment block defining `- VITE_WS_BASE_URL=ws://localhost:8000/ws/inference` seamlessly masking complex network bridging.
     - Explicit mapping passing port 5173 backwards mapping cleanly mapping against NGINX internally.
3. Validate and enforce a local docker network parameter isolating container bindings exclusively to specific overlay domains keeping interference low.
</action>
<acceptance_criteria>
- The final command `docker-compose up` behaves seamlessly pulling 100% logic down correctly rendering both React states and socket payloads synchronously across environments.
</acceptance_criteria>
</task>

## Verification
```bash
docker-compose config
```
