FROM otomi/tools:1.4.5 as build

ENV APP_HOME=/home/app/stack

RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY . .

FROM build as test

ARG CLOUD="google"
ARG CLUSTER="demo"
ARG ENV_DIR="./.demo"

COPY --from=build $APP_HOME $APP_HOME

RUN bin/lint.sh

FROM build as prod 

COPY --from=build $APP_HOME $APP_HOME

CMD ["bin/deploy.sh"]