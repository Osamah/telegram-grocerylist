FROM --platform=linux/amd64 node:current-alpine

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

CMD ["node", "index.js"]