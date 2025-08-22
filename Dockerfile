#Step 1: Build the Angular app
FROM node:alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install -g @angular/cli
RUN npm install --save-dev @angular-devkit/build-angular

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build --prod

# Step 2: Serve the Angular app
FROM nginx:alpine

# Copy the built Angular app from the previous stage
COPY --from=build /app/dist/quanby-health-care/browser /usr/share/nginx/html

# NGINX configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port the app runs on
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
