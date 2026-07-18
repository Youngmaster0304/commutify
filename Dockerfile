FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY engine/ ./engine/
COPY comparator/ ./comparator/
COPY search/ ./search/
COPY api/ ./api/
COPY data/ ./data/

RUN mkdir -p /app/frontend/build
COPY frontend/build/ ./frontend/build/

EXPOSE 3001

CMD ["node", "api/server.js"]
