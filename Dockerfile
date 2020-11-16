FROM node:14-slim as ci

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY package*.json ./
COPY . .
RUN npm install
COPY ./.cspell.json .
RUN npm run spellcheck

FROM otomi/tools:1.4.8 as test
ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .
RUN cp -r .demo/ env/ 

RUN bin/validate-values.sh
RUN EXIT_FAST=1 bin/validate-templates.sh
RUN EXIT_FAST=1 bin/validate-policies.sh

#-----------------------------
FROM otomi/tools:1.4.8 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/otomi"]