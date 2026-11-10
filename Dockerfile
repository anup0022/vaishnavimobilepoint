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

# su-exec hands the process from root to `node` once the entrypoint has made
# the data folders writable — see vmp-entrypoint.sh.
RUN apk add --no-cache su-exec

# Litestream streams the SQLite database to object storage when
# LITESTREAM_REPLICA_URL is set (vmp-entrypoint.sh, litestream.yml). Pinned to
# a release and checked against its published SHA-256 for each architecture.
ARG LITESTREAM_VERSION=0.5.18
RUN set -eu; \
    case "$(uname -m)" in \
      x86_64)  arch=x86_64; sum=d3687b9fd0f2e9426bbd3da828429ff3f1dfc5c9b74d54fdf028e4ee510e7dea ;; \
      aarch64) arch=arm64;  sum=922a09e6a7ac67f2095571894dc6382e94e1dd4cdd9674883ddf1a8e74ab982d ;; \
      *) echo "no Litestream build for $(uname -m)" >&2; exit 1 ;; \
    esac; \
    wget -qO /tmp/litestream.tgz \
      "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-${arch}.tar.gz"; \
    echo "${sum}  /tmp/litestream.tgz" | sha256sum -c -; \
    tar -xzf /tmp/litestream.tgz -C /usr/local/bin litestream; \
    rm /tmp/litestream.tgz; \
    litestream version
COPY litestream.yml /etc/litestream.yml

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/ ./server/
COPY --from=client /app/client/dist ./client/dist
COPY vmp-entrypoint.sh /usr/local/bin/vmp-entrypoint.sh
RUN chmod +x /usr/local/bin/vmp-entrypoint.sh

# node:alpine ships an unprivileged `node` user, and the server always runs
# as it: running as root meant a remote-code bug would have had root inside
# the container. There is no USER line only because the entrypoint has one
# job to do as root first — making a freshly mounted disk writable — before
# it drops to `node` for good.
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

EXPOSE 8470

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8470)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["vmp-entrypoint.sh"]
CMD ["node", "server/index.js"]
