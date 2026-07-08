FROM node:22-slim
WORKDIR /app

# Install dependencies (including tsx for TypeScript runtime)
COPY package*.json ./
RUN npm install

# Copy source (exclude node_modules, .env files, demo artifacts)
COPY agent/ ./agent/
COPY server/ ./server/
COPY types/ ./types/
COPY tsconfig.json ./
COPY known-sources.json ./

EXPOSE 3333
ENV PORT=3333
ENV NODE_ENV=production

# Run the audit oracle server (serves REST API for contract auditing)
CMD ["node", "--import", "tsx/esm", "server/api.ts"]
