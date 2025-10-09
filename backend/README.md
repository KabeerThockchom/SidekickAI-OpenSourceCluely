# Backend Documentation

Organized backend structure for the Real-time Speech-to-Text system.

## Directory Structure

```
backend/
├── api/
│   ├── __init__.py
│   └── server.py              # FastAPI web server
├── services/
│   ├── __init__.py
│   ├── question_detector.py   # Question detection & answering
│   └── transcription_service.py  # Audio transcription service
├── utils/
│   ├── __init__.py
│   └── vad.py                 # Voice Activity Detection utilities
├── config/
│   ├── __init__.py
│   └── settings.py            # Configuration settings
└── __init__.py
```

## Modules

### `api/server.py`
FastAPI web server that:
- Serves the React frontend
- Provides WebSocket endpoint for real-time updates
- Handles transcript and answer API endpoints
- Integrates with question detection service

### `services/question_detector.py`
AI-powered question detection and answering:
- `QuestionDetector`: Detects questions from transcript using OpenAI GPT-5 Nano
- `QuestionAnswerer`: Generates answers using context
- Uses OpenAI Responses API with minimal reasoning for speed

### `services/transcription_service.py`
Real-time audio transcription:
- Captures audio from microphone using ffmpeg
- Uses VAD for speech detection
- Transcribes using MLX Whisper
- Sends transcripts to web server

### `utils/vad.py`
Voice Activity Detection utilities:
- `SileroVAD`: ML-based VAD (requires torch)
- `EnergyVAD`: Energy-based fallback VAD
- `get_vad()`: Factory function to get appropriate VAD

### `config/settings.py`
Centralized configuration:
- Audio settings (sample rate, durations)
- Model settings (Whisper, OpenAI)
- Server settings (host, port, URLs)
- Paths (frontend build)

## Running from Root Directory

### Option 1: Use Start Script (Recommended)
```bash
chmod +x start.sh
./start.sh
```

### Option 2: Run Components Separately
```bash
# Terminal 1 - Web server
python3 run_server.py

# Terminal 2 - Transcription service
python3 run_transcription.py
```

### Option 3: Run from Backend Directory
```bash
cd backend

# Web server
python3 -m api.server

# Transcription service
python3 -m services.transcription_service
```

## Configuration

All settings are centralized in `config/settings.py`:

```python
# Audio Configuration
SAMPLE_RATE = 16000
SILENCE_DURATION = 0.6
MIN_SPEECH_DURATION = 0.3
MAX_SPEECH_DURATION = 30

# VAD Configuration
VAD_THRESHOLD = 0.5

# Whisper Configuration
WHISPER_MODEL = "mlx-community/whisper-medium"

# OpenAI Configuration
OPENAI_MODEL = "gpt-5-nano"

# Web Server Configuration
WEB_SERVER_PORT = 8000
```

Edit `config/settings.py` to customize these settings.

## Environment Variables

Required environment variables (set in `.env` file):
```
OPENAI_API_KEY=your-openai-api-key-here
```

## Import Paths

The backend uses relative imports within modules:

```python
# From root scripts (run_server.py, run_transcription.py)
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Then import
from api.server import app
from services.transcription_service import main
from config.settings import WHISPER_MODEL
from utils.vad import get_vad
```

## Development

### Adding New Configuration
1. Add setting to `config/settings.py`
2. Import where needed: `from config.settings import YOUR_SETTING`

### Adding New Services
1. Create service file in `services/`
2. Import configuration from `config.settings`
3. Use utilities from `utils/`

### Adding New Utilities
1. Create utility file in `utils/`
2. Keep utilities stateless and reusable
3. Document parameters and return values

## Testing

Test individual components:

```bash
# Test VAD
python3 -c "from backend.utils.vad import get_vad; vad = get_vad(); print('VAD loaded')"

# Test configuration
python3 -c "from backend.config.settings import WHISPER_MODEL; print(WHISPER_MODEL)"

# Test question detector
python3 -c "from backend.services.question_detector import question_detector; print('Detector ready')"
```

## Migration from Old Structure

Old files are kept in root for backward compatibility:
- `web_server.py` → `backend/api/server.py`
- `web_server_react.py` → `backend/api/server.py`
- `question_detector.py` → `backend/services/question_detector.py`
- `realtime_transcribe_web.py` → `backend/services/transcription_service.py`

New wrapper scripts provide the same interface:
- `run_server.py` → runs `backend/api/server.py`
- `run_transcription.py` → runs `backend/services/transcription_service.py`
- `start.sh` → orchestrates both services
