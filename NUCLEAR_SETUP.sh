#!/bin/bash
set -e
echo "🔥 NUCLEAR SETUP: Fresh venv from scratch"
echo ""
BACKEND_DIR=$(pwd)
echo "Backend directory: $BACKEND_DIR"
echo ""
echo "Step 1: Removing broken venv..."
if [ -d "venv" ]; then
    rm -rf venv
    echo "✅ Removed old venv"
fi
echo ""
echo "Step 2: Creating fresh venv..."
python3 -m venv venv --clear --symlinks
echo "✅ venv created"
echo ""
source venv/bin/activate
echo "Step 3: venv activated"
python --version
echo ""
echo "Step 4: Upgrading pip..."
python -m pip install --upgrade pip setuptools wheel > /dev/null 2>&1
echo "✅ pip upgraded"
echo ""
echo "Step 5: Installing core packages..."
pip install fastapi==0.104.1 > /dev/null 2>&1
pip install uvicorn==0.24.0 > /dev/null 2>&1
pip install python-multipart==0.0.6 > /dev/null 2>&1
pip install pydantic==2.5.0 > /dev/null 2>&1
echo "✅ Core packages installed"
echo ""
echo "Step 6: Verifying..."
python -c "import fastapi, uvicorn; print('✅ FastAPI and Uvicorn ready')"
echo ""
echo "════════════════════════════════════════════════════"
echo "🚀 STARTING PROCTORING SERVICE"
echo "════════════════════════════════════════════════════"
echo "http://0.0.0.0:8000"
echo "Press Ctrl+C to stop"
echo ""
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
