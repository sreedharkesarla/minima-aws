# Multi-stage build for production-ready chat widget
# Stage 1: Build the Web Component
FROM node:18-slim AS builder

WORKDIR /app

# Configure npm for SSL issues
RUN npm config set strict-ssl false

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the Web Component
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy demo and embed pages
COPY --from=builder /app/demo.html /usr/share/nginx/html/
COPY --from=builder /app/chat-embed.html /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
