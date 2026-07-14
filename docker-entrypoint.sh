#!/bin/sh
set -e

# Default to Next standalone server if no command is provided.
if [ "$#" -eq 0 ]; then
  set -- node server.js
fi

# Railway volume mounts can be owned by root. If running as root, reconcile
# ownership first and then drop to the unprivileged runtime user.
if [ "$(id -u)" -eq 0 ]; then
  if [ -n "$RAILWAY_VOLUME_MOUNT_PATH" ]; then
    mkdir -p "$RAILWAY_VOLUME_MOUNT_PATH"
    chown -R nextjs:nodejs "$RAILWAY_VOLUME_MOUNT_PATH" || true
  fi

  exec su nextjs -s /bin/sh -c 'exec "$@"' -- "$@"
fi

exec "$@"
