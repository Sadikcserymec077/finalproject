#!/bin/bash

echo "========================================"
echo "Static Analysis Framework - Quick Start"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "[WARNING] Docker is not running!"
    echo "Please start Docker first."
    exit 1
fi

echo "[OK] Prerequisites checked"
echo ""

# Check if .env exists in backend
if [ ! -f "mobsf-ui-backend/.env" ]; then
    echo "[WARNING] .env file not found in mobsf-ui-backend!"
    echo "Please create .env file manually or run setup script first."
    echo ""
    echo "Creating .env file with default values..."
    cat > mobsf-ui-backend/.env << EOF
MOBSF_URL=http://localhost:8000
MOBSF_API_KEY=your-api-key-here
PORT=4000
EOF
    echo "[INFO] Please update MOBSF_API_KEY in mobsf-ui-backend/.env"
    echo ""
    read -p "Press enter to continue..."
fi

echo "========================================"
echo "Starting All Services..."
echo "========================================"
echo ""

# Start MobSF Docker container
echo "[1/3] Starting MobSF (Docker)..."
cd mobsf-ui-backend
docker-compose up -d
sleep 5
cd ..

# Start Backend Server (in background)
echo "[2/3] Starting Backend Server..."
cd mobsf-ui-backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3
cd ..

# Start Frontend Server (in background, with BROWSER=none)
echo "[3/3] Starting Frontend Server..."
cd mobsf-frontend
BROWSER=none npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ..

echo ""
echo "========================================"
echo "All Services Started!"
echo "========================================"
echo ""
echo "Services running:"
echo "  - MobSF:        http://localhost:8000"
echo "  - Backend API:  http://localhost:4000"
echo "  - Frontend:     http://localhost:3000"
echo ""
echo "Logs:"
echo "  - Backend:  tail -f backend.log"
echo "  - Frontend: tail -f frontend.log"
echo ""
echo "To stop all services:"
echo "  1. Kill processes: kill $BACKEND_PID $FRONTEND_PID"
echo "  2. Stop Docker: cd mobsf-ui-backend && docker-compose down"
echo ""
echo "========================================"
echo ""
echo "Opening browser in a moment..."
echo ""

# Wait for frontend to be ready, then open browser once
sleep 12
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi

echo "Browser opened! If it didn't open, go to: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; cd mobsf-ui-backend && docker-compose down; exit" INT
wait

