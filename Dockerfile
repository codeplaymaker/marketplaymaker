FROM node:20-alpine AS builder

WORKDIR /app

# Install root dependencies (including devDeps for craco/tailwind/postcss)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build React
COPY src/ ./src/
COPY public/ ./public/
COPY craco.config.js postcss.config.js tailwind.config.js ./
ENV SKIP_PREFLIGHT_CHECK=true
ENV FAST_REFRESH=false
ENV GENERATE_SOURCEMAP=false
ENV CI=false
RUN npm run build && ls -la build/

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy React build
COPY --from=builder /app/build ./build

# Install bot dependencies
COPY bot/package.json ./bot/
RUN cd bot && npm install --omit=dev

# Copy bot source
COPY bot/ ./bot/

# Railway injects PORT
EXPOSE ${PORT:-4000}

CMD ["node", "bot/server.js"]
