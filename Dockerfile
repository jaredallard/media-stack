#
# (c) 2018 Jared Allard <jaredallard@outlook.com>
#

FROM node:9

# "static" stuff
ENTRYPOINT ["/usr/bin/docker-entrypoint"]
ENV DEBUG media:*
WORKDIR /stack

# Setup Repositories
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 816950D8; \
    echo "deb [arch=amd64] http://ppa.launchpad.net/stebbins/handbrake-git-snapshots/ubuntu xenial main" | tee /etc/apt/sources.list.d/handbrake.list; \
    echo "deb [arch=amd64] http://www.deb-multimedia.org jessie main non-free" | tee /etc/apt/sources.list.d/ffmpeg.list

# Install FFMPEG and Handbrake-cli
# IDK what's up with this insecure GPG key DL stuf
RUN wget -O key.dpkg http://www.deb-multimedia.org/pool/main/d/deb-multimedia-keyring/deb-multimedia-keyring_2016.8.1_all.deb; \
    dpkg -i key.dpkg; \
    rm key.dpkg; \
    apt-get update; \
    apt-get install -y ffmpeg handbrake-cli

# Install dumb-init
RUN wget -O /usr/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.1/dumb-init_1.2.1_amd64
RUN chmod +x /usr/bin/dumb-init

# Install redis-cli, so we can test redis
RUN apt-get install -y redis-tools

# Seperate package.json to reduce build time
COPY package.json /stack
RUN yarn

# Cophy over the entry-point
COPY docker/docker-entrypoint /usr/bin/docker-entrypoint
RUN chmod +x /usr/bin/docker-entrypoint

# Copy our service.
COPY . /stack
