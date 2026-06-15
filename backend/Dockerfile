FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN npm install -g pm2
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["pm2-runtime", "src/server.js", "-i", "max"]
