# ── Perceptra UI — Multi-stage Production Build ──

# ── Stage 1: Build the Vite app ──
FROM node:18-alpine AS builder

WORKDIR /app

# Dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Accept build-time WS URL override
ARG VITE_WS_BASE_URL=ws://localhost:8000/ws/inference
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL

# Build the production bundle
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ──
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
