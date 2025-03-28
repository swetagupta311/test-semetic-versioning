FROM node:20.10.0-bullseye

WORKDIR /app

COPY ./package.json ./
RUN npm install

COPY ./ ./

ENTRYPOINT [ "node" ]
CMD [ "/app/src/app.js" ]