#!/bin/bash

# Docker helper scripts for E-commerce Platform
# Usage: ./docker-scripts.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check for Docker Compose (both v1 and v2)
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        print_info "For Docker Desktop, Compose is included. For Linux, install docker-compose-plugin."
        exit 1
    fi
}

# Development environment commands
dev_up() {
    print_info "Starting development environment..."
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml up -d
    print_success "Development environment started!"
    print_info "API available at: http://localhost:8080"
    print_info "Swagger UI at: http://localhost:8080/api-docs"
    print_info "MongoDB at: localhost:27017"
    print_info "Redis at: localhost:6379"
}

dev_down() {
    print_info "Stopping development environment..."
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml down
    print_success "Development environment stopped!"
}

dev_logs() {
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml logs -f
}

dev_build() {
    print_info "Building development environment..."
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
    print_success "Development environment built!"
}

# Production environment commands
prod_up() {
    print_warning "Ensure production environment variables are set!"
    print_info "Starting production environment..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d
    print_success "Production environment started!"
    print_info "API available at: http://localhost:8080"
}

prod_down() {
    print_info "Stopping production environment..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down
    print_success "Production environment stopped!"
}

prod_logs() {
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f
}

prod_build() {
    print_info "Building production environment..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build --no-cache
    print_success "Production environment built!"
}

# Utility commands
clean() {
    print_info "Cleaning up Docker resources..."
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed!"
}

status() {
    print_info "Docker containers status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

logs() {
    local service=${2:-app}
    print_info "Showing logs for service: $service"
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml logs -f $service
}

restart() {
    local service=${2:-app}
    print_info "Restarting service: $service"
    $DOCKER_COMPOSE_CMD -f docker-compose.yml -f docker-compose.dev.yml restart $service
    print_success "Service $service restarted!"
}

# Main command handler
case "${1:-help}" in
    "dev-up"|"dev")
        check_docker
        dev_up
        ;;
    "dev-down"|"dev-stop")
        check_docker
        dev_down
        ;;
    "dev-logs")
        check_docker
        dev_logs
        ;;
    "dev-build")
        check_docker
        dev_build
        ;;
    "prod-up"|"prod")
        check_docker
        prod_up
        ;;
    "prod-down"|"prod-stop")
        check_docker
        prod_down
        ;;
    "prod-logs")
        check_docker
        prod_logs
        ;;
    "prod-build")
        check_docker
        prod_build
        ;;
    "clean")
        check_docker
        clean
        ;;
    "status")
        check_docker
        status
        ;;
    "logs")
        check_docker
        logs "$@"
        ;;
    "restart")
        check_docker
        restart "$@"
        ;;
    "help"|*)
        echo "E-commerce Platform Docker Scripts"
        echo ""
        echo "Development Commands:"
        echo "  ./docker-scripts.sh dev-up        Start development environment"
        echo "  ./docker-scripts.sh dev-down      Stop development environment"
        echo "  ./docker-scripts.sh dev-logs      Show development logs"
        echo "  ./docker-scripts.sh dev-build     Build development environment"
        echo ""
        echo "Production Commands:"
        echo "  ./docker-scripts.sh prod-up       Start production environment"
        echo "  ./docker-scripts.sh prod-down     Stop production environment"
        echo "  ./docker-scripts.sh prod-logs     Show production logs"
        echo "  ./docker-scripts.sh prod-build    Build production environment"
        echo ""
        echo "Utility Commands:"
        echo "  ./docker-scripts.sh status        Show container status"
        echo "  ./docker-scripts.sh logs [service] Show logs for service (default: app)"
        echo "  ./docker-scripts.sh restart [service] Restart service (default: app)"
        echo "  ./docker-scripts.sh clean         Clean up all Docker resources"
        echo "  ./docker-scripts.sh help          Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./docker-scripts.sh dev-up"
        echo "  ./docker-scripts.sh logs mongodb"
        echo "  ./docker-scripts.sh restart app"
        ;;
esac