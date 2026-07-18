FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations and install dependencies
COPY package*.json ./
RUN npm install

# Build frontend assets inside the container
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Create execution image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Copy backend source files
COPY engine/ ./engine/
COPY comparator/ ./comparator/
COPY search/ ./search/
COPY chatbot/ ./chatbot/
COPY bus/ ./bus/
COPY fare/ ./fare/
COPY auth/ ./auth/
COPY api/ ./api/
COPY data/ ./data/

# Copy compiled frontend build directory from builder
COPY --from=builder /app/frontend/build ./frontend/build

EXPOSE 3001

CMD ["node", "api/server.js"]
