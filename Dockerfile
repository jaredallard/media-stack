#
# (c) 2018 Jared Allard <jaredallard@outlook.com>
#

FROM mhart/alpine-node:9

# "static" stuff
ENTRYPOINT ["/usr/bin/docker-entrypoint"]
ENV DEBUG media:*
WORKDIR /stack

# Fix SSL. See https://github.com/Yelp/dumb-init/issues/73
RUN echo '@edge http://dl-cdn.alpinelinux.org/alpine/edge/main' >> /etc/apk/repositories \
 && echo '@edge http://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories \
 && echo '@edge http://dl-cdn.alpinelinux.org/alpine/edge/testing' >> /etc/apk/repositories \
 && apk update \
 &&   apk --no-cache add ca-certificates wget \
 &&   update-ca-certificates \
 &&   apk upgrade --no-cache --no-self-upgrade --available

# Install our deps
RUN apk add --no-cache ffmpeg@edge handbrake@edge dumb-init redis bash

# Seperate package.json to reduce build time
COPY package.json /stack
RUN yarn

# Cophy over the entry-point
COPY docker/docker-entrypoint /usr/bin/docker-entrypoint
RUN chmod +x /usr/bin/docker-entrypoint

# Copy our service.
COPY . /stack
