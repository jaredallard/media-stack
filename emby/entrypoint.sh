#!/bin/sh

set -e

INIT="/init"
CONFIG_DIR="/mnt/media-v1/emby"
MEDIA_DIR="/mnt/media-v1/production"

CONFIG="/config"
PRODUCTION="/mnt/media-v1/production"

export GID=999
export UID=999
export GIDLIST=999

addgroup -g 999 emby
adduser -u 999 -G emby -s /bin/sh -D emby

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
