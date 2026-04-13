FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy bot source
COPY . .

# Ensure logs directory exists
RUN mkdir -p /app/logs

EXPOSE 4000

CMD ["node", "server.js"]
