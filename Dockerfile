FROM node:14-slim as build

ARG SKIP_TESTS='false'
ENV EXIT_FAST='true'

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY package*.json ./
COPY . .
COPY ./.cspell.json .
RUN cp -r .demo/ env/ 

RUN [ "$SKIP_TESTS" = 'false' ] && \
  npm install && \
  npm run spellcheck && \
  bin/validate-values.sh && \
  bin/validate-templates.sh || true

#-----------------------------
FROM bats/bats:latest as test

WORKDIR /tmp
COPY . .

RUN apk add curl git && \
  wget $(curl -s https://api.github.com/repos/mikefarah/yq/releases/latest | \
  grep browser_download_url | \
  grep linux_amd64 | cut -d '"' -f 4) -O /usr/bin/yq && \
  chmod +x /usr/bin/yq && \
  git clone https://github.com/ztombol/bats-support bin/tests/test_helper/bats-support && \
  git clone https://github.com/ztombol/bats-assert.git bin/tests/test_helper/bats-assert && \ 
  git clone https://github.com/ztombol/bats-file.git bin/tests/test_helper/bats-file

RUN bats bin/tests

#-----------------------------
FROM otomi/tools:1.4.8 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/otomi"]