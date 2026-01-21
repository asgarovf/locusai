#!/bin/bash

# Port cleanup just in case
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "🚀 Starting Locus in Development Mode..."

# Run server with all passed arguments
bun run --cwd apps/api dev "$@" &
SERVER_PID=$!

# Run web app in foreground, arguments are NOT passed here
bun run --cwd apps/web dev &
WEB_PID=$!

# Handle shutdown
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $SERVER_PID
  kill $WEB_PID
  exit
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
