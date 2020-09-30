FROM node:13.10.1-alpine as dev

RUN apk --no-cache add make gcc g++ python git jq

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run lint:all

FROM otomi/tools:1.4.5 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/deploy.sh"]