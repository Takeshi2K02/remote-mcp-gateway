FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are inlined into the client JS bundle at build
# time, not read at container startup - so the real backend URL has to be
# supplied here as a build-arg, not as a runtime env var on the Container
# App.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build

# output: "standalone" in next.config.ts makes `next build` emit a
# self-contained server (.next/standalone) with only the node_modules
# actually needed at runtime traced in - static assets and public/ are not
# included in it and must be copied in separately.
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
