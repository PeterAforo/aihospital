FROM node:20-alpine AS base

RUN npm install -g pnpm

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY . .

# Build
RUN pnpm run build || npx tsc

EXPOSE 5000

CMD ["node", "dist/main.js"]
