FROM node:12

ENV NODE_ENV development

WORKDIR /usr/src/app

COPY package.json .

RUN npm install

ADD . /usr/src/app
