# backend/Dockerfile
# =============================================================================
# The image that runs the API IN PRODUCTION (e.g. on Render). It bundles Node
# AND g++ so the judge can compile C++ submissions.
#
# Important nuance: this is NOT the per-submission sandbox from Layer 6. Render's
# free tier can't run Docker-inside-Docker, so the judge runs in `host` mode —
# i.e. it shells out to g++ INSIDE this container. This container is itself the
# isolation boundary between you and other tenants on the host. The Layer 6
# dockerExecutor still ships in the repo and switches on wherever nested Docker
# is allowed (a VM you control), via EXECUTION_MODE=docker.
# =============================================================================

FROM node:20-bookworm-slim

# Install the C++ compiler the host-mode judge needs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so Docker can cache this layer when only src changes.
# `npm ci` uses the committed package-lock.json for a reproducible install.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the application source.
COPY . .

ENV NODE_ENV=production
ENV EXECUTION_MODE=host

# The host (Render) injects PORT; server.js reads process.env.PORT.
EXPOSE 4000
CMD ["npm", "start"]
