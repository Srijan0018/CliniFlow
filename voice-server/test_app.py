"""Run:  ASR_BACKEND=mock pytest -q"""
import os

os.environ.setdefault("ASR_BACKEND", "mock")

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)

CASES = [
    # (lang, what the patient says, expected department)
    ("en", "where is the pharmacy", "pharmacy"),
    ("en", "where is the farmacy", "pharmacy"),
    ("en", "i need to go to x ray", "xray"),
    ("en", "where is the blood bank", "blood_bank"),
    ("en", "where can i give blood test", "laboratory"),
    ("en", "heart doctor", "cardiology"),
    ("en", "my father needs heart surgery", "cardiac_surgery"),
    ("en", "eye doctor please", "ophthalmology"),
    ("en", "where is the washroom", "toilet"),
    ("en", "emergancy", "emergency"),
    ("en", "i want to pay the bill", "billing"),
    ("en", "where is the dentist", "dental"),
    ("en", "ENT department", "ent"),
    ("en", "where is the lift", "lift"),
    ("en", "ct scan", "ct_mri"),
    ("en", "where is ultrasound", "ultrasound"),
    ("hi", "दवाई कहाँ मिलेगी", "pharmacy"),
    ("hi", "एक्स रे कहाँ होता है", "xray"),
    ("hi", "टॉयलेट किधर है", "toilet"),
    ("hi", "बच्चों के डॉक्टर कहाँ हैं", "pediatrics"),
    ("hi", "दिल के डॉक्टर", "cardiology"),
    ("hi", "ब्लड बैंक कहाँ है", "blood_bank"),
    ("hi", "कैंटीन कहाँ है", "canteen"),
    ("hi", "बिल कहाँ भरना है", "billing"),
    ("kn", "ಫಾರ್ಮಸಿ ಎಲ್ಲಿದೆ", "pharmacy"),
    ("kn", "ಫಾರ್ಮಸಿಯಲ್ಲಿ ಔಷಧ ಸಿಗುತ್ತಾ", "pharmacy"),
    ("kn", "ಕಣ್ಣಿನ ಡಾಕ್ಟರ್ ಎಲ್ಲಿ", "ophthalmology"),
    ("kn", "ಎಕ್ಸರೆ ಎಲ್ಲಿ ಮಾಡ್ತಾರೆ", "xray"),
    ("kn", "ಟಾಯ್ಲೆಟ್ ಎಲ್ಲಿದೆ", "toilet"),
    ("kn", "ಮಕ್ಕಳ ಡಾಕ್ಟರ್", "pediatrics"),
    ("kn", "ಬಿಲ್ ಕಟ್ಟಬೇಕು", "billing"),
    ("kn", "ಹೃದಯದ ಡಾಕ್ಟರ್", "cardiology"),
    ("ml", "ഫാർമസി എവിടെയാണ്", "pharmacy"),
    ("ml", "മരുന്ന് എവിടെ കിട്ടും", "pharmacy"),
    ("ml", "എക്സ്-റേ എവിടെ", "xray"),
    ("ml", "ടോയ്‌ലറ്റ് എവിടെ", "toilet"),
    ("ml", "കണ്ണിന്റെ ഡോക്ടർ", "ophthalmology"),
    ("ml", "കാന്റീൻ എവിടെ", "canteen"),
    ("tcy", "ಫಾರ್ಮಸಿ ಓಲು ಉಂಡು", "pharmacy"),
    ("tcy", "ಮರ್ದ್ ಓಲು ತಿಕ್ಕುಂಡು", "pharmacy"),
    ("tcy", "ಎಕ್ಸ್ ರೇ ಓಲು", "xray"),
    ("tcy", "ಟಾಯ್ಲೆಟ್ ಓಲು ಉಂಡು", "toilet"),
    ("tcy", "ಎಮರ್ಜೆನ್ಸಿ ಓಲು", "emergency"),
    # code-mixed
    ("kn", "pharmacy ಎಲ್ಲಿದೆ", "pharmacy"),
    ("hi", "x ray कहाँ है", "xray"),
]


@pytest.mark.parametrize("lang,text,expected", CASES)
def test_understands(lang, text, expected):
    r = client.post("/ask", data={"lang": lang, "text": text}).json()
    got = r["destination"]["id"] if r["destination"] else None
    assert got == expected, (text, r["match"], [a["id"] for a in r["alternatives"]])
    assert r["reply_text"]


@pytest.mark.parametrize("text", ["hello how are you", "what is the time", "ok thank you", "ಹೇಗಿದ್ದೀರಾ"])
def test_rejects_unrelated(text):
    r = client.post("/ask", data={"lang": "en", "text": text}).json()
    assert r["destination"] is None, r["match"]
    assert "Sorry" in r["reply_text"] or r["reply_text"]


@pytest.mark.parametrize("lang", ["en", "hi", "kn", "ml", "tcy"])
def test_reply_in_language(lang):
    r = client.post("/ask", data={"lang": lang, "text": "pharmacy"}).json()
    assert r["destination"]["id"] == "pharmacy"
    assert "{" not in r["reply_text"]
    print(lang, r["reply_text"])


def test_departments_list():
    r = client.get("/departments", params={"lang": "kn"}).json()
    assert len(r["departments"]) >= 60
    assert all(d["name"] for d in r["departments"])


def test_bad_lang():
    assert client.post("/ask", data={"lang": "fr", "text": "x"}).status_code == 400


def test_health():
    assert client.get("/health").json()["status"] == "ok"
