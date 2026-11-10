#!/bin/sh
# Runs as root only long enough to make the data and upload folders writable
# by the unprivileged `node` user, then hands the process over to it for good.
#
# Why: on Render the persistent disk is mounted at runtime over /app/var, on
# top of whatever the image had there, so a chown in the Dockerfile cannot
# reach it — and a freshly attached disk can arrive owned by root. Without
# this the server could not create its SQLite file and would crash-loop.
#
# Named vmp-entrypoint.sh so it does not replace the node base image's own
# docker-entrypoint.sh.
set -e

if [ "$(id -u)" = "0" ]; then
  for dir in "${DATA_DIR:-/app/data}" "${UPLOAD_DIR:-/app/uploads}"; do
    mkdir -p "$dir"
    # Recursive, so a file left behind by a root shell is fixed on the next
    # start. Not fatal: a Docker Desktop bind mount (docker-compose.yml)
    # belongs to the host and is already writable — but say so when the
    # folder really is not, instead of letting the server fail later.
    if ! chown -R node:node "$dir" 2>/dev/null && ! su-exec node test -w "$dir"; then
      echo "vmp-entrypoint: $dir is not writable by the node user" >&2
    fi
  done
  exec su-exec node "$@"
fi

exec "$@"
