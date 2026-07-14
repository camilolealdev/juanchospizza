FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=nodejs:nodejs server ./server
COPY --chown=nodejs:nodejs --from=build /app/dist ./dist
USER nodejs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1
CMD ["node", "server/index.js"]