# syntax=docker/dockerfile:1.6
FROM ubuntu:20.04 as builder

ARG DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
# https://nodejs.org/en/download/
ARG NODE_VERSION=16

WORKDIR /

# Install all required packages in one layer
RUN apt-get update && apt-get install -y \
    curl \
    coreutils \
    apache2-utils \
    apt-transport-https \
    awscli \
    ca-certificates \
    gettext \
    git \
    gnupg \
    gnupg2 \
    groff \
    locales \
    nano \
    netcat \
    openssh-server \
    python3 \
    python3-pip \
    python3-setuptools \
    rlwrap \
    vim \
    rsync && \
    rm -rf /var/lib/apt/lists/* && \
    locale-gen en_US.UTF-8

# jq
RUN jq_download_url="https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-${TARGETARCH}" && \
    if [ "${TARGETARCH}" = "amd64" ]; then \
        jq_expected_checksum="5942c9b0934e510ee61eb3e30273f1b3fe2590df93933a93d7c58b81d19c8ff5"; \
    elif [ "${TARGETARCH}" = "arm64" ]; then \
        jq_expected_checksum="4dd2d8a0661df0b22f1bb9a1f9830f06b6f3b8f7d91211a1ef5d7c4f06a8b4a5"; \
    else \
        echo "Unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1; \
    fi && \
    curl -L "${jq_download_url}" --output /usr/bin/jq && \
    echo "${jq_expected_checksum}  /usr/bin/jq" | sha256sum -c - && \
    chmod +x /usr/bin/jq

# yq
COPY --from=mikefarah/yq:4 /usr/bin/yq /usr/bin/yq

RUN mkdir -p /home/app
RUN groupadd -r app &&\
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME

# Node.js installation
RUN set -uex && \
  mkdir -p /etc/apt/keyrings && \
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
  NODE_MAJOR=${NODE_VERSION} && \
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
  apt-get update && \
  apt-get install nodejs -y && \
  npm install -g ajv-cli@v3.3.0 json-dereference-cli@0.1.2 zx

# Copy binaries and scripts
COPY tools/download-binaries.sh .
RUN chmod +x download-binaries.sh && ./download-binaries.sh $TARGETARCH

FROM ubuntu:20.04 as final

RUN mkdir -p /home/app
RUN groupadd -r app &&\
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME

COPY --from=builder /usr/bin /usr/bin
COPY --from=builder /home/app/tools /home/app/tools

RUN chown -R app:app /home/app
USER app


CMD ["/bin/bash"]
