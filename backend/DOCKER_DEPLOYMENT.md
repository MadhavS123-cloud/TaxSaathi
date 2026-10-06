# TaxSaathi Backend - Docker Deployment Guide

## Prerequisites

1. **Docker Desktop** installed and running
2. **.env file** configured with:
   ```
   GEMINI_API_KEY=your_api_key_here
   DATABASE_URL=postgresql://user:pass@host:5432/db
   ```

---

## Local Development (Windows)

### Quick Start

1. **Start Docker Desktop**

2. **Run the setup script:**
   ```powershell
   .\run_local_docker.ps1
   ```

### Manual Setup

1. **Build the image:**
   ```bash
   docker build -t taxsaathi-backend .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name taxsaathi-backend \
     -p 8000:8000 \
     --env-file .env \
     -v ./data:/app/data \
     taxsaathi-backend
   ```

3. **View logs:**
   ```bash
   docker logs -f taxsaathi-backend
   ```

4. **Stop the container:**
   ```bash
   docker stop taxsaathi-backend
   ```

---

## Using Docker Compose (Alternative)

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

---

## Render Deployment

### Configuration

The `render.yaml` is already configured for Docker deployment:

```yaml
services:
  - type: web
    name: taxsaathi-backend
    env: docker
    rootDir: backend
    dockerfilePath: ./Dockerfile
```

### Environment Variables

Set these in Render Dashboard:

1. **DATABASE_URL**: Your Supabase PostgreSQL connection string
2. **GEMINI_API_KEY**: Your Google Gemini API key
3. **FRONTEND_URL** (optional): Your frontend deployment URL

### Deploy

1. Push code to GitHub
2. Go to Render Dashboard
3. Trigger **Manual Deploy**
4. Render will automatically:
   - Build the Docker image
   - Install all dependencies inside the container
   - Start the uvicorn server
   - Expose the service on port 10000

---

## Troubleshooting

### Docker Build Fails

**Error:** `failed to connect to docker API`
- **Solution:** Start Docker Desktop

### Container Won't Start

**Error:** Port 8000 already in use
- **Solution:** 
  ```bash
  docker stop taxsaathi-backend
  docker rm taxsaathi-backend
  ```

### Database Connection Fails

- Check `DATABASE_URL` in `.env`
- Ensure Supabase allows connections from your IP
- Test connection:
  ```bash
  docker exec taxsaathi-backend python -c "from db.session import SessionLocal; db = SessionLocal(); db.execute('SELECT 1'); print('✅ Connected')"
  ```

### ChromaDB Errors

- Ensure `data/chroma_db/` directory exists
- Volume mount correct:
  ```bash
  docker inspect taxsaathi-backend | grep -A 5 Mounts
  ```

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### API Documentation
Open in browser: http://localhost:8000/docs

### Create a Case
```bash
curl -X POST http://localhost:8000/cases \
  -H "Content-Type: application/json" \
  -d '{"client":"Test Client","scope":"GST Filing"}'
```

### Advisory Query
```bash
curl -X POST http://localhost:8000/advisory/query \
  -H "Content-Type: application/json" \
  -d '{"query":"What is Section 80C?"}'
```

---

## Benefits of Docker Deployment

✅ **Consistent Environment**: Same behavior on Windows, Mac, Linux, Render  
✅ **Isolated Dependencies**: No conflicts with system Python  
✅ **Bypass Restrictions**: Runs in container, avoids Windows Application Control  
✅ **Easy Scaling**: Render can scale Docker containers easily  
✅ **Version Control**: Dockerfile is part of the codebase  

---

## File Structure

```
backend/
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Local multi-container setup
├── .dockerignore           # Files to exclude from image
├── run_local_docker.ps1    # Quick start script for Windows
├── requirements.txt        # Python dependencies
├── main.py                 # FastAPI application
└── data/                   # Mounted volume (ChromaDB, etc.)
```

---

## Performance Notes

- **First build**: ~5-10 minutes (installs all dependencies)
- **Subsequent builds**: ~30 seconds (uses Docker cache)
- **Container startup**: ~5 seconds
- **Memory usage**: ~500 MB (includes Python + dependencies)
- **CPU usage**: Minimal (spikes during ChromaDB queries)

---

## Next Steps

1. ✅ Test locally with Docker
2. ✅ Verify all routes work
3. ✅ Push to GitHub
4. ✅ Deploy to Render (automatic with Docker)
5. ✅ Enjoy stable deployment! 🚀
