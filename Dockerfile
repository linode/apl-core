FROM node:14-slim as ci

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY package*.json ./
RUN npm install
COPY . .
COPY ./.cspell.json .

RUN npm run lint:all

#-----------------------------
FROM otomi/tools:1.4.6 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

FROM ci as test

ARG CLOUD="google"
ARG CLUSTER="demo"
ARG ENV_DIR="./.demo"

COPY --from=build $APP_HOME $APP_HOME

RUN bin/lint.sh

FROM build as prod 

COPY --from=build $APP_HOME $APP_HOME

CMD ["bin/deploy.sh"]