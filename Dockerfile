FROM node:14-slim as build 

ARG SKIP_TESTS='false'
ENV EXIT_FAST='true'

# Necessary for node-gyp and some node modules 
RUN apt-get update && apt-get install --no-install-recommends autoconf libtool build-essential git python -y

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
FROM otomi/tools:1.4.8 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/otomi"]