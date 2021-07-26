FROM node:16-slim as npm

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

ARG SKIP_TESTS='false'
ENV CI=true

COPY . .
COPY ./.cspell.json .

RUN if [ "$SKIP_TESTS" = 'false' ]; then \
  npm install cspell && npm run spellcheck; fi

#-----------------------------
FROM otomi/tools:v1.4.19 as test

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

ARG SKIP_TESTS='false'
ENV CI=true

COPY --chown=app . .

RUN if [ "$SKIP_TESTS" = 'false' ]; then src/ci-tests.ts; fi

#-----------------------------
FROM otomi/tools:v1.4.19 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY --chown=app . .
RUN npm ci && npm run compile

CMD ["dist/otomi.js"]