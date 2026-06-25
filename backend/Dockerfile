FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build
RUN npm prune --omit=dev

ENV PORT=3000

CMD ["npm", "run", "start"]
