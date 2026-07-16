FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY prisma prisma

RUN npm ci

COPY tsconfig.base.json ./
COPY backend backend

RUN npm run build --workspace backend

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace", "backend"]
