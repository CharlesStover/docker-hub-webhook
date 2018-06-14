FROM node:alpine
LABEL Author="Charles Stover"
WORKDIR /var/www
COPY package.json yarn.lock ./
RUN yarn install
COPY index.js .
CMD [ "node", "index.js" ]
