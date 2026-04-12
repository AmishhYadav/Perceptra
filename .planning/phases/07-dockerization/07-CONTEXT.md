# Phase 07: Dockerization & Deployment - Context

**Gathered:** April 2026
**Status:** Ready for planning
**Source:** Interaction Decisions

<domain>
## Phase Boundary

This phase introduces containerization primitives to the Perceptra system. The boundary covers isolating the Python FastAPI backend and the React UI frontend into separate deployable units natively orchestratable through Docker Compose.
</domain>

<decisions>
## Implementation Decisions

### A. Container Architecture
- **Decision**: Multi-container Docker Compose.
- **Details**: `docker-compose.yml` to orchestrate isolated `backend` (FastAPI) and `frontend` (React) services, guaranteeing modular deployment scale parameters.

### B. Frontend Serving Strategy
- **Decision**: NGINX Static Web Server.
- **Details**: Discard Node.js for production frontend serving. Build UI locally/in-container utilizing Vite's bundler, and push to an alpine-based Nginx instance serving HTML/JS/CSS assets with maximum bandwidth efficiency.

### C. Environment Focus
- **Decision**: Optimized Multi-stage Production orientation.
- **Details**: Implementation of rigorous `Dockerfile` techniques dropping redundant Python/Node build layers in favor of lightweight execution containers.
</decisions>

<canonical_refs>
## Canonical References
- `docker-compose.yml`
- `Dockerfile` (Backend specific)
- `frontend/Dockerfile` (Frontend specific)
- `frontend/nginx.conf`
</canonical_refs>
