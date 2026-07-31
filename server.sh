#!/usr/bin/env bash
set -e

PORT="${1:-3001}"

export PORT="$PORT"

echo "Starting Scale Finder on port $PORT..."
node server.js &
SERVER_PID=$!

# Wait for the server to be ready
for i in $(seq 1 20); do
  if curl -s "http://localhost:$PORT/" > /dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

URL="http://localhost:$PORT"

if command -v open &>/dev/null; then
  open "$URL"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
else
  echo ""
  echo "Server is running. Open your browser to: $URL"
fi

wait "$SERVER_PID"
