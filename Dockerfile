FROM node:alpine
LABEL Author="Charles Stover"
WORKDIR /var/www
COPY package.json yarn.lock ./
RUN yarn install
COPY index.js .
EXPOSE 80
CMD [ "node", "index.js" ]
