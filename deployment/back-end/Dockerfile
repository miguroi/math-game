FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY backend/ .

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]