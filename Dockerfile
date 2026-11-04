FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
