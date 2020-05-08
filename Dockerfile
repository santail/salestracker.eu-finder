FROM node:10-alpine

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install --production
RUN npm install pm2 -g

COPY ./dist /usr/src/app

RUN ls -al -R

CMD [ "npm", "start:prod" ]
