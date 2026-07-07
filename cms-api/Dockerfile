FROM node:22-alpine

WORKDIR /app

# install production deps first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN chmod +x docker-entrypoint.sh && mkdir -p uploads

EXPOSE 3022

# entrypoint seeds the DB on first run, then starts the server
ENTRYPOINT ["./docker-entrypoint.sh"]
