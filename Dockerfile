FROM otomi/tools:v1.4.24 as test

ENV APP_HOME=/home/app/stack

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

ARG SKIP_TESTS='false'
ENV CI=true
ENV ENV_DIR=$APP_HOME/env
ENV IN_DOCKER='1'
ENV VERBOSITY='2'

COPY --chown=app . .

RUN npm config set update-notifier false
RUN npm ci --ignore-scripts && npm run compile

RUN if [ "$SKIP_TESTS" = 'false' ]; then ln -s $APP_HOME/tests/fixtures env && npm test && rm $APP_HOME/env; fi

#-----------------------------
FROM otomi/tools:v1.4.24 as prod

ENV APP_HOME=/home/app/stack
ENV ENV_DIR=/home/app/stack/env
ENV IN_DOCKER='1'
ENV VERBOSITY='0'
ENV NODE_NO_WARNINGS='1'

RUN npm config set update-notifier false

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY --from=test /home/app/stack/dist /home/app/stack/dist
COPY --chown=app . .

RUN npm install --production --ignore-scripts

CMD ["dist/src/otomi.js"]