FROM node:slim as ci

RUN apk --no-cache add make gcc g++ python git jq

ENV APP_HOME=/home/app/stack
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run lint:all

#-----------------------------
FROM otomi/tools:1.4.5 as prod

RUN mkdir $APP_HOME
COPY . .

CMD ["bin/deploy.sh"]