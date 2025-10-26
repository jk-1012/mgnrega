#!/bin/bash
# Initialize data for all districts
# Usage: ./init_data.sh [year-month]

set -e

YEAR_MONTH=${1:-$(date +%Y-%m)}

echo "========================================"
echo "  MGNREGA Data Initialization"
echo "========================================"
echo "Target Month: $YEAR_MONTH"
echo ""

# Check if backend is running
if ! curl -s http://localhost:8000/api/v1/ping > /dev/null; then
    echo "Error: Backend is not running. Start services first."
    exit 1
fi

# Get list of districts
echo "Fetching district list..."
districts=$(curl -s http://localhost:8000/api/v1/districts | jq -r '.[].district_code')
count=$(echo "$districts" | wc -l)

echo "Found $count districts"
echo ""

# Confirm before proceeding
read -p "Queue data fetch tasks for all $count districts? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Queue tasks
echo "Queueing tasks..."
success=0
failed=0

for district in $districts; do
    response=$(curl -s -X POST \
        "http://localhost:8000/api/v1/admin/trigger-refresh/$district?year_month=$YEAR_MONTH" \
        -H "Content-Type: application/json")

    if echo "$response" | jq -e '.status == "queued"' > /dev/null 2>&1; then
        ((success++))
        echo "✓ Queued: $district"
    else
        ((failed++))
        echo "✗ Failed: $district"
    fi

    # Small delay to avoid overwhelming the API
    sleep 0.1
done

echo ""
echo "========================================"
echo "  Summary"
echo "========================================"
echo "Successfully queued: $success"
echo "Failed: $failed"
echo ""
echo "Tasks are now being processed by Celery workers."
echo "Monitor progress with:"
echo "  docker-compose -f infra/docker-compose.yml logs -f worker"