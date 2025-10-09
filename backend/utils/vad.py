"""
Voice Activity Detection utilities
"""
import numpy as np
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Try to import torch for Silero VAD
try:
    import torch
    torch.set_num_threads(1)
    SILERO_AVAILABLE = True
except ImportError:
    SILERO_AVAILABLE = False


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

    def is_speech(self, audio_chunk, sample_rate=16000, threshold=0.5):
        """Check if audio chunk contains speech"""
        audio_array = np.frombuffer(audio_chunk, dtype=np.int16)
        audio_float = audio_array.astype(np.float32) / 32768.0
        audio_tensor = torch.from_numpy(audio_float)

        with torch.no_grad():
            speech_prob = self.model(audio_tensor, sample_rate).item()

        return speech_prob > threshold, speech_prob


class EnergyVAD:
    """Fallback energy-based VAD"""
    def __init__(self, threshold=300):
        self.threshold = threshold
        print(f"Using energy-based VAD (threshold: {threshold})\n")

    def is_speech(self, audio_chunk, sample_rate=16000, threshold=None):
        """Check if audio chunk contains speech based on energy"""
        if threshold is None:
            threshold = self.threshold

        audio_array = np.frombuffer(audio_chunk, dtype=np.int16)
        if len(audio_array) == 0:
            return False, 0.0

        energy = np.sqrt(np.mean(audio_array.astype(np.float32) ** 2))
        return energy > threshold, energy / 1000.0


def get_vad(vad_threshold=0.5):
    """Get appropriate VAD based on availability"""
    try:
        if SILERO_AVAILABLE:
            return SileroVAD()
        else:
            return EnergyVAD()
    except Exception as e:
        print(f"VAD initialization error: {e}")
        return EnergyVAD()
