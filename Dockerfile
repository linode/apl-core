FROM node:14-slim as npm

ARG SKIP_TESTS='false'
ENV CI=true

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .
COPY ./.cspell.json .

RUN if [ "$SKIP_TESTS" = 'false' ]; then \
  npm install cspell && npm run spellcheck; fi

#-----------------------------
FROM otomi/tools:1.4.10 as prod

ARG SKIP_TESTS='false'
ENV CI=true

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

RUN if [ "$SKIP_TESTS" = 'false' ]; then \
  cp -r .demo/ env/ && \
  bin/validate-values.sh && \
  bin/validate-templates.sh && \
  rm -rf env/*; fi

CMD ["bin/otomi"]