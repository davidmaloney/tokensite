FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ sqlite
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p /data
EXPOSE 4000
CMD ["node", "src/server.js"]
