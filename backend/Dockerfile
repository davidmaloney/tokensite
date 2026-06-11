FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ sqlite
RUN npm install -g pm2
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p /data
EXPOSE 4000
CMD ["pm2-runtime", "src/server.js", "-i", "max"]
