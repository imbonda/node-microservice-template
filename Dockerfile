#
# Stage 1: Build TypeScript code.
#
FROM node:18-alpine AS builder

# Install rsync.
RUN apk add --no-cache rsync

# Set working directory.
WORKDIR /microservice

# Install dependencies.
COPY package*.json ./
RUN npm ci

# Copy source code.
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code.
RUN npm run build

#
# Stage 2: Create production image.
#
FROM node:18-alpine

RUN apk add --no-cache \
    dumb-init

# Set working directory.
WORKDIR /microservice

# Copy production dependencies.
COPY --from=builder /microservice/package*.json ./
RUN npm ci --production

# Copy built TypeScript code.
COPY --from=builder /microservice/dist ./dist

# Runs "/usr/bin/dumb-init -- /my/script --with --args"
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
