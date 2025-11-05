FROM linode/apl-tools:v2.10.5 AS ci

ENV APP_HOME=/home/app/stack

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

ARG SKIP_TESTS='false'
ENV NODE_ENV='test'
ENV CI=true
ENV DIR=$APP_HOME/tests/fixtures
ENV VERBOSITY='2'
ENV DISABLE_SYNC='1'
ENV NODE_PATH='dist'

COPY --chown=app . .

RUN set -e && \
    npm config set update-notifier false && \
    npm ci --ignore-scripts && \
    npm run compile

# Run tests with the CI-specific script that has proper Jest flags
RUN set -e && \
    if [ "$SKIP_TESTS" = 'false' ]; then \
        echo "Running CI tests..." && \
        npm run test:ci && \
        echo "Tests completed successfully"; \
    else \
        echo "Skipping tests (SKIP_TESTS=true)"; \
    fi

# --------------- Cleanup
FROM ci AS clean

# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production

FROM linode/apl-tools:v2.10.5 AS prod
ARG APPS_REVISION=''
ENV APP_HOME=/home/app/stack
ENV ENV_DIR=/home/app/stack/env
ENV VERBOSITY='0'
ENV NODE_NO_WARNINGS='1'
ENV NODE_PATH='dist'
ENV APPS_REVISION=$APPS_REVISION

RUN npm config set update-notifier false

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY --from=ci /home/app/stack/dist /home/app/stack/dist
COPY --from=clean /home/app/stack/node_modules /home/app/stack/node_modules
COPY --chown=app . .

CMD ["dist/src/otomi.js"]
