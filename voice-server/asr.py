"""
Speech-to-text with SraVaani (ARTPARK-IISc). Loaded once at server start.

ASR_BACKEND=sravaani (default)  -> real model, needs HF_TOKEN and the model terms accepted on Hugging Face
ASR_BACKEND=mock                -> no model; for testing the app without a GPU (send `text` instead of audio)
"""

import os
import shutil
import subprocess
import tempfile


def to_wav16k(src_path: str) -> str:
    """Convert any recording (m4a, aac, webm, 3gp, wav...) to 16 kHz mono WAV, max 15 s."""
    if not shutil.which("ffmpeg"):
        if src_path.lower().endswith(".wav"):
            return src_path  # hope it is already 16 kHz mono
        raise RuntimeError("ffmpeg is not installed on the server (apt install ffmpeg)")
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", src_path, "-t", "15",
         "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", out],
        check=True, timeout=30,
    )
    return out


class SraVaaniASR:
    name = "sravaani"

    def __init__(self):
        import torch
        from transformers import AutoModel

        self.torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        repo = os.environ.get("ASR_MODEL", "ARTPARK-IISc/SraVaani")
        self.model = AutoModel.from_pretrained(
            repo, trust_remote_code=True, token=os.environ.get("HF_TOKEN"),
        ).to(self.device).eval()
        if self.device == "cuda":
            self.model = self.model.half()
        # warm-up so the first patient doesn't wait for CUDA init
        try:
            import numpy as np, soundfile as sf
            tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
            sf.write(tmp, np.zeros(16000, dtype="float32"), 16000)
            self.transcribe(tmp)
            os.remove(tmp)
        except Exception:
            pass

    def transcribe(self, wav_path: str) -> str:
        with self.torch.no_grad():
            hyps = self.model.transcribe(wav_path, return_hypotheses=True)
        first = hyps[0] if isinstance(hyps, (list, tuple)) else hyps
        if isinstance(first, (list, tuple)) and first:
            first = first[0]
        return (getattr(first, "text", None) or str(first)).strip()


class MockASR:
    name = "mock"

    def transcribe(self, wav_path: str) -> str:
        return ""


def load_asr():
    backend = os.environ.get("ASR_BACKEND", "sravaani").lower()
    return MockASR() if backend == "mock" else SraVaaniASR()
