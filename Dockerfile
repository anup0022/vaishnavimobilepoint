# ---------- stage 1: build the React client ----------
FROM node:24-alpine AS client

WORKDIR /app/client
COPY client/package.json ./
RUN npm install --no-audit --no-fund

COPY client/ ./
RUN npm run build

# ---------- stage 2: runtime ----------
FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/ ./server/
COPY --from=client /app/client/dist ./client/dist

# node:alpine ships an unprivileged `node` user. Running as root meant a
# remote-code bug would have had root inside the container.
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app
USER node

EXPOSE 8470

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8470)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
