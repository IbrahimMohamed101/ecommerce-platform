#!/bin/bash

echo "🧹 Cleaning up your system..."

# Kill all Node.js processes
echo "➡️ Stopping Node.js processes..."
sudo pkill -f node 2>/dev/null

# Stop all Docker containers
echo "➡️ Stopping Docker containers..."
docker ps -q | xargs -r docker stop

# Stop Redis
echo "➡️ Stopping Redis service..."
sudo systemctl stop redis 2>/dev/null

# Stop PostgreSQL
echo "➡️ Stopping PostgreSQL service..."
sudo systemctl stop postgresql 2>/dev/null

echo "✅ Cleanup complete! All Node.js, Docker, Redis, and Postgres stopped."
