FROM apl-tools:latest AS ci

ENV APP_HOME=/home/app/stack

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

ARG SKIP_TESTS='false'
ENV NODE_ENV='test'
ENV CI=true
ENV ENV_DIR=$APP_HOME/env
ENV VERBOSITY='2'
ENV DISABLE_SYNC='1'
ENV NODE_PATH='dist'

COPY --chown=app . .

RUN npm config set update-notifier false
RUN npm ci --ignore-scripts && npm run compile

RUN set -e && \
    npm config set update-notifier false && \
    npm ci --ignore-scripts && \
    npm run compile

# Run tests with the CI-specific script that has proper Jest flags
RUN set -e && \
    if [ "$SKIP_TESTS" = 'false' ]; then \
        echo "Setting up test environment..." && \
        ln -s $APP_HOME/tests/fixtures env && \
        echo "Running CI tests..." && \
        npm run test:ci && \
        echo "Cleaning up test environment..." && \
        rm env && \
        echo "Tests completed successfully"; \
    else \
        echo "Skipping tests (SKIP_TESTS=true)"; \
    fi

# --------------- Cleanup
FROM ci AS clean

# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production

FROM apl-tools:latest  AS prod
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
