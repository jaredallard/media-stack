#!/usr/bin/env bash

echo "creating secret 'media-config' from ../config/config.yaml"
kubectl delete secret media-config
kubectl create secret generic media-config --from-file="config.yaml=../config/config.yaml"
