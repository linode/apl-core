# Base image carrying the toolchain (kubectl, helm, helmfile, sops, node, ...).
#
# It is built from tools/Dockerfile in this same repository -- see
# .github/workflows/otomi-tools-build-push.yaml, which publishes it as linode/apl-tools.
# The default below keeps the published image, so nothing changes for a normal build.
#
# Override it to build against a toolchain image you produce yourself, which removes the
# only build-time dependency on a Linode-published artifact:
#
#   docker build -t apl-tools-local:v3.0.1 ./tools
#   docker build --build-arg TOOLS_IMAGE=apl-tools-local:v3.0.1 -t apl-core-local:<tag> .
#
# tools/Dockerfile itself derives only from ubuntu plus upstream release tarballs, so a
# self-built toolchain contains no Linode-provided content.
ARG TOOLS_IMAGE=linode/apl-tools:v3.0.1

FROM ${TOOLS_IMAGE} AS ci

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

# Install dependencies before copying the source code to take advantage of Docker layer caching
COPY --chown=app package*.json ./
RUN npm config set update-notifier false
RUN npm ci --ignore-scripts

COPY --chown=app . .
RUN npm run compile
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

# ARG declared before the first FROM goes out of scope at each stage, so re-declare it here.
ARG TOOLS_IMAGE=linode/apl-tools:v3.0.1
FROM ${TOOLS_IMAGE} AS prod
ARG APPS_REVISION=''
# Repository Argo CD fetches charts/* from. It must hold the same commit the
# templates in this image came from -- see the APPS_REVISION note in SETUP.md.
# Overridable so a fork can serve charts that upstream does not have.
ARG APPS_REPO_URL='https://github.com/linode/apl-core.git'
ENV APP_HOME=/home/app/stack
ENV ENV_DIR=/home/app/stack/env
ENV VERBOSITY='0'
ENV NODE_NO_WARNINGS='1'
ENV NODE_PATH='dist'
ENV APPS_REVISION=$APPS_REVISION
ENV APPS_REPO_URL=$APPS_REPO_URL

RUN npm config set update-notifier false

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY --from=ci /home/app/stack/dist /home/app/stack/dist
COPY --from=clean /home/app/stack/node_modules /home/app/stack/node_modules
COPY --chown=app . .
ARG VERSION="0.0.0"
RUN npm version "$VERSION" --no-git-tag-version --allow-same-version


ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/src/operator/main.js"]
