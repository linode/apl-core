# Token-free build of apl-tasks with the Vikunja operator.
#
# apl-tasks' own Dockerfile runs `npm ci` against GitHub Packages, which needs an
# NPM_TOKEN with read:packages -- GitHub Packages requires auth even for public
# packages. The published linode/apl-tasks:main image already carries a resolved
# node_modules including @linode/*, so we borrow it instead of resolving again.
# Only the compiler and its @types come from public npm.

FROM docker.io/linode/apl-tasks:main AS deps

FROM node:22.21.1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# jest.config.ts is not optional here. tsconfig's `include` lists it alongside ./src/**/*.ts, and
# tsc infers rootDir from the common ancestor of the files it actually finds. Without it rootDir
# collapses to src/ and the output lands in dist/operators/ instead of dist/src/operators/ --
# with tsc still exiting 0. `operator:vikunja` then points at a path that does not exist.
COPY package.json tsconfig.json jest.config.ts ./
COPY src ./src
# --no-package-lock stops npm from re-resolving the @linode deps already present.
RUN npm install --no-package-lock --no-audit --no-fund \
      typescript@5.9.3 \
      @types/node@24.10.0 @types/lodash@4.17.20 @types/async-retry@1.4.9 \
      @types/express@5.0.5 @types/js-yaml@4.0.9
RUN npx tsc \
 && cp src/operators/harbor/harbor-full-robot-system-permissions.json dist/src/operators/harbor/
RUN test -f dist/src/operators/vikunja/vikunja.js

FROM docker.io/linode/apl-tasks:main
USER root
COPY --from=build /app/dist /app/dist
COPY package.json /app/package.json
USER node
