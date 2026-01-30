# Variables
COMPOSE := docker-compose -f docker-compose.dev.yml
COMPOSE_PROD := docker-compose
COMPOSE_FLAGS := -d
LOGS_FLAGS := -f
CLEAN_FLAGS := -v
CLEAN_ALL_FLAGS := -v --rmi all
PRUNE_FLAGS := -f
PRUNE_ALL_FLAGS := -af

BACKEND_SERVICE := backend
FRONTEND_SERVICE := frontend
SHELL := /bin/sh

DB_PATH_DATA := data/activity_tracker.db
DB_PATH_ROOT := activity_tracker.db
TIMESTAMP := $(shell date +%Y%m%d_%H%M%S)

BACKEND_URL := http://localhost:8000/api/auth/me
FRONTEND_URL := http://localhost:3000/health

.PHONY: help build up down logs clean dev-up dev-down rebuild destroy logs-backend logs-frontend shell-backend shell-frontend fix-db

help:
	@echo "Activity Tracker - Docker Commands"
	@echo ""
	@echo "Development (Default):"
	@echo "  make build          - Build development containers"
	@echo "  make up             - Start development containers (hot-reload)"
	@echo "  make down           - Stop development containers"
	@echo "  make logs           - View development logs (all services)"
	@echo "  make logs-backend   - View backend logs only"
	@echo "  make logs-frontend  - View frontend logs only"
	@echo "  make restart        - Restart development containers"
	@echo "  make rebuild        - Rebuild and restart (down, build, up)"
	@echo ""
	@echo "Production:"
	@echo "  make prod-build     - Build production containers"
	@echo "  make prod-up        - Start production containers"
	@echo "  make prod-down      - Stop production containers"
	@echo "  make prod-logs      - View production logs"
	@echo "  make prod-restart   - Restart production containers"
	@echo "  make prod-rebuild   - Rebuild production and restart"
	@echo ""
	@echo "Maintenance:"
	@echo "  make ps             - Show running containers"
	@echo "  make clean          - Remove containers and volumes"
	@echo "  make destroy        - Remove everything (containers, volumes, images)"
	@echo "  make shell-backend  - Open shell in backend container"
	@echo "  make shell-frontend - Open shell in frontend container"
	@echo ""
	@echo "Database:"
	@echo "  make db-backup      - Backup database with timestamp"
	@echo "  make db-restore     - List available database backups"
	@echo "  make fix-db         - Fix database issues (recreate)"
	@echo ""
	@echo "Health:"
	@echo "  make health         - Check backend and frontend health"
	@echo ""

# Development commands (default)
build:
	$(COMPOSE) build

up:
	$(COMPOSE) up $(COMPOSE_FLAGS)

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs $(LOGS_FLAGS)

restart:
	$(COMPOSE) restart

rebuild:
	@echo "Rebuilding containers..."
	$(COMPOSE) down
	$(COMPOSE) build
	$(COMPOSE) up $(COMPOSE_FLAGS)
	@echo "Rebuild complete!"

# Production commands
prod-build:
	$(COMPOSE_PROD) build

prod-up:
	$(COMPOSE_PROD) up $(COMPOSE_FLAGS)

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs $(LOGS_FLAGS)

prod-restart:
	$(COMPOSE_PROD) restart

prod-rebuild:
	@echo "Rebuilding production containers..."
	$(COMPOSE_PROD) down
	$(COMPOSE_PROD) build
	$(COMPOSE_PROD) up $(COMPOSE_FLAGS)
	@echo "Production rebuild complete!"

# Utility commands
ps:
	$(COMPOSE) ps

logs-backend:
	$(COMPOSE) logs $(LOGS_FLAGS) $(BACKEND_SERVICE)

logs-frontend:
	$(COMPOSE) logs $(LOGS_FLAGS) $(FRONTEND_SERVICE)

shell-backend:
	$(COMPOSE) exec $(BACKEND_SERVICE) $(SHELL)

shell-frontend:
	$(COMPOSE) exec $(FRONTEND_SERVICE) $(SHELL)

clean:
	$(COMPOSE) down $(CLEAN_FLAGS)
	$(COMPOSE_PROD) down $(CLEAN_FLAGS)
	docker system prune $(PRUNE_FLAGS)

destroy: clean-all

clean-all:
	@echo "WARNING: This will remove all containers, volumes, and images!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(COMPOSE) down $(CLEAN_ALL_FLAGS); \
		$(COMPOSE_PROD) down $(CLEAN_ALL_FLAGS); \
		docker system prune $(PRUNE_ALL_FLAGS); \
		echo "Cleanup complete!"; \
	else \
		echo "Cancelled."; \
	fi

# Database commands
db-backup:
	@echo "Backing up database..."
	@if [ -f $(DB_PATH_DATA) ]; then \
		cp $(DB_PATH_DATA) $(DB_PATH_DATA).backup.$(TIMESTAMP); \
		echo "Backup created in data/ directory!"; \
	elif [ -f $(DB_PATH_ROOT) ]; then \
		cp $(DB_PATH_ROOT) $(DB_PATH_ROOT).backup.$(TIMESTAMP); \
		echo "Backup created!"; \
	else \
		echo "No database file found!"; \
	fi

db-restore:
	@echo "Available backups:"
	@ls -1 $(DB_PATH_DATA).backup.* 2>/dev/null || ls -1 $(DB_PATH_ROOT).backup.* 2>/dev/null || echo "No backups found"

fix-db:
	@echo "Fixing database issues..."
	@echo "This will stop containers and recreate the database."
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(COMPOSE) down; \
		rm -f $(DB_PATH_DATA); \
		$(COMPOSE) up $(COMPOSE_FLAGS); \
		echo "Database recreated!"; \
	else \
		echo "Cancelled."; \
	fi

# Health checks
health:
	@echo "Checking backend health..."
	@curl -f $(BACKEND_URL) || echo "Backend not responding"
	@echo ""
	@echo "Checking frontend health..."
	@curl -f $(FRONTEND_URL) || echo "Frontend not responding"
