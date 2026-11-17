"""
Builds a complete sample hospital block (all floors) from departments.json:
rooms, corridor, lifts, stairs, toilets, and a walking graph for route-finding.

    python tools/build_layout.py                 -> writes web/layout.json
    python tools/build_layout.py --sync-places   -> also updates "place" in departments.json to match

Every department in departments.json gets a room on its floor, and its door is the route target
(same id as map_node). Re-run after editing departments.json. To use your real hospital later,
edit web/layout.json (room x/y/w/h in metres) or replace it - the map viewer only reads that file.
"""
import json
import sys
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LANGS = ["en", "hi", "kn", "ml", "tcy"]

# ---- geometry (metres) ---------------------------------------------------------------
W, H = 92.0, 32.0                 # floor outline
X0, X1 = 3.0, 89.0                # usable length
TOP = (3.0, 14.0)                 # top row of rooms: y from..to
BOT = (18.0, 29.0)                # bottom row of rooms
CY = 16.0                         # corridor centre line (corridor 14..18 = 4 m wide)
CORE = (41.0, 51.0)               # central core: lifts + stairs (top), toilets + water (bottom)
SEGMENTS = [("top", X0, CORE[0]), ("bot", X0, CORE[0]), ("top", CORE[1], X1), ("bot", CORE[1], X1)]

# Rooms that appear on EVERY floor (in the core). Routes go to the nearest one.
PER_FLOOR = {"lift", "toilet", "drinking_water"}
BIG = {"emergency": 2.2, "laboratory": 1.6, "opd_registration": 1.6, "waiting_area": 1.6, "icu": 2.0,
       "operation_theatre": 2.0, "canteen": 2.0, "parking": 2.6, "wards": 2.0, "obstetrics_gynecology": 1.5,
       "labour_room": 1.4, "cardiology": 1.4, "oncology": 1.6, "dialysis": 1.4, "physiotherapy": 1.3}

# Realistic ordering on the ground floor: lobby desks near the entrance (left end).
GROUND_ORDER = ["reception", "waiting_area", "opd_registration", "billing", "insurance", "admission", "atm",
                "emergency", "ambulance", "security", "wheelchair", "fever_clinic", "injection_room",
                "pharmacy", "laboratory", "physiotherapy",
                "xray", "ct_mri", "ultrasound"]

# Non-department rooms so floors look like a real building (labels only, not routable).
FILLERS = {
    -1: ["Generator Room", "Central Stores", "Laundry", "CSSD", "Biomedical Waste"],
    1: ["Doctors' Lounge"],
    2: ["Nurse Station", "Seminar Hall", "Doctors' Lounge", "Store"],
    3: ["Nurse Station", "Store"],
    4: ["Nurse Station", "Pre-op / Recovery", "CSSD", "Doctors' Lounge", "Store"],
    5: ["Nurse Station", "Pantry", "Linen Store", "Doctors' Duty Room"],
}
# Extra rooms that share a department's route target (e.g. several wards on floor 5).
EXTRA_TARGET_ROOMS = {5: [("wards", "General Ward (Male)"), ("wards", "General Ward (Female)"),
                          ("wards", "Semi-Private Rooms"), ("wards", "Private Rooms"), ("wards", "Isolation Rooms")]}

FLOOR_NAME_EN = {-1: "Basement", 0: "Ground floor"}


def floor_names(messages, level):
    out = {}
    for lang in LANGS:
        if lang == "en":
            out[lang] = FLOOR_NAME_EN.get(level, f"Floor {level}")
        else:
            f = messages["floor"][lang]
            out[lang] = f.get(str(level)) or f["n"].format(n=level)
    return out


def main():
    data = json.load(open(os.path.join(ROOT, "departments.json"), encoding="utf-8"))
    depts = {d["id"]: d for d in data["departments"] if d.get("available", True)}
    levels = sorted({d["floor"] for d in depts.values() if d.get("floor") is not None})

    floors, nodes, edges, targets = [], {}, [], {}

    def add_node(nid, level, x, y):
        nodes[nid] = {"f": level, "x": round(x, 2), "y": round(y, 2)}
        return nid

    def add_target(tid, nid):
        targets.setdefault(tid, []).append(nid)

    for level in levels:
        rooms = []
        # ---- rooms placed in the four segments ----
        ids = [i for i, d in depts.items() if d["floor"] == level and i not in PER_FLOOR and i != "exit"]
        if level == 0:
            ids = [i for i in GROUND_ORDER if i in ids] + [i for i in ids if i not in GROUND_ORDER]
        items = [("dept", i, depts[i]["names"], BIG.get(i, 1.0)) for i in ids]
        items += [("dept", tid, {**depts[tid]["names"], "en": label}, 1.4)
                  for tid, label in EXTRA_TARGET_ROOMS.get(level, []) if tid in depts]
        items = [it for it in items if not (level == 5 and it[1] == "wards" and it[2]["en"] == depts["wards"]["names"]["en"])] \
            if level in EXTRA_TARGET_ROOMS else items
        items += [("filler", None, {l: name for l in LANGS}, 1.0) for name in FILLERS.get(level, [])]

        # split items across 4 segments as evenly as possible by weight
        total = sum(w for *_, w in items)
        per_seg = total / 4
        seg_items, acc, s = [[] for _ in SEGMENTS], 0.0, 0
        for it in items:
            if s < 3 and acc >= per_seg * (s + 1) - 1e-9:
                s += 1
            seg_items[s].append(it)
            acc += it[3]

        corridor_x = {X0, X1, CORE[0], CORE[1]}
        for (side, a, b), group in zip(SEGMENTS, seg_items):
            if not group:
                continue
            gw = sum(it[3] for it in group)
            x = a
            for kind, tid, label, w in group:
                width = (b - a) * w / gw
                y0, y1 = TOP if side == "top" else BOT
                door_y = y1 if side == "top" else y0
                dx = x + width / 2
                rid = f"r{level}_{len(rooms)}"
                room = {"id": rid, "kind": "filler" if kind == "filler" else depts[tid].get("type", "department"),
                        "target": tid, "label": label,
                        "x": round(x, 2), "y": y0, "w": round(width, 2), "h": y1 - y0, "door": [round(dx, 2), door_y]}
                rooms.append(room)
                if tid:
                    nid = add_node(f"door_{rid}", level, dx, door_y)
                    add_target(tid, nid)
                    corridor_x.add(round(dx, 2))
                x += width

        # ---- core: lifts + stairs (top), toilets + drinking water (bottom) ----
        core = [("lift", "top", CORE[0], CORE[0] + 6.0), ("stairs", "top", CORE[0] + 6.0, CORE[1]),
                ("toilet", "bot", CORE[0], CORE[0] + 6.5), ("drinking_water", "bot", CORE[0] + 6.5, CORE[1])]
        for tid, side, a, b in core:
            y0, y1 = TOP if side == "top" else BOT
            door_y = y1 if side == "top" else y0
            dx = (a + b) / 2
            if tid == "stairs":
                label = {"en": "Stairs", "hi": "सीढ़ियाँ", "kn": "ಮೆಟ್ಟಿಲು", "ml": "പടികൾ", "tcy": "ಮೆಟ್ಟಿಲ್"}
            else:
                label = depts[tid]["names"] if tid in depts else {l: tid for l in LANGS}
            rid = f"r{level}_{len(rooms)}"
            rooms.append({"id": rid, "kind": "core", "target": tid, "label": label, "x": a, "y": y0,
                          "w": b - a, "h": y1 - y0, "door": [dx, door_y]})
            nid = add_node(f"{tid}_{level}", level, dx, door_y)
            if tid != "stairs":
                add_target(tid, nid)
            corridor_x.add(round(dx, 2))

        # ---- entrance (ground floor, left end) ----
        extra = []
        if level == 0:
            add_node("exit_0", 0, 0.5, CY)
            add_target("exit", "exit_0")
            extra.append({"type": "entrance", "x": 0.0, "y": CY, "label": depts["exit"]["names"] if "exit" in depts else {}})
        if level == -1 and "parking" in depts:
            extra.append({"type": "ramp", "x": W - 0.5, "y": CY, "label": {l: "Ramp / Gate 3" for l in LANGS}})

        # ---- corridor walking graph: chain of points along the centre line ----
        xs = sorted(corridor_x)
        cids = []
        for x in xs:
            cids.append(add_node(f"c{level}_{x:g}", level, x, CY))
        for p, q in zip(cids, cids[1:]):
            edges.append([p, q, round(nodes[q]["x"] - nodes[p]["x"], 2), "walk"])
        by_x = {nodes[c]["x"]: c for c in cids}
        for nid, n in list(nodes.items()):
            if n["f"] == level and not nid.startswith("c") and nid != "exit_0":
                edges.append([nid, by_x[n["x"]], abs(n["y"] - CY), "walk"])
        if level == 0:
            edges.append(["exit_0", by_x[min(by_x)], round(min(by_x) - 0.5, 2), "walk"])

        floors.append({"level": level, "name": floor_names(data["messages"], level),
                       "corridor": {"x": X0, "y": CY - 2, "w": X1 - X0, "h": 4.0}, "rooms": rooms, "extras": extra})

    # ---- vertical connections: lift is preferred, stairs cost more ----
    for a, b in zip(levels, levels[1:]):
        edges.append([f"lift_{a}", f"lift_{b}", 8.0, "lift"])
        edges.append([f"stairs_{a}", f"stairs_{b}", 14.0, "stairs"])

    layout = {
        "_readme": "Sample block generated by tools/build_layout.py. Units are metres. "
                   "rooms[].target = department id (map_node). Edit freely or replace with your hospital's real plan.",
        "building": {"en": "Main Block", "hi": "मुख्य भवन", "kn": "ಮುಖ್ಯ ಕಟ್ಟಡ", "ml": "പ്രധാന ബ്ലോക്ക്", "tcy": "ಮುಖ್ಯ ಕಟ್ಟಡ"},
        "width": W, "height": H, "start": "exit_0",
        "floors": floors, "nodes": nodes, "edges": edges, "targets": targets,
    }
    if "--sync-places" in sys.argv:
        # write each department's position back into departments.json so the spoken reply matches the map
        side = {}
        for f in floors:
            for r in f["rooms"]:
                if r["target"] and r["kind"] != "core" and r["target"] not in side:
                    wing = "left wing" if r["x"] + r["w"] / 2 < CORE[0] else "right wing"
                    side[r["target"]] = f"Main Block, {wing}"
        for d in data["departments"]:
            if d["id"] in side:
                d["place"] = side[d["id"]]
            elif d["id"] in PER_FLOOR:
                d["place"] = "Main Block, next to the lifts on every floor"
            elif d["id"] == "exit":
                d["place"] = "Main Block, west end of the ground floor"
        json.dump(data, open(os.path.join(ROOT, "departments.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("departments.json places updated to match the layout")

    out = os.path.join(ROOT, "web", "layout.json")
    json.dump(layout, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    rooms = sum(len(f["rooms"]) for f in floors)
    missing = [i for i in depts if i not in targets]
    print(f"{len(floors)} floors, {rooms} rooms, {len(nodes)} nodes, {len(edges)} edges -> {out}")
    print("departments without a room:", missing or "none")


if __name__ == "__main__":
    main()
