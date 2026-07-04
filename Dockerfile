# Step 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install all dependencies (needed for compilation)
RUN npm install

# Copy the rest of the application files
COPY . .

# Run compilation for frontend assets and backend server bundling
RUN npm run build

# Step 2: Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Configure environmental variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package definition files to runner
COPY package*.json ./

# Install only essential production dependencies to keep the image slim
RUN npm install --omit=dev

# Copy compiled files and bundle from builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Command to launch the full-stack server
CMD ["npm", "run", "start"]
