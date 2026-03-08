#!/bin/bash

echo "Starting services..."

# Cleanup function
cleanup() {
  echo "Cleaning up..."
  if [ ! -z "$WORKER_PID" ]; then
    kill $WORKER_PID 2>/dev/null
  fi
  docker compose down
}

# Run cleanup on exit
trap cleanup EXIT

# Start Docker services
docker compose up -d mongodb redis

# Wait for services
echo "Waiting for services to be ready..."
sleep 5

# Start worker in background
npm run worker &
WORKER_PID=$!

# Wait for worker to connect
sleep 3

# Run tests
echo "Running tests..."
npm test

# Exit with test result
exit $?