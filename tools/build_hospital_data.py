"""
Builds docs/data/hospital.js - the CliniFlow hospital CAMPUS used by the 3D navigator:

    Main & Emergency Block   (Basement + Ground + 5 floors)
    Outpatient (OPD) Block   (Ground + 3 floors)
    Administrative Block     (Ground + 2 floors)
    + Main Gate, covered walkways, visitor parking, ambulance bay

    python tools/build_hospital_data.py

Department names/keywords in 5 languages come from voice-server/departments.json, so voice search,
typed search and the voice server all use the same department ids. To move a department, edit the
BLOCKS table below and re-run. Units are metres; x = west -> east, y = south -> north.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPTS_FILE = os.path.join(ROOT, "voice-server", "departments.json")
OUT = os.path.join(ROOT, "docs", "data", "hospital.js")
LANGS = ["en", "hi", "kn", "ml", "tcy"]
FLOOR_ORDER = ["B", "G", "1", "2", "3", "4", "5"]
CORR_HALF = 1.5        # corridors are 3 m wide
LOBBY_W = 8.0          # entrance lobby width (east/west entrances)
TOILET_W = 4.5

F = lambda dept=None, label=None, w=1.0, extra=(): (dept, label, w, list(extra))

# ------------------------------------------------------------------------------------------------
# Each block: rectangle, entrance side, floors. Rooms per floor are given per row:
#   "S" = south row, "N" = north row. A row is split into a west part and an east part by the
#   lobby/core when the entrance is in the middle ("south"), so those rows take two lists.
# ------------------------------------------------------------------------------------------------
BLOCKS = [
    {
        "id": "A", "name": "Administrative Block", "badge": "C", "short": "Admin Block", "sign": "ADMINISTRATIVE BLOCK",
        "names": {"en": "Administrative Block", "hi": "प्रशासनिक भवन", "kn": "ಆಡಳಿತ ಕಟ್ಟಡ", "ml": "ഭരണ ബ്ലോക്ക്", "tcy": "ಆಡಳಿತ ಕಟ್ಟಡ"},
        "rect": (2.0, 6.0, 40.0, 22.0), "entrance": "east", "color": 0xE8E2D4,
        "lobby": {"G": ("Admin Lobby & Reception", ["reception"])},
        "floors": {
            "G": {"S": [F("billing"), F("insurance"), F("admission"), F("medical_records"), F("patient_relations")],
                  "N": [F("canteen", w=2), F("atm"), F("security")]},
            "1": {"S": [F("administration", w=2), F("hr"), F("accounts"), F("nursing_office")],
                  "N": [F("prayer_room"), F(None, "Record Room"), F(None, "Store")]},
            "2": {"S": [F("conference_hall", w=2), F("it_department"), F("library", w=2)],
                  "N": [F(None, "Server Room"), F(None, "Board Room"), F(None, "Store")]},
        },
    },
    {
        "id": "O", "name": "Outpatient (OPD) Block", "badge": "B", "short": "OPD Block", "sign": "OUTPATIENT (OPD) BLOCK",
        "names": {"en": "Outpatient (OPD) Block", "hi": "ओपीडी भवन", "kn": "ಹೊರರೋಗಿ (ಒಪಿಡಿ) ಕಟ್ಟಡ", "ml": "ഒപി ബ്ലോക്ക്", "tcy": "ಒಪಿಡಿ ಕಟ್ಟಡ"},
        "rect": (78.0, 4.0, 44.0, 26.0), "entrance": "west", "color": 0xDDE8F0,
        "lobby": {"G": ("OPD Lobby & Waiting Area", ["reception", "waiting_area"])},
        "floors": {
            "G": {"S": [F("opd_registration", w=1.5), F("pharmacy", w=1.5), F("laboratory", w=1.5), F("xray"), F("ultrasound")],
                  "N": [F("ecg_echo"), F("vaccination"), F("health_checkup")]},
            "1": {"S": [F("general_medicine"), F("general_surgery"), F("orthopedics"), F("pediatrics"), F("dermatology")],
                  "N": [F("ent"), F("ophthalmology"), F("dental")]},
            "2": {"S": [F("cardiology"), F("neurology"), F("nephrology"), F("urology"), F("gastroenterology")],
                  "N": [F("pulmonology"), F("endocrinology"), F("rheumatology")]},
            "3": {"S": [F("psychiatry"), F("neurosurgery"), F("cardiac_surgery"), F("plastic_surgery"), F("vascular_surgery")],
                  "N": [F("physiotherapy"), F("dietetics"), F("geriatrics")]},
        },
    },
    {
        "id": "M", "name": "Main & Emergency Block", "badge": "A", "short": "Main Block", "sign": "MAIN & EMERGENCY BLOCK",
        "names": {"en": "Main & Emergency Block", "hi": "मुख्य एवं आपातकालीन भवन", "kn": "ಮುಖ್ಯ ಮತ್ತು ತುರ್ತು ಕಟ್ಟಡ", "ml": "പ്രധാന-അത്യാഹിത ബ്ലോക്ക്", "tcy": "ಮುಖ್ಯ ಬೊಕ್ಕ ಎಮರ್ಜೆನ್ಸಿ ಕಟ್ಟಡ"},
        "rect": (18.0, 48.0, 84.0, 28.0), "entrance": "south", "color": 0xF1F3F4, "redCross": True,
        "lobby": {"G": ("Main Lobby & Reception", ["reception", "wheelchair"])},
        "floors": {
            "B": {"S": [[F("blood_bank"), F(None, "CSSD")], [F("mortuary"), F(None, "Central Stores")]],
                  "N": [[F(None, "Laundry"), F(None, "Kitchen")], [F(None, "Biomedical Waste"), F(None, "Generator Room")]]},
            "G": {"S": [[F("injection_room"), F("fever_clinic"), F(None, "Emergency Observation")],
                        [F("ct_mri"), F(None, "Medico-legal Desk"), F("emergency", "Emergency & Trauma", 2.5)]],
                  "N": [[F(None, "Doctors' Duty Room"), F(None, "Plaster Room")],
                        [F(None, "Minor OT"), F("emergency", "Emergency – Triage", 2)]]},
            "1": {"S": [[F("icu")], [F("operation_theatre", w=2), F(None, "Pre-op / Recovery")]],
                  "N": [[F("pain_clinic"), F(None, "ICU Nurse Station")], [F("cath_lab"), F(None, "Sterile Store")]]},
            "2": {"S": [[F("obstetrics_gynecology")], [F("labour_room", w=1.5), F("nicu_picu")]],
                  "N": [[F("ivf_fertility"), F(None, "Antenatal Ward")], [F(None, "Postnatal Ward"), F(None, "Nurse Station")]]},
            "3": {"S": [[F("dialysis")], [F("oncology", w=2), F("hematology")]],
                  "N": [[F("endoscopy"), F(None, "Day Care")], [F(None, "Chemotherapy Day Care"), F(None, "Nurse Station")]]},
            "4": {"S": [[F("wards", "General Ward (Male)")], [F("wards", "General Ward (Female)")]],
                  "N": [[F(None, "Nurse Station"), F(None, "Pantry")], [F("wards", "Semi-Private Rooms")]]},
            "5": {"S": [[F("wards", "Private Rooms")], [F("wards", "Deluxe Suites")]],
                  "N": [[F("wards", "Isolation Rooms")], [F(None, "Doctors' Duty Room"), F(None, "Linen Store")]]},
        },
    },
]

# outdoor, ground floor only: (id, name, type, rect, door, depts)
OUTDOOR = [
    ("G-MAINGATE", "Main Gate", "gate", (54.0, -12.0, 12.0, 6.0), (60.0, -6.0), ["exit"]),
    ("G-PARKING", "Visitor Parking", "outdoor", (22.0, 33.0, 24.0, 10.0), (46.0, 38.0), ["parking"]),
    ("G-AMBULANCE", "Ambulance Bay", "outdoor", (104.0, 56.0, 12.0, 12.0), (104.0, 62.0), ["ambulance"]),
]
# covered walkways (ground floor): spine from the gate to the Main Block, branches to the blocks
WALKWAYS = [
    [(60.0, -6.0), (60.0, 48.0)],    # Main Gate -> Main Block entrance
    [(42.0, 17.0), (60.0, 17.0)],    # Admin Block entrance -> spine
    [(60.0, 17.0), (78.0, 17.0)],    # spine -> OPD Block entrance
    [(46.0, 38.0), (60.0, 38.0)],    # parking -> spine
    [(102.0, 62.0), (104.0, 62.0)],  # Main Block east door -> ambulance bay
]

TYPE_OF = {}
for d in ["laboratory", "xray", "ct_mri", "ultrasound", "ecg_echo", "endoscopy", "cath_lab", "blood_bank"]:
    TYPE_OF[d] = "diagnostic"
for d in ["emergency", "ambulance", "fever_clinic"]:
    TYPE_OF[d] = "emergency"
for d in ["icu", "operation_theatre", "nicu_picu", "labour_room", "dialysis"]:
    TYPE_OF[d] = "critical"
TYPE_OF["wards"] = "ward"
for d in ["pharmacy", "billing", "insurance", "admission", "opd_registration", "medical_records", "canteen", "atm",
          "security", "prayer_room", "mortuary", "injection_room", "patient_relations"]:
    TYPE_OF[d] = "service"
for d in ["administration", "hr", "accounts", "nursing_office", "conference_hall", "it_department", "library"]:
    TYPE_OF[d] = "admin"

TYPES = {
    "clinic": [0x8FB3D9, "OPD / Clinic"], "diagnostic": [0x6CC4A1, "Diagnostics"], "emergency": [0xE57373, "Emergency"],
    "critical": [0xF0A35D, "ICU / OT"], "ward": [0xB39DDB, "Wards"], "service": [0xF2C879, "Services"],
    "admin": [0xA1887F, "Administration"], "staff": [0xD3D8DE, "Staff / Support"], "toilet": [0xB8C2CC, "Toilet"],
    "lobby": [0xD9DEE4, "Lobby"], "outdoor": [0xC5CCD3, "Outdoor"], "gate": [0x78909C, "Gate"],
    "stairs": [0x55606E, "Stairs"], "lift": [0x2F3A48, "Lift"],
}


def slug(s):
    return re.sub(r"[^A-Za-z0-9]+", "", s.title())[:14].upper()


def main():
    data = json.load(open(DEPTS_FILE, encoding="utf-8"))
    depts = {d["id"]: d for d in data["departments"]}
    placed = {"lift"}
    floors = {c: {"code": c, "rooms": [], "corridors": []} for c in FLOOR_ORDER}
    connectors, blocks_out = [], []

    def add_room(code, bid, dept, name_en, rect, door, rtype, extra=(), flat=False, rid=None):
        used = {r["id"] for r in floors[code]["rooms"]}
        base = rid or f"{bid}{code}-{(dept.upper() if dept else slug(name_en))}"
        rid, k = base, 2
        while rid in used:
            rid, k = f"{base}{k}", k + 1
        room = {"id": rid, "name": name_en, "type": rtype, "block": bid,
                "rect": [round(v, 2) for v in rect], "door": [round(door[0], 2), round(door[1], 2)]}
        ds = ([dept] if dept else []) + list(extra)
        if ds:
            room["dept"] = ds
            placed.update(ds)
        if dept:
            room["names"] = {l: (name_en if l == "en" else depts[dept]["names"].get(l, name_en)) for l in LANGS}
        if flat:
            room["landmark"] = True
        floors[code]["rooms"].append(room)
        return room

    def fill(code, bid, items, x0, x1, y0, y1, door_y):
        if not items or x1 - x0 < 1:
            return
        total = sum(w for *_, w, _ in items)
        x = x0
        for dept, lab, w, extra in items:
            wd = (x1 - x0) * w / total
            name = lab or depts[dept]["names"]["en"]
            add_room(code, bid, dept, name, (x, y0, wd, y1 - y0), (x + wd / 2, door_y),
                     TYPE_OF.get(dept, "clinic") if dept else "staff", extra)
            x += wd

    for blk in BLOCKS:
        bid = blk["id"]
        X0, Y0, W, D = blk["rect"]
        X1, Y1 = X0 + W, Y0 + D
        yc = Y0 + D / 2
        sS, sN = (Y0, yc - CORR_HALF), (yc + CORR_HALF, Y1)    # south / north rows
        codes = [c for c in FLOOR_ORDER if c in blk["floors"]]
        ent = blk["entrance"]

        # ---- fixed layout parts (same on every floor of the block) ----
        if ent in ("east", "west"):
            lob = (X1 - LOBBY_W, Y0, LOBBY_W, D) if ent == "east" else (X0, Y0, LOBBY_W, D)
            lob_door = (lob[0] + LOBBY_W / 2, yc)
            if ent == "east":   # core west of the lobby (north row); toilets + fire stairs at the west end
                lift_x, stairs_x = X1 - LOBBY_W - 2.6, X1 - LOBBY_W - 7.0
                toilet_x, fire_x = X0, X0 + TOILET_W
                free_S = [(X0 + TOILET_W, X1 - LOBBY_W)]
                free_N = [(X0 + TOILET_W + 4.0, stairs_x)]
            else:               # core east of the lobby; toilets + fire stairs at the east end
                lift_x, stairs_x = X0 + LOBBY_W, X0 + LOBBY_W + 2.6
                toilet_x, fire_x = X1 - TOILET_W, X1 - TOILET_W - 4.0
                free_S = [(X0 + LOBBY_W, X1 - TOILET_W)]
                free_N = [(stairs_x + 4.4, fire_x)]
            lifts = [(f"{bid}-L1", f"{blk['short']} Lift", lift_x, 2.6)]
            stairs = [(f"{bid}-STA", f"{blk['short']} Stairs", stairs_x, 4.4), (f"{bid}-STB", f"{blk['short']} Fire Exit Stairs", fire_x, 4.0)]
        else:  # entrance in the middle of the south side
            mid = (X0 + X1) / 2
            lob = (mid - 5.0, Y0, 10.0, yc - Y0)
            lob_door = (mid, Y0 + (yc - Y0) / 2)
            toilet_x = X0
            lifts = [(f"{bid}-L1", f"{blk['short']} Lift 1", mid - 5.0, 2.6), (f"{bid}-L2", f"{blk['short']} Bed Lift", mid - 2.4, 2.6)]
            stairs = [(f"{bid}-STA", f"{blk['short']} Stairs", mid + 0.2, 4.8), (f"{bid}-STB", f"{blk['short']} Fire Exit Stairs", X0 + TOILET_W, 4.0)]
            free_S = [(X0 + TOILET_W, mid - 5.0), (mid + 5.0, X1)]
            free_N = [(X0 + TOILET_W + 4.0, mid - 5.0), (mid + 5.0, X1)]

        for cid, name, x, w in lifts:
            connectors.append({"id": cid, "name": name, "kind": "lift", "block": bid, "floors": codes,
                               "rect": [round(x, 2), sN[0], w, round(sN[1] - sN[0], 2) / 2], "door": [round(x + w / 2, 2), sN[0]],
                               "costPerFloor": 3, "waitCost": 24})
        for cid, name, x, w in stairs:
            connectors.append({"id": cid, "name": name, "kind": "stairs", "block": bid, "floors": codes,
                               "rect": [round(x, 2), sN[0], w, round(sN[1] - sN[0], 2) / 2], "door": [round(x + w / 2, 2), sN[0]],
                               "costPerFloor": 14})

        for code in codes:
            spec = blk["floors"][code]
            floors[code]["corridors"].append({"a": [X0, yc], "b": [X1, yc], "zone": bid})
            lname, ldepts = blk["lobby"].get(code, ("Lift Lobby", []))
            lobby = add_room(code, bid, None, lname, lob, lob_door, "lobby", flat=True, rid=f"{bid}{code}-LOBBY")
            if ldepts:
                lobby["dept"] = ldepts
                placed.update(ldepts)
            add_room(code, bid, "toilet", "Gents' Toilet", (toilet_x, sS[0], TOILET_W, sS[1] - sS[0]), (toilet_x + TOILET_W / 2, sS[1]), "toilet")
            add_room(code, bid, "toilet", "Ladies' Toilet", (toilet_x, sN[0], TOILET_W, sN[1] - sN[0]), (toilet_x + TOILET_W / 2, sN[0]), "toilet")
            dw = (lob[0] + 0.3, lob[1] + 0.3, 2.0, 2.0)
            add_room(code, bid, "drinking_water", "Drinking Water", dw, (dw[0] + 1.0, dw[1] + 2.0), "toilet")
            for row, (ya, yb), door_y, free in (("S", sS, sS[1], free_S), ("N", sN, sN[0], free_N)):
                items = spec.get(row, [])
                parts = items if (items and isinstance(items[0], list)) else [items]
                if len(parts) == 1 and len(free) == 2:
                    # one list for a split row: share it across both parts by width
                    total_len = sum(b - a for a, b in free)
                    tot_w = sum(it[2] for it in parts[0])
                    acc, cut = 0.0, len(parts[0])
                    for i, it in enumerate(parts[0]):
                        if acc >= tot_w * (free[0][1] - free[0][0]) / total_len - 1e-9:
                            cut = i
                            break
                        acc += it[2]
                    parts = [parts[0][:cut], parts[0][cut:]]
                for (a, b), its in zip(free, parts):
                    fill(code, bid, its, a, b, ya, yb, door_y)

        blocks_out.append({
            "id": bid, "name": blk["name"], "short": blk["short"], "badge": blk.get("badge", ""), "names": blk["names"], "sign": blk["sign"],
            "floors": codes, "rect": [X0, Y0, W, D], "color": blk["color"], "redCross": bool(blk.get("redCross")),
            "entrance": ent, "outline": [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]],
        })

    # ---- outdoor places + walkways (ground floor) ----
    for rid, name, typ, rect, door, ds in OUTDOOR:
        add_room("G", None, None, name, rect, door, typ, extra=ds, flat=True, rid=rid)
        floors["G"]["rooms"][-1].pop("block")
    for a, b in WALKWAYS:
        floors["G"]["corridors"].append({"a": list(a), "b": list(b), "zone": "walkway"})
    # the Main Block's south entrance: walkway continues through the lobby to the block corridor
    m = next(b for b in BLOCKS if b["id"] == "M")
    mx, my = m["rect"][0] + m["rect"][2] / 2, m["rect"][1] + m["rect"][3] / 2
    floors["G"]["corridors"].append({"a": [mx, m["rect"][1]], "b": [mx, my], "zone": "M"})

    labels = {"B": "Basement", "G": "Ground"}
    floor_list = [{"code": c, "label": labels.get(c, c), "rooms": floors[c]["rooms"], "corridors": floors[c]["corridors"]}
                  for c in FLOOR_ORDER if floors[c]["rooms"]]
    missing = sorted(set(depts) - placed)

    building = {
        "name": "CliniFlow Hospital Campus", "campus": "CliniFlow Multispeciality Hospital",
        "FLOOR_HEIGHT": 3.6,
        "floorNames": {"B": "Basement", "G": "Ground floor"},
        "floorSpoken": {"B": "the basement", "G": "the ground floor"},
        "floorShort": {"B": "B", "G": "G"},
        "center": [58.0, 32.0],
        "view": {"dist": 185, "distNarrow": 270, "allDist": 290, "pan": [80, 60], "outsideDir": [0.0, 0.95, 1.0], "outsideDist": 195},
        "types": {k: {"color": v[0], "name": v[1]} for k, v in TYPES.items()},
        "flatTypes": ["lobby", "outdoor", "gate"],
        "legend": ["clinic", "diagnostic", "emergency", "critical", "ward", "service", "admin", "toilet", "lift"],
        "hints": {"west": "towards the west side", "east": "towards the east side", "north": "towards the north side", "south": "towards the south side"},
        "defaults": {"from": "MG-LOBBY", "to": None},
        # GPS anchor: the Main Gate's real position. Change lat/lng to your hospital's gate (Google Maps -> long-press -> copy).
        # rotation = how many degrees the campus "north" (y axis) is turned clockwise from true north.
        "geo": None,   # indoor navigation only. To try GPS later: {"lat": .., "lng": .., "x": 60.0, "y": -6.0, "rotation": 0}
        "brand": {
            "eyebrow": "CliniFlow Multispeciality Hospital", "title": "CliniFlow · Hospital Campus", "caption": "Hospital Campus",
            "gateSign": "CLINIFLOW HOSPITAL",
            "colors": {"wall": 0xE9ECEE, "band": 0xFFFFFF, "roof": 0xC9D1D6, "glass": 0x3A5A70, "curtain": 0x7FB3C8,
                       "frame": 0xF5F7F8, "sign": 0x1565C0, "signBack": 0x0D47A1, "ground": 0xB7C4A9},
            "qrBase": "https://srijan0018.github.io/CliniFlow/",
        },
        "blocks": blocks_out,
        "walkways": [[list(a), list(b)] for a, b in WALKWAYS],
        "outline": blocks_out[-1]["outline"],
        "corridors": [],
        "floors": floor_list, "connectors": connectors,
        "departments": {i: {"names": d["names"], "keywords": d["keywords"], "type": d.get("type")} for i, d in depts.items()},
        "messages": data["messages"],
    }
    js = ("/*\n * CliniFlow hospital campus - map data (generated by tools/build_hospital_data.py; edit BLOCKS there and re-run).\n"
          " * 3 blocks + outdoor walkways. Units: metres. x = west->east, y = south->north.\n"
          " * room.block = block id, room.dept = department ids from voice-server/departments.json.\n */\n"
          "window.BUILDING = " + json.dumps(building, ensure_ascii=False, indent=1) + ";\n")
    open(OUT, "w", encoding="utf-8").write(js)
    n = sum(len(f["rooms"]) for f in floor_list)
    print(f"{len(blocks_out)} blocks, {len(floor_list)} floor levels, {n} rooms, {len(connectors)} lifts/stairs -> {OUT}")
    for b in blocks_out:
        cnt = sum(1 for f in floor_list for r in f["rooms"] if r.get("block") == b["id"])
        print(f"  {b['name']}: floors {','.join(b['floors'])}, {cnt} rooms")
    print("departments without a room:", missing or "none")


if __name__ == "__main__":
    main()
