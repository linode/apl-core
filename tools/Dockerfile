# syntax=docker/dockerfile:1.6
FROM ubuntu:24.04 AS builder

ARG DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
# https://github.com/helm/helm/tags
ARG HELM_VERSION=3.19.2
# https://github.com/databus23/helm-diff/releases
ARG HELM_DIFF_VERSION=3.14.1
# https://github.com/helmfile/helmfile/releases
ARG HELMFILE_VERSION=1.2.2
# https://nodejs.org/en/download/
ARG NODE_VERSION=24

ARG HELM_FILE_NAME=helm-v${HELM_VERSION}-linux-${TARGETARCH}.tar.gz
WORKDIR /

# Install all required packages in one layer
RUN apt-get update && apt-get install -y \
  curl \
  ca-certificates \
  git \
  locales && \
  rm -rf /var/lib/apt/lists/* && \
  locale-gen en_US.UTF-8

RUN mkdir -p /home/app
RUN groupadd -r app && \
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME

# helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp && mv /tmp/linux-${TARGETARCH}/helm helm && rm -rf /tmp/*
RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}

# helmfile
ADD https://github.com/helmfile/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz /tmp
RUN tar -zxvf /tmp/helmfile_${HELMFILE_VERSION}_linux_${TARGETARCH}.tar.gz -C /tmp && mv /tmp/helmfile helmfile

# node
# https://github.com/nodesource/distributions
RUN set -uex && \
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x -o nodesource_setup.sh && \
  bash nodesource_setup.sh && \
  apt-get update && \
  apt-get install -y nodejs

FROM ubuntu:24.04 AS final

RUN mkdir -p /home/app
RUN groupadd -r app &&\
  useradd -r -g app -d /home/app -s /sbin/nologin -c "Docker image user" app
ENV HOME=/home/app
ENV APP_HOME=/home/app/tools
RUN mkdir $APP_HOME
WORKDIR $APP_HOME
ENV PATH $PATH:$APP_HOME
ENV PATH="/usr/local/bin:${PATH}"

# Copy over binaries
COPY --from=builder /usr/bin /usr/bin
# Copy over node_modules (npm)
COPY --from=builder /usr/lib /usr/lib
# Copy over tools
COPY --from=builder $APP_HOME $APP_HOME
COPY --from=builder $HOME/.local/share/helm/plugins $HOME/.local/share/helm/plugins
# Copy over trust store
COPY --from=builder /etc/ssl /etc/ssl

RUN chown -R app:app /home/app
USER app

CMD ["/bin/bash"]
