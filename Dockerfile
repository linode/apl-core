FROM node:14-slim as ci

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY package*.json ./
RUN npm install
COPY . .
COPY ./.cspell.json .

RUN npm run spellcheck

#-----------------------------
FROM otomi/tools:1.4.7 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/otomi"]