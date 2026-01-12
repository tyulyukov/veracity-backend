# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN apk add --no-cache build-base vips-dev

RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node_modules/node-pg-migrate ./node_modules/node-pg-migrate
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx

COPY --from=builder /app/node_modules/.bin/node-pg-migrate ./node_modules/.bin/node-pg-migrate
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

USER node

CMD ["node", "dist/main.js"]
