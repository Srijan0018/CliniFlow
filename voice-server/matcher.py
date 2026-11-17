"""
Turns a transcript ("ಫಾರ್ಮಸಿ ಎಲ್ಲಿದೆ", "dawai kahan milegi", "where is x ray") into a
department id, and builds the spoken reply. Pure Python - no ML model needed.
"""

import json
import re
import unicodedata
from dataclasses import dataclass

from rapidfuzz import fuzz

LANGS = ["en", "hi", "kn", "ml", "tcy"]
MIN_SCORE = 82          # below this we say "didn't understand"
SHORT_KEYWORD = 4       # keywords shorter than this (e.g. "ent", "icu", "दिल") must match a whole word exactly

_SPLIT = re.compile(r"[\s,.;:!?\"'()\[\]{}।॥/\\|_-]+")
_INVISIBLE = dict.fromkeys(map(ord, "​‌‍﻿"), None)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFC", s).translate(_INVISIBLE).lower()
    return " ".join(t for t in _SPLIT.split(s) if t)


@dataclass
class Match:
    dept_id: str
    score: float
    keyword: str
    keyword_lang: str


class Matcher:
    def __init__(self, path: str):
        self.path = path
        self.reload()

    # ------------------------------------------------------------------ data
    def reload(self):
        with open(self.path, encoding="utf-8") as f:
            data = json.load(f)
        self.messages = data["messages"]
        self.depts = {d["id"]: d for d in data["departments"]}
        self.index = []  # (normalized keyword, tokens, dept_id, lang)
        for d in data["departments"]:
            seen = set()
            for lang, words in d["keywords"].items():
                for w in list(words) + [d["names"].get(lang, "")]:
                    k = norm(w)
                    if k and (k, lang) not in seen:
                        seen.add((k, lang))
                        self.index.append((k, k.split(), d["id"], lang))

    # ------------------------------------------------------------------ matching
    @staticmethod
    def _score(kw: str, kw_toks: list, toks: list) -> float:
        n = len(kw_toks)
        best = 0.0
        for i in range(len(toks) - n + 1):
            g = toks[i:i + n]
            gram = " ".join(g)
            if gram == kw:
                return 100.0
            # Kannada / Malayalam / Tulu add suffixes: ಫಾರ್ಮಸಿ + ಯಲ್ಲಿ, മരുന്ന് + ിന്റെ
            if g[:-1] == kw_toks[:-1] and len(kw_toks[-1]) >= 3 and g[-1].startswith(kw_toks[-1]):
                best = max(best, 95.0)
                continue
            if len(kw) < SHORT_KEYWORD:
                continue
            # multi-word keyword: every word must be close, so "a doctor" doesn't match "baby doctor"
            if n > 1 and any(fuzz.ratio(a, b) < 70 for a, b in zip(kw_toks, g)):
                continue
            s = max(
                fuzz.ratio(kw, gram),
                fuzz.ratio(kw, gram[:len(kw)]) * 0.97,                    # small suffix
                fuzz.ratio(kw.replace(" ", ""), gram.replace(" ", "")),   # "x ray" vs "xray"
            )
            best = max(best, s)
        # the transcript may join words that the keyword splits ("ಹೆಲ್ತ್ಚೆಕಪ್")
        if n > 1 and len(kw) >= 6:
            joined = kw.replace(" ", "")
            for t in toks:
                if t == joined or t.startswith(joined):
                    best = max(best, 95.0)
        return best

    def match(self, text: str, lang: str, top: int = 3):
        toks = norm(text).split()
        if not toks:
            return None, []
        per_dept = {}
        for kw, kw_toks, dept_id, kw_lang in self.index:
            s = self._score(kw, kw_toks, toks)
            if s < MIN_SCORE - 10:
                continue
            if kw_lang == lang:
                s += 3  # prefer the patient's chosen language
            key = (s, len(kw))  # tie-break: longer, more specific keyword wins ("blood bank" over "bank")
            cur = per_dept.get(dept_id)
            if cur is None or key > (cur.score, len(cur.keyword)):
                per_dept[dept_id] = Match(dept_id, s, kw, kw_lang)
        ranked = sorted(per_dept.values(), key=lambda m: (m.score, len(m.keyword)), reverse=True)
        best = ranked[0] if ranked and ranked[0].score >= MIN_SCORE else None
        if best and best.score >= 100:
            alternatives = []  # exact match - no "did you mean"
        else:
            alternatives = [m.dept_id for m in ranked[:top + 1]
                            if m.score >= MIN_SCORE - 6 and (not best or m.dept_id != best.dept_id)][:top]
        return best, alternatives

    # ------------------------------------------------------------------ replies
    def floor_text(self, floor, lang: str) -> str:
        f = self.messages["floor"].get(lang) or self.messages["floor"]["en"]
        if floor is None:
            return ""
        return f.get(str(floor)) or f["n"].format(n=floor)

    def name(self, dept_id: str, lang: str) -> str:
        d = self.depts[dept_id]
        return d["names"].get(lang) or d["names"]["en"]

    def reply(self, dept_id, lang: str) -> str:
        msg = self.messages
        if dept_id is None:
            return msg["not_understood"].get(lang) or msg["not_understood"]["en"]
        d = self.depts[dept_id]
        name = self.name(dept_id, lang)
        if not d.get("available", True):
            return (msg["unavailable"].get(lang) or msg["unavailable"]["en"]).format(name=name)
        custom = (d.get("directions") or {}).get(lang)
        if custom:
            text = custom
        else:
            tpl = msg["found"].get(lang) or msg["found"]["en"]
            text = tpl.format(name=name, floor=self.floor_text(d.get("floor"), lang), place=d.get("place", ""))
        if dept_id == "emergency":
            text = (msg["emergency_prefix"].get(lang) or "") + text
        return text

    def describe(self, dept_id: str, lang: str) -> dict:
        d = self.depts[dept_id]
        return {
            "id": dept_id,
            "type": d.get("type"),
            "name": self.name(dept_id, lang),
            "name_en": d["names"]["en"],
            "floor": d.get("floor"),
            "floor_text": self.floor_text(d.get("floor"), lang),
            "place": d.get("place", ""),
            "available": d.get("available", True),
            "map_node": d.get("map_node", dept_id),
        }
