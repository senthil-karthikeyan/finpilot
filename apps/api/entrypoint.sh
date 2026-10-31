#!/bin/sh
set -e

echo "=== FinPilot API Startup ==="
echo "Running database migrations..."
node dist/database/migrate.js || true

echo "Ensuring seed data is loaded..."
node dist/database/seed.js || true

echo "Starting NestJS API server on port 3001..."
exec node dist/main.js

