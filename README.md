# SidekickAI

Your intelligent AI assistant that listens, transcribes, and answers questions in real-time.

## Features

- 🎤 **Real-time Speech-to-Text** - Continuous transcription using MLX Whisper
- 🖥️ **System Audio Capture** - Capture both microphone AND system audio (YouTube, Zoom, etc.)
- 🧠 **Silero VAD** - Advanced voice activity detection for accurate pause detection
- ❓ **AI Question Detection** - Automatically identifies questions in the transcript
- 💬 **Instant Answers** - Get answers to detected questions with one click
- 🌐 **Web Interface** - Beautiful real-time dashboard with WebSocket updates
- 📊 **Confidence Scores** - See transcription accuracy in real-time
- 💾 **Auto-logging** - All transcripts saved to timestamped files

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Microphone    │     │  System Audio   │
│      (🎤)       │     │  (🖥️  YouTube,  │
│                 │     │   Zoom, etc.)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │ (via BlackHole)
         └───────────┬───────────┘
                     │
         ├──> Audio Capture (ffmpeg, parallel streams)
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
│  • Live Transcripts (labeled)    │
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

Modern React UI with organized backend structure.

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

# Audio devices (macOS)
MICROPHONE_DEVICE = ":2"          # MacBook Pro Microphone
SYSTEM_AUDIO_DEVICE = ":1"        # BlackHole 2ch
ENABLE_SYSTEM_AUDIO = True        # Enable/disable system audio capture

# VAD
VAD_THRESHOLD = 0.5

# Models
WHISPER_MODEL = "mlx-community/whisper-medium"
OPENAI_MODEL = "gpt-5-nano"

# Server
WEB_SERVER_PORT = 8000
```

**Finding your audio device indices:**
```bash
ffmpeg -f avfoundation -list_devices true -i ""
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

## System Audio Capture

Capture both your microphone AND system audio (YouTube, Zoom, music, etc.) simultaneously!

### Quick Setup (macOS) - 5 Minutes

#### 1. Install BlackHole (if not already installed)
```bash
brew install blackhole-2ch
```

#### 2. Create Multi-Output Device

**Open Audio MIDI Setup:**
- Press `Cmd+Space` and type "Audio MIDI Setup"
- Or go to `/Applications/Utilities/Audio MIDI Setup.app`

**Create the device:**
1. Click the **+** button in the bottom-left corner
2. Select **"Create Multi-Output Device"**
3. In the right panel, check BOTH boxes:
   - ☑ **MacBook Pro Speakers** (or your speakers)
   - ☑ **BlackHole 2ch**
4. **Important**: Set "Primary Device" dropdown to **"MacBook Pro Speakers"**
5. Optionally rename to "Speakers + BlackHole"

#### 3. Set as System Output

**Option A: Menu Bar (Quick)**
1. Hold `Option` key
2. Click the 🔊 Sound icon in menu bar
3. Select **"Multi-Output Device"** under Output Device

**Option B: System Settings**
1. Open System Settings → Sound → Output
2. Select **"Multi-Output Device"**

#### 4. Find Your Device Indices

Run this command:
```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

Look for:
```
[AVFoundation indev @ ...] AVFoundation audio devices:
[AVFoundation indev @ ...] [1] BlackHole 2ch
[AVFoundation indev @ ...] [2] MacBook Pro Microphone
```

#### 5. Update Configuration

Edit `backend/config/settings.py` with your device indices:
```python
MICROPHONE_DEVICE = ":2"          # Your microphone index
SYSTEM_AUDIO_DEVICE = ":1"        # BlackHole index
ENABLE_SYSTEM_AUDIO = True        # Set to True
```

#### 6. Start the System!

```bash
./start.sh
```

**Test it:**
- Play a YouTube video
- Speak into your microphone
- Watch the terminal and web interface:
  - 🎤 for your voice (microphone)
  - 🖥️ for system audio (YouTube, Zoom, etc.)

### What's Happening?

```
┌──────────────────────────────────────┐
│  Your Mac's Audio Output             │
│                                      │
│  ┌────────────────────────────┐     │
│  │  Multi-Output Device       │     │
│  │  ├─> MacBook Speakers ───────────┼──> 🔊 You hear audio
│  │  └─> BlackHole 2ch ───────────────┼──> 📹 App captures it
│  └────────────────────────────┘     │
└──────────────────────────────────────┘
```

The Multi-Output Device routes audio to BOTH your speakers (so you can hear) AND BlackHole (so the app can capture it). Both streams are transcribed in parallel and labeled separately.

### Troubleshooting

**No system audio transcriptions:**
- Verify Multi-Output Device is set as system output (check Sound icon in menu bar)
- Ensure BOTH boxes are checked in Audio MIDI Setup
- Make sure you're playing audio (YouTube, music, etc.)
- Check `ENABLE_SYSTEM_AUDIO = True` in settings.py

**Can't hear audio anymore:**
- In Audio MIDI Setup, ensure "MacBook Pro Speakers" is checked
- Verify "Primary Device" is set to your speakers, not BlackHole

**To disable system audio capture:**
```python
# In backend/config/settings.py
ENABLE_SYSTEM_AUDIO = False  # Just set to False
```

Or switch your system output back to "MacBook Pro Speakers" in Sound Settings.

### Detailed Documentation

See `SYSTEM_AUDIO_SETUP_MAC.md` for comprehensive troubleshooting and advanced setup options.

## Web Interface

### React Frontend
Modern, clean interface with real-time updates:
- 🔴 **Live Status Indicator** - Connection status at a glance
- 📊 **Confidence Scores** - Real-time transcription accuracy
- ⚡ **WebSocket Updates** - Instant real-time updates
- 🎨 **Clean Design** - Modern, professional interface
- 📱 **Responsive Design** - Works on all devices
- 🎭 **Smooth Animations** - Polished user experience

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
SidekickAI/
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
├── frontend/                    # React frontend
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

- [x] System audio capture integration (✅ DONE!)
- [x] Speaker diarization (✅ DONE!)
- [ ] Multiple language support
- [ ] Export transcripts to various formats
- [ ] Custom question answering prompts
- [ ] Local LLM support (Ollama integration)

---

## About SidekickAI

**SidekickAI** is your intelligent companion that listens to everything you say and hear, transcribes it in real-time, automatically detects questions, and provides instant AI-powered answers. Perfect for meetings, lectures, research, or just capturing your thoughts.

## Credits

Built with:
- [MLX Whisper](https://github.com/ml-explore/mlx-examples) - Apple Silicon optimized Whisper
- [Silero VAD](https://github.com/snakers4/silero-vad) - Voice Activity Detection
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [OpenAI API](https://openai.com/) - Question detection & answering
- [React](https://react.dev/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## License

MIT License - Feel free to use and modify!
