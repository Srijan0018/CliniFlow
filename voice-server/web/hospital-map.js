/*
 * Hospital block map with turn-by-turn routes - no framework needed.
 *
 *   <div id="hospital-map"></div>
 *   <script src="https://YOUR-SERVER/web/hospital-map.js"></script>
 *   <script>
 *     var map = HospitalMap.mount('#hospital-map', { layoutUrl: 'https://YOUR-SERVER/web/layout.json', lang: 'en' });
 *     map.route('pharmacy');            // route from the main entrance (or the chosen "You are here")
 *     map.route('xray', 'reception');   // route between two places
 *     map.setLang('kn');
 *   </script>
 */
(function () {
  'use strict';

  var T = {
    en: { here: 'You are here', from: 'I am at', entrance: 'Main entrance', walk: 'Walk {m} m along the corridor', lift: 'Take the lift to {f}', stairs: 'Take the stairs to {f}', arrive: 'Arrive at {n}', total: '{m} m · about {t} min', to: 'Route to', pick: 'Say or choose where you want to go', clear: 'Clear route' },
    hi: { here: 'आप यहाँ हैं', from: 'मैं यहाँ हूँ', entrance: 'मुख्य द्वार', walk: 'गलियारे में {m} मीटर चलें', lift: 'लिफ्ट से {f} जाएँ', stairs: 'सीढ़ियों से {f} जाएँ', arrive: '{n} पहुँचें', total: '{m} मीटर · लगभग {t} मिनट', to: 'रास्ता', pick: 'बोलें या चुनें कि आपको कहाँ जाना है', clear: 'रास्ता हटाएँ' },
    kn: { here: 'ನೀವು ಇಲ್ಲಿದ್ದೀರಿ', from: 'ನಾನು ಇಲ್ಲಿದ್ದೇನೆ', entrance: 'ಮುಖ್ಯ ದ್ವಾರ', walk: 'ಕಾರಿಡಾರ್‌ನಲ್ಲಿ {m} ಮೀ ನಡೆಯಿರಿ', lift: 'ಲಿಫ್ಟ್‌ನಲ್ಲಿ {f}ಗೆ ಹೋಗಿ', stairs: 'ಮೆಟ್ಟಿಲುಗಳಲ್ಲಿ {f}ಗೆ ಹೋಗಿ', arrive: '{n} ತಲುಪಿ', total: '{m} ಮೀ · ಸುಮಾರು {t} ನಿಮಿಷ', to: 'ದಾರಿ', pick: 'ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು ಎಂದು ಹೇಳಿ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿ', clear: 'ದಾರಿ ತೆಗೆಯಿರಿ' },
    ml: { here: 'നിങ്ങൾ ഇവിടെയാണ്', from: 'ഞാൻ ഇവിടെയാണ്', entrance: 'പ്രധാന കവാടം', walk: 'ഇടനാഴിയിലൂടെ {m} മീ നടക്കുക', lift: 'ലിഫ്റ്റിൽ {f}യിലേക്ക് പോകുക', stairs: 'പടികൾ വഴി {f}യിലേക്ക് പോകുക', arrive: '{n} എത്തുക', total: '{m} മീ · ഏകദേശം {t} മിനിറ്റ്', to: 'വഴി', pick: 'എവിടെ പോകണമെന്ന് പറയുക അല്ലെങ്കിൽ തിരഞ്ഞെടുക്കുക', clear: 'വഴി മായ്ക്കുക' },
    tcy: { here: 'ಈರ್ ಮುಲ್ಪ ಉಲ್ಲರ್', from: 'ಯಾನ್ ಮುಲ್ಪ ಉಲ್ಲೆ', entrance: 'ಮೇನ್ ಗೇಟ್', walk: 'ಕಾರಿಡಾರ್‌ಡ್ {m} ಮೀ ನಡಪುಲೆ', lift: 'ಲಿಫ್ಟ್‌ಡ್ {f}ಗ್ ಪೋಲೆ', stairs: 'ಮೆಟ್ಟಿಲ್‌ಡ್ {f}ಗ್ ಪೋಲೆ', arrive: '{n} ಎತ್ತುಲೆ', total: '{m} ಮೀ · ಸುಮಾರ್ {t} ನಿಮಿಷ', to: 'ಸಾದಿ', pick: 'ಓಲುಗು ಪೋವೊಡು ಪನ್ಲೆ ಅತ್ತಂಡ ಆಯ್ಕೆ ಮಲ್ಪುಲೆ', clear: 'ಸಾದಿ ದೆಪ್ಪುಲೆ' }
  };
  var COLORS = { department: '#DCEBFB', facility: '#DDF3E4', core: '#E4E4E8', filler: '#F2F2F2' };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var CSS =
    '.hm{font-family:system-ui,-apple-system,"Noto Sans",sans-serif;color:#1a1a1a}.hm *{box-sizing:border-box}' +
    '.hm-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}.hm-bar select{padding:8px;font-size:15px;border:1px solid #ccc;border-radius:8px;max-width:100%}' +
    '.hm-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.hm-tab{border:1px solid #0B6BCB;background:#fff;color:#0B6BCB;border-radius:16px;padding:6px 12px;font-size:14px;cursor:pointer}' +
    '.hm-tab.on{background:#0B6BCB;color:#fff}.hm-tab.route{box-shadow:0 0 0 3px #FFC10766}' +
    '.hm-svg{width:100%;height:auto;background:#fff;border:1px solid #ddd;border-radius:10px;touch-action:pan-y}' +
    '.hm-steps{margin-top:10px;background:#EEF5FD;border-radius:10px;padding:12px 14px}.hm-steps h3{margin:0 0 4px;font-size:18px;color:#0B6BCB}' +
    '.hm-steps small{color:#555}.hm-steps ol{margin:8px 0 0;padding-left:22px}.hm-steps li{margin:6px 0;cursor:pointer;font-size:15px}.hm-steps li:hover{text-decoration:underline}' +
    '.hm-clear{margin-top:8px;background:none;border:0;color:#0B6BCB;text-decoration:underline;cursor:pointer;font-size:14px;padding:0}' +
    '.hm-hint{color:#666;font-size:14px;margin:8px 2px}@keyframes hmdash{to{stroke-dashoffset:-4}}.hm-route{animation:hmdash 1s linear infinite}';

  function fmt(s, o) { return s.replace(/\{(\w)\}/g, function (_, k) { return o[k]; }); }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function wrap(text, width, maxSize) {
    // pick a font size and split the label into up to 3 lines that fit the room width
    var words = text.split(/\s+/);
    for (var fs = maxSize; fs >= 0.5; fs -= 0.05) {
      var perLine = Math.max(3, Math.floor((width - 0.6) / (fs * 0.58)));
      var lines = [], cur = '';
      words.forEach(function (w) {
        if (!cur) cur = w;
        else if ((cur + ' ' + w).length <= perLine) cur += ' ' + w;
        else { lines.push(cur); cur = w; }
      });
      if (cur) lines.push(cur);
      var longest = Math.max.apply(null, lines.map(function (l) { return l.length; }));
      if (lines.length <= 3 && longest <= perLine + 1) return { fs: fs, lines: lines };
    }
    return { fs: 0.5, lines: [text.slice(0, 18) + '…'] };
  }

  function mount(target, opts) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!document.getElementById('hm-css')) { var st = document.createElement('style'); st.id = 'hm-css'; st.textContent = CSS; document.head.appendChild(st); }
    var S = { lang: opts.lang || 'en', layout: null, floor: 0, path: null, to: null, from: opts.from || null, pending: null };
    var graph = {}, nodeRoom = {}, roomById = {};

    function t() { return T[S.lang] || T.en; }
    function L(obj) { return (obj && (obj[S.lang] || obj.en)) || ''; }

    fetch(opts.layoutUrl || 'layout.json').then(function (r) { return r.json(); }).then(function (layout) {
      S.layout = layout;
      layout.edges.forEach(function (e) {
        (graph[e[0]] = graph[e[0]] || []).push([e[1], e[2], e[3]]);
        (graph[e[1]] = graph[e[1]] || []).push([e[0], e[2], e[3]]);
      });
      layout.floors.forEach(function (f) {
        f.rooms.forEach(function (r) {
          roomById[r.id] = r; r.level = f.level;
          if (r.target && r.kind !== 'core') nodeRoom['door_' + r.id] = r;
          if (r.kind === 'core') nodeRoom[r.target + '_' + f.level] = r;
        });
      });
      S.floor = layout.nodes[layout.start].f;
      if (S.pending) { var p = S.pending; S.pending = null; api.route(p[0], p[1]); } else render();
      if (opts.onReady) opts.onReady(api);
    });

    function startNode() {
      var lay = S.layout;
      if (!S.from) return lay.start;
      if (lay.nodes[S.from]) return S.from;
      var ns = lay.targets[S.from];
      return ns ? ns[0] : lay.start;
    }

    function dijkstra(src, goals) {
      var dist = {}, prev = {}, done = {}, goalSet = {};
      goals.forEach(function (g) { goalSet[g] = 1; });
      dist[src] = 0;
      var queue = [src];
      while (queue.length) {
        var bi = 0;
        for (var i = 1; i < queue.length; i++) if (dist[queue[i]] < dist[queue[bi]]) bi = i;
        var u = queue.splice(bi, 1)[0];
        if (done[u]) continue;
        done[u] = 1;
        if (goalSet[u]) { var path = [u]; while (prev[path[0]]) path.unshift(prev[path[0]][0]); return { nodes: path, kinds: path.map(function (n) { return prev[n] ? prev[n][1] : null; }), dist: dist[u] }; }
        (graph[u] || []).forEach(function (e) {
          var nd = dist[u] + e[1];
          if (dist[e[0]] === undefined || nd < dist[e[0]]) { dist[e[0]] = nd; prev[e[0]] = [u, e[2]]; queue.push(e[0]); }
        });
      }
      return null;
    }

    function steps(path) {
      var lay = S.layout, out = [], walk = 0, i = 1, total = 0;
      var nodes = path.nodes;
      while (i < nodes.length) {
        var kind = path.kinds[i];
        if (kind === 'lift' || kind === 'stairs') {
          if (walk > 1) out.push({ text: fmt(t().walk, { m: Math.max(5, Math.round(walk / 5) * 5) }), floor: lay.nodes[nodes[i - 1]].f });
          total += walk; walk = 0;
          while (i < nodes.length && path.kinds[i] === kind) i++;
          var f = lay.nodes[nodes[i - 1]].f;
          var fl = lay.floors.filter(function (x) { return x.level === f; })[0];
          out.push({ text: fmt(t()[kind], { f: L(fl.name) }), floor: f });
          continue;
        }
        var a = lay.nodes[nodes[i - 1]], b = lay.nodes[nodes[i]];
        walk += Math.hypot(a.x - b.x, a.y - b.y);
        i++;
      }
      total += walk;
      var last = nodes[nodes.length - 1];
      if (walk > 1) out.push({ text: fmt(t().walk, { m: Math.max(5, Math.round(walk / 5) * 5) }), floor: lay.nodes[last].f });
      var room = nodeRoom[last];
      out.push({ text: fmt(t().arrive, { n: room ? L(room.label) : '' }), floor: lay.nodes[last].f });
      return { list: out, meters: Math.round(total), minutes: Math.max(1, Math.round(total / 1.1 / 60 + (path.kinds.indexOf('lift') >= 0 ? 1 : 0))) };
    }

    function render() {
      var lay = S.layout;
      root.innerHTML = '';
      var wrapEl = document.createElement('div'); wrapEl.className = 'hm';
      root.appendChild(wrapEl);

      // "I am at" selector
      var bar = document.createElement('div'); bar.className = 'hm-bar';
      var lab = document.createElement('span'); lab.textContent = t().from + ':';
      var sel = document.createElement('select');
      var optE = document.createElement('option'); optE.value = ''; optE.textContent = t().entrance; sel.appendChild(optE);
      var seen = {};
      lay.floors.forEach(function (f) {
        f.rooms.forEach(function (r) {
          if (!r.target || r.kind === 'core' || seen[r.target]) return;
          seen[r.target] = 1;
          var o = document.createElement('option'); o.value = r.target; o.textContent = L(r.label) + ' (' + L(f.name) + ')';
          if (S.from === r.target) o.selected = true;
          sel.appendChild(o);
        });
      });
      sel.onchange = function () { S.from = sel.value || null; if (S.to) api.route(S.to); else { S.floor = lay.nodes[startNode()].f; render(); } };
      bar.appendChild(lab); bar.appendChild(sel); wrapEl.appendChild(bar);

      // floor tabs (route floors highlighted)
      var routeFloors = {};
      if (S.path) S.path.nodes.forEach(function (n) { routeFloors[lay.nodes[n].f] = 1; });
      var tabs = document.createElement('div'); tabs.className = 'hm-tabs';
      lay.floors.slice().reverse().forEach(function (f) {
        var b = document.createElement('button');
        b.className = 'hm-tab' + (f.level === S.floor ? ' on' : '') + (routeFloors[f.level] ? ' route' : '');
        b.textContent = L(f.name);
        b.onclick = function () { S.floor = f.level; render(); };
        tabs.appendChild(b);
      });
      wrapEl.appendChild(tabs);

      // floor drawing
      var floor = lay.floors.filter(function (f) { return f.level === S.floor; })[0];
      var s = svg('svg', { viewBox: '-2 -2 ' + (lay.width + 4) + ' ' + (lay.height + 6), class: 'hm-svg', role: 'img', 'aria-label': L(floor.name) });
      svg('rect', { x: 0, y: 0, width: lay.width, height: lay.height + 1, rx: 0.8, fill: '#FAFAFA', stroke: '#9AA0A6', 'stroke-width': 0.35 }, s);
      var c = floor.corridor;
      svg('rect', { x: c.x, y: c.y, width: c.w, height: c.h, fill: '#FFFFFF', stroke: '#E0E0E0', 'stroke-width': 0.1 }, s);

      var destNode = S.path && S.path.nodes[S.path.nodes.length - 1];
      var destRoom = destNode && nodeRoom[destNode];
      floor.rooms.forEach(function (r) {
        var isDest = destRoom && destRoom.id === r.id;
        var g = svg('g', { style: r.target && r.kind !== 'core' ? 'cursor:pointer' : '' }, s);
        svg('rect', { x: r.x + 0.1, y: r.y + 0.1, width: r.w - 0.2, height: r.h - 0.2, rx: 0.4,
          fill: isDest ? '#FFE082' : COLORS[r.kind] || COLORS.department, stroke: isDest ? '#F57C00' : '#90A4AE', 'stroke-width': isDest ? 0.45 : 0.15 }, g);
        // door gap
        svg('line', { x1: r.door[0] - 0.9, y1: r.door[1], x2: r.door[0] + 0.9, y2: r.door[1], stroke: '#FFFFFF', 'stroke-width': 0.5 }, g);
        var w = wrap(L(r.label), r.w, 1.15);
        var txt = svg('text', { x: r.x + r.w / 2, y: r.y + r.h / 2 - (w.lines.length - 1) * w.fs * 0.6, 'font-size': w.fs, 'text-anchor': 'middle',
          'dominant-baseline': 'middle', fill: r.kind === 'filler' ? '#888' : '#1a1a1a', 'font-weight': isDest ? 700 : 500 }, g);
        w.lines.forEach(function (line, i) { var ts = svg('tspan', { x: r.x + r.w / 2, dy: i ? w.fs * 1.2 : 0 }, txt); ts.textContent = line; });
        if (r.target && r.kind !== 'core') g.addEventListener('click', function () { api.route(r.target); if (opts.onSelect) opts.onSelect(r.target); });
      });

      (floor.extras || []).forEach(function (x) {
        var tx = svg('text', { x: x.type === 'entrance' ? 0.4 : x.x - 0.4, y: lay.height + 2.6, 'font-size': 1.1, 'text-anchor': x.type === 'entrance' ? 'start' : 'end', fill: '#2E7D32', 'font-weight': 700 }, s);
        tx.textContent = (x.type === 'entrance' ? '⇦ ' : '') + L(x.label) + (x.type === 'ramp' ? ' ⇨' : '');
        svg('rect', { x: x.type === 'entrance' ? -1.2 : lay.width - 0.6, y: x.y - 2, width: 1.8, height: 4, fill: '#C8E6C9', stroke: '#2E7D32', 'stroke-width': 0.2 }, s);
      });

      // route on this floor
      if (S.path) {
        var pts = [], segs = [];
        S.path.nodes.forEach(function (n) {
          var nd = lay.nodes[n];
          if (nd.f === S.floor) pts.push(nd.x + ',' + nd.y);
          else if (pts.length) { segs.push(pts); pts = []; }
        });
        if (pts.length) segs.push(pts);
        segs.forEach(function (p) {
          svg('polyline', { points: p.join(' '), fill: 'none', stroke: '#0B6BCB', 'stroke-width': 0.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.35 }, s);
          svg('polyline', { points: p.join(' '), fill: 'none', stroke: '#0B6BCB', 'stroke-width': 0.7, 'stroke-dasharray': '1.2 0.8', 'stroke-linecap': 'round', class: 'hm-route' }, s);
        });
      }
      // "you are here"
      var sn = lay.nodes[startNode()];
      if (sn.f === S.floor) {
        svg('circle', { cx: sn.x, cy: sn.y, r: 1.1, fill: '#2E7D32', stroke: '#fff', 'stroke-width': 0.3 }, s);
        var yt = svg('text', { x: sn.x + 1.5, y: sn.y - 1.4, 'font-size': 1.05, fill: '#2E7D32', 'font-weight': 700 }, s);
        yt.textContent = t().here;
      }
      if (destNode && lay.nodes[destNode].f === S.floor) {
        var dn = lay.nodes[destNode];
        svg('path', { d: 'M' + dn.x + ' ' + (dn.y) + ' l-1 -2 a1.2 1.2 0 1 1 2 0 z', fill: '#E53935', stroke: '#fff', 'stroke-width': 0.2 }, s);
      }
      wrapEl.appendChild(s);

      // steps
      if (S.path) {
        var st = steps(S.path), box = document.createElement('div'); box.className = 'hm-steps';
        var h = document.createElement('h3'); h.textContent = t().to + ': ' + (destRoom ? L(destRoom.label) : '');
        var sm = document.createElement('small'); sm.textContent = fmt(t().total, { m: st.meters, t: st.minutes });
        var ol = document.createElement('ol');
        st.list.forEach(function (x) {
          var li = document.createElement('li'); li.textContent = x.text;
          li.onclick = function () { S.floor = x.floor; render(); };
          ol.appendChild(li);
        });
        var clr = document.createElement('button'); clr.className = 'hm-clear'; clr.textContent = t().clear;
        clr.onclick = function () { S.path = null; S.to = null; S.floor = lay.nodes[startNode()].f; render(); };
        box.appendChild(h); box.appendChild(sm); box.appendChild(ol); box.appendChild(clr);
        wrapEl.appendChild(box);
      } else {
        var hint = document.createElement('p'); hint.className = 'hm-hint'; hint.textContent = t().pick; wrapEl.appendChild(hint);
      }
    }

    var api = {
      /** Draw the route to a department id (the voice assistant's dest.map_node). Returns false if unknown. */
      route: function (to, from) {
        if (from !== undefined) S.from = from || null;
        if (!S.layout) { S.pending = [to, from]; return true; }
        var goals = S.layout.targets[to];
        if (!goals) return false;
        var p = dijkstra(startNode(), goals);
        if (!p) return false;
        S.path = p; S.to = to;
        S.floor = S.layout.nodes[p.nodes[0]].f;
        render();
        return true;
      },
      setLang: function (l) { S.lang = l; if (S.layout) render(); },
      setFloor: function (f) { S.floor = f; if (S.layout) render(); },
      clear: function () { S.path = null; S.to = null; if (S.layout) render(); }
    };
    return api;
  }

  window.HospitalMap = { mount: mount };
})();
