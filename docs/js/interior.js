/*
 * Detailed interiors for the 3D view: walls with door openings, glass fronts on the corridor side,
 * painted corridors and furniture that shows what each room is (beds, OT table, CT scanner,
 * X-ray stand, lab benches, pharmacy shelves, waiting chairs, desks, toilets, cars...).
 *
 * All pieces of one floor are merged into a few meshes per colour, so even a phone renders it smoothly.
 * Used by js/app.js when the data file has `blocks` (campus) and `interior` is not false.
 */
window.Interior = (function () {
  'use strict';
  const WALL_H = 2.8, T = 0.16, GLASS_H = 2.5, OUT_H = 3.1;
  const COL = {
    wall: 0xf8f9fa, glass: 0x9fd6da, frame: 0xe3e8ea, white: 0xffffff, teal: 0x5fb8be, tealDark: 0x2d7f8a,
    gray: 0xb4c0c7, dark: 0x4d5b66, wood: 0xd9c6a5, green: 0x7cb87c, red: 0xe35d5d, paint: 0xe4eff0,
    car1: 0x9fb4c7, car2: 0xd8d8d8, car3: 0x6e7f8f, step: 0x9aa6ae, lift: 0x37474f, metal: 0xcfd8dc,
    skin: 0xe2b48c, scrub: 0x3aa6a0, coat: 0xfbfbfb, pot: 0xf2f2f2, pants: 0x5d6f7a,
  };

  // ---------- which template a room uses ----------
  function kindOf(rm) {
    const d = (rm.dept && rm.dept[0]) || '', n = rm.name.toLowerCase(), t = rm.type;
    if (t === 'gate') return 'gate';
    if (d === 'parking') return 'parking';
    if (d === 'ambulance') return 'ambulance';
    if (t === 'lobby') return 'lobby';
    if (d === 'drinking_water') return 'water';
    if (d === 'toilet' || t === 'toilet') return 'toilet';
    if (d === 'operation_theatre' || n.includes('minor ot')) return 'ot';
    if (d === 'cath_lab') return 'cath';
    if (d === 'ct_mri') return 'ct';
    if (d === 'xray') return 'xray';
    if (['ultrasound', 'ecg_echo', 'endoscopy'].includes(d)) return 'scan';
    if (d === 'icu') return 'icu';
    if (d === 'nicu_picu') return 'cribs';
    if (d === 'dialysis' || n.includes('chemotherapy')) return 'recliners';
    if (['wards', 'emergency', 'labour_room', 'fever_clinic'].includes(d) || /ward|recovery|observation|day care|isolation|suite|private|triage|pre-op|plaster/.test(n)) return 'beds';
    if (d === 'laboratory') return 'lab';
    if (d === 'blood_bank') return 'bloodbank';
    if (d === 'pharmacy') return 'pharmacy';
    if (['medical_records'].includes(d) || /record|store|linen|sterile|cssd/.test(n)) return 'shelves';
    if (['billing', 'insurance', 'admission', 'patient_relations', 'opd_registration'].includes(d)) return 'counter';
    if (n.includes('pantry')) return 'lounge';
    if (d === 'canteen' || n.includes('kitchen')) return n.includes('kitchen') ? 'machines' : 'canteen';
    if (d === 'conference_hall' || n.includes('board room') || n.includes('meeting')) return 'conference';
    if (d === 'library') return 'library';
    if (d === 'atm') return 'atm';
    if (d === 'physiotherapy') return 'physio';
    if (['vaccination', 'injection_room'].includes(d)) return 'vaccine';
    if (d === 'prayer_room') return 'prayer';
    if (d === 'mortuary') return 'mortuary';
    if (/laundry|generator|waste|server/.test(n)) return 'machines';
    if (n.includes('nurse station')) return 'nurse';
    if (/lounge|duty room/.test(n)) return 'lounge';
    if (n.includes('waiting')) return 'waiting';
    if (rm.type === 'admin' || d === 'security' || n.includes('medico-legal') || n.includes('plaster')) return 'office';
    return 'clinic';
  }

  const ICON = {
    emergency: '🚑', ambulance: '🚑', icu: '❤️‍🩹', operation_theatre: '⚕️', cath_lab: '❤️', ct_mri: '🩻', xray: '🩻',
    ultrasound: '🖥️', ecg_echo: '💓', endoscopy: '🔬', laboratory: '🧪', blood_bank: '🩸', pharmacy: '💊', billing: '💳',
    insurance: '📄', admission: '📝', medical_records: '🗂️', opd_registration: '🎫', canteen: '🍽️', atm: '🏧',
    security: '🛡️', toilet: '🚻', drinking_water: '🚰', wards: '🛏️', pediatrics: '🧒', dental: '🦷', ophthalmology: '👁️',
    ent: '👂', cardiology: '❤️', cardiac_surgery: '❤️', neurology: '🧠', neurosurgery: '🧠', psychiatry: '🧠', orthopedics: '🦴',
    pulmonology: '🫁', obstetrics_gynecology: '🤰', labour_room: '🤱', nicu_picu: '👶', ivf_fertility: '👶', vaccination: '💉',
    injection_room: '💉', dialysis: '💧', nephrology: '💧', urology: '💧', physiotherapy: '🏃', dietetics: '🥗', parking: '🅿️',
    exit: '🚪', reception: 'ℹ️', conference_hall: '👥', library: '📚', it_department: '💻', hr: '👔', accounts: '📊',
    administration: '🏛️', nursing_office: '👩‍⚕️', patient_relations: '🙋', prayer_room: '🛐', oncology: '🎗️', hematology: '🩸',
    dermatology: '🧴', gastroenterology: '🩺', endocrinology: '🩺', rheumatology: '🦴', geriatrics: '🧓', general_medicine: '🩺',
    general_surgery: '🩺', fever_clinic: '🌡️', health_checkup: '📋', pain_clinic: '💉', plastic_surgery: '🩹', vascular_surgery: '🩺',
  };
  function iconFor(rm) {
    const d = rm.dept && rm.dept[0];
    if (d && ICON[d]) return ICON[d];
    if (rm.type === 'lobby') return 'ℹ️';
    return '';
  }

  // ---------- geometry helpers ----------
  function merge(geos) {
    let n = 0; geos.forEach((g) => { n += g.attributes.position.count; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    geos.forEach((g) => {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      o += g.attributes.position.count; g.dispose();
    });
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return m;
  }

  function buildFloor(ctx) {
    const { B, F, fi, grp, mat, lineMat, CX, CY, typeColor } = ctx;
    const buckets = new Map();
    let cur = null; // block id the next pieces belong to (null = outdoors)
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
    const put = (key, geo, x, y, z, rot) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      Q.setFromAxisAngle(UP, rot || 0);
      M4.compose(new THREE.Vector3(x - CX, z, -(y - CY)), Q, S1);
      g.applyMatrix4(M4);
      const k = `${cur === null ? '~' : cur}|${key}`;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(g);
    };
    // world-space box: centre (x,y), base z0, size w (east-west) d (north-south) h (height)
    const box = (key, x, y, z0, w, d, h) => { if (w > 0.01 && d > 0.01 && h > 0.005) put(key, new THREE.BoxGeometry(w, h, d), x, y, z0 + h / 2, 0); };
    const cyl = (key, x, y, z0, r, h, seg = 12) => put(key, new THREE.CylinderGeometry(r, r, h, seg), x, y, z0 + h / 2, 0);

    // ---- painted corridors ----
    const segs = (F.corridors || B.corridors || []).map((s) => (Array.isArray(s) ? { a: s[0], b: s[1], zone: null } : s));
    segs.forEach((s) => {
      if (s.zone === 'walkway' || true) return; // corridor = beige floor slab; walkways drawn by app.js
      const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]); if (L < 0.5) return;
      const horiz = Math.abs(s.b[1] - s.a[1]) < 0.01;
      box('paint', (s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, 0.005, horiz ? L : 2.6, horiz ? 2.6 : L, 0.02);
    });

    const flatTypes = new Set(B.flatTypes || ['lobby']);
    const picks = [];

    F.rooms.forEach((rm) => {
      cur = rm.block || null;
      const [x, y, w, h] = rm.rect, [dx, dy] = rm.door;
      // floor tile (also the tap target)
      const base = new THREE.Color(rm.type === 'toilet' ? 0xd6dde5 : rm.type === 'gate' || rm.type === 'outdoor' ? (rm.dept && rm.dept.indexOf('ambulance') >= 0 ? 0xd9b9b9 : 0xb9bfc4) : flatTypes.has(rm.type) ? 0xe3d8c7 : 0x98a0d9);
      picks.push({ rm, x, y, w, h, color: base, block: cur });
      const kind = kindOf(rm);
      if (kind === 'gate' || kind === 'parking' || kind === 'ambulance') { outdoor(kind, x, y, w, h); return; }

      // which side the door is on
      const dist = { S: Math.abs(dy - y), N: Math.abs(dy - (y + h)), W: Math.abs(dx - x), E: Math.abs(dx - (x + w)) };
      let side = Object.keys(dist).sort((a, b) => dist[a] - dist[b])[0];
      if (dist[side] > 0.6) side = 'S';
      if (!flatTypes.has(rm.type) && kind !== 'water') walls(x, y, w, h, side, dx, dy, rm.block);

      // local frame: u along the back wall (opposite the door), v from the back wall towards the door
      const L = side === 'S' || side === 'N' ? w : h, D = side === 'S' || side === 'N' ? h : w;
      const P = (u, v) => side === 'S' ? [x + u, y + h - v] : side === 'N' ? [x + w - u, y + v] : side === 'W' ? [x + w - v, y + h - u] : [x + v, y + u];
      const lb = (key, u, v, z0, a, b, hh) => { const [px, py] = P(u, v); if (side === 'S' || side === 'N') box(key, px, py, z0, a, b, hh); else box(key, px, py, z0, b, a, hh); };
      const lc = (key, u, v, z0, r, hh) => { const [px, py] = P(u, v); cyl(key, px, py, z0, r, hh); };
      furnish(kind, rm, L, D, lb, lc, side, P);
    });

    function onOuter(blockId, x1, y1, x2, y2) {
      const bk = (B.blocks || []).find((b) => b.id === blockId); if (!bk) return false;
      const [bx, by, bw, bd] = bk.rect, e = 0.06;
      if (y1 === y2) return Math.abs(y1 - by) < e || Math.abs(y1 - (by + bd)) < e;
      return Math.abs(x1 - bx) < e || Math.abs(x1 - (bx + bw)) < e;
    }
    function walls(x, y, w, h, doorSide, dx, dy, blockId) {
      const edges = { S: [x, y, x + w, y], N: [x, y + h, x + w, y + h], W: [x, y, x, y + h], E: [x + w, y, x + w, y + h] };
      Object.entries(edges).forEach(([k, [x1, y1, x2, y2]]) => {
        if (k !== doorSide && onOuter(blockId, x1, y1, x2, y2)) return;
        const horiz = y1 === y2, len = horiz ? x2 - x1 : y2 - y1;
        const seg = (a, b, key, z0, hh) => {
          if (b - a < 0.05) return;
          if (horiz) box(key, (a + b) / 2, y1, z0, b - a, T, hh); else box(key, x1, (a + b) / 2, z0, T, b - a, hh);
        };
        const lo = horiz ? x1 : y1, hi = horiz ? x2 : y2;
        if (k === doorSide) {
          const c = horiz ? dx : dy, gap = Math.min(1.6, len * 0.4);
          seg(lo, c - gap / 2, 'glass', 0, GLASS_H); seg(c + gap / 2, hi, 'glass', 0, GLASS_H);
          seg(lo, hi, 'frame', GLASS_H, 0.12);          // header over glass + door
          seg(lo, c - gap / 2, 'frame', 0, 0.12); seg(c + gap / 2, hi, 'frame', 0, 0.12); // sill
          seg(c - gap / 2 - 0.08, c - gap / 2, 'frame', 0, GLASS_H); seg(c + gap / 2, c + gap / 2 + 0.08, 'frame', 0, GLASS_H); // jambs
        } else seg(lo, hi, 'wall', 0, WALL_H);
      });
    }

    function outdoor(kind, x, y, w, h) {
      if (kind === 'gate') {
        box('dark', x + 1.2, y + h - 1.6, 0, 2.0, 2.0, 2.4); box('teal', x + 1.2, y + h - 1.6, 2.4, 2.3, 2.3, 0.2);
        box('red', x + w / 2 + 1, y + h - 0.3, 1.0, w - 4, 0.15, 0.12);
      } else if (kind === 'parking') {
        const cols = Math.max(1, Math.floor((w - 1) / 2.6));
        for (let i = 0; i <= cols; i++) box('white', x + 0.6 + i * 2.6, y + h - 2.6, 0.01, 0.12, 4.6, 0.02);
        const colors = ['car1', 'car2', 'car3', 'car2', 'car1'];
        for (let i = 0; i < cols; i++) if (i % 3 !== 2) {
          const cx = x + 0.6 + i * 2.6 + 1.3, cy = y + h - 2.6, k = colors[i % colors.length];
          box(k, cx, cy, 0.25, 1.75, 4.1, 0.75); box('dark', cx, cy - 0.2, 1.0, 1.55, 2.1, 0.55);
          [-1.3, 1.3].forEach((o) => [-0.8, 0.8].forEach((q) => cyl('dark', cx + q, cy + o, 0, 0.32, 0.5, 10)));
        }
      } else {
        const cx = x + w / 2, cy = y + h / 2;
        box('white', cx, cy, 0.35, 2.2, 5.6, 2.2); box('red', cx, cy, 1.2, 2.25, 5.65, 0.35); box('red', cx, cy - 2.2, 2.55, 1.6, 0.4, 0.2);
        box('dark', cx, cy - 2.6, 1.4, 2.0, 0.5, 0.8);
        [-1.9, 1.9].forEach((o) => [-1.0, 1.0].forEach((q) => cyl('dark', cx + q, cy + o, 0, 0.38, 0.5, 10)));
      }
    }

    // ---------- furniture templates (local u/v coordinates) ----------
    function bed(lb, lc, u, v, flip, monitor) {
      const s = flip ? -1 : 1, V = (k) => v + s * k;
      lb('white', u, V(1.05), 0.25, 1.0, 2.0, 0.35);         // mattress
      lb('teal', u, V(1.45), 0.6, 1.02, 1.1, 0.06);          // blanket
      lb('white', u, V(0.3), 0.6, 0.7, 0.35, 0.1);           // pillow
      lb('tealDark', u, V(0.05), 0, 1.1, 0.1, 1.0);          // headboard
      lb('metal', u - 0.85, V(0.35), 0, 0.45, 0.45, 0.6);    // bedside cabinet
      lc('gray', u + 0.75, V(0.3), 0, 0.03, 1.9);            // IV pole
      if (monitor) lb('dark', u - 0.85, V(0.35), 1.2, 0.5, 0.08, 0.4);
    }
    function chairRow(lb, u0, u1, v, facingBack) {
      const n = Math.max(1, Math.floor((u1 - u0) / 0.6));
      for (let i = 0; i < n; i++) {
        const u = u0 + (i + 0.5) * (u1 - u0) / n;
        lb('teal', u, v, 0.4, 0.52, 0.5, 0.08); lb('teal', u, v + (facingBack ? -0.25 : 0.25), 0.4, 0.52, 0.08, 0.45);
        lb('gray', u, v, 0, 0.06, 0.06, 0.4);
      }
    }
    function desk(lb, u, v, withChair, monitor) {
      lb('wood', u, v, 0.72, 1.4, 0.7, 0.05); lb('metal', u - 0.6, v, 0, 0.05, 0.6, 0.72); lb('metal', u + 0.6, v, 0, 0.05, 0.6, 0.72);
      if (monitor !== false) lb('dark', u, v - 0.15, 0.77, 0.55, 0.05, 0.35);
      if (withChair) { lb('dark', u, v + 0.65, 0.42, 0.5, 0.5, 0.08); lb('dark', u, v + 0.9, 0.42, 0.5, 0.06, 0.5); lb('gray', u, v + 0.65, 0, 0.06, 0.06, 0.42); }
    }
    function shelfRow(lb, u0, u1, v, key) {
      const n = Math.max(1, Math.floor((u1 - u0) / 1.3));
      for (let i = 0; i < n; i++) {
        const u = u0 + (i + 0.5) * (u1 - u0) / n;
        lb(key || 'wood', u, v, 0, 1.15, 0.45, 2.0);
        [0.5, 1.0, 1.5].forEach((z) => lb('white', u, v + 0.05, z, 1.1, 0.4, 0.04));
      }
    }

    function lperson(lc, u, v, top) { lc('pants', u, v, 0, 0.16, 0.8); lc(top || 'scrub', u, v, 0.8, 0.22, 0.62); lc('skin', u, v, 1.42, 0.12, 0.24); }
    function wheelchair(lb, u, v) {
      lb('tealDark', u, v, 0.45, 0.5, 0.5, 0.06); lb('tealDark', u, v - 0.25, 0.5, 0.5, 0.05, 0.5);
      lb('dark', u - 0.3, v, 0.0, 0.05, 0.62, 0.62); lb('dark', u + 0.3, v, 0.0, 0.05, 0.62, 0.62);
    }
    function plant(lc, u, v) { lc('pot', u, v, 0, 0.28, 0.45); lc('green', u, v, 0.45, 0.4, 0.75); lc('green', u, v, 1.1, 0.25, 0.3); }
    function people(kind, rm, L, D, lb, lc) {
      if (kind === 'beds' || kind === 'icu') { lperson(lc, Math.min(L - 0.8, L / Math.max(1, Math.floor((L - 0.8) / 2.6)) / 2 + 1.0), 2.7, 'scrub'); if (L > 6) wheelchair(lb, L - 0.9, D - 1.2); if (L > 12) lperson(lc, L * 0.6, D / 2, 'coat'); }
      else if (kind === 'ot' || kind === 'cath') { lperson(lc, (L > 12 ? L / 4 : L / 2) + 0.8, D / 2 + 0.3, 'scrub'); lperson(lc, (L > 12 ? L / 4 : L / 2) - 0.8, D / 2 - 0.4, 'scrub'); }
      else if (kind === 'clinic') { lperson(lc, L / (L > 9 ? 2 : 1) * 0.62, 1.65, 'coat'); lperson(lc, L / (L > 9 ? 2 : 1) * 0.62 + 0.4, 2.6, 'scrub'); }
      else if (kind === 'scan' || kind === 'xray' || kind === 'ct') lperson(lc, Math.min(L - 1, L / 2 + 1.6), D - 2.6, 'coat');
      else if (kind === 'counter' || kind === 'pharmacy') { lperson(lc, 1.6, D - 2.1, 'coat'); lperson(lc, L / 2, D - 0.6, 'pants'); }
      else if (kind === 'lobby') { lperson(lc, L / 2, 0.45, 'coat'); wheelchair(lb, 0.9, D - 1.4); plant(lc, 0.6, D - 0.6); plant(lc, L - 0.6, D - 0.6); }
      else if (kind === 'lab') lperson(lc, L / 2, 1.3, 'coat');
      else if (kind === 'nurse') lperson(lc, L / 2 + 0.8, D / 2 - 0.7, 'scrub');
    }
    function furnish(kind, rm, L, D, lb, lc) {
      people(kind, rm, L, D, lb, lc);
      const m = 0.5;
      switch (kind) {
        case 'beds': case 'icu': {
          const n = Math.max(1, Math.min(10, Math.floor((L - 0.8) / 2.6)));
          for (let i = 0; i < n; i++) bed(lb, lc, (i + 0.5) * L / n, 0.15, false, kind === 'icu');
          if (D >= 8) for (let i = 0; i < n; i++) bed(lb, lc, (i + 0.5) * L / n, D - 0.15, true, kind === 'icu');
          if (kind === 'icu' || rm.name.toLowerCase().includes('triage')) lb('teal', L / 2, D / 2 + (D >= 8 ? 0 : 0.8), 0, Math.min(3, L * 0.4), 0.7, 1.05);
          break;
        }
        case 'cribs': {
          const n = Math.max(1, Math.floor((L - 0.6) / 1.4));
          [1.0, D >= 6 ? D - 1.6 : null].forEach((v) => { if (v !== null) for (let i = 0; i < n; i++) { const u = (i + 0.5) * L / n; lb('white', u, v, 0.6, 0.65, 0.95, 0.4); lb('glass', u, v, 1.0, 0.6, 0.9, 0.35); lb('metal', u, v, 0, 0.1, 0.1, 0.6); } });
          break;
        }
        case 'recliners': {
          const n = Math.max(1, Math.floor((L - 0.6) / 2.0));
          for (let i = 0; i < n; i++) { const u = (i + 0.5) * L / n; lb('teal', u, 1.0, 0.35, 0.85, 1.6, 0.15); lb('teal', u, 0.3, 0.35, 0.85, 0.2, 0.75); lb('gray', u + 0.75, 0.5, 0, 0.45, 0.45, 1.2); lb('dark', u + 0.75, 0.3, 1.0, 0.4, 0.06, 0.3); }
          break;
        }
        case 'ot': case 'cath': {
          const tables = L > 12 ? [L / 4, 3 * L / 4] : [L / 2];
          tables.forEach((u) => {
            const v = D / 2;
            lc('gray', u, v, 0, 0.25, 0.75); lb('teal', u, v, 0.75, 0.7, 2.0, 0.12);
            lc('gray', u, v, 2.15, 0.04, 0.35); lc('white', u, v, 2.05, 0.75, 0.12);           // surgical lamp
            lb('gray', u + 1.4, v - 0.5, 0, 0.7, 0.6, 1.4); lb('dark', u + 1.4, v - 0.5, 1.4, 0.6, 0.06, 0.4); // anaesthesia
            lb('metal', u - 1.3, v + 0.4, 0, 0.9, 0.5, 0.9);                                     // instrument trolley
            if (kind === 'cath') { lb('white', u, v - 0.9, 0, 0.4, 0.4, 1.6); lb('white', u, v - 0.3, 1.6, 0.35, 1.3, 0.3); }
          });
          if (L > 12) lb('wall', L / 2, D / 2, 0, 0.12, D * 0.7, 2.2);
          break;
        }
        case 'ct': {
          const units = L > 9 ? [L * 0.28, L * 0.72] : [L / 2];
          units.forEach((u, i) => {
            const v = D * 0.42;
            lb('white', u, v, 0, 2.6, 0.9, 2.5);                                               // gantry housing
            lc('tealDark', u, v + 0.46, 0.7, 0.6, 0.02);                                         // (base mark)
            const ringV = v + 0.47;
            lb('tealDark', u, ringV, 0.45, 1.5, 0.04, 0.12); lb('tealDark', u, ringV, 1.95, 1.5, 0.04, 0.12);
            lb('tealDark', u - 0.75, ringV, 0.45, 0.12, 0.04, 1.6); lb('tealDark', u + 0.75, ringV, 0.45, 0.12, 0.04, 1.6);
            lb('dark', u, ringV, 0.6, 1.3, 0.03, 1.3);                                           // bore
            lb('white', u, v + 1.8, 0, 0.6, 2.6, 0.75); lb('teal', u, v + 1.8, 0.75, 0.55, 2.4, 0.06); // patient table
            if (i === 0) { desk(lb, Math.min(L - 1.2, u + 2.2), D - 1.2, true); }
          });
          break;
        }
        case 'xray': {
          const u = L / 2, v = D * 0.45;
          lb('white', u, v + 0.6, 0, 0.8, 2.2, 0.8);                                             // table
          lc('gray', u - 1.2, v + 0.6, 0, 0.1, 2.5); lb('gray', u - 0.6, v + 0.6, 2.2, 1.2, 0.18, 0.18); lb('white', u, v + 0.6, 1.8, 0.5, 0.45, 0.4); // tube stand
          lb('tealDark', u + 1.5, 0.15, 0, 0.6, 0.15, 1.9);                                      // wall bucky
          lb('gray', L - 1.0, D - 1.0, 0, 1.2, 0.08, 2.0);                                       // lead screen
          desk(lb, L - 1.0, D - 2.0, true);
          break;
        }
        case 'scan': {
          const n = L > 8 ? 2 : 1;
          for (let i = 0; i < n; i++) { const u = (i + 0.5) * L / n; lb('teal', u, 1.4, 0, 0.8, 1.9, 0.65); lb('white', u, 0.7, 0.65, 0.6, 0.35, 0.12); lb('dark', u + 0.9, 1.0, 0, 0.5, 0.6, 1.0); lb('dark', u + 0.9, 0.85, 1.0, 0.55, 0.06, 0.4); lb('dark', u - 0.8, 2.2, 0.42, 0.45, 0.45, 0.08); }
          if (n === 2) lb('frame', L / 2, 1.6, 0, 0.06, 3.2, 2.0);
          break;
        }
        case 'lab': {
          lb('white', L / 2, 0.45, 0, L - 2 * m, 0.7, 0.9); lb('teal', L / 2, 0.45, 0.9, L - 2 * m, 0.72, 0.04);
          const n = Math.max(1, Math.floor((L - 1) / 1.6));
          for (let i = 0; i < n; i++) { const u = m + (i + 0.5) * (L - 2 * m) / n; lb(i % 2 ? 'dark' : 'gray', u, 0.4, 0.94, 0.45, 0.4, i % 2 ? 0.35 : 0.5); lc('dark', u, 1.25, 0, 0.18, 0.62); }
          if (D > 5) { lb('white', L / 2, D / 2 + 0.2, 0, L * 0.55, 1.2, 0.9); lb('teal', L / 2, D / 2 + 0.2, 0.9, L * 0.55, 1.22, 0.04); }
          for (let i = 0; i < Math.min(3, Math.floor(L / 2)); i++) { const u = 1 + i * 1.6; lb('teal', u, D - 1.2, 0.45, 0.6, 0.6, 0.1); lb('teal', u, D - 1.5, 0.45, 0.6, 0.12, 0.6); lb('teal', u + 0.4, D - 1.1, 0.75, 0.15, 0.6, 0.06); }
          break;
        }
        case 'bloodbank': {
          const n = Math.max(1, Math.floor((L - 1) / 1.1));
          for (let i = 0; i < n; i++) { const u = 0.6 + (i + 0.5) * (L - 1.2) / n; lb('white', u, 0.45, 0, 0.9, 0.7, 1.95); lb('red', u, 0.82, 1.55, 0.7, 0.03, 0.25); }
          desk(lb, L / 2, D - 1.6, true);
          break;
        }
        case 'pharmacy': {
          shelfRow(lb, m, L - m, 0.35, 'white');
          lb('white', L / 2, D - 1.4, 0, L - 1.2, 0.6, 1.05); lb('teal', L / 2, D - 1.1, 0.15, L - 1.2, 0.04, 0.75); lb('wood', L / 2, D - 1.4, 1.05, L - 1.1, 0.7, 0.05);
          for (let u = 1.2; u < L - 0.8; u += 2.2) lb('dark', u, D - 1.55, 1.1, 0.45, 0.05, 0.32);
          break;
        }
        case 'counter': {
          lb('white', L / 2, D - 1.5, 0, L - 1.2, 0.6, 1.05); lb('teal', L / 2, D - 1.2, 0.15, L - 1.2, 0.04, 0.75); lb('wood', L / 2, D - 1.5, 1.05, L - 1.1, 0.7, 0.05);
          for (let u = 1.2; u < L - 0.8; u += 2.0) { lb('dark', u, D - 1.65, 1.1, 0.45, 0.05, 0.32); lb('dark', u, D - 2.3, 0.42, 0.5, 0.5, 0.08); }
          if (D > 5) shelfRow(lb, m, L - m, 0.35, 'white');
          if (rm.dept && rm.dept[0] === 'opd_registration') for (let u = 1; u < L - 0.5; u += 1.2) lc('metal', u, D - 0.4, 0, 0.04, 1.0);
          break;
        }
        case 'shelves': {
          const rows = Math.max(1, Math.floor((D - 1.2) / 1.6));
          for (let r = 0; r < rows; r++) shelfRow(lb, m, L - m, 0.4 + r * 1.6, rm.name.toLowerCase().includes('record') ? 'wood' : 'metal');
          break;
        }
        case 'canteen': {
          lb('white', L / 2, 0.5, 0, L * 0.6, 0.7, 1.0); lb('wood', L / 2, 0.5, 1.0, L * 0.6, 0.75, 0.05);
          for (let u = 1.4; u < L - 0.8; u += 2.4) for (let v = 2.2; v < D - 0.8; v += 2.4) {
            lc('wood', u, v, 0.7, 0.55, 0.05); lc('metal', u, v, 0, 0.06, 0.7);
            [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]].forEach(([a, b]) => lc('teal', u + a, v + b, 0, 0.2, 0.45));
          }
          break;
        }
        case 'conference': {
          const tl = Math.max(2, L * 0.6);
          lb('wood', L / 2, D / 2, 0.72, tl, 1.4, 0.06); lb('metal', L / 2, D / 2, 0, tl * 0.8, 0.5, 0.72);
          for (let u = L / 2 - tl / 2 + 0.4; u < L / 2 + tl / 2; u += 0.8) { lb('dark', u, D / 2 - 1.05, 0.42, 0.48, 0.48, 0.08); lb('dark', u, D / 2 + 1.05, 0.42, 0.48, 0.48, 0.08); }
          lb('dark', L / 2, 0.12, 0.9, Math.min(3, L * 0.4), 0.06, 1.4);
          break;
        }
        case 'library': {
          for (let v = 0.4; v < D * 0.6; v += 1.7) lb('wood', L / 2, v, 0, L - 1.2, 0.45, 1.9);
          lb('wood', L / 2, D - 1.6, 0.72, Math.min(4, L * 0.5), 1.0, 0.06);
          break;
        }
        case 'atm': {
          const n = Math.max(1, Math.min(3, Math.floor(L / 1.4)));
          for (let i = 0; i < n; i++) { const u = (i + 0.5) * L / n; lb('tealDark', u, 0.4, 0, 0.75, 0.6, 1.65); lb('dark', u, 0.72, 1.1, 0.5, 0.04, 0.35); }
          break;
        }
        case 'physio': {
          for (let u = 1.2; u < L - 0.6; u += 1.8) lb('teal', u, 1.6, 0, 1.0, 2.0, 0.12);
          const bu = L / 2, bv = D - 1.3;
          [-0.45, 0.45].forEach((o) => { lb('metal', bu, bv + o, 0.9, 3.0, 0.06, 0.06); lb('gray', bu - 1.4, bv + o, 0, 0.06, 0.06, 0.95); lb('gray', bu + 1.4, bv + o, 0, 0.06, 0.06, 0.95); });
          lb('dark', 0.9, D - 1.2, 0, 0.6, 1.2, 0.9);
          break;
        }
        case 'vaccine': {
          chairRow(lb, 0.8, L - 1.8, D - 1.3, true);
          lb('white', L - 0.8, 0.45, 0, 0.8, 0.7, 1.8); lb('teal', L - 0.8, 0.82, 1.4, 0.6, 0.03, 0.2);
          desk(lb, L / 2, 1.1, true);
          break;
        }
        case 'prayer': {
          for (let u = 1; u < L - 0.6; u += 1.2) for (let v = 1; v < D - 1.2; v += 2.0) lb('wood', u, v, 0, 0.8, 1.7, 0.03);
          break;
        }
        case 'mortuary': {
          const n = Math.max(1, Math.floor((L - 1) / 1.0));
          for (let i = 0; i < n; i++) { const u = 0.5 + (i + 0.5) * (L - 1) / n; lb('metal', u, 0.5, 0, 0.9, 0.9, 2.1); [0.5, 1.2, 1.9].forEach((z) => lb('gray', u, 0.96, z, 0.7, 0.03, 0.3)); }
          lb('metal', L / 2, D / 2 + 0.5, 0, 0.8, 2.0, 0.85);
          break;
        }
        case 'machines': {
          for (let u = 1.2; u < L - 0.8; u += 2.0) { lb('gray', u, 0.8, 0, 1.4, 1.2, 1.5); lb('dark', u, 1.42, 0.9, 0.5, 0.03, 0.4); }
          if (D > 5) for (let u = 1.2; u < L - 0.8; u += 2.0) lb('metal', u, D - 1.4, 0, 1.4, 1.0, 1.1);
          break;
        }
        case 'nurse': {
          lb('wood', L / 2, D / 2, 0, Math.min(L - 1, 3.4), 0.6, 1.05); lb('wood', L / 2 - Math.min(L - 1, 3.4) / 2 + 0.3, D / 2 - 0.9, 0, 0.6, 1.8, 1.05);
          lb('wood', L / 2, D / 2, 1.05, Math.min(L - 1, 3.4) + 0.1, 0.7, 0.05);
          lb('dark', L / 2 - 0.6, D / 2 - 0.6, 0.42, 0.5, 0.5, 0.08); lb('dark', L / 2 + 0.8, D / 2 - 0.6, 0.42, 0.5, 0.5, 0.08);
          shelfRow(lb, m, L - m, 0.35, 'white');
          break;
        }
        case 'lounge': {
          lb('teal', L / 2, 0.6, 0, Math.min(2.4, L - 1), 0.85, 0.45); lb('teal', L / 2, 0.25, 0.45, Math.min(2.4, L - 1), 0.2, 0.45);
          lb('wood', L / 2, 1.8, 0, 1.2, 0.6, 0.4);
          if (D > 4) { lb('white', 0.9, D - 1.2, 0, 0.9, 1.9, 0.5); lb('teal', 0.9, D - 1.6, 0.5, 0.7, 0.4, 0.1); }
          break;
        }
        case 'waiting': {
          for (let v = 1.0; v < D - 1.0; v += 1.6) chairRow(lb, 0.8, L - 0.8, v, true);
          break;
        }
        case 'office': {
          const cols = Math.max(1, Math.floor((L - 0.6) / 2.2)), rows = Math.max(1, Math.floor((D - 1.6) / 2.2));
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) desk(lb, (c + 0.5) * L / cols, 0.9 + r * 2.2, true);
          lb('metal', L - 0.5, D - 1.0, 0, 0.5, 0.9, 1.4);
          break;
        }
        case 'toilet': {
          const n = Math.max(1, Math.floor((L - 0.4) / 1.3));
          for (let i = 0; i < n; i++) {
            const u = 0.2 + (i + 0.5) * (L - 0.4) / n;
            lb('white', u, 0.45, 0.0, 0.45, 0.6, 0.45);
            if (i > 0) lb('gray', u - (L - 0.4) / n / 2, 0.85, 0.1, 0.05, 1.5, 1.8);
          }
          lb('white', L / 2, D - 0.5, 0.8, Math.min(L - 0.6, 2.4), 0.5, 0.08); lb('gray', L / 2, D - 0.5, 0, Math.min(L - 0.6, 2.4), 0.45, 0.8);
          break;
        }
        case 'water': {
          lb('white', L / 2, D / 2, 0, 0.5, 0.5, 1.1); lc('teal', L / 2, D / 2, 1.1, 0.16, 0.45);
          break;
        }
        case 'lobby': {
          const isMain = L >= 9 || D >= 9;
          lb('wood', L / 2, 1.0, 0, Math.min(4.5, L - 1.5), 0.8, 1.05); lb('white', L / 2, 1.0, 1.05, Math.min(4.6, L - 1.4), 0.9, 0.06); lb('wood', L / 2 - Math.min(4.5, L - 1.5) / 2, 1.6, 0, 0.8, 1.4, 1.05);
          lb('dark', L / 2 - 0.8, 0.5, 0.42, 0.5, 0.5, 0.08); lb('dark', L / 2 + 0.8, 0.5, 0.42, 0.5, 0.5, 0.08);
          if (isMain) for (let v = 3.2; v < D - 1.5; v += 1.7) { chairRow(lb, 0.8, L / 2 - 1.4, v, true); chairRow(lb, L / 2 + 1.4, L - 0.8, v, true); }
          break;
        }
        default: { // consultation room(s)
          const cabins = L > 9 ? 2 : 1;
          for (let c = 0; c < cabins; c++) {
            const u0 = c * L / cabins, cw = L / cabins;
            desk(lb, u0 + cw * 0.62, 1.0, true);
            lb('teal', u0 + cw * 0.62 - 0.3, 1.95, 0.42, 0.48, 0.48, 0.08); lb('teal', u0 + cw * 0.62 + 0.4, 1.95, 0.42, 0.48, 0.48, 0.08);
            lb('white', u0 + 0.75, Math.min(D - 1.2, 1.6), 0, 0.75, 1.9, 0.62); lb('teal', u0 + 0.75, Math.min(D - 1.2, 1.6) - 0.6, 0.62, 0.72, 0.6, 0.12);
            lb('metal', u0 + cw - 0.45, 0.35, 0.8, 0.5, 0.4, 0.15);
            if (c > 0) lb('wall', u0, D / 2 - 0.3, 0, 0.1, D - 1.6, 2.2);
          }
        }
      }
    }

    // ---- outer walls of each building with windows; entrance gaps on the ground floor ----
    (B.blocks || []).filter((bk) => bk.floors.indexOf(F.code) >= 0).forEach((bk) => {
      cur = bk.id;
      const [bx, by, bw, bd] = bk.rect;
      const doors = F.code === 'G' ? (B.walkways || []).flatMap((s) => [s[0], s[1]]) : [];
      [[bx, by, bx + bw, by], [bx, by + bd, bx + bw, by + bd], [bx, by, bx, by + bd], [bx + bw, by, bx + bw, by + bd]].forEach(([x1, y1, x2, y2]) => {
        const horiz = y1 === y2, lo = horiz ? x1 : y1, hi = horiz ? x2 : y2, fixed = horiz ? y1 : x1;
        const gaps = doors.filter((p) => (horiz ? Math.abs(p[1] - y1) < 0.3 && p[0] > lo && p[0] < hi : Math.abs(p[0] - x1) < 0.3 && p[1] > lo && p[1] < hi)).map((p) => (horiz ? p[0] : p[1]));
        const seg = (a, b, key, z0, hh) => { if (b - a < 0.05) return; if (horiz) box(key, (a + b) / 2, fixed, z0, b - a, 0.3, hh); else box(key, fixed, (a + b) / 2, z0, 0.3, b - a, hh); };
        // split the wall around entrance gaps
        const parts = []; let a = lo;
        gaps.sort((p, q) => p - q).forEach((g) => { parts.push([a, g - 1.8]); a = g + 1.8; });
        parts.push([a, hi]);
        parts.forEach(([p0, p1]) => {
          if (p1 - p0 < 0.1) return;
          seg(p0, p1, 'wall', 0, 0.9); seg(p0, p1, 'wall', 2.3, OUT_H - 2.3);
          const n = Math.max(1, Math.floor((p1 - p0) / 3.6));
          const span = (p1 - p0) / n;
          for (let i = 0; i < n; i++) {
            const c0 = p0 + i * span, win = Math.min(2.2, span - 0.8);
            seg(c0, c0 + (span - win) / 2, 'wall', 0.9, 1.4); seg(c0 + (span + win) / 2, c0 + span, 'wall', 0.9, 1.4);
            seg(c0 + (span - win) / 2, c0 + (span + win) / 2, 'glass', 0.9, 1.4);
            seg(c0 + (span - win) / 2, c0 + (span + win) / 2, 'frame', 0.9, 0.06);
          }
        });
        gaps.forEach((g) => { seg(g - 1.8, g + 1.8, 'wall', 2.6, OUT_H - 2.6); });
      });
    });

    // ---- people walking in the corridors ----
    let seed = (F.code.charCodeAt(0) * 131) % 997;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    segs.filter((sg) => sg.zone && sg.zone !== 'walkway').forEach((sg) => {
      cur = sg.zone;
      const L = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]); const horiz = Math.abs(sg.b[1] - sg.a[1]) < 0.01;
      for (let t = 6 + rnd() * 6; t < L - 4; t += 11 + rnd() * 9) {
        const off = (rnd() - 0.5) * 1.6, px = horiz ? sg.a[0] + Math.sign(sg.b[0] - sg.a[0]) * t : sg.a[0] + off, py = horiz ? sg.a[1] + off : sg.a[1] + Math.sign(sg.b[1] - sg.a[1]) * t;
        person(px, py, rnd() < 0.5 ? 'coat' : 'scrub');
      }
    });
    function person(px, py, top) {
      cyl('pants', px, py, 0, 0.16, 0.8, 8); cyl(top, px, py, 0.8, 0.22, 0.62, 10); cyl('skin', px, py, 1.42, 0.12, 0.24, 8);
    }

    // ---- stairs and lifts serving this floor ----
    (B.connectors || []).filter((c) => !c.floors || c.floors.indexOf(F.code) >= 0).forEach((c) => {
      cur = c.block || null;
      const [x, y, w, h] = c.rect;
      if (c.kind === 'stairs') {
        const n = 9, alongX = w >= h;
        for (let i = 0; i < n; i++) {
          const t = i / n;
          if (alongX) box('step', x + w * (t + 0.5 / n), y + h * 0.27, 0, w / n, h * 0.45, 0.17 * (i + 1));
          else box('step', x + w * 0.27, y + h * (t + 0.5 / n), 0, w * 0.45, h / n, 0.17 * (i + 1));
        }
        box('wall', x + w / 2, y + h - 0.07, 0, w, T, WALL_H); box('wall', x + 0.07, y + h / 2, 0, T, h, WALL_H); box('wall', x + w - 0.07, y + h / 2, 0, T, h, WALL_H);
      } else {
        box('lift', x + w / 2, y + h / 2 + 0.15, 0, w - 0.25, h - 0.3, 2.5);
        box('metal', c.door[0], c.door[1] + 0.06, 0.02, Math.min(1.1, w - 0.5), 0.06, 2.1);
      }
      picks.push({ id: `${c.id}@${F.code}`, x, y, w, h, color: new THREE.Color(c.kind === 'lift' ? 0xc9d1d6 : 0xd9dee2), block: cur });
    });

    // ---- tap targets / floor tints ----
    picks.forEach((p) => {
      const geo = new THREE.BoxGeometry(Math.max(0.2, p.w - 0.16), 0.05, Math.max(0.2, p.h - 0.16));
      const mesh = new THREE.Mesh(geo, mat(p.color, 1, fi, 'room', p.block));
      mesh.position.set(p.x + p.w / 2 - CX, 0.03, -(p.y + p.h / 2 - CY));
      mesh.userData.placeId = p.id || p.rm.id; grp.add(mesh);
    });

    // ---- merged meshes ----
    const KIND = { wall: 'room', glass: 'glass', paint: 'paint' };
    const OPA = { glass: 0.38, paint: 1 };
    buckets.forEach((geos, bk) => {
      const [bid, key] = bk.split('|'), block = bid === '~' ? null : bid;
      const geo = merge(geos);
      const mesh = new THREE.Mesh(geo, mat(COL[key] !== undefined ? COL[key] : 0xcccccc, OPA[key] || 1, fi, KIND[key] || 'furn', block));
      grp.add(mesh);
      if (key === 'wall' || key === 'frame') {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), lineMat(0xc5cdd2, fi, block));
        e.userData.interiorLine = true; grp.add(e);
      }
    });
  }

  return { buildFloor, iconFor, kindOf };
})();
