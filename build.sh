#!/usr/bin/env bash

docker build -t jaredallard/media-stack:v1.0.0 .
docker tag jaredallard/media-stack:v1.0.0 jaredallard/media-stack:latest
docker push jaredallard/media-stack:v1.0.0 
docker push jaredallard/media-stack:latest

echo "done"
