FROM node:18-slim
WORKDIR /app
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "backend/server.js"]
