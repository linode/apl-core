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
FROM otomi/tools:1.4.5 as prod

RUN mkdir -p $APP_HOME
COPY . .

CMD ["bin/deploy.sh"]