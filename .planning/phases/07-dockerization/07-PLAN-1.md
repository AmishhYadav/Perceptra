---
phase: 7
plan: 1
title: "Environment & Reverse Proxy Core"
wave: 1
depends_on: []
files_modified:
  - frontend/.env
  - frontend/nginx.conf
  - frontend/src/store/useInferenceStore.ts
autonomous: true
requirements: []
---

# Plan 1: Environment & Reverse Proxy Core

## Goal
Implement the foundational network environment configurations ensuring the React Vite application correctly proxies routes when deployed statically and parses variables externally through a structured `.env` configuration.

## must_haves
- Refactor `useInferenceStore.ts` eliminating the hardcoded internal `localhost` socket. Map it directly to Vite's native `import.meta.env.VITE_WS_BASE_URL`.
- Generate `.env` allowing baseline injection mapping backwards into `ws://localhost:8000/ws/inference`.
- Establish `frontend/nginx.conf` exposing specifically native routing paths blocking static 404 router mismatch definitions.

## Tasks

<task id="7.1.1">
<title>Dynamic Vite Configurations</title>
<read_first>
- frontend/src/store/useInferenceStore.ts
- frontend/package.json
</read_first>
<action>
1. Update `useInferenceStore.ts`: Replace `const WS_BASE = 'ws://localhost:8000/ws/inference'` with dynamic initialization scaling across `import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws/inference'`.
2. Generate `frontend/.env` assigning standard local bindings explicitly for standard fallback behavior.
</action>
<acceptance_criteria>
- The JavaScript logic adapts implicitly into the environmental envelope.
</acceptance_criteria>
</task>

<task id="7.1.2">
<title>Nginx Routing Directives</title>
<action>
1. Generate `frontend/nginx.conf`.
2. Map `server { listen 80; ... }` explicit proxy behaviors pointing natively into `/usr/share/nginx/html`.
3. Construct the `location /` segment including the critical `try_files $uri $uri/ /index.html;` allowing client-side React routes zero disruptions on refresh.
</action>
<acceptance_criteria>
- A pristine Nginx execution block is established strictly mapping Vite routing vectors natively onto external connections.
</acceptance_criteria>
</task>

## Verification
```bash
# Execute local dev scripts and confirm network WebSocket payload succeeds over the newly dynamic .env boundary parameter.
```
