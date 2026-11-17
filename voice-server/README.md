# SraVaani voice server (optional)

Better speech recognition for Kannada, Hindi, Malayalam and Tulu than the browser's own recogniser.
The navigator works without it.

```bash
sudo apt install -y ffmpeg
pip install -r requirements.txt
export HF_TOKEN=hf_xxx          # accept the terms at huggingface.co/ARTPARK-IISc/SraVaani first
uvicorn app:app --host 0.0.0.0 --port 8000
```
No GPU? Use Google Colab (free T4 GPU) and a cloudflared tunnel to get an https link.
Then open the navigator once with `?api=https://<that-link>`.

* `POST /ask` (form `lang` + `audio` or `text`) returns the department and a spoken reply.
* `departments.json` holds the departments and keywords in 5 languages. After editing it, re-run
  `python ../tools/build_hospital_data.py` so the map and the server use the same data.
* Tests: `ASR_BACKEND=mock pytest -q`
