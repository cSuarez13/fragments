# Dockerfile for the Fragments microservice - Optimized version

# Stage 1: Dependencies
FROM node:22.13.0-slim AS dependencies

# Reduce npm spam when installing within Docker
ENV NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Stage 2: Production
FROM node:22.13.0-slim

LABEL maintainer="Claudia Suarez <csuarez-socorro@myseneca.ca>"
LABEL description="Fragments node.js microservice"

# Specify default environment variables
ENV PORT=8080 \
    NODE_ENV=production

# Create a non-root user
# RUN addgroup --system fragments && \
#     adduser --system --ingroup fragments fragments

WORKDIR /app

# Copy only production dependencies from the dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package.json files (needed by the application)
COPY package*.json ./

# Copy application source code
COPY ./src ./src

# Copy only the required HTPASSWD file from tests
COPY ./tests/.htpasswd ./tests/.htpasswd

# Set ownership to the non-root user
#RUN chown -R fragments:fragments /app

# Switch to the non-root user
#USER fragments

# Expose the port the app runs on
EXPOSE 8080 80

# Command to run the application
CMD ["node", "src/index.js"]
