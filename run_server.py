#!/usr/bin/env python3
"""
Wrapper script to run the web server from the root directory
"""
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Run the server
from api.server import app
import uvicorn

if __name__ == "__main__":
    from config.settings import WEB_SERVER_HOST, WEB_SERVER_PORT
    print("\n" + "="*70)
    print("Real-time Speech-to-Text Web Server with React Frontend")
    print("="*70)
    print(f"Server: http://localhost:{WEB_SERVER_PORT}")
    print("\nPress Ctrl+C to stop\n")
    uvicorn.run(app, host=WEB_SERVER_HOST, port=WEB_SERVER_PORT)
