#!/usr/bin/env bash

RELEASE="staging"
TARGET="latest"

if [[ "$1" == "prod" ]]; then
  echo "WARNING: Building for prod..."
  TARGET="stable"
fi

docker build -t jaredallard/media-stack:$RELEASE . --compress
docker tag jaredallard/media-stack:$RELEASE jaredallard/media-stack:$TARGET
docker push jaredallard/media-stack:$RELEASE
docker push jaredallard/media-stack:$TARGET

echo "done"
