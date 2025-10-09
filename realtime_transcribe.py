"""
Enhanced Real-time Speech-to-Text using mlx-whisper
- Silero VAD for accurate voice activity detection
- Non-blocking transcription with queue system
- Better Whisper model (base)
- Timestamps and file logging
- Real-time display with confidence scores
- Post-processing for better text quality
"""

import mlx_whisper
import subprocess
import sys
import threading
import tempfile
import os
import time
import warnings
import numpy as np
import queue
from datetime import datetime
from pathlib import Path
import re

# Suppress warnings
warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Configuration
SAMPLE_RATE = 16000
CHUNK_DURATION = 0.096  # ~96ms chunks for Silero VAD (requires specific chunk sizes)
MIN_SPEECH_DURATION = 0.3
MAX_SPEECH_DURATION = 30
SILENCE_DURATION = 0.6
WHISPER_MODEL = "mlx-community/whisper-medium"  # Better accuracy

# Silero VAD settings
VAD_THRESHOLD = 0.5  # Probability threshold for speech detection (0-1)

# File logging
LOG_FILE = f"transcription_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"

# Global flags
is_recording = True
transcription_queue = queue.Queue()

# Try to import Silero VAD
try:
    import torch
    torch.set_num_threads(1)  # Limit CPU usage
    SILERO_AVAILABLE = True
except ImportError:
    SILERO_AVAILABLE = False
    print("⚠️  Warning: torch not available. Install with: pip install torch")
    print("   Falling back to energy-based VAD\n")


class SileroVAD:
    """Wrapper for Silero VAD model"""
    def __init__(self):
        if not SILERO_AVAILABLE:
            raise ImportError("torch is required for Silero VAD")
        
        print("Loading Silero VAD model...")
        self.model, utils = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            onnx=False
        )
        self.get_speech_timestamps = utils[0]
        self.model.eval()
        print("✓ Silero VAD loaded\n")
    
    def is_speech(self, audio_chunk):
        """Check if audio chunk contains speech"""
        # Convert bytes to tensor
        audio_array = np.frombuffer(audio_chunk, dtype=np.int16)
        audio_float = audio_array.astype(np.float32) / 32768.0  # Normalize to [-1, 1]
        audio_tensor = torch.from_numpy(audio_float)
        
        # Get speech probability
        with torch.no_grad():
            speech_prob = self.model(audio_tensor, SAMPLE_RATE).item()
        
        return speech_prob > VAD_THRESHOLD, speech_prob


class EnergyVAD:
    """Fallback energy-based VAD"""
    def __init__(self, threshold=300):
        self.threshold = threshold
        print(f"Using energy-based VAD (threshold: {threshold})\n")
    
    def is_speech(self, audio_chunk):
        """Check if audio chunk contains speech based on energy"""
        audio_array = np.frombuffer(audio_chunk, dtype=np.int16)
        if len(audio_array) == 0:
            return False, 0.0
        
        energy = np.sqrt(np.mean(audio_array.astype(np.float32) ** 2))
        return energy > self.threshold, energy / 1000.0  # Normalize for display


def post_process_text(text):
    """Post-process transcribed text for better quality"""
    if not text:
        return text
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]
    
    # Add period at end if missing punctuation
    if text and text[-1] not in '.!?':
        text += '.'
    
    # Fix common transcription issues
    text = text.replace(' i ', ' I ')
    text = re.sub(r'\bi\b', 'I', text)  # Standalone 'i' to 'I'
    
    # Fix spacing around punctuation
    text = re.sub(r'\s+([,.!?])', r'\1', text)
    
    return text


def log_transcription(text, timestamp, confidence=None):
    """Save transcription to file with timestamp"""
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            time_str = timestamp.strftime('%Y-%m-%d %H:%M:%S')
            if confidence is not None:
                f.write(f"[{time_str}] ({confidence:.2f}) {text}\n")
            else:
                f.write(f"[{time_str}] {text}\n")
    except Exception as e:
        print(f"⚠️  Logging error: {e}", file=sys.stderr)


def transcription_worker():
    """Separate thread for transcription to avoid blocking audio capture"""
    print("Transcription worker started\n")
    
    while is_recording or not transcription_queue.empty():
        try:
            # Get audio data from queue with timeout
            audio_data = transcription_queue.get(timeout=0.5)
            
            if audio_data is None:  # Poison pill to stop worker
                break
            
            audio_bytes, speech_duration = audio_data
            
            # Show processing indicator
            print("✍️  Transcribing...   ", end='\r')
            sys.stdout.flush()
            
            # Save audio to temporary WAV file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_audio:
                temp_path = temp_audio.name
                
                # Create WAV file using ffmpeg
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
                # Transcribe with Whisper
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
                    # Post-process text
                    text = post_process_text(text)
                    
                    # Get timestamp
                    timestamp = datetime.now()
                    time_str = timestamp.strftime('%H:%M:%S')
                    
                    # Calculate approximate confidence (if available in segments)
                    confidence = None
                    if "segments" in result and result["segments"]:
                        # Average confidence across segments
                        confidences = [seg.get("no_speech_prob", 0) for seg in result["segments"]]
                        if confidences:
                            confidence = 1.0 - (sum(confidences) / len(confidences))
                    
                    # Display with timestamp and confidence
                    if confidence is not None:
                        print(f"📝 [{time_str}] ({confidence:.0%}) {text}                    ")
                    else:
                        print(f"📝 [{time_str}] {text}                    ")
                    sys.stdout.flush()
                    
                    # Log to file
                    log_transcription(text, timestamp, confidence)
                else:
                    print("💤 Waiting for speech...", end='\r')
                    sys.stdout.flush()
                    
            except Exception as e:
                print(f"❌ Transcription error: {e}        ")
                sys.stdout.flush()
            finally:
                # Clean up temp file
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
    try:
        if SILERO_AVAILABLE:
            vad = SileroVAD()
        else:
            vad = EnergyVAD()
    except Exception as e:
        print(f"VAD initialization error: {e}")
        vad = EnergyVAD()
    
    print("🎤 Listening continuously... Speak naturally.\n")
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
        last_speech_prob = 0.0
        
        print("💤 Waiting for speech...", end='\r')
        sys.stdout.flush()
        
        while is_recording:
            # Read audio chunk
            audio_chunk = process.stdout.read(chunk_size_bytes)
            
            if len(audio_chunk) < chunk_size_bytes:
                break
            
            # Check for speech with VAD
            try:
                speech_detected, speech_prob = vad.is_speech(audio_chunk)
                last_speech_prob = speech_prob
            except Exception as e:
                print(f"VAD error: {e}", file=sys.stderr)
                speech_detected = False
                speech_prob = 0.0
            
            if speech_detected:
                # Speech detected
                if not is_speaking:
                    is_speaking = True
                    speech_start_time = time.time()
                    print(f"🗣️  Speaking... (confidence: {speech_prob:.0%})       ", end='\r')
                    sys.stdout.flush()
                
                speech_buffer.append(audio_chunk)
                silence_start = None
                
            else:
                # Silence detected
                if is_speaking:
                    speech_buffer.append(audio_chunk)  # Keep recording during short pauses
                    
                    if silence_start is None:
                        silence_start = time.time()
                    
                    silence_duration = time.time() - silence_start
                    speech_duration = time.time() - speech_start_time if speech_start_time else 0
                    
                    # Show waiting for pause indicator
                    remaining = SILENCE_DURATION - silence_duration
                    if remaining > 0:
                        print(f"⏸️  Pause detected... ({remaining:.1f}s)       ", end='\r')
                        sys.stdout.flush()
                    
                    # Transcribe if silence threshold reached or max duration exceeded
                    if silence_duration >= SILENCE_DURATION or speech_duration >= MAX_SPEECH_DURATION:
                        if len(speech_buffer) > 0 and speech_duration >= MIN_SPEECH_DURATION:
                            # Combine audio chunks
                            full_audio = b''.join(speech_buffer)
                            
                            # Add to transcription queue (non-blocking)
                            transcription_queue.put((full_audio, speech_duration))
                            
                            print(f"📋 Queued for transcription ({speech_duration:.1f}s)    ", end='\r')
                            sys.stdout.flush()
                        
                        # Reset for next phrase
                        speech_buffer = []
                        is_speaking = False
                        silence_start = None
                        speech_start_time = None
        
        # Terminate ffmpeg
        process.terminate()
        process.wait()
        
    except FileNotFoundError:
        print("Error: ffmpeg not found. Install with: brew install ffmpeg", file=sys.stderr)
    except Exception as e:
        print(f"Capture error: {e}", file=sys.stderr)


def main():
    global is_recording
    
    print("=" * 70)
    print("Enhanced Real-time Speech-to-Text Transcription")
    print("=" * 70)
    print(f"\nModel: {WHISPER_MODEL}")
    print(f"VAD: {'Silero (ML-based)' if SILERO_AVAILABLE else 'Energy-based'}")
    print(f"Output file: {LOG_FILE}")
    print(f"\nSettings:")
    print(f"  - Silence detection: {SILENCE_DURATION}s")
    print(f"  - Min speech: {MIN_SPEECH_DURATION}s")
    print(f"  - Max speech: {MAX_SPEECH_DURATION}s")
    print(f"\nPress Ctrl+C to stop\n")
    
    # Start transcription worker thread
    transcription_thread = threading.Thread(target=transcription_worker, daemon=True)
    transcription_thread.start()
    
    # Start audio capture thread
    capture_thread = threading.Thread(target=capture_audio, daemon=True)
    capture_thread.start()
    
    try:
        # Keep main thread alive
        capture_thread.join()
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping...")
        is_recording = False
        
        # Wait for queue to empty
        print("⏳ Processing remaining transcriptions...")
        transcription_queue.join()
        
        # Stop worker thread
        transcription_queue.put(None)  # Poison pill
        transcription_thread.join(timeout=5)
        
        print(f"\n✓ Transcription saved to: {LOG_FILE}")
        print("Done!")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        is_recording = False


if __name__ == "__main__":
    main()
