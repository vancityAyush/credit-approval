#!/bin/bash

# Function to check if the database is available
database_ready() {
  while ! mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &>/dev/null
  do
    echo "Waiting for the database to be available..."
    sleep 1
  done
  echo "Database is available."
}

# Check if the database is ready
database_ready

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate dev --name init

# # Generate Prisma Client
# echo "Generating Prisma Client..."
# npx prisma generate

# # Run Prisma migrations
# echo "Running Prisma migrations..."
# npx prisma migrate deploy

# Start the application
echo "Starting the application..."
exec "$@"
