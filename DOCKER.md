# Docker Setup for Activity Tracker

This guide explains how to run the Activity Tracker application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 1.29+

## Quick Start

### 1. Build and Start the Application

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 2. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 3. Stop the Application

```bash
# Stop and remove containers
docker-compose down

# Stop, remove containers, and delete volumes (WARNING: deletes database)
docker-compose down -v
```

## Architecture

The application runs in two containers:

- **backend** - FastAPI application (Python)
  - Port: 8000
  - Database: SQLite (persisted in volume)

- **frontend** - React SPA served by Nginx
  - Port: 3000 (mapped from container port 80)
  - API requests proxied to backend

## Configuration

### Environment Variables

The backend accepts these environment variables (configured in `docker-compose.yml`):

- `FRONTEND_URL` - Frontend URL for CORS (default: `http://localhost:3000`)
- `ENVIRONMENT` - Set to `production` for secure cookies

### Database Persistence

The SQLite database is persisted using a bind mount to the host:

```yaml
volumes:
  - ./activity_tracker.db:/app/activity_tracker.db
```

This ensures your data survives container restarts and rebuilds.

## Development vs Production

### Development Mode

For development, you can run the services locally without Docker:

```bash
# Backend (in backend/)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (in frontend/)
npm install
npm run dev  # Runs on localhost:5173
```

### Production Mode

Docker Compose is configured for production-like deployment:

- Frontend is built and optimized (minified)
- Static files served by Nginx with caching
- Gzip compression enabled
- Security headers configured
- Health checks for both services

## Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuild Specific Service

```bash
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

### Execute Commands in Containers

```bash
# Access backend shell
docker-compose exec backend /bin/sh

# Access frontend shell
docker-compose exec frontend /bin/sh

# Initialize/reset database
docker-compose exec backend python -c "from database import init_db; init_db()"
```

### Check Service Health

```bash
# Check container status
docker-compose ps

# Check backend health
curl http://localhost:8000/api/auth/me

# Check frontend health
curl http://localhost:3000/health
```

## Ports

The following ports are exposed:

| Service  | Container Port | Host Port | Purpose          |
|----------|----------------|-----------|------------------|
| Backend  | 8000           | 8000      | API endpoints    |
| Frontend | 80             | 3000      | Web interface    |

## Troubleshooting

### Port Already in Use

If ports 3000 or 8000 are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "3001:80"  # Change host port to 3001
```

### Database Issues

If you encounter database errors:

```bash
# Stop containers
docker-compose down

# Remove database file
rm activity_tracker.db

# Restart (database will be recreated)
docker-compose up -d
```

### CORS Errors

If you see CORS errors in the browser console:

1. Check that `FRONTEND_URL` in docker-compose matches your access URL
2. Ensure the backend's `main.py` includes your frontend URL in `allow_origins`
3. Restart backend after changes: `docker-compose restart backend`

### Container Won't Start

Check logs for errors:

```bash
docker-compose logs backend
docker-compose logs frontend
```

Common issues:
- Missing dependencies: Rebuild with `docker-compose up --build`
- Port conflicts: Change ports in `docker-compose.yml`
- Permission issues: Ensure Docker has access to project directory

## Updating the Application

After making code changes:

```bash
# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build backend
```

## Cleanup

Remove all containers, networks, and images:

```bash
# Stop and remove containers
docker-compose down

# Remove all unused Docker resources
docker system prune -a

# Remove volumes (WARNING: deletes database)
docker-compose down -v
```

## Security Notes

- The current setup uses HTTP. For production, configure HTTPS/SSL
- Session cookies have `secure=true` when `ENVIRONMENT=production`
- Default ports are exposed; consider using a reverse proxy (Traefik, Caddy) for production
- Database is stored in a local bind mount; consider using named volumes for production

## Production Deployment

For production deployment, consider:

1. Use a reverse proxy (Nginx, Traefik, Caddy) with SSL/TLS
2. Set `ENVIRONMENT=production` in docker-compose
3. Use Docker secrets for sensitive data
4. Configure firewall rules
5. Set up regular database backups
6. Use container orchestration (Kubernetes, Docker Swarm) for scaling
7. Implement monitoring and logging (Prometheus, Grafana, ELK stack)

## Support

For issues or questions:
- Check the main [README.md](README.md)
- Review [Context.MD](Context.MD) for architecture details
- Check Docker logs: `docker-compose logs`
