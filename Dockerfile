#
# (c) 2018 Jared Allard <jaredallard@outlook.com>
#

FROM mhart/alpine-node:9

# Setup the core user
# for some reason ping has the GID we want -- so use that
RUN adduser -D -u 999 -G ping media

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

# Copy over the entry-point
COPY docker/docker-entrypoint /usr/bin/docker-entrypoint
RUN chmod +x /usr/bin/docker-entrypoint

# Weird state issues?
RUN rm -rf /stack && mkdir /stack && chown -R media:ping /stack && chmod -R 755 /stack

# Seperate package.json to reduce build time
COPY --chown=999:999 package.json /stack
USER media
RUN yarn

# Copy our service.
COPY --chown=999:999 . /stack
