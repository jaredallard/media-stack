#!/usr/bin/env bash
#
# Build Tricke from source @jakl.
#
# EXIT CODES:
#  1 - Failed to get deps
#  2 - Failed to compile
#  3 - Failed to install

echo " --> installing make deps"
apk add --no-cache --virtual build-dependencies \
make autoconf gcc g++ automake libtool libevent libevent-dev libtirpc-dev || exit 1

echo " --> cloning trickle"
git clone --depth=1 https://github.com/jaredallard/trickle /tmp/trickle
pushd "/tmp/trickle"

autoreconf -if
./configure

echo " --> running make"
make || exit 2
make install || exit 3

popd

echo " --> cleaning up..."
apk del --no-cache build-dependencies
rm -rf /tmp/trickle
