# Use specific version tags where possible to ensure consistent environments.
FROM otomi/tools:multi-arch as ci

ENV APP_HOME=/home/app/stack

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

ARG SKIP_TESTS='false'
ENV NODE_ENV='test'
ENV CI=true
ENV ENV_DIR=$APP_HOME/env
ENV IN_DOCKER='1'
ENV VERBOSITY='2'
ENV DISABLE_SYNC='1'
ENV NODE_PATH='dist'

# Copy all source files to the container
COPY --chown=app . .

# Configure npm and conditionally run commands
RUN npm config set update-notifier false
RUN npm ci --ignore-scripts $(if [ "$SKIP_TESTS" = 'false' ] && [ "${ARCH:-amd64}" != 'arm64' ]; then echo ''; else echo '--omit=dev'; fi) && npm run compile
RUN if [ "$SKIP_TESTS" = 'false' ] && [ "${ARCH:-amd64}" != 'arm64' ]; then \
        ln -s $APP_HOME/tests/fixtures env && \
        npm test && \
        npm prune --production && \
        rm env; \
    fi

# Switch to production
ENV NODE_ENV=production

# Using multi-arch as the final stage base image
FROM otomi/tools:multi-arch

ENV APP_HOME=/home/app/stack \
    ENV_DIR=/home/app/stack/env \
    IN_DOCKER=1 \
    VERBOSITY=0 \
    NODE_NO_WARNINGS=1 \
    NODE_PATH=dist

WORKDIR $APP_HOME

# Copy over the files
COPY --from=ci --chown=app $APP_HOME/dist /home/app/stack/dist
COPY --from=ci --chown=app $APP_HOME/node_modules /home/app/stack/node_modules
COPY --chown=app . .

CMD ["dist/src/otomi.js"]
