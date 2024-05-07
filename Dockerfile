FROM otomi/tools:multi-arch

ENV APP_HOME=/home/app/stack
ENV ENV_DIR=/home/app/stack/env
ENV IN_DOCKER='1'
ENV VERBOSITY='0'
ENV NODE_NO_WARNINGS='1'
ENV NODE_PATH='dist'

RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY --chown=app . .

CMD ["dist/src/otomi.js"]
