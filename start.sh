#!/bin/bash
# SidekickAI Startup Script

echo "======================================================================"
echo "                         SidekickAI                                  "
echo "         Your Intelligent AI Listening & Answering Companion         "
echo "======================================================================"
echo ""

# Check for .env file
if [ -f .env ]; then
    echo "✓ Found .env file - API key will be loaded from there"
else
    # Check if OPENAI_API_KEY is set in environment
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  WARNING: No .env file found and OPENAI_API_KEY not set!"
        echo ""
        echo "Please either:"
        echo "  1. Create a .env file with: OPENAI_API_KEY=your-key-here"
        echo "  2. Set environment variable: export OPENAI_API_KEY='your-key-here'"
        echo ""
        read -p "Do you want to continue anyway? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Check audio configuration
echo ""
echo "Audio Configuration:"
echo "-------------------"
if [ -f "backend/config/settings.py" ]; then
    # Extract audio settings
    ENABLE_SYSTEM=$(grep "ENABLE_SYSTEM_AUDIO" backend/config/settings.py | grep -v "^#" | tail -1 | awk '{print $NF}')
    MIC_DEVICE=$(grep "MICROPHONE_DEVICE" backend/config/settings.py | grep -v "^#" | tail -1 | awk -F'"' '{print $2}')
    SYS_DEVICE=$(grep "SYSTEM_AUDIO_DEVICE" backend/config/settings.py | grep -v "^#" | tail -1 | awk -F'"' '{print $2}')

    echo "🎤 Microphone: Device ${MIC_DEVICE}"

    if [[ "$ENABLE_SYSTEM" == "True" ]]; then
        echo "🖥️  System Audio: ENABLED (Device ${SYS_DEVICE})"
        echo ""
        echo "💡 Tip: Make sure your Multi-Output Device is set as system output!"
        echo "   (Hold Option + Click Sound icon in menu bar)"
    else
        echo "🖥️  System Audio: DISABLED"
        echo ""
        echo "💡 To enable system audio capture:"
        echo "   1. See SYSTEM_AUDIO_SETUP_MAC.md for setup"
        echo "   2. Set ENABLE_SYSTEM_AUDIO=True in backend/config/settings.py"
    fi
fi
echo ""

# Check if React build exists
if [ ! -d "frontend/dist" ]; then
    echo "⚠️  React build not found!"
    echo ""
    echo "Building React frontend..."
    cd frontend

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi

    echo "Building production build..."
    npm run build
    cd ..
    echo ""
fi

echo "Starting Web Server with React Frontend..."
python3 run_server.py &
WEB_PID=$!

# Wait for web server to start
sleep 3

echo ""
echo "Web Interface: http://localhost:8000"
echo ""
echo "Starting Transcription Service..."
echo ""

# Start transcription service
python3 run_transcription.py

# Cleanup on exit
kill $WEB_PID 2>/dev/null
echo ""
echo "✓ SidekickAI stopped"
