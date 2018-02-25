#!/bin/sh

set -e

INIT="/init"
CONFIG_DIR="/nfs/emby"
MEDIA_DIR="/nfs/production"

CONFIG="/config"
PRODUCTION="/production"

echo "info: wrapping emby to use our bind mounts around the nfs"

# DEBUG
mkdir -vp "$CONFIG_DIR" "$MEDIA_DIR"

# We have to create the DIRs for some reason
mkdir -vp "$CONFIG" "$PRODUCTION"

if [[ ! -e "$CONFIG_DIR" ]] || [[ ! -d "$MEDIA_DIR" ]]; then
  echo "err: media / config dir not found"
  exit 2
fi

echo "info: whoami `whoami`"

echo "bind: '$CONFIG_DIR' -> '$CONFIG'"
mount --bind "$CONFIG_DIR" "$CONFIG" || exit 1

echo "bind: '$MEDIA_DIR' -> '$PRODUCTION'"
mount --bind "$MEDIA_DIR" "$PRODUCTION" || exit 1

echo "trace: production"
ls "$PRODUCTION"

echo "trace: config"
ls "$CONFIG"

echo "info: running init"
exec /init
