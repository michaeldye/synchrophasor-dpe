FROM node:6.9.5-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app

# Install Node.js dependencies
RUN apk add --no-cache git && \
    npm install && \
    apk del git

EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]
