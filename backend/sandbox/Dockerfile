# backend/sandbox/Dockerfile
# =============================================================================
# An OPTIONAL, slimmer image for the judge. The default engine uses the official
# `gcc:13` image (~1.2 GB) which "just works" but is large. This Debian-slim
# image installs only g++, so containers start faster and pull smaller.
#
# Build it once:
#   docker build -t mcp-judge:cpp backend/sandbox
# Then point the judge at it in backend/.env:
#   JUDGE_DOCKER_IMAGE=mcp-judge:cpp
#
# Note: we do NOT bake any user code into the image. User code is mounted in at
# run time (read-only) and compiled inside a throwaway container. The image is
# just "a box that contains a C++ compiler".
# =============================================================================

FROM debian:12-slim

# --no-install-recommends keeps the image lean; clean up apt lists afterward.
RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*

# The judge overrides the working dir and command at `docker run` time; this is
# just a sensible default.
WORKDIR /sandbox
CMD ["g++", "--version"]
