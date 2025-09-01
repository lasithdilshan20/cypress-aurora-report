# Multi-stage build for optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/dashboard/package*.json ./src/dashboard/

# Install dependencies
RUN npm ci --only=production

# Install dashboard dependencies
RUN cd src/dashboard && npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aurora -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=aurora:nodejs /app/dist ./dist
COPY --from=builder --chown=aurora:nodejs /app/src/dashboard/dist ./src/dashboard/dist
COPY --from=builder --chown=aurora:nodejs /app/package*.json ./
COPY --from=builder --chown=aurora:nodejs /app/node_modules ./node_modules

# Create directories for data persistence
RUN mkdir -p /app/aurora-reports/screenshots && \
    mkdir -p /app/aurora-reports/backups && \
    chown -R aurora:nodejs /app/aurora-reports

# Expose port
EXPOSE 4200

# Switch to non-root user
USER aurora

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 4200, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["node", "dist/server/index.js"]