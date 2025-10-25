#!/bin/bash
# Run on VPS in project folder (mgnrega-app/infra)
# Usage: ./deploy.sh

set -e

# Pull latest images or build
docker-compose -f docker-compose.yml pull || true
docker-compose -f docker-compose.yml build

# Start
docker-compose -f docker-compose.yml up -d --remove-orphans

# Show logs tail
docker-compose -f docker-compose.yml logs -f --tail=50
