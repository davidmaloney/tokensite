FROM node:20-alpine AS builder
WORKDIR /app

# Accept the Solana RPC URL at build time so Vite can bake it into the frontend.
ARG VITE_SOLANA_RPC_URL
ENV VITE_SOLANA_RPC_URL=$VITE_SOLANA_RPC_URL

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
