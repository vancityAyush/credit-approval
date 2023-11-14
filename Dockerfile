# Use the Node.js image
FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the Node.js dependencies
RUN npm install

# Install the MySQL client tools
RUN apt-get update && apt-get install -y default-mysql-client

# Copy the rest of the application files
COPY . .

EXPOSE 5000

# Set the entrypoint
CMD ["./entrypoint.sh"]
