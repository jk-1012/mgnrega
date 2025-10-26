#!/bin/bash
# Health check script for MGNREGA application
# Usage: ./health_check.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  MGNREGA System Health Check"
echo "========================================"
echo ""

# Check if docker-compose is running
echo "📦 Checking Docker Services..."
cd infra
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Docker services are running"
else
    echo -e "${RED}✗${NC} Docker services are not running"
    exit 1
fi

# Check individual services
services=("postgres" "redis" "backend" "frontend" "worker" "nginx")
for service in "${services[@]}"; do
    if docker-compose ps | grep $service | grep -q "Up"; then
        echo -e "  ${GREEN}✓${NC} $service"
    else
        echo -e "  ${RED}✗${NC} $service is down"
    fi
done

echo ""

# Check API health
echo "🔌 Checking API..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/ping)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓${NC} Backend API is responding (HTTP $response)"
else
    echo -e "${RED}✗${NC} Backend API error (HTTP $response)"
fi

# Check Redis
echo ""
echo "💾 Checking Redis..."
redis_ping=$(docker exec mgnrega_redis redis-cli ping 2>/dev/null || echo "FAILED")
if [ "$redis_ping" = "PONG" ]; then
    echo -e "${GREEN}✓${NC} Redis is responding"
    redis_keys=$(docker exec mgnrega_redis redis-cli DBSIZE | grep -o '[0-9]*')
    echo "  Cached keys: $redis_keys"
else
    echo -e "${RED}✗${NC} Redis connection failed"
fi

# Check PostgreSQL
echo ""
echo "🗄️  Checking PostgreSQL..."
if docker exec mgnrega_postgres pg_isready -U postgres &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL is ready"

    # Count districts
    district_count=$(docker exec mgnrega_postgres psql -U postgres -d mgnrega -t -c "SELECT COUNT(*) FROM districts;" 2>/dev/null | xargs)
    echo "  Districts in DB: $district_count"

    # Count monthly records
    monthly_count=$(docker exec mgnrega_postgres psql -U postgres -d mgnrega -t -c "SELECT COUNT(*) FROM district_monthly;" 2>/dev/null | xargs)
    echo "  Monthly records: $monthly_count"
else
    echo -e "${RED}✗${NC} PostgreSQL connection failed"
fi

# Check Celery workers
echo ""
echo "⚙️  Checking Celery Workers..."
active_tasks=$(docker exec mgnrega_worker celery -A app.tasks inspect active 2>/dev/null | grep -c "empty" || echo "0")
if [ "$active_tasks" -ge 0 ]; then
    echo -e "${GREEN}✓${NC} Celery workers are running"
    echo "  Active tasks: $active_tasks"
else
    echo -e "${YELLOW}⚠${NC} Could not check Celery status"
fi

# Check disk space
echo ""
echo "💿 Checking Disk Space..."
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    echo -e "${GREEN}✓${NC} Disk usage: ${disk_usage}%"
elif [ "$disk_usage" -lt 90 ]; then
    echo -e "${YELLOW}⚠${NC} Disk usage: ${disk_usage}% (Warning)"
else
    echo -e "${RED}✗${NC} Disk usage: ${disk_usage}% (Critical)"
fi

# Check memory
echo ""
echo "🧠 Checking Memory..."
mem_usage=$(free | grep Mem | awk '{printf("%.0f", ($3/$2) * 100)}')
if [ "$mem_usage" -lt 85 ]; then
    echo -e "${GREEN}✓${NC} Memory usage: ${mem_usage}%"
elif [ "$mem_usage" -lt 95 ]; then
    echo -e "${YELLOW}⚠${NC} Memory usage: ${mem_usage}% (Warning)"
else
    echo -e "${RED}✗${NC} Memory usage: ${mem_usage}% (Critical)"
fi

# Check frontend
echo ""
echo "🌐 Checking Frontend..."
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$frontend_response" = "200" ]; then
    echo -e "${GREEN}✓${NC} Frontend is responding (HTTP $frontend_response)"
else
    echo -e "${RED}✗${NC} Frontend error (HTTP $frontend_response)"
fi

# Check Nginx
echo ""
echo "🔀 Checking Nginx..."
nginx_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
if [ "$nginx_response" = "200" ]; then
    echo -e "${GREEN}✓${NC} Nginx is responding (HTTP $nginx_response)"
else
    echo -e "${RED}✗${NC} Nginx error (HTTP $nginx_response)"
fi

# Check recent logs for errors
echo ""
echo "📋 Recent Errors (last 50 lines)..."
error_count=$(docker-compose logs --tail=50 2>&1 | grep -i "error" | wc -l)
if [ "$error_count" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No recent errors found"
else
    echo -e "${YELLOW}⚠${NC} Found $error_count error messages in recent logs"
fi

# Summary
echo ""
echo "========================================"
echo "  Health Check Complete"
echo "========================================"

# Exit with appropriate code
if docker-compose ps | grep -q "Exit"; then
    exit 1
else
    exit 0
fi