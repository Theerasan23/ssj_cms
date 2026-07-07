FROM node:22-alpine

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# install all deps (build needs tailwind + react-compiler babel plugin)
COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* is baked into the client bundle at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

EXPOSE 3021
CMD ["npm", "run", "start", "--", "-p", "3021"]
