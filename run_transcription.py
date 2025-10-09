#!/usr/bin/env python3
"""
Wrapper script to run the transcription service from the root directory
"""
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Run the transcription service
from services.transcription_service import main

if __name__ == "__main__":
    main()
