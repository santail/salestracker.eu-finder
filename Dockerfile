FROM node:10-alpine

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/

RUN npm install --production
RUN npm install pm2 -g

RUN pm2 link erah4c4xr4hrh8c v9mu2241ctrmk0p

ENV PM2_PUBLIC_KEY v9mu2241ctrmk0p
ENV PM2_SECRET_KEY erah4c4xr4hrh8c

COPY ./dist /usr/src/app

RUN ls -al -R

CMD ["pm2-runtime", "index.js"]
