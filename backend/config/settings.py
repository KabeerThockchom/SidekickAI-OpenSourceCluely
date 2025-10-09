"""
Configuration settings for the Real-time Speech-to-Text system
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Audio Configuration
SAMPLE_RATE = 16000
CHUNK_DURATION = 0.096
MIN_SPEECH_DURATION = 0.3
MAX_SPEECH_DURATION = 30
SILENCE_DURATION = 0.6

# VAD Configuration
VAD_THRESHOLD = 0.5

# Whisper Configuration
WHISPER_MODEL = "mlx-community/whisper-medium"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-5-nano"

# Web Server Configuration
WEB_SERVER_HOST = "0.0.0.0"
WEB_SERVER_PORT = 8000
WEB_SERVER_URL = f"http://localhost:{WEB_SERVER_PORT}"

# Frontend Configuration
FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
