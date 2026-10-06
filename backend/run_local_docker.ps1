# PowerShell script to run TaxSaathi backend in Docker locally

Write-Host "🚀 TaxSaathi Backend - Local Docker Runner" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (!(Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your configuration." -ForegroundColor Red
    exit 1
}
Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""

# Stop any existing container
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
docker stop taxsaathi-backend 2>$null
docker rm taxsaathi-backend 2>$null
Write-Host "✅ Cleaned up old containers" -ForegroundColor Green
Write-Host ""

# Build the Docker image
Write-Host "Building Docker image (this may take a few minutes)..." -ForegroundColor Yellow
docker build -t taxsaathi-backend .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker image built successfully" -ForegroundColor Green
Write-Host ""

# Run the container
Write-Host "Starting backend container..." -ForegroundColor Yellow
docker run -d `
    --name taxsaathi-backend `
    -p 8000:8000 `
    --env-file .env `
    -v "${PWD}/data:/app/data" `
    taxsaathi-backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start container!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Container started successfully" -ForegroundColor Green
Write-Host ""

# Wait for the server to start
Write-Host "Waiting for backend to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Show logs
Write-Host "📋 Container logs:" -ForegroundColor Cyan
docker logs taxsaathi-backend

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Backend is running at http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:    docker logs -f taxsaathi-backend" -ForegroundColor White
Write-Host "  Stop server:  docker stop taxsaathi-backend" -ForegroundColor White
Write-Host "  Restart:      docker restart taxsaathi-backend" -ForegroundColor White
Write-Host "  Remove:       docker rm -f taxsaathi-backend" -ForegroundColor White
Write-Host ""
Write-Host "Test endpoints:" -ForegroundColor Yellow
Write-Host "  Health:       curl http://localhost:8000/health" -ForegroundColor White
Write-Host "  Docs:         http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
