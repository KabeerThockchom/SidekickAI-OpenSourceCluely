"""
Enhanced Real-time Speech-to-Text with Web Integration
Sends transcripts to web server for question detection
"""

import mlx_whisper
import subprocess
import sys
import threading
import tempfile
import os
import time
import warnings
import queue
from datetime import datetime
import requests

# Import config and VAD utilities
import sys
from pathlib import Path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from config.settings import (
    SAMPLE_RATE, CHUNK_DURATION, MIN_SPEECH_DURATION,
    MAX_SPEECH_DURATION, SILENCE_DURATION, WHISPER_MODEL,
    VAD_THRESHOLD, WEB_SERVER_URL
)
from utils.vad import get_vad

# Suppress warnings
warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Global flags
is_recording = True
transcription_queue = queue.Queue()


def send_to_web_server(text, timestamp, confidence=None):
    """Send transcript to web server"""
    try:
        data = {
            "text": text,
            "timestamp": timestamp,
            "confidence": confidence
        }
        requests.post(f"{WEB_SERVER_URL}/transcript", json=data, timeout=2)
    except Exception as e:
        # Silently fail if web server is not running
        pass


def transcription_worker():
    """Separate thread for transcription"""
    print("Transcription worker started\n")

    while is_recording or not transcription_queue.empty():
        try:
            audio_data = transcription_queue.get(timeout=0.5)

            if audio_data is None:
                break

            audio_bytes, speech_duration = audio_data

            print("✍️  Transcribing...   ", end='\r')
            sys.stdout.flush()

            # Save audio to temporary WAV file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_audio:
                temp_path = temp_audio.name

                wav_cmd = [
                    'ffmpeg', '-y',
                    '-f', 's16le',
                    '-ar', str(SAMPLE_RATE),
                    '-ac', '1',
                    '-i', 'pipe:0',
                    temp_path
                ]

                wav_process = subprocess.Popen(
                    wav_cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                wav_process.communicate(input=audio_bytes)

            try:
                import contextlib
                import io

                with contextlib.redirect_stdout(io.StringIO()), \
                     contextlib.redirect_stderr(io.StringIO()):
                    result = mlx_whisper.transcribe(
                        temp_path,
                        path_or_hf_repo=WHISPER_MODEL,
                        verbose=False
                    )

                text = result["text"].strip()

                if text:
                    timestamp = datetime.now()
                    time_str = timestamp.strftime('%H:%M:%S')

                    # Calculate confidence
                    confidence = None
                    if "segments" in result and result["segments"]:
                        confidences = [seg.get("no_speech_prob", 0) for seg in result["segments"]]
                        if confidences:
                            confidence = 1.0 - (sum(confidences) / len(confidences))

                    # Display locally
                    if confidence is not None:
                        print(f"📝 [{time_str}] ({confidence:.0%}) {text}                    ")
                    else:
                        print(f"📝 [{time_str}] {text}                    ")
                    sys.stdout.flush()

                    # Send to web server for question detection
                    send_to_web_server(text, time_str, confidence)

            except Exception as e:
                print(f"❌ Transcription error: {e}        ")
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

            transcription_queue.task_done()

        except queue.Empty:
            continue
        except Exception as e:
            print(f"❌ Worker error: {e}", file=sys.stderr)


def capture_audio():
    """Captures audio and uses VAD for speech detection"""
    print("Initializing...")

    # Initialize VAD
    vad = get_vad(VAD_THRESHOLD)

    print("🎤 Listening continuously... Speak naturally.\n")
    print("🌐 Sending transcripts to web interface at http://localhost:8000\n")
    print("=" * 70)

    # Start ffmpeg process
    ffmpeg_cmd = [
        'ffmpeg',
        '-f', 'avfoundation',
        '-i', ':1',  # MacBook Pro Microphone
        '-ar', str(SAMPLE_RATE),
        '-ac', '1',
        '-f', 's16le',
        '-acodec', 'pcm_s16le',
        'pipe:1'
    ]

    try:
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=SAMPLE_RATE * 2
        )

        chunk_size_bytes = int(SAMPLE_RATE * 2 * CHUNK_DURATION)

        speech_buffer = []
        is_speaking = False
        silence_start = None
        speech_start_time = None

        print("💤 Waiting for speech...", end='\r')
        sys.stdout.flush()

        while is_recording:
            audio_chunk = process.stdout.read(chunk_size_bytes)

            if len(audio_chunk) < chunk_size_bytes:
                break

            try:
                speech_detected, speech_prob = vad.is_speech(audio_chunk)
            except Exception as e:
                print(f"VAD error: {e}", file=sys.stderr)
                speech_detected = False
                speech_prob = 0.0

            if speech_detected:
                if not is_speaking:
                    is_speaking = True
                    speech_start_time = time.time()
                    print(f"🗣️  Speaking... (confidence: {speech_prob:.0%})       ", end='\r')
                    sys.stdout.flush()

                speech_buffer.append(audio_chunk)
                silence_start = None

            else:
                if is_speaking:
                    speech_buffer.append(audio_chunk)

                    if silence_start is None:
                        silence_start = time.time()

                    silence_duration = time.time() - silence_start
                    speech_duration = time.time() - speech_start_time if speech_start_time else 0

                    remaining = SILENCE_DURATION - silence_duration
                    if remaining > 0:
                        print(f"⏸️  Pause detected... ({remaining:.1f}s)       ", end='\r')
                        sys.stdout.flush()

                    if silence_duration >= SILENCE_DURATION or speech_duration >= MAX_SPEECH_DURATION:
                        if len(speech_buffer) > 0 and speech_duration >= MIN_SPEECH_DURATION:
                            full_audio = b''.join(speech_buffer)
                            transcription_queue.put((full_audio, speech_duration))

                            print(f"📋 Queued for transcription ({speech_duration:.1f}s)    ", end='\r')
                            sys.stdout.flush()

                        speech_buffer = []
                        is_speaking = False
                        silence_start = None
                        speech_start_time = None

        process.terminate()
        process.wait()

    except FileNotFoundError:
        print("Error: ffmpeg not found. Install with: brew install ffmpeg", file=sys.stderr)
    except Exception as e:
        print(f"Capture error: {e}", file=sys.stderr)


def main():
    global is_recording

    print("=" * 70)
    print("Real-time Speech-to-Text with Question Detection")
    print("=" * 70)
    print(f"\nModel: {WHISPER_MODEL}")
    print(f"Web Interface: {WEB_SERVER_URL}")
    print(f"\nSettings:")
    print(f"  - Silence detection: {SILENCE_DURATION}s")
    print(f"  - Min speech: {MIN_SPEECH_DURATION}s")
    print(f"  - Max speech: {MAX_SPEECH_DURATION}s")
    print(f"\n👉 Open {WEB_SERVER_URL} in your browser to see the web interface")
    print(f"\nPress Ctrl+C to stop\n")

    # Start transcription worker thread
    transcription_thread = threading.Thread(target=transcription_worker, daemon=True)
    transcription_thread.start()

    # Start audio capture thread
    capture_thread = threading.Thread(target=capture_audio, daemon=True)
    capture_thread.start()

    try:
        capture_thread.join()
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping...")
        is_recording = False

        print("⏳ Processing remaining transcriptions...")
        transcription_queue.join()

        transcription_queue.put(None)
        transcription_thread.join(timeout=5)

        print("\n✓ Done!")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        is_recording = False


if __name__ == "__main__":
    main()
