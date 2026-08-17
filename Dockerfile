FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

RUN mkdir -p /data

ENV HOST=0.0.0.0
ENV PORT=8787
ENV TASKS_OPS_DB=/data/tasks-ops.sqlite

VOLUME ["/data"]
EXPOSE 8787

CMD ["node", "dist/server.js"]
