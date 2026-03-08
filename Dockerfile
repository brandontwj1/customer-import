FROM node:20

COPY package*.json /app/

WORKDIR /app

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]