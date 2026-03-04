FROM node:20

ENV MONGO_DB_USERNAME=admin \
    MONGO_DB_PWD=password

COPY package*.json /app/

WORKDIR /app

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]