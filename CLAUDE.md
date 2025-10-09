# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview - SidekickAI

SidekickAI is an intelligent real-time speech-to-text system with AI-powered question detection and answering. Captures audio from both microphone and system audio (YouTube, Zoom, etc.), transcribes using MLX Whisper (Apple Silicon optimized), detects questions with OpenAI GPT-5 Nano, and displays everything through a modern React frontend.

## Core Architecture

Three-tier architecture with clear separation of concerns:

### 1. Transcription Service (`backend/services/transcription_service.py`)
- **Audio Capture**: ffmpeg subprocess captures microphone audio at 16kHz
- **VAD Processing**: Voice Activity Detection (Silero ML-based or energy-based fallback) detects speech vs silence
- **Transcription Pipeline**: Queued transcription using MLX Whisper in dedicated worker thread
- **Web Integration**: POSTs transcripts to web server at `/transcript` endpoint
- **Threading Model**: Main thread for audio capture, worker thread for transcription processing (CPU-intensive)

Key Configuration (`backend/config/settings.py`):
- `SILENCE_DURATION = 0.6` - Seconds of silence before triggering transcription
- `MIN_SPEECH_DURATION = 0.3` - Minimum speech length to process
- `MAX_SPEECH_DURATION = 30` - Force transcription after this duration
- Audio device: Line 155 in transcription_service.py: `'-i', ':1'` (macOS avfoundation index)

### 2. Web Server (`backend/api/server.py`)
- **FastAPI Application**: Serves React build from `frontend/dist/` and provides API endpoints
- **WebSocket Manager**: Broadcasts real-time updates to all connected clients
- **API Endpoints**:
  - POST `/transcript` - Receives transcripts from transcription service
  - POST `/answer` - Generates AI answers for questions
  - WebSocket `/ws` - Real-time bidirectional communication
- **Question Detection Integration**: Automatically calls question detector for each transcript

### 3. Question Detection (`backend/services/question_detector.py`)
- **QuestionDetector**: Analyzes ONLY current transcript line (uses previous 5 lines as context)
- **QuestionAnswerer**: Generates answers using transcript context
- **OpenAI Integration**: Uses Responses API with `gpt-5-nano` model, minimal reasoning for speed
- **Deduplication**: Normalizes questions (lowercase, remove punctuation) to prevent duplicates
- **Context Window**: Maintains last 20 transcript lines for context

## Configuration System

All configuration centralized in `backend/config/settings.py`:

```python
# Audio - affects transcription quality and responsiveness
SAMPLE_RATE = 16000              # Whisper requires 16kHz
SILENCE_DURATION = 0.6           # Lower = faster but may cut off speech
MIN_SPEECH_DURATION = 0.3        # Minimum to prevent noise transcription
MAX_SPEECH_DURATION = 30         # Prevent memory issues with long speech

# VAD - affects speech detection sensitivity
VAD_THRESHOLD = 0.5              # 0-1, higher = less sensitive

# Models - affects quality and speed
WHISPER_MODEL = "mlx-community/whisper-medium"  # tiny/small/medium
OPENAI_MODEL = "gpt-5-nano"      # Fast question detection

# Server
WEB_SERVER_PORT = 8000
FRONTEND_BUILD_PATH = "frontend/dist"
```

Environment variables (`.env` file):
```
OPENAI_API_KEY=your-api-key-here
```

## Common Development Commands

### Full System
```bash
./start.sh                    # Builds frontend if needed, starts both services
```

### Backend Only
```bash
# Run web server
python3 run_server.py

# Run transcription service
python3 run_transcription.py

# Standalone transcription (no web)
python3 realtime_transcribe.py
```

### Frontend Development
```bash
cd frontend
npm install                   # Install dependencies
npm run dev                   # Dev server with hot reload (port 3000)
npm run build                 # Production build to dist/
```

### Testing Audio Device
```bash
# List available audio devices
ffmpeg -f avfoundation -list_devices true -i ""

# Update device in backend/services/transcription_service.py line ~155
'-i', ':X'  # Replace X with device index
```

## Critical Implementation Details

### VAD System (`backend/utils/vad.py`)
- **Primary**: SileroVAD (ML-based, requires torch) - more accurate speech detection
- **Fallback**: EnergyVAD (energy threshold-based) - no dependencies
- **Auto-selection**: `get_vad()` factory function automatically selects based on torch availability
- VAD receives audio chunks and returns `(is_speech: bool, confidence: float)`

### Transcription Queue Pattern
The transcription service uses a producer-consumer pattern to separate audio capture from processing:
1. Main thread captures audio continuously from ffmpeg subprocess
2. VAD analyzes each chunk in real-time
3. When silence detected, accumulated audio bytes queued
4. Worker thread processes queue items (CPU-intensive MLX Whisper)
5. Prevents audio capture blocking on transcription

### Question Detection Logic
**IMPORTANT**: QuestionDetector only analyzes the CURRENT transcript line:
- Previous 5 lines provided as context to understand conversation
- Does NOT detect questions from historical lines
- Uses normalized text (lowercase, no punctuation) to deduplicate
- Maintains `detected_questions` set to prevent re-detecting same question

### WebSocket Broadcasting
All clients receive same updates (no per-client filtering):
- Transcripts broadcast immediately upon receipt
- Questions broadcast when detected
- Answers broadcast when generated
- Frontend maintains last 20 transcripts, 10 questions, 10 answers

### Frontend Architecture (React)
- **Components**: Header, TranscriptPanel, QuestionsPanel, QAChatPanel, ConnectionError
- **State Management**: useWebSocket custom hook manages WebSocket connection and data
- **Styling**: Tailwind CSS for clean, modern UI
- **WebSocket Protocol**: JSON messages with `type` field (transcript/question/answer)

## Import Path Pattern

Backend uses path manipulation for imports:

```python
# In run_server.py and run_transcription.py
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Then import from backend modules
from api.server import app
from services.transcription_service import main
from config.settings import WHISPER_MODEL
from utils.vad import get_vad
```

Within backend modules, use relative imports:
```python
from config.settings import SAMPLE_RATE
from utils.vad import get_vad
```

## Troubleshooting Audio Capture

**No microphone input**:
1. Check microphone permissions for Terminal
2. List devices: `ffmpeg -f avfoundation -list_devices true -i ""`
3. Update device index in `backend/services/transcription_service.py` line ~155

**VAD not working**:
- Install torch: `pip install torch torchaudio`
- System auto-falls back to EnergyVAD if torch unavailable

**System audio capture** (optional):
- Install BlackHole: `brew install blackhole-2ch`
- Create Multi-Output Device in Audio MIDI Setup
- Update ffmpeg device index to capture system audio

## Performance Characteristics

- **Transcription latency**: ~2-3 seconds (whisper-medium on Apple Silicon)
- **Question detection**: ~500ms (gpt-5-nano with minimal reasoning)
- **Answer generation**: ~1-2 seconds
- **WebSocket latency**: <100ms for UI updates

## File Responsibilities

### Backend
- `backend/api/server.py` - FastAPI app, WebSocket manager, serves frontend
- `backend/services/question_detector.py` - QuestionDetector and QuestionAnswerer classes
- `backend/services/transcription_service.py` - Audio capture, VAD, Whisper, threading
- `backend/utils/vad.py` - SileroVAD, EnergyVAD, get_vad() factory
- `backend/config/settings.py` - All configuration constants

### Frontend
- `frontend/src/App.tsx` - Main app with layout and component orchestration
- `frontend/src/hooks/useWebSocket.ts` - WebSocket connection, reconnect, message handling
- `frontend/src/components/TranscriptPanel.tsx` - Live transcripts with confidence scores
- `frontend/src/components/QuestionsPanel.tsx` - Clickable detected questions
- `frontend/src/components/AnswersPanel.tsx` - AI-generated answers display
- `frontend/src/components/StatusIndicator.tsx` - Connection status indicator

### Root Scripts
- `run_server.py` - Wrapper to run backend web server
- `run_transcription.py` - Wrapper to run transcription service
- `start.sh` - Orchestrates frontend build and starts both services

## Platform Specifics

**macOS Only**: Uses `avfoundation` for audio capture
- Audio device specified as `:X` where X is device index
- Default `:1` is typically built-in microphone
- Run `ffmpeg -f avfoundation -list_devices true -i ""` to see available devices

**Apple Silicon Optimized**: MLX Whisper uses Apple's ML framework for fast on-device transcription
- No GPU needed, runs on Neural Engine
- Much faster than CPU-only Whisper on M1/M2/M3

**Browser Compatibility**:
- Chrome/Edge: Full support (recommended)
- Safari/Firefox: Full support
