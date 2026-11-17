"""
Hospital navigation voice assistant - API server.

  POST /ask            lang + audio (any format) or text  ->  department + spoken reply
  GET  /departments    full list in a language (for the tap-to-choose fallback)
  GET  /health         server + model status
  POST /reload         re-read departments.json after editing (needs ADMIN_TOKEN)

Run:  uvicorn app:app --host 0.0.0.0 --port 8000
"""

import os
import tempfile
import time

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from asr import load_asr, to_wav16k
from matcher import LANGS, Matcher

HERE = os.path.dirname(os.path.abspath(__file__))
DEPT_FILE = os.environ.get("DEPARTMENTS_FILE", os.path.join(HERE, "departments.json"))
AUDIO_DIR = os.environ.get("AUDIO_DIR", os.path.join(HERE, "audio"))
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
MAX_UPLOAD = 5 * 1024 * 1024

matcher = Matcher(DEPT_FILE)
asr = load_asr()

app = FastAPI(title="Hospital Voice Navigation")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
os.makedirs(AUDIO_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")
# website widget + demo page:  http://SERVER:8000/web/
app.mount("/web", StaticFiles(directory=os.path.join(HERE, "web"), html=True), name="web")


@app.get("/", include_in_schema=False)
def home():
    from fastapi.responses import RedirectResponse
    return RedirectResponse("/web/")


def check_lang(lang: str) -> str:
    lang = (lang or "en").lower()
    if lang not in LANGS:
        raise HTTPException(400, f"lang must be one of {LANGS}")
    return lang


def recorded_clip(lang: str, key: str):
    """Pre-recorded reply: audio/<lang>/<key>.mp3|.wav|.m4a (e.g. audio/tcy/pharmacy.mp3)."""
    for ext in (".mp3", ".m4a", ".wav"):
        if os.path.exists(os.path.join(AUDIO_DIR, lang, key + ext)):
            return f"/audio/{lang}/{key}{ext}"
    return None


@app.get("/health")
def health():
    return {"status": "ok", "asr": asr.name, "departments": len(matcher.depts), "languages": LANGS}


@app.get("/departments")
def departments(lang: str = "en", include_unavailable: bool = False):
    lang = check_lang(lang)
    items = [matcher.describe(i, lang) for i in matcher.depts]
    if not include_unavailable:
        items = [d for d in items if d["available"]]
    return {"lang": lang, "departments": items}


@app.get("/departments/{dept_id}")
def department(dept_id: str, lang: str = "en"):
    lang = check_lang(lang)
    if dept_id not in matcher.depts:
        raise HTTPException(404, "unknown department")
    return {**matcher.describe(dept_id, lang),
            "reply_text": matcher.reply(dept_id, lang),
            "reply_audio": recorded_clip(lang, dept_id)}


@app.post("/ask")
async def ask(lang: str = Form("en"), audio: UploadFile | None = File(None), text: str = Form("")):
    lang = check_lang(lang)
    t0 = time.perf_counter()
    heard = text.strip()

    if not heard and audio is not None:
        data = await audio.read()
        if len(data) > MAX_UPLOAD:
            raise HTTPException(413, "recording too long")
        suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
        src = tempfile.NamedTemporaryFile(suffix=suffix, delete=False).name
        with open(src, "wb") as f:
            f.write(data)
        wav = None
        try:
            wav = to_wav16k(src)
            heard = asr.transcribe(wav)
        except Exception as e:
            raise HTTPException(500, f"could not process audio: {e}")
        finally:
            for p in {src, wav}:
                if p and os.path.exists(p):
                    os.remove(p)
    t_asr = time.perf_counter()

    best, alternatives = matcher.match(heard, lang) if heard else (None, [])
    dept_id = best.dept_id if best else None

    return {
        "lang": lang,
        "heard": heard,
        "understood": dept_id is not None,
        "destination": matcher.describe(dept_id, lang) if dept_id else None,
        "alternatives": [matcher.describe(a, lang) for a in alternatives],
        "reply_text": matcher.reply(dept_id, lang),
        "reply_audio": recorded_clip(lang, dept_id or "not_understood"),
        "match": {"keyword": best.keyword, "score": round(best.score, 1)} if best else None,
        "timing_ms": {"asr": round((t_asr - t0) * 1000), "total": round((time.perf_counter() - t0) * 1000)},
    }


@app.post("/reload")
def reload(x_admin_token: str = Header("")):
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(403, "set ADMIN_TOKEN on the server and send it as X-Admin-Token")
    matcher.reload()
    return {"status": "reloaded", "departments": len(matcher.depts)}
