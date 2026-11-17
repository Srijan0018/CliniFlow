/* Building navigator – 3D view + UI. Map data: data/hospital.js or data/block3.js, routing: js/graph.js
   Works for any building in the block3.js format; branding, colours and floor names come from the data file. */
(function () {
  const B = window.BUILDING || window.BLOCK3, NG = window.NavGraph;
  const BR = B.brand || {};
  const g = NG.build(B);
  const H = B.FLOOR_HEIGHT;
  const $ = (id) => document.getElementById(id);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // ---------- branding from the data file ----------
  if (BR.title) {
    document.title = BR.title;
    const eb = document.querySelector('.panel-head .eyebrow'), h1 = document.querySelector('.panel-head h1');
    if (eb) eb.textContent = BR.eyebrow || ''; if (h1) h1.textContent = BR.title;
  }

  // ---------- places / search ----------
  const places = g.places.filter((p) => !/^(L\d)@/.test(p.id) || true);
  const byId = new Map(places.map((p) => [p.id, p]));
  const urlId = (id) => id.replace('@', '-at-');
  const fromUrlId = (s) => s.replace('-at-', '@');
  const floorLabel = (c) => (B.floorNames && B.floorNames[c]) || (c === 'G' ? 'Ground floor' : `Floor ${c}`);
  const floorShort = (c) => (B.floorShort && B.floorShort[c]) || (c === 'G' ? 'G' : 'F' + c);
  const floorWord = (c) => (B.floorNames && B.floorNames[c]) || (c === 'G' ? 'Ground' : 'Floor ' + c);
  const typeColor = {
    classroom: 0x8fb3d9, lab: 0x6cc4a1, hall: 0xb39ddb, office: 0xf2c879, library: 0xe39b7b,
    toilet: 0xb8c2cc, lobby: 0xd9dee4, stairs: 0x55606e, lift: 0x2f3a48,
  };
  const typeName = { classroom: 'Classroom', lab: 'Lab', hall: 'Hall', office: 'Office', library: 'Library', toilet: 'Toilet', stairs: 'Stairs', lift: 'Lift' };
  Object.entries(B.types || {}).forEach(([k, v]) => { typeColor[k] = v.color; typeName[k] = v.name; });
  // extra search words: department names + keywords in every language (typing "ಔಷಧ" or "heart" finds the room)
  const deptWords = (ids) => (ids || []).map((d) => { const D = B.departments && B.departments[d]; if (!D) return ''; return Object.values(D.names).join(' ') + ' ' + Object.values(D.keywords).map((a) => a.join(' ')).join(' '); }).join(' ');

  function search(q) {
    q = q.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const scored = [];
    for (const p of places) {
      if (p.id.includes('~')) continue;
      const hay = (p.hay || (p.hay = `${p.name} ${p.no} ${floorLabel(p.floor)} ${p.floor} ${typeName[p.type] || ''} ${p.block ? blockShort(p.block) : ''} ${deptWords(p.dept)}`.toLowerCase()));
      if (words.every((w) => hay.includes(w) || (w === p.floor.toLowerCase()))) {
        let s = 0;
        if (p.no && p.no.toLowerCase() === q) s -= 100;
        if (p.name.toLowerCase().startsWith(q)) s -= 10;
        if (p.landmark) s += 2;
        scored.push([s + p.fi * 0.01, p]);
      }
    }
    return scored.sort((a, b) => a[0] - b[0]).slice(0, 40).map((x) => x[1]);
  }
  const blockShort = (id) => { const b = (B.blocks || []).find((x) => x.id === id); return b ? b.short : ''; };
  const display = (p) => `${p.no ? p.no + ' · ' : ''}${p.name} · ${p.block ? blockShort(p.block) + ' · ' : ''}${floorWord(p.floor)}`;

  // ---------- state ----------
  const state = { from: null, to: null, floor: 'G', all: false, outside: true, res: null, steps: [], activeStep: -1, focusBlock: null, focusPoint: null, autoStart: true };
  const blockById = (id) => (B.blocks || []).find((b) => b.id === id);

  // ---------- three.js scene ----------
  const mapEl = $('map'), labelsEl = $('labels');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  mapEl.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2000);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 15; controls.maxDistance = Math.max(260, ((B.view && B.view.allDist) || 0) * 1.9);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(-40, 80, 60); scene.add(sun);

  // building coords (x east, y north) -> three (X, Y up, Z south)
  const CX = (B.center || [28.75, 20])[0], CY = (B.center || [28.75, 20])[1];
  const gap = () => (state.all ? H * 2.4 : H);
  const V = (x, y, fi, up = 0) => new THREE.Vector3(x - CX, fi * gap() + up, -(y - CY));

  const floorGroups = [];
  const mats = []; // [{mat, base, fi, kind}]
  function mat(color, opacity, fi, kind, block) {
    const m = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: opacity > 0.9 });
    mats.push({ m, base: opacity, fi, kind, block: block === undefined ? '*' : block }); return m;
  }
  function lineMat(color, fi, block) {
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    mats.push({ m, base: 0.9, fi, kind: 'line', block: block === undefined ? '*' : block }); return m;
  }

  function buildFloors() {
    const ink = new THREE.Color(css('--ink') || '#17233a');
    const slabColor = new THREE.Color(document.documentElement.dataset.theme === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' ? 0x223047 : 0xffffff);
    B.floors.forEach((F, fi) => {
      const grp = new THREE.Group(); grp.userData.fi = fi; floorGroups.push(grp); scene.add(grp);
      // slab: one per building outline on this floor (campus) or the single outline
      const outlines = B.blocks ? B.blocks.filter((bk) => bk.floors.indexOf(F.code) >= 0).map((bk) => [bk.outline, bk.id]) : [[B.outline, undefined]];
      outlines.forEach(([ol, bid]) => {
        const shape = new THREE.Shape(ol.map(([x, y]) => new THREE.Vector2(x - CX, y - CY)));
        const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }), mat(B.blocks && window.Interior && B.interior !== false ? 0xe8dfd1 : slabColor, 1, fi, 'slab', bid));
        slab.rotation.x = -Math.PI / 2; slab.position.y = -0.25; grp.add(slab);
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), lineMat(ink, fi, bid));
        edge.rotation.x = -Math.PI / 2; edge.position.y = -0.25; grp.add(edge);
      });
      // campus: covered walkways on the ground floor
      if (B.walkways && F.code === 'G') {
        B.walkways.forEach(([a, b]) => {
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) return;
          const path = new THREE.Mesh(new THREE.BoxGeometry(L + 3, 0.12, 3.2), mat(0xcfd6dc, 0.95, fi, 'room', null));
          path.position.set((a[0] + b[0]) / 2 - CX, -0.06, -((a[1] + b[1]) / 2 - CY));
          path.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0]); grp.add(path);
        });
      }
      // detailed interiors (walls, glass, furniture) for campus data
      if (window.Interior && B.blocks && B.interior !== false) {
        const ilineMat = (color, f, block) => { const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }); mats.push({ m, base: 0.9, fi: f, kind: 'iline', block: block === undefined ? '*' : block }); return m; };
        window.Interior.buildFloor({ B, F, fi, grp, mat, lineMat: ilineMat, CX, CY, typeColor });
        return;
      }
      // rooms as low blocks
      const flat = new Set(B.flatTypes || ['lobby']);
      const blocks = F.rooms.map((rm) => ({ rects: [rm.rect, ...(rm.extra || [])], type: rm.type, id: rm.id }))
        .concat(B.connectors.filter((c) => !c.floors || c.floors.indexOf(F.code) >= 0).map((c) => ({ rects: [c.rect], type: c.kind, id: `${c.id}@${F.code}` })));
      blocks.forEach((b) => {
        b.rects.forEach(([x, y, w, h]) => {
          const hgt = flat.has(b.type) ? 0.05 : b.type === 'stairs' || b.type === 'lift' ? 1.6 : 1.1;
          const geo = new THREE.BoxGeometry(w - 0.3, hgt, h - 0.3);
          const mesh = new THREE.Mesh(geo, mat(typeColor[b.type] || 0xcccccc, flat.has(b.type) ? 0.6 : 0.82, fi, 'room'));
          mesh.position.set(x + w / 2 - CX, hgt / 2, -(y + h / 2 - CY));
          mesh.userData.placeId = b.id; grp.add(mesh);
          const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(ink, fi));
          e.position.copy(mesh.position); grp.add(e);
        });
      });
    });
  }
  buildFloors();

  // ---------- outside view: the block as it looks from the road ----------
  // SJEC academic blocks: khaki-olive walls, cream floor bands, dark glass (some red curtains),
  // a curved entrance canopy with the block's name board.
  const SJEC = Object.assign({ wall: 0xb4ac83, band: 0xd8d1ad, roof: 0x9d9671, glass: 0x34444c, curtain: 0x8e3a3a, frame: 0xe7e1c6, sign: 0x9fd3d8, signBack: 0x174f56, ground: 0xb7bfa9 }, BR.colors || {});
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const shell = new THREE.Group(); shell.visible = false; scene.add(shell);
  function signTexture(lines, w, h, bg, fg) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = h * 0.05; x.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((ln, i) => {
      x.font = `${ln.weight || 800} ${ln.size}px Archivo, "Helvetica Neue", Arial, sans-serif`;
      x.fillText(ln.text, w / 2, h * ln.y);
    });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  // campus: an aerial "model" of the hospital - lawns, trees, roads, roundabout, parking, gate and the buildings
  function buildCampusShell() {
    const P = (x, y, z) => new THREE.Vector3(x - CX, z, -(y - CY));
    const M = {};
    const lam = (c) => (M[c] = M[c] || new THREE.MeshLambertMaterial({ color: c }));
    const box = (w, h, d, color, x, y, z, rotY = 0, matOverride) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOverride || lam(color));
      m.position.copy(P(x, y, z)); m.rotation.y = rotY; shell.add(m); return m;
    };
    const flat = (x0, y0, x1, y1, color, z = 0.02) => { const m = box(x1 - x0, 0.06, y1 - y0, color, (x0 + x1) / 2, (y0 + y1) / 2, z); m.userData.ground = true; return m; };
    const ASPH = 0xb9bec4, WALK = 0xdcd4c6, GRASS = 0xb7cf9f, HEDGE = 0x86ad70, LINE = 0xffffff, PLATE = 0xe7e4dd;
    const gi = Math.max(0, B.floors.findIndex((f) => f.code === 'G'));
    const gate = B.floors[gi].rooms.find((r) => r.type === 'gate');
    const GX = gate ? gate.rect[0] + gate.rect[2] / 2 : CX, GY = gate ? gate.rect[1] + gate.rect[3] : 0;
    const mainB = B.blocks.find((b) => b.redCross) || B.blocks[B.blocks.length - 1];
    const [mx0, my0, mw] = mainB.rect;
    const RX = mx0 + mw / 2, RY = (GY + my0) / 2 + 2;   // roundabout between the gate and the main entrance

    // ground: lawn + main road outside the gate
    const roadY = GY - 16;
    let px0 = 1e9, px1 = -1e9, py1 = -1e9;
    B.blocks.forEach((bk) => { px0 = Math.min(px0, bk.rect[0]); px1 = Math.max(px1, bk.rect[0] + bk.rect[2]); py1 = Math.max(py1, bk.rect[1] + bk.rect[3]); });
    const PL = { x0: px0 - 48, x1: px1 + 48, y0: roadY - 16, y1: py1 + 40 };
    {
      // rounded base plate, like an architect's presentation model on a table
      const r = 8, w = PL.x1 - PL.x0, h = PL.y1 - PL.y0, sh = new THREE.Shape();
      sh.moveTo(r, 0); sh.lineTo(w - r, 0); sh.quadraticCurveTo(w, 0, w, r); sh.lineTo(w, h - r); sh.quadraticCurveTo(w, h, w - r, h);
      sh.lineTo(r, h); sh.quadraticCurveTo(0, h, 0, h - r); sh.lineTo(0, r); sh.quadraticCurveTo(0, 0, r, 0);
      const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 2 }), lam(PLATE));
      plate.rotation.x = -Math.PI / 2; plate.position.set(PL.x0 - CX, -3.1, -(PL.y0 - CY)); plate.userData.ground = true; shell.add(plate);
    }
    flat(PL.x0 + 2, roadY - 5, PL.x1 - 2, roadY + 5, ASPH, -0.22);
    for (let x = PL.x0 + 6; x < PL.x1 - 6; x += 8) flat(x, roadY - 0.15, x + 4, roadY + 0.15, LINE, -0.17);
    flat(PL.x0 + 2, roadY + 5, PL.x1 - 2, roadY + 8, WALK, -0.21); flat(PL.x0 + 2, roadY - 8, PL.x1 - 2, roadY - 5, WALK, -0.21);

    // campus bounds (all blocks + outdoor places), boundary hedge with the gate opening
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    B.floors.forEach((F) => F.rooms.forEach((rm) => { const [x, y, w, h] = rm.rect; bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x + w); by1 = Math.max(by1, y + h); }));
    bx0 -= 16; bx1 += 16; by1 += 14; by0 = GY - 4;
    flat(bx0, by0, bx1, by1, GRASS, -0.24);
    const hedge = (x0, y0, x1, y1) => box(Math.max(0.8, x1 - x0), 0.9, Math.max(0.8, y1 - y0), HEDGE, (x0 + x1) / 2, (y0 + y1) / 2, 0.15);
    // low hedges around the campus
    hedge(bx0, by0, GX - 9, by0 + 0.8); hedge(GX + 9, by0, bx1, by0 + 0.8); hedge(bx0, by1 - 0.8, bx1, by1); hedge(bx0, by0, bx0 + 0.8, by1); hedge(bx1 - 0.8, by0, bx1, by1);

    // internal roads: gate -> roundabout -> main entrance, ring road, branches
    flat(GX - 5, by0, GX + 5, RY - 10, ASPH);
    flat(RX - 9, RY + 9, RX + 9, my0 - 0.5, ASPH);
    flat(bx0 + 3, RY - 3, RX - 10, RY + 3, ASPH); flat(RX + 10, RY - 3, bx1 - 3, RY + 3, ASPH);
    flat(bx0 + 3, RY - 3, bx0 + 9, by1 - 3, ASPH); flat(bx1 - 9, RY - 3, bx1 - 3, by1 - 3, ASPH); flat(bx0 + 3, by1 - 9, bx1 - 3, by1 - 3, ASPH);
    for (let y = by0 + 2; y < RY - 12; y += 6) flat(GX - 0.12, y, GX + 0.12, y + 3, LINE, 0.06);
    const ring = new THREE.Mesh(new THREE.RingGeometry(7.5, 12, 48), lam(ASPH)); ring.rotation.x = -Math.PI / 2; ring.position.copy(P(RX, RY, 0.05)); shell.add(ring);
    const garden = new THREE.Mesh(new THREE.CircleGeometry(7.5, 40), lam(0xb5cf9c)); garden.rotation.x = -Math.PI / 2; garden.position.copy(P(RX, RY, 0.07)); shell.add(garden);
    // zebra crossings where the walkways cross the roads
    (B.walkways || []).forEach(([a, b]) => {
      const horiz = Math.abs(a[1] - b[1]) < 0.01;
      if (horiz && a[1] > by0 && a[1] < RY - 10 && Math.min(a[0], b[0]) < GX && Math.max(a[0], b[0]) > GX) for (let k = -4; k <= 4; k += 1.2) flat(GX + k - 0.3, a[1] - 1.5, GX + k + 0.3, a[1] + 1.5, LINE, 0.07);
    });

    // trees (instanced): avoid buildings, roads, parking and paths
    const keepOut = [];
    B.blocks.forEach((bk) => { const [x, y, w, h] = bk.rect; keepOut.push([x - 4, y - 4, x + w + 4, y + h + 4]); });
    B.floors[gi].rooms.filter((r) => !r.block).forEach((r) => { const [x, y, w, h] = r.rect; keepOut.push([x - 3, y - 3, x + w + 3, y + h + 3]); });
    keepOut.push([GX - 8, by0 - 2, GX + 8, RY], [RX - 14, RY - 14, RX + 14, my0], [bx0 + 1, RY - 5, bx1 - 1, RY + 5], [bx0 + 1, RY - 5, bx0 + 11, by1], [bx1 - 11, RY - 5, bx1, by1], [bx0, by1 - 11, bx1, by1 + 1]);
    (B.walkways || []).forEach(([a, b]) => keepOut.push([Math.min(a[0], b[0]) - 3, Math.min(a[1], b[1]) - 3, Math.max(a[0], b[0]) + 3, Math.max(a[1], b[1]) + 3]));
    const blocked = (x, y) => keepOut.some(([a, b2, c, d]) => x > a && x < c && y > b2 && y < d) || (y > roadY - 9 && y < roadY + 9);
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const spots = [];
    for (let x = PL.x0 + 5; x < PL.x1 - 5; x += 8) for (let y = PL.y0 + 5; y < PL.y1 - 5; y += 8) {
      const px = x + (rnd() - 0.5) * 5, py = y + (rnd() - 0.5) * 5;
      const inside = px > bx0 && px < bx1 && py > by0 && py < by1;
      if (blocked(px, py)) continue;
      if (inside ? rnd() < 0.16 : rnd() < 0.3) spots.push([px, py, 0.75 + rnd() * 0.5]);
    }
    for (let x = PL.x0 + 6; x < PL.x1 - 6; x += 10) { spots.push([x, roadY + 11, 0.9]); spots.push([x + 5, roadY - 11, 0.9]); }
    const trunkG = new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6), crownG = new THREE.IcosahedronGeometry(1.9, 0);
    const trunks = new THREE.InstancedMesh(trunkG, lam(0xa58d72), spots.length);
    const crownsA = new THREE.InstancedMesh(crownG, lam(0x93b97b), spots.length), crownsB = new THREE.InstancedMesh(crownG, lam(0x7ba868), spots.length);
    const dm = new THREE.Object3D(); let na = 0, nb = 0;
    spots.forEach(([x, y, k], i) => {
      dm.position.copy(P(x, y, 1.1 * k)); dm.scale.set(k, k, k); dm.rotation.set(0, 0, 0); dm.updateMatrix(); trunks.setMatrixAt(i, dm.matrix);
      dm.position.copy(P(x, y, 3.4 * k)); dm.scale.set(k, k * 0.9, k); dm.updateMatrix();
      if (i % 3) crownsA.setMatrixAt(na++, dm.matrix); else crownsB.setMatrixAt(nb++, dm.matrix);
    });
    crownsA.count = na; crownsB.count = nb; shell.add(trunks, crownsA, crownsB);
    // flowers in the roundabout + shrubs
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 6, 5), new THREE.MeshLambertMaterial({ color: 0xffffff }), 70);
    const fc = [0xe0559a, 0xd94a3d, 0xf2c14e, 0xffffff], col = new THREE.Color();
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2, r = i % 2 ? 5.6 : 3.4;
      dm.position.copy(P(RX + Math.cos(a) * r, RY + Math.sin(a) * r, 0.4)); dm.scale.set(1, 1, 1); dm.updateMatrix(); fl.setMatrixAt(i, dm.matrix); fl.setColorAt(i, col.set(fc[i % 4]));
    }
    shell.add(fl);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4, 10), lam(0x7ba868)); cone.position.copy(P(RX, RY, 2)); shell.add(cone);

    // buildings
    const winGlass = lam(0x7fa3b8), WALLC = 0xf1efea, BANDC = 0xd9d6ce;
    B.blocks.forEach((bk) => {
      const [x0, y0, w, d] = bk.rect;
      const above = bk.floors.filter((c) => B.floors.findIndex((f) => f.code === c) >= gi).length;
      const TOP = above * H;
      box(w, TOP, d, WALLC, x0 + w / 2, y0 + d / 2, TOP / 2).userData.block = bk.id;
      // window ribbons on every floor, split by white piers
      for (let f = 0; f < above; f++) {
        const z = f * H + 1.9;
        [[x0 + w / 2, y0 - 0.06, w - 1.2, 0.12], [x0 + w / 2, y0 + d + 0.06, w - 1.2, 0.12], [x0 - 0.06, y0 + d / 2, 0.12, d - 1.2], [x0 + w + 0.06, y0 + d / 2, 0.12, d - 1.2]].forEach(([cx, cy, ww, dd]) => box(ww, 1.5, dd, 0, cx, cy, z, 0, winGlass));
        box(w + 0.3, 0.35, d + 0.3, BANDC, x0 + w / 2, y0 + d / 2, (f + 1) * H - 0.15);
      }
      for (let px = x0 + 4; px < x0 + w - 1; px += 4) { box(0.5, TOP, 0.4, WALLC, px, y0 - 0.12, TOP / 2); box(0.5, TOP, 0.4, WALLC, px, y0 + d + 0.12, TOP / 2); }
      for (let py = y0 + 4; py < y0 + d - 1; py += 4) { box(0.4, TOP, 0.5, WALLC, x0 - 0.12, py, TOP / 2); box(0.4, TOP, 0.5, WALLC, x0 + w + 0.12, py, TOP / 2); }
      // roof: parapet + rooftop units
      box(w - 0.6, 0.3, d - 0.6, 0xc9cbcc, x0 + w / 2, y0 + d / 2, TOP + 0.15);
      box(w, 0.9, 0.35, WALLC, x0 + w / 2, y0 + 0.17, TOP + 0.45); box(w, 0.9, 0.35, WALLC, x0 + w / 2, y0 + d - 0.17, TOP + 0.45);
      box(0.35, 0.9, d, WALLC, x0 + 0.17, y0 + d / 2, TOP + 0.45); box(0.35, 0.9, d, WALLC, x0 + w - 0.17, y0 + d / 2, TOP + 0.45);
      box(Math.min(10, w * 0.25), 2.4, Math.min(7, d * 0.3), 0xe6e6e3, x0 + w * 0.3, y0 + d * 0.62, TOP + 1.2);
      box(Math.min(6, w * 0.15), 1.6, Math.min(5, d * 0.22), 0xd2d4d5, x0 + w * 0.72, y0 + d * 0.4, TOP + 0.8);
      // entrance: glass atrium + canopy (and the red EMERGENCY sign on the main block)
      const ent = bk.entrance;
      if (ent === 'south') {
        const aw = Math.min(18, w * 0.25);
        box(aw, TOP + 1.2, 2.2, 0, x0 + w / 2, y0 - 0.9, (TOP + 1.2) / 2, 0, lam(0x86b3c8));
        for (let k = -aw / 2; k <= aw / 2 + 0.01; k += aw / 6) box(0.18, TOP + 1.2, 2.3, WALLC, x0 + w / 2 + k, y0 - 0.9, (TOP + 1.2) / 2);
        for (let f = 1; f <= above; f++) box(aw, 0.2, 2.3, WALLC, x0 + w / 2, y0 - 0.9, f * H);
        box(aw + 6, 0.5, 6, WALLC, x0 + w / 2, y0 - 3, 4.2);
        [-1, 1].forEach((sgn) => box(0.5, 4.2, 0.5, WALLC, x0 + w / 2 + sgn * (aw / 2 + 2.5), y0 - 5.6, 2.1));
        if (bk.redCross) {
          const tex = signTexture([{ text: '✚  EMERGENCY', size: 92, y: 0.56 }], 1024, 180, '#d32f2f', '#ffffff');
          const sw = aw + 2;
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 180 / 1024), new THREE.MeshBasicMaterial({ map: tex }));
          sign.position.copy(P(x0 + w / 2, y0 - 6.05, 5.2)); shell.add(sign);
        }
      } else {
        const cx = ent === 'east' ? x0 + w + 2.2 : x0 - 2.2, cy = y0 + d / 2;
        box(3.2, TOP * 0.6, 10, 0, ent === 'east' ? x0 + w + 0.6 : x0 - 0.6, cy, TOP * 0.3, 0, lam(0x6f9db4));
        box(4.4, 0.4, 11, WALLC, cx, cy, 3.6);
      }
    });
    // covered walkways between the blocks (glass roof on slim posts); the gate path is the road
    (B.walkways || []).forEach(([a, b]) => {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 3) return;
      const vertical = Math.abs(a[0] - b[0]) < 0.01;
      if (vertical) return;
      const rot = Math.atan2(b[1] - a[1], b[0] - a[0]);
      box(L, 0.22, 4, 0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 3.6, rot, new THREE.MeshLambertMaterial({ color: 0xcfe3ec, transparent: true, opacity: 0.85 }));
      box(L, 0.1, 3.2, WALK, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.05, rot);
      for (let i = 0, n = Math.floor(L / 5); i <= n; i++) {
        const t = n ? i / n : 0.5, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t;
        [-1.8, 1.8].forEach((o) => box(0.2, 3.6, 0.2, 0xb0bec5, px - Math.sin(rot) * o, py + Math.cos(rot) * o, 1.8));
      }
    });
    // footpath beside the entrance road
    flat(GX + 6, by0, GX + 9, RY - 10, WALK, 0.04); flat(GX - 9, by0, GX - 6, RY - 10, WALK, 0.04);

    // outdoor places: parking with cars, ambulance bay, gate with a glass canopy (shadows set up at the end)
    const carCols = [0xffffff, 0xc0c4c8, 0x2f3c4a, 0xb33a3a, 0x8aa1b5, 0xe8e8e8];
    B.floors[gi].rooms.filter((r) => !r.block).forEach((r) => {
      const [x, y, w, d] = r.rect;
      if (r.type === 'gate') {
        box(1.4, 6, 1.4, 0xe8e2d6, x + 0.7, y + d, 3); box(1.4, 6, 1.4, 0xe8e2d6, x + w - 0.7, y + d, 3);
        box(w + 6, 0.5, 6, 0, x + w / 2, y + d - 1, 6.2, 0, new THREE.MeshLambertMaterial({ color: 0xcfe3ec, transparent: true, opacity: 0.9 }));
        box(w + 6.4, 0.25, 6.4, WALLC, x + w / 2, y + d - 1, 6.55);
        [-1, 1].forEach((sgn) => { box(1.6, 2.4, 1.6, 0xd9d4c8, x + w / 2 + sgn * 3.5, y + d - 1, 1.2); });
        flat(x + w / 2 - 5, y + d - 4, x + w / 2 + 5, y + d + 2, ASPH, 0.03);
      } else if (r.dept && r.dept.indexOf('parking') >= 0) {
        flat(x, y, x + w, y + d, ASPH, 0.03);
        const cols = Math.floor(w / 2.8);
        for (let i = 0; i <= cols; i++) { flat(x + i * 2.8 - 0.06, y + 0.4, x + i * 2.8 + 0.06, y + 4.6, LINE, 0.07); flat(x + i * 2.8 - 0.06, y + d - 4.6, x + i * 2.8 + 0.06, y + d - 0.4, LINE, 0.07); }
        for (let i = 0; i < cols; i++) [[y + 2.5, i % 3 !== 1], [y + d - 2.5, i % 4 !== 2]].forEach(([cy, show]) => {
          if (!show) return;
          const cx = x + i * 2.8 + 1.4, c = carCols[(i * 7 + Math.round(cy)) % carCols.length];
          box(1.8, 0.8, 4, c, cx, cy, 0.55); box(1.6, 0.6, 2, 0x26323c, cx, cy, 1.2);
        });
      } else {
        flat(x, y, x + w, y + d, 0xb8bec3, 0.03);
        box(2.2, 2.3, 5.6, 0xffffff, x + w / 2, y + d / 2, 1.4); box(2.25, 0.35, 5.65, 0xd32f2f, x + w / 2, y + d / 2, 1.3);
      }
    });
    // soft shadows, rendered once (the model doesn't move)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    const key = new THREE.DirectionalLight(0xfff6ea, 0.75); shell.userData.key = key;
    key.position.set(-70, 140, 90); key.target.position.set(0, 0, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.4;
    const sc = key.shadow.camera; sc.left = -150; sc.right = 150; sc.top = 130; sc.bottom = -130; sc.near = 10; sc.far = 400;
    shell.add(key, key.target);
    shell.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.receiveShadow = true; o.castShadow = !o.userData.ground; } });
    renderer.shadowMap.needsUpdate = true;
  }

  function buildShell() {
    if (B.blocks) return buildCampusShell();
    const N = B.floors.length, TOP = N * H;
    const outline = B.outline.map(([x, y]) => new THREE.Vector2(x - CX, y - CY));
    const shape = new THREE.Shape(outline);
    const prism = (depth, color, y0, scale = 1) => {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), new THREE.MeshLambertMaterial({ color }));
      m.rotation.x = -Math.PI / 2; m.position.y = y0; m.scale.set(scale, scale, 1); shell.add(m); return m;
    };
    // ground
    const ground = new THREE.Mesh(new THREE.CircleGeometry(95, 56), new THREE.MeshLambertMaterial({ color: SJEC.ground }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; shell.add(ground);
    // walls, floor bands, roof
    prism(TOP, SJEC.wall, 0);
    for (let f = 1; f <= N; f++) prism(0.45, SJEC.band, f * H - 0.45, 1.006);
    prism(0.9, SJEC.roof, TOP, 0.996);
    // windows on every wall longer than 3 m
    let area = 0;
    for (let i = 0; i < B.outline.length; i++) { const [x1, y1] = B.outline[i], [x2, y2] = B.outline[(i + 1) % B.outline.length]; area += x1 * y2 - x2 * y1; }
    const ccw = area > 0, spots = [];
    for (let i = 0; i < B.outline.length; i++) {
      const [x1, y1] = B.outline[i], [x2, y2] = B.outline[(i + 1) % B.outline.length];
      const L = Math.hypot(x2 - x1, y2 - y1); if (L < 3) continue;
      const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      const nx = ccw ? uy : -uy, ny = ccw ? -ux : ux; // outward normal
      const n = Math.max(1, Math.floor((L - 1) / 3.4));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n * L;
        spots.push({ x: x1 + ux * t + nx * 0.08, y: y1 + uy * t + ny * 0.08, nx, ny });
      }
    }
    const count = spots.length * N;
    const winGeo = new THREE.BoxGeometry(1.7, 1.6, 0.12), frameGeo = new THREE.BoxGeometry(2.0, 1.9, 0.08);
    const wins = new THREE.InstancedMesh(winGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), count);
    const frames = new THREE.InstancedMesh(frameGeo, new THREE.MeshLambertMaterial({ color: SJEC.frame }), count);
    const dummy = new THREE.Object3D(), glass = new THREE.Color(SJEC.glass), curtain = new THREE.Color(SJEC.curtain);
    let k = 0, seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let f = 0; f < N; f++) {
      spots.forEach((sp) => {
        const pos = new THREE.Vector3(sp.x - CX, f * H + 1.9, -(sp.y - CY));
        dummy.position.copy(pos); dummy.lookAt(pos.clone().add(new THREE.Vector3(sp.nx, 0, -sp.ny))); dummy.updateMatrix();
        frames.setMatrixAt(k, dummy.matrix);
        dummy.position.add(new THREE.Vector3(sp.nx * 0.05, 0, -sp.ny * 0.05)); dummy.updateMatrix();
        wins.setMatrixAt(k, dummy.matrix);
        wins.setColorAt(k, rnd() < 0.18 ? curtain : glass);
        k++;
      });
    }
    shell.add(frames, wins);
    // entrance canopy on the lobby side (west), like the real block
    const lobbyY = 14.8 - CY;
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.7, 40, 1, false, Math.PI, Math.PI), new THREE.MeshLambertMaterial({ color: SJEC.band }));
    canopy.position.set(0 - CX, 3.6, -lobbyY); shell.add(canopy);
    [-3.2, 3.2].forEach((dz) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.6, 16), new THREE.MeshLambertMaterial({ color: SJEC.band }));
      col.position.set(-3.8 - CX, 1.8, -lobbyY + dz); shell.add(col);
    });
    const smallSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: signTexture([{ text: BR.canopy || 'ACADEMIC BLOCK III', size: 64, y: 0.55 }], 768, 140, hex(SJEC.sign), '#ffffff') }));
    smallSign.position.set(-5.25 - CX, 3.6, -lobbyY); smallSign.rotation.y = -Math.PI / 2; shell.add(smallSign);
    // name board on the roof above the entrance (west) side, facing the visitor
    const board = new THREE.Group();
    const boardTex = signTexture([
      { text: BR.signTop || 'SJEC', size: 120, y: 0.36 },
      { text: BR.signBottom || 'ACADEMIC BLOCK 3', size: 96, y: 0.72, weight: 700 },
    ], 1024, 300, BR.colors ? hex(SJEC.sign) : '#1f6f78', '#ffffff');
    const face = new THREE.Mesh(new THREE.PlaneGeometry(20, 5.9), new THREE.MeshBasicMaterial({ map: boardTex }));
    face.position.z = 0.16; board.add(face);
    const back = new THREE.Mesh(new THREE.BoxGeometry(20.4, 6.2, 0.3), new THREE.MeshLambertMaterial({ color: SJEC.signBack }));
    board.add(back);
    [-7, 7].forEach((dx) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.4), new THREE.MeshLambertMaterial({ color: 0x55605f })); leg.position.set(dx, -4, -0.2); board.add(leg); });
    board.scale.set(0.8, 0.8, 0.8); board.rotation.y = -Math.PI / 2;
    board.position.set(4 - CX, TOP + 4.6, -(11 - CY)); shell.add(board);
    if (BR.redCross) {
      // hospital red cross on the west wall, above the entrance
      const cross = new THREE.Group(), red = new THREE.MeshBasicMaterial({ color: 0xd32f2f });
      cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 1.6), red), new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 5), red));
      cross.position.set(-0.35 - CX, TOP - 4, -(15.5 - CY)); shell.add(cross);
    }
  }
  buildShell();

  // route objects
  const routeGroup = new THREE.Group(); scene.add(routeGroup);
  let routeArrows = [];

  function clearRoute() {
    while (routeGroup.children.length) {
      const c = routeGroup.children.pop(); c.geometry && c.geometry.dispose();
    }
    routeArrows = [];
  }

  function drawRoute() {
    clearRoute();
    floorGroups.forEach((grp, fi) => { grp.position.y = fi * gap(); });
    if (!state.res || state.outside) return;
    const P = state.res.path.filter((n, i, a) => i === 0 || Math.hypot(n.x - a[i - 1].x, n.y - a[i - 1].y) > 0.01 || n.fi !== a[i - 1].fi);
    const green = new THREE.Color(css('--exit') || '#138a4a');
    const pts = P.map((n) => V(n.x, n.y, n.fi, 0.9));
    // per-segment tubes, coloured faint when off the focused floor
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (a.distanceTo(b) < 0.01) continue;
      const fiA = P[i - 1].fi, fiB = P[i].fi;
      const onFocus = state.all || (fiA === fidx(state.floor) && fiB === fiA) || (fiA !== fiB && (fiA === fidx(state.floor) || fiB === fidx(state.floor)));
      if (!onFocus && fiA === fiB) continue; // other floors' walking legs would clutter this floor
      const geo = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, onFocus ? 0.38 : 0.2, 8, false);
      const m = new THREE.MeshBasicMaterial({ color: green, transparent: !onFocus, opacity: onFocus ? 1 : 0.35, depthTest: onFocus ? true : false });
      const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 5; routeGroup.add(mesh);
      // joints
      const j = new THREE.Mesh(new THREE.SphereGeometry(onFocus ? 0.38 : 0.2, 10, 8), m); j.position.copy(b); routeGroup.add(j);
    }
    // moving chevrons along the route
    const single = B.blocks && !state.all, f0 = fidx(state.floor);
    let cpts = pts;
    if (single) {
      // longest stretch of the route on the floor being shown
      let best = [], run = [];
      P.forEach((n, i) => { if (n.fi === f0) run.push(pts[i]); else { if (run.length > best.length) best = run; run = []; } });
      if (run.length > best.length) best = run;
      cpts = best.length >= 2 ? best : [];
    }
    const curve = new THREE.CurvePath();
    for (let i = 1; i < cpts.length; i++) if (cpts[i - 1].distanceTo(cpts[i]) > 0.01) curve.add(new THREE.LineCurve3(cpts[i - 1], cpts[i]));
    const total = curve.getLength();
    if (B.blocks) {
      // campus: one green dot (the person) walks the route from start to destination, like a map preview
      if (total >= 0.5) {
        const w = new THREE.Group();
        const dotM = new THREE.MeshBasicMaterial({ color: 0x1aa260, depthTest: false });
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), dotM); dot.position.y = 0.3; dot.renderOrder = 9; w.add(dot);
        const halo = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.9, 36), new THREE.MeshBasicMaterial({ color: 0x1aa260, transparent: true, opacity: 0.3, depthTest: false, side: THREE.DoubleSide }));
        halo.rotation.x = -Math.PI / 2; halo.position.y = -0.3; halo.renderOrder = 8; w.add(halo);
        w.userData = { u: 0, walker: true, halo }; routeGroup.add(w); routeArrows.push(w);
      }
    } else {
      const count = total < 0.5 ? 0 : Math.max(4, Math.round(total / 6));
      const arrowGeo = new THREE.ConeGeometry(0.55, 1.4, 12); arrowGeo.rotateX(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let k = 0; k < count; k++) {
        const a = new THREE.Mesh(arrowGeo, arrowMat); a.renderOrder = 6; a.userData.u = k / count; routeGroup.add(a); routeArrows.push(a);
      }
    }
    routeGroup.userData.curve = curve;
    // pins
    const pin = (n, color) => {
      const grp = new THREE.Group();
      const k = B.blocks ? 0.6 : 1; // smaller pins in the detailed campus view
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1 * k, 20, 14), new THREE.MeshLambertMaterial({ color }));
      ball.position.y = 3.2 * k + 0.6; grp.add(ball);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * k, 0.15 * k, 3 * k + 0.6, 8), new THREE.MeshLambertMaterial({ color }));
      stick.position.y = (3 * k + 0.6) / 2; grp.add(stick);
      grp.position.copy(V(n.x, n.y, n.fi, 0)); routeGroup.add(grp);
    };
    if (!single || P[0].fi === f0) pin(P[0], new THREE.Color(css('--here') || '#d98a00'));
    if (!single || P[P.length - 1].fi === f0) pin(P[P.length - 1], B.blocks ? new THREE.Color(0xe53935) : green);
  }

  const fidx = (code) => B.floors.findIndex((f) => f.code === code);
  const roomById = new Map(); B.floors.forEach((F) => F.rooms.forEach((rm) => roomById.set(rm.id, rm)));

  const DETAIL = new Set(['furn', 'glass', 'paint', 'iline']);
  function applyFloorVisibility() {
    const f = fidx(state.floor);
    shell.visible = state.outside;
    $('outsideHint').hidden = !state.outside;
    const fbk = B.blocks && !state.outside ? state.focusBlock : null;
    mats.forEach(({ m, base, fi, kind, block }) => {
      let o;
      if (state.outside) o = 0;
      else if (fbk && block !== '*' && block !== fbk) o = 0;      // only the block you asked for
      else if (state.all && !DETAIL.has(kind)) o = base * (kind === 'line' ? 0.5 : 0.55);
      else if (DETAIL.has(kind)) o = (fi === f && !state.all) ? base : 0;   // furniture, glass, paint: focused floor only
      else if (fi === f) o = base;
      else if (fi < f) o = B.blocks ? 0 : (kind === 'line' ? 0.12 : base * 0.08);
      else o = 0;
      // an opaque slab must render in the opaque pass, or it paints over the rooms sitting on it
      const solid = o > 0.999;
      if (m.transparent === solid) { m.transparent = !solid; m.needsUpdate = true; }
      m.opacity = o; m.visible = o > 0.001; m.depthWrite = solid || (kind === 'room' && o > 0.5);
    });
  }

  // ---------- camera ----------
  const camGoal = { target: new THREE.Vector3(), pos: null, t: 1 };
  function frame(animate = true) {
    const f = fidx(state.floor);
    const tY = state.all ? (B.floors.length - 1) * gap() / 2 : f * gap();
    let target = new THREE.Vector3(0, tY, 0);
    const narrow = mapEl.clientWidth < 600;
    const VW = B.view || {};
    if (state.outside && B.blocks) {
      // campus: from above the main gate, looking north over all blocks
      target = new THREE.Vector3(0, 6, 0);
      const od = narrow ? [0, 1.7, 1] : (VW.outsideDir || [0.45, 0.55, 1]);   // phones: more top-down, fits a tall screen
      const pos = target.clone().add(new THREE.Vector3(od[0], od[1], od[2]).normalize().multiplyScalar((VW.outsideDist || 170) * (narrow ? 2.35 : 1)));
      if (!animate) { controls.target.copy(target); camera.position.copy(pos); camGoal.t = 1; return; }
      camGoal.fromT = controls.target.clone(); camGoal.fromP = camera.position.clone();
      camGoal.target = target; camGoal.pos = pos; camGoal.t = 0; return;
    }
    if (state.outside) {
      // from the entrance side (west): the block stands tall, with the canopy and name board facing you
      target = new THREE.Vector3(-2, B.floors.length * H * 0.5, 0);
      const pos = target.clone().add(new THREE.Vector3(-1, 0.3, 0.22).normalize().multiplyScalar(Math.max(115, 34 / (Math.tan(21 * Math.PI / 180) * Math.max(0.3, camera.aspect)))));
      if (!animate) { controls.target.copy(target); camera.position.copy(pos); camGoal.t = 1; return; }
      camGoal.fromT = controls.target.clone(); camGoal.fromP = camera.position.clone();
      camGoal.target = target; camGoal.pos = pos; camGoal.t = 0; return;
    }
    let dist = state.all ? (VW.allDist || 150) : narrow ? (VW.distNarrow || 105) : (VW.dist || 80);
    let dir = new THREE.Vector3(0.0, state.all ? 0.55 : 0.95, 0.75).normalize();
    const fb = state.focusBlock && blockById(state.focusBlock);
    if (state.focusPoint && !state.all) {
      // close-up, like an architect's cut-away model of that part of the floor
      target = new THREE.Vector3(state.focusPoint[0] - CX, tY, -(state.focusPoint[1] - CY));
      dist = narrow ? 92 : 54;
      dir = new THREE.Vector3(0, 1, 0.62).normalize();   // straight from the south: floors look level
    } else if (fb) {
      // zoom into one block, seen at an angle like an architect's model
      const [bx, by, bw, bd] = fb.rect;
      target = new THREE.Vector3(bx + bw / 2 - CX, tY, -(by + bd / 2 - CY));
      dist = (Math.max(bw, bd) * (state.all ? 1.6 : 1.3) + 16) * (narrow ? 1.55 : 1);
      dir = new THREE.Vector3(0, state.all ? 0.6 : 1, state.all ? 0.85 : 0.62).normalize();
    }
    const pos = target.clone().add(dir.multiplyScalar(dist));
    if (!animate) { controls.target.copy(target); camera.position.copy(pos); camGoal.t = 1; return; }
    camGoal.fromT = controls.target.clone(); camGoal.fromP = camera.position.clone();
    camGoal.target = target; camGoal.pos = pos; camGoal.t = 0;
  }

  // ---------- labels ----------
  let labelNodes = [];
  function buildLabels() {
    labelsEl.innerHTML = '';
    labelNodes = [];
    if (state.outside && B.blocks) {
      const gi0 = Math.max(0, B.floors.findIndex((f) => f.code === 'G'));
      const pills = B.blocks.map((bk) => {
        const above = bk.floors.filter((c) => B.floors.findIndex((f) => f.code === c) >= gi0).length;
        const bc = { A: '#d64545', B: '#1e6fd9', C: '#0f8b8d' }[bk.badge] || '#0d4f8b';
        return { html: `<b style="background:${bc};box-shadow:0 0 0 1px ${bc}">${bk.badge || ''}</b>${bk.name}`, x: bk.rect[0] + bk.rect[2] / 2, y: bk.rect[1] + bk.rect[3] / 2, z: above * H + 6, block: bk.id };
      });
      B.floors[gi0].rooms.filter((r) => !r.block).forEach((r) => pills.push({ html: r.type === 'gate' ? 'Main Entrance' : r.name, x: r.rect[0] + r.rect[2] / 2, y: r.type === 'gate' ? r.rect[1] - 3 : r.rect[1] + r.rect[3] / 2, z: r.type === 'gate' ? 0 : 3, small: r.type !== 'gate', id: r.id }));
      pills.forEach((pl) => {
        const d = document.createElement('div');
        d.className = 'lbl pill' + (pl.small ? ' small' : '') + (pl.block ? ' blockpill' : '');
        d.innerHTML = pl.html;
        if (pl.block) d.onclick = (e) => { e.stopPropagation(); state.focusBlock = pl.block; state.focusPoint = null; state.outside = false; state.all = false; state.floor = 'G'; refreshView(true); };
        labelsEl.appendChild(d);
        labelNodes.push({ el: d, prio: pl.block ? 100 : 1, must: !!pl.block, v: () => new THREE.Vector3(pl.x - CX, pl.z, -(pl.y - CY)) });
      });
      labelNodes.forEach((n) => { n.w = n.el.offsetWidth; n.h = n.el.offsetHeight; });
      return;
    }
    if (state.outside) return;
    const f = fidx(state.floor);
    const fl = B.floors[f];
    const show = state.all ? [] : fl.rooms.filter((rm) => !B.blocks || (rm.type !== 'toilet' && rm.type !== 'staff' && (!state.focusBlock || rm.block === state.focusBlock))).map((rm) => ({ id: rm.id, name: rm.name, no: rm.no, x: rm.rect[0] + rm.rect[2] / 2, y: rm.rect[1] + rm.rect[3] / 2, fi: f }));
    if (!state.all) B.connectors.filter((c) => c.kind === 'stairs' && (!c.floors || c.floors.indexOf(fl.code) >= 0) && !/Fire Exit/.test(c.name) && (!B.blocks || !state.focusBlock || c.block === state.focusBlock)).forEach((c) => show.push({ id: `${c.id}@${fl.code}`, name: c.name.replace(' Staircase', ' stairs'), x: c.rect[0] + c.rect[2] / 2, y: c.rect[1] + c.rect[3] / 2, fi: f }));
    if (state.all && state.res) {
      const P = state.res.path; [P[0], P[P.length - 1]].forEach((n) => show.push({ id: n.ref && n.ref.id ? (n.kind === 'room' ? n.ref.id : n.id) : n.id, name: n.ref ? n.ref.name : '', x: n.x, y: n.y, fi: n.fi }));
    }
    show.forEach((s) => {
      const d = document.createElement('div');
      d.className = 'lbl';
      const fromId = state.from && state.from.id, toId = state.to && state.to.id;
      if (s.id === toId) d.classList.add('hit');
      if (s.id === fromId) d.classList.add('src');
      const ic = s.icon || (s.id && byId.get(s.id) && window.Interior ? window.Interior.iconFor(roomById.get(s.id) || {}) : '');
      d.textContent = (ic ? ic + ' ' : '') + s.name;
      if (s.no) { const sm = document.createElement('small'); sm.textContent = s.no; d.appendChild(sm); }
      labelsEl.appendChild(d);
      const rm = roomById.get(s.id);
      const prio = (s.id === toId ? 1e6 : 0) + (s.id === fromId ? 5e5 : 0) + (rm ? rm.rect[2] * rm.rect[3] : 10);
      labelNodes.push({ el: d, prio, must: s.id === toId || s.id === fromId, v: () => V(s.x, s.y, s.fi, s.id && s.id.includes('LOBBY') ? 0.4 : 1.4) });
    });
    labelNodes.sort((a, b) => b.prio - a.prio);
    labelNodes.forEach((n) => { n.w = n.el.offsetWidth; n.h = n.el.offsetHeight; });
  }
  function placeLabels() {
    const w = mapEl.clientWidth, h = mapEl.clientHeight, placed = [];
    labelNodes.forEach((n) => {
      const { el, v } = n;
      const p = v().project(camera);
      let vis = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
      const sx = (p.x + 1) / 2 * w, sy = (1 - p.y) / 2 * h;
      if (vis && B.blocks) {
        // skip a label that would cover a more important one (destination and start always win)
        const r = { l: sx - n.w / 2 - 3, r: sx + n.w / 2 + 3, t: sy - n.h / 2 - 2, b: sy + n.h / 2 + 2 };
        if (!n.must && placed.some((q) => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t)) vis = false;
        else placed.push(r);
      }
      el.hidden = !vis;
      if (vis) { el.style.left = `${sx}px`; el.style.top = `${sy}px`; }
    });
  }

  // ---------- floor rail ----------
  function buildRail() {
    const rail = $('rail'); rail.innerHTML = '';
    const onRoute = new Set(state.res ? state.res.path.map((n) => n.floor) : []);
    const home = document.createElement('button');
    home.title = 'Re-centre the map'; home.setAttribute('aria-label', 'Re-centre the map');
    home.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><circle cx="8" cy="8" r="4.5" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><path d="M8 0.5v3M8 12.5v3M0.5 8h3M12.5 8h3" stroke="currentColor" stroke-width="1.6"/></svg>';
    home.onclick = () => { state.focusBlock = null; state.focusPoint = null; refreshView(true); };
    rail.appendChild(home);
    const out = document.createElement('button');
    out.title = 'Outside view of the block'; out.setAttribute('aria-label', 'Outside view of the block');
    out.className = state.outside ? 'on' : '';
    out.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2 14.5h12M3.5 14.5V4l4.5-2.5L12.5 4v10.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6 6.5h1.3M8.7 6.5H10M6 9h1.3M8.7 9H10M7 14.5v-2.5h2v2.5" stroke="currentColor" stroke-width="1.4"/></svg>';
    out.onclick = () => { state.outside = true; state.focusPoint = null; refreshView(true); };
    rail.appendChild(out);
    const sep0 = document.createElement('div'); sep0.className = 'sep'; rail.appendChild(sep0);
    const all = document.createElement('button');
    all.textContent = 'All'; all.title = 'Show all floors'; all.className = state.all && !state.outside ? 'on' : '';
    all.onclick = () => { state.all = state.outside ? true : !state.all; state.outside = false; state.focusPoint = null; refreshView(true); };
    rail.appendChild(all);
    const sep = document.createElement('div'); sep.className = 'sep'; rail.appendChild(sep);
    [...B.floors].reverse().forEach((F) => {
      const b = document.createElement('button');
      b.textContent = F.code; b.title = floorLabel(F.code);
      const fbk = state.focusBlock && blockById(state.focusBlock);
      const absent = fbk && fbk.floors.indexOf(F.code) < 0;
      b.className = (!state.all && !state.outside && F.code === state.floor ? 'on ' : '') + (onRoute.has(F.code) ? 'onroute ' : '') + (absent ? 'absent' : '');
      b.onclick = () => { if (absent) state.focusBlock = null; state.focusPoint = null; state.all = false; state.outside = false; state.floor = F.code; refreshView(true); };
      rail.appendChild(b);
    });
    const fbn = state.focusBlock && blockById(state.focusBlock);
    if (renderer.shadowMap.enabled && state.outside) renderer.shadowMap.needsUpdate = true;
    if (B.blocks) { hemi.intensity = state.outside ? 0.58 : 0.85; sun.intensity = state.outside ? 0.08 : 0.55; }
    mapEl.classList.toggle('is-outside', !!(state.outside && B.blocks));
    $('floorcap').textContent = state.outside ? (BR.caption || 'SJEC Academic Block 3') : (fbn ? fbn.short + ' · ' : '') + (state.all ? 'All floors' : floorLabel(state.floor));
    buildBlockBar();
  }

  function refreshView(animate) {
    applyFloorVisibility(); drawRoute(); buildLabels(); buildRail(); frame(animate);
  }

  // ---------- campus: block switcher (Campus / Main / OPD / Admin) ----------
  function buildBlockBar() {
    if (!B.blocks) return;
    let bar = $('blockbar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'blockbar'; bar.className = 'blockbar'; $('map').appendChild(bar); }
    bar.innerHTML = '';
    const mk = (label, id) => {
      const b = document.createElement('button');
      b.textContent = label; b.className = (state.focusBlock === id && !state.outside) || (!id && !state.focusBlock && !state.outside) ? 'on' : '';
      b.onclick = () => {
        state.focusBlock = id; state.focusPoint = null; state.outside = false; state.all = false;
        const bk = id && blockById(id); if (bk && bk.floors.indexOf(state.floor) < 0) state.floor = 'G';
        refreshView(true);
      };
      bar.appendChild(b);
    };
    mk('Campus', null);
    B.blocks.slice().reverse().forEach((bk) => mk(bk.short.replace(' Block', ''), bk.id));
  }

  // ---------- campus: directory of every department by block and floor ----------
  function openDirectory() {
    let sh = $('dirSheet');
    if (!sh) {
      sh = document.createElement('div'); sh.id = 'dirSheet'; sh.className = 'sheet';
      sh.innerHTML = '<div class="sheet-card" role="dialog" aria-labelledby="dirTitle"><div class="sheet-head"><h2 id="dirTitle">Hospital directory</h2><button class="btn" id="dirClose">Close</button></div><input id="dirFilter" class="dir-filter" type="search" placeholder="Filter departments…" aria-label="Filter departments"><div id="dirBody" class="dir-body"></div></div>';
      document.body.appendChild(sh);
      $('dirClose').onclick = () => { sh.hidden = true; };
      sh.onclick = (e) => { if (e.target === sh) sh.hidden = true; };
      $('dirFilter').oninput = () => fillDir($('dirFilter').value);
    }
    sh.hidden = false; $('dirFilter').value = ''; fillDir('');
  }
  function fillDir(q) {
    q = q.trim().toLowerCase();
    const body = $('dirBody'); body.innerHTML = '';
    const sections = (B.blocks || []).map((bk) => ({ title: bk.name, id: bk.id, floors: bk.floors.slice().reverse() }));
    sections.push({ title: 'Outdoors', id: null, floors: ['G'] });
    sections.forEach((sec) => {
      const wrap = document.createElement('section'); wrap.className = 'dir-block';
      let any = false;
      const h = document.createElement('h3'); h.textContent = sec.title; wrap.appendChild(h);
      sec.floors.forEach((code) => {
        const F = B.floors.find((f) => f.code === code); if (!F) return;
        const seen = new Set();
        const rooms = F.rooms.filter((rm) => (sec.id ? rm.block === sec.id : !rm.block) && rm.type !== 'toilet' && rm.type !== 'staff' && !seen.has(rm.name) && seen.add(rm.name))
          .filter((rm) => !q || `${rm.name} ${deptWords(rm.dept)}`.toLowerCase().includes(q));
        if (!rooms.length) return;
        any = true;
        const row = document.createElement('div'); row.className = 'dir-floor';
        row.innerHTML = `<span class="dir-fl">${floorLabel(code)}</span>`;
        const chips = document.createElement('div'); chips.className = 'dir-chips';
        rooms.forEach((rm) => {
          const c = document.createElement('button'); c.type = 'button';
          const ic = window.Interior ? window.Interior.iconFor(rm) : '';
          c.textContent = (ic ? ic + ' ' : '') + rm.name;
          c.onclick = () => { $('dirSheet').hidden = true; const p = byId.get(rm.id); if (p) { toBox.set(p); compute(); if (isPhone()) openDrawer(false); } };
          chips.appendChild(c);
        });
        row.appendChild(chips); wrap.appendChild(row);
      });
      if (any) body.appendChild(wrap);
    });
  }
  if (B.blocks) {
    const db = document.createElement('button'); db.className = 'btn'; db.id = 'dirBtn'; db.textContent = 'Directory';
    db.onclick = openDirectory;
    $('qrBtn').parentNode.insertBefore(db, $('qrBtn'));
  }

  // ---------- legend ----------
  if (B.blocks && window.Interior && B.interior !== false) $('legend').hidden = true;
  $('legend').innerHTML = (B.legend || ['classroom', 'lab', 'hall', 'office', 'library', 'toilet', 'stairs', 'lift'])
    .map((t) => `<span><i style="background:#${typeColor[t].toString(16).padStart(6, '0')}"></i>${typeName[t]}</span>`).join('');

  // ---------- routing UI ----------
  const icons = {
    start: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="currentColor"/></svg>',
    end: '<svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    walk: '<svg viewBox="0 0 16 16"><path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    left: '<svg viewBox="0 0 16 16"><path d="M11 14V8a2 2 0 00-2-2H3M6 3L3 6l3 3" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    right: '<svg viewBox="0 0 16 16"><path d="M5 14V8a2 2 0 012-2h6M10 3l3 3-3 3" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    back: '<svg viewBox="0 0 16 16"><path d="M5 14V6a3 3 0 016 0v2M8 6l3 3 3-3" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    stairs: '<svg viewBox="0 0 16 16"><path d="M2 14h3v-3h3V8h3V5h3V2" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    lift: '<svg viewBox="0 0 16 16"><rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6 7l2-2 2 2M6 9l2 2 2-2" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  };

  function compute() {
    if (B.blocks && state.autoStart && state.to && state.to.block) {
      const lob = byId.get(`${state.to.block}G-LOBBY`);
      if (lob && (!state.from || state.from.block !== state.to.block)) fromBox.set(lob);
    }
    state.res = null; state.steps = []; state.activeStep = -1;
    if (state.from && state.to && state.from.id !== state.to.id) {
      const opts = { avoidStairs: $('noStairs').checked, avoidLifts: $('noLifts').checked };
      state.res = NG.route(g, state.from.id, state.to.id, opts);
      if (state.res) state.steps = NG.directions(g, state.res, B);
    }
    renderSteps();
    if (state.res) {
      const floors = new Set(state.res.path.map((n) => n.floor));
      state.floor = state.from.floor;
      state.outside = false;
      state.all = floors.size > 1; // show the whole trip first; tap a step to zoom to its floor
      if (B.blocks) {
        // campus: open straight on the destination floor, zoomed into the destination's block
        const end = state.res.path[state.res.path.length - 1];
        state.all = false;
        state.floor = end.floor;
        state.focusBlock = (end.ref && end.ref.block) || (end.zone && end.zone !== 'walkway' ? end.zone : null);
        state.focusPoint = [end.x, end.y];
      }
    } else if (state.to) state.floor = state.to.floor;
    else if (state.from) state.floor = state.from.floor;
    refreshView(true);
    writeUrl();
    routeListeners.forEach((cb) => { try { cb(state.res, state.steps); } catch (e) { console.error(e); } });
  }
  const routeListeners = [];

  function renderSteps() {
    const ol = $('steps'); ol.innerHTML = '';
    $('empty').hidden = !!state.res;
    $('summary').hidden = !state.res;
    if (state.from && state.to && !state.res) {
      $('empty').hidden = false;
      $('empty').textContent = state.from.id === state.to.id ? 'You are already there.' : 'No route found with these options. Try allowing stairs or lifts.';
    } else if (!state.res) {
      $('empty').textContent = "Pick where you are and where you want to go. Scanning a room's QR code fills in the first box for you.";
    }
    if (!state.res) return;
    const walk = NG.totalWalk(state.res);
    const P = state.res.path;
    let floorsMoved = 0, usedLift = null, usedStairs = null;
    for (let i = 1; i < P.length; i++) if (P[i].floor !== P[i - 1].floor) { floorsMoved++; if (P[i].kind === 'lift') usedLift = P[i].ref.name; else usedStairs = P[i].ref.name; }
    const secs = walk / 1.2 + (usedLift ? 40 + floorsMoved * 4 : 0) + (usedStairs ? floorsMoved * 15 : 0);
    $('sumMetres').textContent = `${Math.round(walk)} m`;
    const via = usedLift ? `via ${usedLift}` : usedStairs ? `via the ${usedStairs.toLowerCase()}` : 'same floor';
    $('sumMeta').textContent = `about ${Math.max(1, Math.round(secs / 60))} min · ${via}`;
    state.steps.forEach((s, i) => {
      const li = document.createElement('li');
      li.dataset.icon = s.icon; li.tabIndex = 0;
      li.innerHTML = `<span class="ico">${icons[s.icon] || icons.walk}</span><span class="stxt"></span><span class="sfl">${s.floor}</span>`;
      li.querySelector('.stxt').textContent = s.text;
      const go = () => { state.activeStep = i; [...ol.children].forEach((c, k) => c.classList.toggle('active', k === i)); state.all = false; state.outside = false; state.floor = s.floor;
        if (B.blocks && s.at) { const z = (s.at.zone && s.at.zone !== 'walkway') ? s.at.zone : (s.at.ref && s.at.ref.block); state.focusBlock = z || null; state.focusPoint = [s.at.x, s.at.y]; }
        refreshView(true); };
      li.onclick = go; li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      ol.appendChild(li);
    });
  }

  function combo(inputId, listId, key) {
    const input = $(inputId), list = $(listId);
    let items = [], sel = 0;
    const show = () => {
      items = search(input.value);
      list.innerHTML = '';
      if (!items.length) { list.innerHTML = '<div class="empty" style="padding:8px">No match. Try a room name, lab or floor.</div>'; }
      items.forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-selected', i === sel ? 'true' : 'false');
        b.innerHTML = `<span class="fl">${floorShort(p.floor)}</span><span></span>`;
        b.lastChild.textContent = (p.no ? p.no + ' · ' : '') + p.name;
        b.onmousedown = (e) => { e.preventDefault(); pick(p); };
        list.appendChild(b);
      });
      list.hidden = false;
    };
    const pick = (p) => { state[key] = p; if (key === 'from') state.autoStart = false; input.value = display(p); list.hidden = true; input.blur(); compute(); };
    input.addEventListener('focus', () => { input.select(); sel = 0; show(); });
    input.addEventListener('input', () => { sel = 0; show(); });
    input.addEventListener('blur', () => { setTimeout(() => { list.hidden = true; if (state[key]) input.value = display(state[key]); }, 120); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); show(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); show(); e.preventDefault(); }
      else if (e.key === 'Enter' && items[sel]) { pick(items[sel]); e.preventDefault(); }
      else if (e.key === 'Escape') { list.hidden = true; input.blur(); }
    });
    return { set: (p) => { state[key] = p; input.value = p ? display(p) : ''; } };
  }
  const fromBox = combo('from', 'from-s', 'from');
  const toBox = combo('to', 'to-s', 'to');
  $('swap').onclick = () => { const f = state.from, t = state.to; state.autoStart = false; fromBox.set(t); toBox.set(f); compute(); };
  $('noStairs').onchange = () => { if ($('noStairs').checked) $('noLifts').checked = false; compute(); };
  $('noLifts').onchange = () => { if ($('noLifts').checked) $('noStairs').checked = false; compute(); };

  // ---------- URL: ?from=6-T1&to=6-IOT  or  #from-6-T1 ----------
  function readUrl() {
    let from = null, to = null;
    try {
      const q = new URLSearchParams(location.search);
      from = q.get('from'); to = q.get('to');
    } catch (e) { /* ignore */ }
    const h = (location.hash || '').slice(1);
    if (h.startsWith('from-')) from = h.slice(5);
    else if (h.startsWith('to-')) to = h.slice(3);
    return { from: from && byId.get(fromUrlId(from)), to: to && byId.get(fromUrlId(to)) };
  }
  function writeUrl() {
    try {
      if (!/^https?:$/.test(location.protocol) || /claude\.ai|claudeusercontent/.test(location.host)) return;
      const q = new URLSearchParams();
      if (state.from) q.set('from', urlId(state.from.id));
      if (state.to) q.set('to', urlId(state.to.id));
      history.replaceState(null, '', `${location.pathname}?${q}`);
    } catch (e) { /* ignore */ }
  }
  window.addEventListener('hashchange', () => { const u = readUrl(); if (u.from) fromBox.set(u.from); if (u.to) toBox.set(u.to); compute(); });

  // ---------- QR sheet ----------
  const qrFloor = $('qrFloor');
  B.floors.forEach((F) => { const o = document.createElement('option'); o.value = F.code; o.textContent = floorLabel(F.code); qrFloor.appendChild(o); });
  const defaultBase = (() => {
    try {
      if (/^https?:$/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.host)) return location.origin + location.pathname;
    } catch (e) { /* ignore */ }
    return BR.qrBase || 'https://athithijain21.github.io/HospiNavi/';
  })();
  $('qrBase').value = defaultBase;
  function renderQR() {
    const grid = $('qrGrid'); grid.innerHTML = '';
    const base = $('qrBase').value.trim() || defaultBase;
    places.filter((p) => p.floor === qrFloor.value && !p.id.includes('~')).forEach((p) => {
      const url = `${base}${base.includes('?') ? '&' : '?'}from=${encodeURIComponent(urlId(p.id))}`;
      const card = document.createElement('div'); card.className = 'qr';
      card.innerHTML = '<div class="code"></div><b></b><span></span>';
      card.querySelector('b').textContent = `${p.no ? p.no + ' · ' : ''}${p.name}`;
      card.querySelector('span').textContent = `from=${urlId(p.id)}`;
      grid.appendChild(card);
      if (window.QRCode) new QRCode(card.querySelector('.code'), { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
      else card.querySelector('.code').textContent = url;
    });
  }
  $('qrBtn').onclick = () => { qrFloor.value = state.floor; $('sheet').hidden = false; renderQR(); };
  $('sheetClose').onclick = () => { $('sheet').hidden = true; };
  $('sheet').onclick = (e) => { if (e.target.id === 'sheet') $('sheet').hidden = true; };
  qrFloor.onchange = renderQR; $('qrBase').onchange = renderQR;

  const unverified = places.filter((p) => p.verify && !p.id.includes('@') && !p.id.includes('~')).length;
  const nRooms = places.filter((p) => !p.id.includes('~') && !p.landmark).length;
  $('dataNote').textContent = B.blocks ? `${nRooms} rooms · ${B.blocks.length} blocks · ${B.floors.length} floor levels` : `${nRooms} rooms on ${B.floors.length} floors · ${unverified} names to confirm`;

  // ---------- tap a room on the map to set destination ----------
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    if (state.outside) {
      if (B.blocks) {
        const r0 = renderer.domElement.getBoundingClientRect();
        mouse.set(((e.clientX - r0.left) / r0.width) * 2 - 1, -((e.clientY - r0.top) / r0.height) * 2 + 1);
        ray.setFromCamera(mouse, camera);
        const h0 = ray.intersectObjects(shell.children.filter((o) => o.userData.block), false)[0];
        if (h0) { state.focusBlock = h0.object.userData.block; state.focusPoint = null; state.floor = 'G'; state.all = false; }
      }
      state.outside = false;
      if (!state.focusBlock) state.all = !!(state.res && new Set(state.res.path.map((n) => n.floor)).size > 1);
      refreshView(true); return;
    }
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const f = fidx(state.floor);
    const targets = state.all ? floorGroups.flatMap((gp) => gp.children) : floorGroups[f].children;
    const hit = ray.intersectObjects(targets.filter((o) => o.isMesh && o.userData.placeId && o.material.visible), false)[0];
    if (!hit) return;
    const p = byId.get(hit.object.userData.placeId);
    if (!p) return;
    if (!state.from) fromBox.set(p); else toBox.set(p);
    compute();
  });

  // ---------- phone: directions panel slides in from the left ----------
  const panel = $('panel'), backdrop = $('backdrop');
  const isPhone = () => matchMedia('(max-width: 760px)').matches;
  function openDrawer(open) {
    panel.classList.toggle('open', open); backdrop.hidden = !open;
    $('drawerBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $('drawerBtn').onclick = () => openDrawer(!panel.classList.contains('open'));
  $('drawerClose').onclick = () => openDrawer(false);
  backdrop.onclick = () => openDrawer(false);
  $('steps').addEventListener('click', () => { if (isPhone()) setTimeout(() => openDrawer(false), 150); });

  // ---------- "you are here" marker for live tracking ----------
  const gpsDot = new THREE.Group(); gpsDot.visible = false; scene.add(gpsDot);
  {
    const blue = 0x1a73e8;
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 14), new THREE.MeshBasicMaterial({ color: blue, depthTest: false })); core.renderOrder = 12; gpsDot.add(core);
    const rim = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); rim.renderOrder = 11; gpsDot.add(rim);
    const accR = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: blue, transparent: true, opacity: 0.16, depthTest: false, side: THREE.DoubleSide }));
    accR.rotation.x = -Math.PI / 2; accR.renderOrder = 10; gpsDot.add(accR); gpsDot.userData.acc = accR;
  }
  let gpsFix = null;   // { x, y, acc } in map metres
  const you = new THREE.Group(); you.visible = false; scene.add(you);
  const youBlue = new THREE.Color(B.blocks ? 0x1aa260 : 0x2f7df6);
  const youDot = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), new THREE.MeshBasicMaterial({ color: youBlue, depthTest: false }));
  youDot.position.y = 1.3; youDot.renderOrder = 9; you.add(youDot);
  const youRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.4, 40), new THREE.MeshBasicMaterial({ color: youBlue, transparent: true, opacity: 0.35, depthTest: false, side: THREE.DoubleSide }));
  youRing.rotation.x = -Math.PI / 2; youRing.position.y = 0.6; youRing.renderOrder = 8; you.add(youRing);
  let youPos = null, follow = false;

  // ---------- live position hook (for step tracking / AR later) ----------
  // window.BlockNav.setStart('6-T1') or .setPosition({floor:'6', x: 20, y: 11.6})
  window.BlockNav = {
    graph: g, data: B, scene, places, byId, floorLabel,
    geoToLocal: (la, lo) => (B.geo ? geoToLocal(la, lo) : null),
    getState() { return { from: state.from, to: state.to, floor: state.floor }; },
    setStart(id) { const p = byId.get(fromUrlId(id)); if (p) { fromBox.set(p); compute(); } },
    setDestination(id) { const p = byId.get(fromUrlId(id)); if (p) { toBox.set(p); compute(); } },
    setPosition({ floor, x, y }) {
      let best = null;
      g.nodes.forEach((n) => { if (n.floor === floor && n.kind === 'corridor') { const d = Math.hypot(n.x - x, n.y - y); if (!best || d < best.d) best = { d, n }; } });
      if (!best) return;
      const p = { id: best.n.id, floor, fi: best.n.fi, name: 'Your position', no: '', type: 'here', landmark: true };
      byId.set(p.id, p); best.n.ref = best.n.ref || { name: 'your position' };
      fromBox.set(p); compute();
    },
    // used by js/tracking.js
    closeDrawer() { if (isPhone()) openDrawer(false); },
    getRoute() { return { res: state.res, steps: state.steps, from: state.from, to: state.to }; },
    onRoute(cb) { routeListeners.push(cb); },
    showYou(pos) { youPos = pos; you.visible = !!pos; },   // pos = {fi, x, y} in metres, or null
    setFollow(on) { follow = !!on; },
    focusFloor(code, zoomIn) {
      if (!state.all && !state.outside && state.floor === code && !zoomIn) return;
      state.all = false; state.outside = false; state.floor = code;
      if (B.blocks && youPos) {
        const bk = B.blocks.find((b) => youPos.x >= b.rect[0] - 1 && youPos.x <= b.rect[0] + b.rect[2] + 1 && youPos.y >= b.rect[1] - 1 && youPos.y <= b.rect[1] + b.rect[3] + 1);
        if (bk) state.focusBlock = bk.id;
        state.focusPoint = [youPos.x, youPos.y];
        refreshView(true); return;
      }
      refreshView(true);
      if (zoomIn) { camGoal.pos = camGoal.target.clone().add(new THREE.Vector3(0, 0.95, 0.75).normalize().multiplyScalar(mapEl.clientWidth < 600 ? 70 : 60)); }
    },
    highlightStep(i) {
      const ol = $('steps'); state.activeStep = i;
      [...ol.children].forEach((c, k) => c.classList.toggle('active', k === i));
      const li = ol.children[i]; if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
  };

  // ---------- render loop ----------
  function resize() {
    const w = mapEl.clientWidth, h = mapEl.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => { resize(); }).observe(mapEl);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick); // schedule first, so one bad frame can never stop the map
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (camGoal.t < 1) {
      camGoal.t = reduce ? 1 : Math.min(1, camGoal.t + dt * 1.8);
      const e = 1 - Math.pow(1 - camGoal.t, 3);
      controls.target.lerpVectors(camGoal.fromT, camGoal.target, e);
      camera.position.lerpVectors(camGoal.fromP, camGoal.pos, e);
    }
    // keep the building in view: the camera can't be panned away from the block
    if (camGoal.t >= 1) {
      const t = controls.target, before = t.clone();
      const top = (B.floors.length - 1) * gap();
      const PAN = (B.view && B.view.pan) || [32, 24];
      t.x = Math.max(-PAN[0], Math.min(PAN[0], t.x));
      t.z = Math.max(-PAN[1], Math.min(PAN[1], t.z));
      t.y = Math.max(-2, Math.min(top + 2, t.y));
      camera.position.add(t.clone().sub(before));
    }
    controls.update();
    const curve = routeGroup.userData.curve;
    if (curve && routeArrows.length) {
      routeArrows.forEach((a) => {
        if (a.userData.walker) {
          a.visible = !you.visible;                       // live tracking replaces the preview
          a.userData.halo.scale.setScalar(1 + 0.25 * Math.sin(now / 250));
          // walk at about 3 m/s, pause 1 s at the destination, then start again
          a.userData.t = (a.userData.t || 0) + dt;
          const dur = Math.max(2, curve.getLength() / 3);
          a.userData.u = Math.min(1, (a.userData.t % (dur + 1)) / dur);
        } else if (!reduce) a.userData.u = (a.userData.u + dt * 6 / Math.max(1, curve.getLength())) % 1;
        // rounding can push u just past the end of the path, where three.js returns null
        const u = Math.min(0.999, Math.max(0, a.userData.u));
        const p = curve.getPointAt(u);
        if (!p) return;
        let t = null;
        try { t = curve.getTangentAt(u); } catch (e) { t = null; }
        a.position.copy(p);
        if (t) a.lookAt(p.clone().add(t));
      });
    }
    // GPS blue dot: outside view and ground floor, near the campus
    if (gpsFix && !you.visible && (state.outside || state.floor === 'G') && gpsFix.near) {
      gpsDot.visible = true;
      const giG = fidx('G');
      gpsDot.position.copy(state.outside ? new THREE.Vector3(gpsFix.x - CX, 1.2, -(gpsFix.y - CY)) : V(gpsFix.x, gpsFix.y, giG, 0.8));
      const r = Math.max(3, Math.min(40, gpsFix.acc));
      gpsDot.userData.acc.scale.set(r, r, r);
      gpsDot.children[0].scale.setScalar(1 + 0.12 * Math.sin(now / 300));
    } else gpsDot.visible = false;
    if (youPos) {
      const p = V(youPos.x, youPos.y, youPos.fi, 0);
      you.position.copy(p);
      const k = 1 + 0.25 * Math.sin(now / 250);
      youRing.scale.set(k, k, k);
      if (follow && camGoal.t >= 1) {
        const d = new THREE.Vector3(p.x - controls.target.x, 0, p.z - controls.target.z).multiplyScalar(Math.min(1, dt * 3));
        controls.target.add(d); camera.position.add(d);
      }
    }
    renderer.render(scene, camera);
    placeLabels();
  }

  // ---------- campus: find the start point from the phone's location (like Google Maps) ----------
  const GEO = B.geo;
  const ANCHOR_KEY = 'cliniflow.gateAnchor';
  function anchor() {
    try { const a = JSON.parse(localStorage.getItem(ANCHOR_KEY) || 'null'); if (a && isFinite(a.lat) && isFinite(a.lng)) return Object.assign({}, GEO, a); } catch (e) { /* ignore */ }
    return GEO;
  }
  // phone GPS -> map metres (x east, y north), using the Main Gate as the reference point
  function geoToLocal(lat, lng) {
    const A = anchor();
    const east = (lng - A.lng) * 111320 * Math.cos(A.lat * Math.PI / 180), north = (lat - A.lat) * 110540;
    const r = (A.rotation || 0) * Math.PI / 180;
    return { x: A.x + east * Math.cos(r) - north * Math.sin(r), y: A.y + east * Math.sin(r) + north * Math.cos(r), dist: Math.hypot(east, north) };
  }
  // campus bounds (all blocks + outdoor places), to decide "inside the hospital" or "far away"
  const BOUNDS = (() => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    B.floors.forEach((F) => F.rooms.forEach((rm) => { const [x, y, w2, h2] = rm.rect; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w2); y1 = Math.max(y1, y + h2); }));
    return { x0: x0 - 25, y0: y0 - 25, x1: x1 + 25, y1: y1 + 25 };
  })();
  const fmtDist = (dm) => (dm >= 1000 ? (dm / 1000).toFixed(dm >= 10000 ? 0 : 1) + ' km' : Math.round(dm) + ' m');
  function note(html) { const n = $('locateNote'); if (n) { n.innerHTML = html; n.hidden = !html; } }
  const compass = (dx, dy) => ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  // entrances people can walk in from outside: the gate, parking, ambulance bay and each block's ground-floor lobby
  const ENTRANCES = (() => {
    const G0 = B.floors.find((f) => f.code === 'G');
    return G0 ? G0.rooms.filter((r) => !r.block || r.type === 'lobby').map((r) => ({ id: r.id, name: r.name, x: r.door[0], y: r.door[1] })) : [];
  })();
  let locating = false, watchId = null, lastAuto = null, lastAutoT = 0;
  function trackingOn() { const t = window.BlockNav && window.BlockNav.tracking; return !!(t && t.state && t.state.on); }
  function useFix(pos, first) {
    const { latitude: la, longitude: lo, accuracy } = pos.coords;
    const L = geoToLocal(la, lo);
    const inside = L.x >= BOUNDS.x0 && L.x <= BOUNDS.x1 && L.y >= BOUNDS.y0 && L.y <= BOUNDS.y1;
    gpsFix = { x: L.x, y: L.y, acc: accuracy, near: inside || (L.x > BOUNDS.x0 - 120 && L.x < BOUNDS.x1 + 120 && L.y > BOUNDS.y0 - 120 && L.y < BOUNDS.y1 + 120) };
    const fromIsGps = !state.from || state.from.type === 'here' || (state.from.id === (B.defaults || {}).from && first);
    if (inside) {
      // keep the start on the blue dot while you walk (unless you picked another start, or Start walking is on)
      const moved = !lastAuto || Math.hypot(L.x - lastAuto.x, L.y - lastAuto.y) > 8;
      const apply = () => { window.BlockNav.setPosition({ floor: 'G', x: L.x, y: L.y }); lastAuto = { x: L.x, y: L.y }; lastAutoT = Date.now(); };
      if (!trackingOn() && (first || (fromIsGps && moved))) {
        clearTimeout(useFix.pending);
        const wait = first ? 0 : Math.max(0, 4000 - (Date.now() - lastAutoT));   // at most one re-route every 4 s
        if (wait === 0) apply(); else useFix.pending = setTimeout(() => { if (!trackingOn()) apply(); }, wait);
      }
      if (first) note(`📍 You're here (±${Math.round(accuracy)} m) — the blue dot follows you. Upstairs? Scan the QR code on the nearest door to set your floor.`);
      return;
    }
    if (!first) return;
    const cxm = (BOUNDS.x0 + BOUNDS.x1) / 2, cym = (BOUNDS.y0 + BOUNDS.y1) / 2;
    const away = Math.hypot(L.x - cxm, L.y - cym);
    if (away < 3000 && ENTRANCES.length) {
      // nearby: start from the closest way in, not always the Main Gate
      let best = ENTRANCES[0], bd = 1e12;
      ENTRANCES.forEach((e) => { const dd = Math.hypot(e.x - L.x, e.y - L.y); if (dd < bd) { bd = dd; best = e; } });
      const p = byId.get(best.id); if (p) { fromBox.set(p); compute(); }
      note(`📍 You're ${fmtDist(bd)} ${compass(L.x - cxm, L.y - cym)} of the hospital. Routes start at the nearest entrance: <b>${best.name}</b>. <button type="button" class="linkish" id="setGateHere">Demo: place the hospital around me</button>`);
    } else {
      fromBox.set(byId.get((B.defaults || {}).from)); compute();
      note(`You're ${fmtDist(L.dist)} from the hospital, so routes start at the Main Gate. <button type="button" class="linkish" id="setGateHere">Demo: place the hospital around me</button>`);
    }
    const g = $('setGateHere');
    if (g) g.onclick = () => {
      try { localStorage.setItem(ANCHOR_KEY, JSON.stringify({ lat: la, lng: lo })); } catch (e) { /* ignore */ }
      lastAuto = null;
      useFix(pos, true);
      note('📍 Done: the hospital is now placed so you stand at its Main Gate (on this phone). Walk around — the blue dot follows you.');
    };
  }
  function locateMe(auto) {
    const btn = $('locateBtn');
    if (!GEO) return;
    if (!navigator.geolocation || !window.isSecureContext) { note('Location needs the https site and a phone with GPS. Scan a door QR code or pick your start.'); return; }
    if (locating) return;
    locating = true; if (btn) btn.classList.add('busy');
    note('📍 Finding your location…');
    let best = null;
    const finish = (err) => {
      navigator.geolocation.clearWatch(wid); clearTimeout(timer);
      locating = false; if (btn) btn.classList.remove('busy');
      if (!best) {
        note(err && err.code === 1
          ? 'Location is blocked. Tap the 🔒 next to the address → Permissions → Location → Allow, then tap 📍.'
          : 'Couldn\'t get a GPS fix (common indoors). Step outside or near a window and tap 📍, or scan the QR code on the nearest door.');
        return;
      }
      lastAuto = null;
      useFix(best, true);
      // then keep following you, like the blue dot in Google Maps
      if (watchId === null) watchId = navigator.geolocation.watchPosition((p2) => { if (p2.coords.accuracy <= 40) useFix(p2, false); }, () => {}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
    };
    // take the most accurate reading within 8 s (the first GPS fix is often rough)
    const wid = navigator.geolocation.watchPosition((pos) => {
      if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
      if (best.coords.accuracy <= 15) finish();
    }, (err) => { if (err.code === 1 || !best) finish(err); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 });
    const timer = setTimeout(() => finish(), 8000);
  }
  if (GEO) {
    const field = $('from').parentNode;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'locateBtn'; b.className = 'locate-btn';
    b.title = 'Use my location'; b.setAttribute('aria-label', 'Use my location');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" stroke-width="2"/></svg>';
    b.onclick = () => locateMe(false);
    field.style.position = 'relative'; field.appendChild(b);
    const n = document.createElement('div'); n.id = 'locateNote'; n.className = 'locate-note'; n.hidden = true;
    field.parentNode.parentNode.insertBefore(n, field.parentNode.nextSibling);
  }

  // ---------- start ----------
  resize();
  const u = readUrl();
  const DEF = B.defaults || { from: 'G-LOBBY', to: '6-IOT' };
  if (u.from) state.autoStart = false;
  fromBox.set(u.from || byId.get(DEF.from));
  toBox.set(u.to || (u.from ? null : byId.get(DEF.to)));
  compute();
  state.outside = true; // open on the outside view of the block; tap it to go inside
  refreshView(false);
  // like Google Maps: try to find where you are (only if no start came from a QR code / link)
  if (GEO && !u.from) setTimeout(() => locateMe(true), 700);
  requestAnimationFrame(tick);
})();
