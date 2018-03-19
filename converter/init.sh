#!/usr/bin/env bash
#
# Exit Codes:
#
# 2 - Failed to get serviceaccount (kubernetes)
# 1 - Unknown Error
#
# Attempt to associate with all Tinder pods currently available.
TOKEN_PATH="/var/run/secrets/kubernetes.io/serviceaccount/token"
CA_PATH="/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
NAMESPACE_PATH="/var/run/secrets/kubernetes.io/serviceaccount/namespace"
