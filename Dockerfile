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

# Firebase config — baked into React bundle at build time
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_FIREBASE_PROJECT_ID
ARG REACT_APP_FIREBASE_STORAGE_BUCKET
ARG REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ARG REACT_APP_FIREBASE_APP_ID
ARG REACT_APP_FIREBASE_MEASUREMENT_ID
ENV REACT_APP_FIREBASE_API_KEY=$REACT_APP_FIREBASE_API_KEY
ENV REACT_APP_FIREBASE_AUTH_DOMAIN=$REACT_APP_FIREBASE_AUTH_DOMAIN
ENV REACT_APP_FIREBASE_PROJECT_ID=$REACT_APP_FIREBASE_PROJECT_ID
ENV REACT_APP_FIREBASE_STORAGE_BUCKET=$REACT_APP_FIREBASE_STORAGE_BUCKET
ENV REACT_APP_FIREBASE_MESSAGING_SENDER_ID=$REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ENV REACT_APP_FIREBASE_APP_ID=$REACT_APP_FIREBASE_APP_ID
ENV REACT_APP_FIREBASE_MEASUREMENT_ID=$REACT_APP_FIREBASE_MEASUREMENT_ID

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
