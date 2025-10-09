# Real-time Speech-to-Text with AI Question Detection

An intelligent real-time transcription system that automatically detects questions and provides instant answers using AI.

## Features

- 🎤 **Real-time Speech-to-Text** - Continuous transcription using MLX Whisper
- 🧠 **Silero VAD** - Advanced voice activity detection for accurate pause detection
- ❓ **AI Question Detection** - Automatically identifies questions in the transcript
- 💬 **Instant Answers** - Get answers to detected questions with one click
- 🌐 **Web Interface** - Beautiful real-time dashboard with WebSocket updates
- 📊 **Confidence Scores** - See transcription accuracy in real-time
- 💾 **Auto-logging** - All transcripts saved to timestamped files

## System Architecture

```
┌─────────────────┐
│   Microphone    │
└────────┬────────┘
         │
         ├──> Audio Capture (ffmpeg)
         │
         ├──> VAD (Silero/Energy-based)
         │
         ├──> Whisper Transcription (MLX)
         │
         ▼
┌─────────────────────────────────┐
│      Web Server (FastAPI)        │
│  ┌──────────────────────────┐   │
│  │   Question Detector      │   │
│  │   (OpenAI gpt-5-nano)   │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │   Question Answerer      │   │
│  │   (OpenAI GPT-5 Nano*)   │   │
│  └──────────────────────────┘   │
└────────────┬────────────────────┘
             │
             ├──> WebSocket
             │
             ▼
┌─────────────────────────────────┐
│      Web Interface (HTML/JS)     │
│  • Live Transcripts              │
│  • Detected Questions            │
│  • AI Answers                    │
└─────────────────────────────────┘
```

*Currently using gpt-5-nano, will upgrade to GPT-5 Nano when available

## Installation

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Install ffmpeg** (if not already installed):
```bash
brew install ffmpeg
```

3. **Set OpenAI API Key:**
```bash
export OPENAI_API_KEY='your-openai-api-key-here'
```

## Usage

### Option 1: Quick Start with Organized Backend (Recommended)

Beautiful modern UI with Apple's liquid glass effect and organized backend structure.

```bash
chmod +x start.sh
./start.sh
```

Then open http://localhost:8000 in your browser.

**Note:** First run will automatically install frontend dependencies and build the React app.

### Option 2: Run Services Separately

```bash
# Terminal 1 - Web server with React frontend
python3 run_server.py

# Terminal 2 - Transcription service
python3 run_transcription.py
```

Then open http://localhost:8000 in your browser.

### Option 3: Standalone Transcription (No Web Interface)

```bash
python3 realtime_transcribe.py
```

## Configuration

### Centralized Configuration

All settings are now in `backend/config/settings.py`:

```python
# Audio settings
SAMPLE_RATE = 16000
SILENCE_DURATION = 0.6
MIN_SPEECH_DURATION = 0.3
MAX_SPEECH_DURATION = 30

# VAD
VAD_THRESHOLD = 0.5

# Models
WHISPER_MODEL = "mlx-community/whisper-medium"
OPENAI_MODEL = "gpt-5-nano"

# Server
WEB_SERVER_PORT = 8000
```

### Legacy Configuration

You can also edit these variables in the legacy files if using old scripts:

**`realtime_transcribe_web.py`:**

```python
# Audio settings
SAMPLE_RATE = 16000              # Whisper sample rate
SILENCE_DURATION = 0.6           # Pause detection threshold (seconds)
MIN_SPEECH_DURATION = 0.3        # Minimum speech length
MAX_SPEECH_DURATION = 30         # Max before forced transcription

# Models
WHISPER_MODEL = "mlx-community/whisper-medium"  # tiny/small/medium
VAD_THRESHOLD = 0.5              # Speech detection sensitivity (0-1)
```

Edit these in `question_detector.py`:

```python
# Question detection model
model = "gpt-5-nano"  # Fast and accurate

# Will upgrade to "gpt-5-nano" for even faster responses
```

## System Audio Capture (Optional)

To capture system audio in addition to microphone:

### macOS Setup:

1. **Install BlackHole** (virtual audio device):
```bash
brew install blackhole-2ch
```

2. **Create Multi-Output Device:**
   - Open Audio MIDI Setup
   - Click "+" → Create Multi-Output Device
   - Check: Built-in Output + BlackHole 2ch
   - Set as system output

3. **Update audio device in code:**
```python
# In realtime_transcribe_web.py, line ~530
'-i', ':1',  # Change to appropriate audio device index
```

Find device index:
```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

## Web Interface

Two frontend options available:

### React Frontend (Recommended)
Beautiful modern interface with Apple's liquid glass effects:
- ✨ **Liquid Glass UI** - Apple-style glassmorphism using [liquid-glass-react](https://github.com/rdev/liquid-glass-react)
- 🔴 **Live Status Indicator** - Pulsing connection status
- 📊 **Confidence Scores** - Real-time transcription accuracy
- ⚡ **WebSocket Updates** - Instant real-time updates
- 🎨 **Gradient Background** - Beautiful purple gradient
- 📱 **Responsive Design** - Works on all devices
- 🎭 **Smooth Animations** - Slide-in and pop-in effects

**Best viewed in Chrome or Edge** (Safari/Firefox have partial liquid glass support)

### Original HTML Frontend
Simple embedded interface with all core features:
- **Live Transcripts** - Real-time transcription with timestamps and confidence scores
- **Detected Questions** - Questions automatically identified by AI
- **Answers** - Click any question to get an instant answer

## How It Works

1. **Audio Capture**: FFmpeg captures audio from your microphone
2. **VAD**: Silero VAD detects when you're speaking vs. silent
3. **Transcription**: When silence is detected, audio is sent to MLX Whisper
4. **Question Detection**: Each transcript line is analyzed by gpt-5-nano
5. **Display**: Transcripts and questions appear in real-time via WebSocket
6. **Answering**: Click a question → GPT-5 Nano generates instant answer

## File Structure

```
RealTime_Speech2Text/
├── backend/                     # Organized backend code
│   ├── api/
│   │   └── server.py           # FastAPI web server
│   ├── services/
│   │   ├── question_detector.py    # AI question detection
│   │   └── transcription_service.py # Audio transcription
│   ├── utils/
│   │   └── vad.py              # Voice Activity Detection
│   ├── config/
│   │   └── settings.py         # Centralized configuration
│   └── README.md               # Backend documentation
├── frontend/                    # React frontend with liquid glass
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── App.tsx             # Main app component
│   │   └── types.ts            # TypeScript definitions
│   ├── package.json
│   └── README.md               # Frontend documentation
├── run_server.py               # Run web server (wrapper)
├── run_transcription.py        # Run transcription (wrapper)
├── start.sh                    # Main startup script
├── requirements.txt            # Python dependencies
├── CLAUDE.md                   # Claude Code documentation
├── QUICKSTART.md               # Quick start guide
└── README.md                   # This file

Legacy files:
└── realtime_transcribe.py      # Standalone transcription (no web)
```

## Troubleshooting

**Web interface not loading:**
- Check web server is running: `http://localhost:8000`
- Look for errors in the web server terminal

**No transcriptions:**
- Check microphone permissions
- Run `ffmpeg -f avfoundation -list_devices true -i ""` to verify device
- Try standalone mode: `python3 realtime_transcribe.py`

**Question detection not working:**
- Verify OPENAI_API_KEY is set
- Check web server logs for API errors

**VAD errors:**
- Install torch: `pip install torch torchaudio`
- System will fallback to energy-based VAD if needed

## Model Options

### Whisper Models (Speed vs Accuracy):
- `whisper-tiny` - Fastest, least accurate
- `whisper-small` - Balanced
- `whisper-medium` - Best quality (current default)

### Question Detection/Answering:
- Currently: `gpt-5-nano` (fast and accurate)
- Future: `gpt-5-nano` (even faster with minimal reasoning)

## Performance

- **Transcription latency**: ~2-3 seconds (with whisper-medium)
- **Question detection**: ~500ms
- **Answer generation**: ~1-2 seconds

## Future Enhancements

- [ ] System audio capture integration
- [ ] Multiple language support
- [ ] Export transcripts to various formats
- [ ] Custom question answering prompts
- [ ] Speaker diarization
- [ ] GPT-5 Nano integration when available
- [ ] Local LLM support (Ollama integration)

## Credits

Built with:
- [MLX Whisper](https://github.com/ml-explore/mlx-examples) - Apple Silicon optimized Whisper
- [Silero VAD](https://github.com/snakers4/silero-vad) - Voice Activity Detection
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [OpenAI API](https://openai.com/) - Question detection & answering
- [Liquid Glass React](https://github.com/rdev/liquid-glass-react) - Apple's liquid glass effect
- [React](https://react.dev/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## License

MIT License - Feel free to use and modify!
