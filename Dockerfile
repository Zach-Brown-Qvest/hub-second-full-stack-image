FROM node:24-alpine
WORKDIR /app
COPY src ./src
ENV PORT=8080
EXPOSE 8080
CMD ["node", "src/server.mjs"]
