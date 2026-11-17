/*
 * Voice search in 5 languages for the navigator (English, ಕನ್ನಡ, हिन्दी, മലയാളം, ತುಳು).
 *
 * Works with NO server: the browser's speech recognition (Chrome / Edge / Android / iPhone Safari)
 * turns speech into text, and the matcher below finds the department in any of the 5 languages.
 *
 * Optional: point it at the SraVaani voice server (voice-server/ folder) for better Indic + Tulu
 * recognition:   index.html?api=https://your-server     (remembered on this device)
 *
 * Needs data with `departments` (names + keywords per language), e.g. data/hospital.js.
 */
(function () {
  'use strict';
  const NAV = window.BlockNav, B = NAV && NAV.data;
  const box = document.getElementById('voice');
  if (!B || !B.departments || !box) return;

  // ------------------------------------------------------------------ config
  const LANGS = [
    { code: 'en', label: 'EN', speech: 'en-IN' },
    { code: 'kn', label: 'ಕನ್ನಡ', speech: 'kn-IN' },
    { code: 'hi', label: 'हिन्दी', speech: 'hi-IN' },
    { code: 'ml', label: 'മലയാളം', speech: 'ml-IN' },
    { code: 'tcy', label: 'ತುಳು', speech: 'kn-IN' }, // no Tulu recogniser/voice exists; Kannada is closest
  ];
  let API = '';
  try {
    const q = new URLSearchParams(location.search).get('api');
    if (q !== null) localStorage.setItem('hospinaviVoiceApi', q);
    API = (q !== null ? q : localStorage.getItem('hospinaviVoiceApi')) || window.HOSPINAVI_VOICE_API || '';
  } catch (e) { API = window.HOSPINAVI_VOICE_API || ''; }
  API = API.replace(/\/+$/, '');

  const UI = {
    en: { ask: 'Ask by voice', listening: 'Listening… speak now', thinking: 'Finding it…', said: 'You said', nosupport: 'Voice is not supported in this browser. Type in "Where to?" instead (any language works).', denied: 'Microphone blocked. Allow it in the browser, or type in "Where to?".', hint: 'e.g. "Where is the pharmacy?"', type: 'Or type in any language…', mean: 'Did you mean', reply: '{name} is {floor}. Follow the green line on the map.' },
    kn: { ask: 'ಧ್ವನಿಯಲ್ಲಿ ಕೇಳಿ', listening: 'ಕೇಳುತ್ತಿದೆ… ಮಾತನಾಡಿ', thinking: 'ಹುಡುಕುತ್ತಿದೆ…', said: 'ನೀವು ಹೇಳಿದ್ದು', nosupport: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.', denied: 'ಮೈಕ್ ಅನುಮತಿ ಇಲ್ಲ. ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಅನುಮತಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.', hint: 'ಉದಾ: "ಫಾರ್ಮಸಿ ಎಲ್ಲಿದೆ?"', type: 'ಅಥವಾ ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ…', mean: 'ನೀವು ಇದನ್ನು ಹೇಳಿದಿರಾ', reply: '{name} {floor}ಯಲ್ಲಿದೆ. ನಕ್ಷೆಯಲ್ಲಿನ ಹಸಿರು ಗೆರೆಯನ್ನು ಅನುಸರಿಸಿ.' },
    hi: { ask: 'बोलकर पूछें', listening: 'सुन रहा है… बोलिए', thinking: 'ढूंढ रहा है…', said: 'आपने कहा', nosupport: 'इस ब्राउज़र में आवाज़ उपलब्ध नहीं है। नीचे लिखें।', denied: 'माइक की अनुमति नहीं है। ब्राउज़र में अनुमति दें या लिखें।', hint: 'जैसे: "फार्मेसी कहाँ है?"', type: 'या यहाँ लिखें…', mean: 'क्या आपका मतलब था', reply: '{name} {floor} पर है। नक्शे पर हरी लाइन का पालन करें।' },
    ml: { ask: 'ശബ്ദത്തിൽ ചോദിക്കുക', listening: 'കേൾക്കുന്നു… സംസാരിക്കുക', thinking: 'കണ്ടെത്തുന്നു…', said: 'നിങ്ങൾ പറഞ്ഞത്', nosupport: 'ഈ ബ്രൗസറിൽ ശബ്ദം ലഭ്യമല്ല. താഴെ ടൈപ്പ് ചെയ്യുക.', denied: 'മൈക്ക് അനുമതിയില്ല. ബ്രൗസറിൽ അനുവദിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.', hint: 'ഉദാ: "ഫാർമസി എവിടെയാണ്?"', type: 'അല്ലെങ്കിൽ ഇവിടെ ടൈപ്പ് ചെയ്യുക…', mean: 'ഇതാണോ ഉദ്ദേശിച്ചത്', reply: '{name} {floor}യിലാണ്. മാപ്പിലെ പച്ച വര പിന്തുടരുക.' },
    tcy: { ask: 'ಪಾತೆರ್ದ್ ಕೇನುಲೆ', listening: 'ಕೇನೊಂದುಂಡು… ಪಾತೆರ್ಲೆ', thinking: 'ನಾಡೊಂದುಂಡು…', said: 'ಈರ್ ಪಂಡಿನವು', nosupport: 'ಈ ಬ್ರೌಸರ್‌ಡ್ ಪಾತೆರ ತಿಕ್ಕುಜಿ. ತಿರ್ತ್ ಟೈಪ್ ಮಲ್ಪುಲೆ.', denied: 'ಮೈಕ್ ಅನುಮತಿ ಇಜ್ಜಿ. ಬ್ರೌಸರ್‌ಡ್ ಅನುಮತಿ ಕೊರ್ಲೆ.', hint: 'ಉದಾ: "ಫಾರ್ಮಸಿ ಓಲು ಉಂಡು?"', type: 'ಅತ್ತಂಡ ಮುಲ್ಪ ಟೈಪ್ ಮಲ್ಪುಲೆ…', mean: 'ಈರ್ ಇಂದೇ ಪಂಡಿನವಾ', reply: '{name} {floor}ಡ್ ಉಂಡು. ಮ್ಯಾಪ್‌ದ ಪಚ್ಚೆ ಗೆರೆನ್ ತೂದು ಪೋಲೆ.' },
  };

  // campus replies name the block too
  const BLOCK_REPLY = {
    en: '{name} is in the {block}, {floor}. Follow the green line on the map.',
    hi: '{name} {block} में, {floor} पर है। नक्शे पर हरी लाइन का पालन करें।',
    kn: '{name} {block}ದ {floor}ಯಲ್ಲಿದೆ. ನಕ್ಷೆಯಲ್ಲಿನ ಹಸಿರು ಗೆರೆಯನ್ನು ಅನುಸರಿಸಿ.',
    ml: '{name}: {block}, {floor}യിൽ. മാപ്പിലെ പച്ച വര പിന്തുടരുക.',
    tcy: '{name} {block}ದ {floor}ಡ್ ಉಂಡು. ಮ್ಯಾಪ್‌ದ ಪಚ್ಚೆ ಗೆರೆನ್ ತೂದು ಪೋಲೆ.',
  };

  // ------------------------------------------------------------------ matcher (same rules as voice-server/matcher.py)
  const MIN_SCORE = 82, SHORT = 4;
  const SPLIT = /[\s,.;:!?"'()\[\]{}।॥/\\|_-]+/;
  const norm = (s) => String(s || '').normalize('NFC').replace(/[​‌‍﻿]/g, '').toLowerCase().split(SPLIT).filter(Boolean).join(' ');
  function lcs(a, b) {
    if (!a.length || !b.length) return 0;
    let prev = new Array(b.length + 1).fill(0);
    for (let i = 1; i <= a.length; i++) {
      const cur = [0];
      for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      prev = cur;
    }
    return prev[b.length];
  }
  const ratio = (a, b) => (a.length + b.length ? 200 * lcs(a, b) / (a.length + b.length) : 0);

  const INDEX = [];
  Object.entries(B.departments).forEach(([id, d]) => {
    const seen = new Set();
    Object.entries(d.keywords).forEach(([lang, words]) => {
      words.concat([d.names[lang] || '']).forEach((w) => {
        const k = norm(w);
        if (k && !seen.has(k + '|' + lang)) { seen.add(k + '|' + lang); INDEX.push({ kw: k, toks: k.split(' '), id, lang }); }
      });
    });
  });

  function score(kw, kt, toks) {
    const n = kt.length; let best = 0;
    for (let i = 0; i + n <= toks.length; i++) {
      const g = toks.slice(i, i + n), gram = g.join(' ');
      if (gram === kw) return 100;
      const head = g.slice(0, -1).join(' ') === kt.slice(0, -1).join(' ');
      if (head && kt[n - 1].length >= 3 && g[n - 1].startsWith(kt[n - 1])) { best = Math.max(best, 95); continue; }
      if (kw.length < SHORT) continue;
      if (n > 1 && kt.some((t, j) => ratio(t, g[j]) < 70)) continue;
      best = Math.max(best, ratio(kw, gram), ratio(kw, gram.slice(0, kw.length)) * 0.97, ratio(kw.replace(/ /g, ''), gram.replace(/ /g, '')));
    }
    if (n > 1 && kw.length >= 6) { const j = kw.replace(/ /g, ''); toks.forEach((t) => { if (t === j || t.startsWith(j)) best = Math.max(best, 95); }); }
    return best;
  }

  function match(text, lang) {
    const toks = norm(text).split(' ').filter(Boolean);
    if (!toks.length) return { best: null, alternatives: [] };
    const per = new Map();
    INDEX.forEach(({ kw, toks: kt, id, lang: kl }) => {
      let s = score(kw, kt, toks);
      if (s < MIN_SCORE - 10) return;
      if (kl === lang) s += 3;
      const cur = per.get(id);
      if (!cur || s > cur.score || (s === cur.score && kw.length > cur.kw.length)) per.set(id, { id, score: s, kw });
    });
    const ranked = [...per.values()].sort((a, b) => b.score - a.score || b.kw.length - a.kw.length);
    const best = ranked[0] && ranked[0].score >= MIN_SCORE ? ranked[0] : null;
    const alternatives = best && best.score >= 100 ? [] : ranked.filter((m) => m.score >= MIN_SCORE - 6 && (!best || m.id !== best.id)).slice(0, 3).map((m) => m.id);
    return { best, alternatives };
  }

  // ------------------------------------------------------------------ department -> room on the map
  const levelOf = (code) => (code === 'B' ? -1 : code === 'G' ? 0 : parseInt(code, 10));
  function roomsFor(dept) {
    if (dept === 'lift') return NAV.places.filter((p) => p.type === 'lift' && p.id.includes('@'));
    return NAV.places.filter((p) => p.dept && p.dept.indexOf(dept) >= 0);
  }
  function nearestRoom(dept) {
    const cands = roomsFor(dept);
    if (!cands.length) return null;
    const st = NAV.getState();
    const from = st.from || NAV.byId.get((B.defaults || {}).from);
    if (!from || cands.length === 1) return cands[0];
    let best = null;
    cands.forEach((p) => {
      const r = window.NavGraph.route(NAV.graph, from.id, p.id, {});
      if (r && (!best || r.cost < best.cost)) best = { cost: r.cost, p };
    });
    return best ? best.p : cands[0];
  }
  function deptName(dept, lang) { const d = B.departments[dept]; return (d && (d.names[lang] || d.names.en)) || dept; }
  function replyText(dept, room, lang) {
    if (!dept) return (B.messages && B.messages.not_understood && (B.messages.not_understood[lang] || B.messages.not_understood.en)) || 'Sorry, I did not understand.';
    const fl = (B.messages && B.messages.floor && (B.messages.floor[lang] || B.messages.floor.en)) || {};
    const lv = levelOf(room.floor);
    const floor = fl[String(lv)] || (fl.n || 'floor {n}').replace('{n}', lv);
    const name = (room.names && room.names[lang]) || deptName(dept, lang);
    const blk = room.block && B.blocks ? B.blocks.find((b) => b.id === room.block) : null;
    if (blk) return BLOCK_REPLY[lang].replace('{name}', name).replace('{block}', blk.names[lang] || blk.name).replace('{floor}', floor);
    return UI[lang].reply.replace('{name}', name).replace('{floor}', floor);
  }

  // ------------------------------------------------------------------ speech out
  const player = new Audio();
  function speak(text, lang, audioPath) {
    try { player.pause(); window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    if (audioPath && API) { player.src = API + audioPath; player.play().catch(() => {}); return; }
    if (!window.speechSynthesis || !text) return;
    const code = LANGS.find((l) => l.code === lang).speech;
    const u = new SpeechSynthesisUtterance(text); u.lang = code;
    const v = speechSynthesis.getVoices().find((x) => (x.lang || '').replace('_', '-').toLowerCase().startsWith(code.slice(0, 2)));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ------------------------------------------------------------------ UI
  let lang = 'en';
  try { lang = localStorage.getItem('hospinaviLang') || 'en'; } catch (e) { /* ignore */ }
  const $ = (sel) => box.querySelector(sel);
  function render() {
    const t = UI[lang];
    box.innerHTML =
      '<div class="v-langs">' + LANGS.map((l) => `<button type="button" data-l="${l.code}" class="${l.code === lang ? 'on' : ''}">${l.label}</button>`).join('') + '</div>' +
      `<div class="v-row"><button type="button" class="v-mic" aria-label="${t.ask}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg><span>${t.ask}</span></button>` +
      `<span class="v-hint">${t.hint}</span></div>` +
      `<form class="v-type"><input type="text" placeholder="${t.type}" aria-label="${t.type}"><button type="submit" class="btn small" aria-label="Go">→</button></form>` +
      '<div class="v-out" aria-live="polite"></div>';
    box.querySelectorAll('.v-langs button').forEach((b) => b.onclick = () => { lang = b.dataset.l; try { localStorage.setItem('hospinaviLang', lang); } catch (e) { /* ignore */ } render(); });
    $('.v-mic').onclick = listen;
    $('.v-type').onsubmit = (e) => { e.preventDefault(); const v = $('.v-type input').value; if (v.trim()) handleText(v, null); };
  }
  function out(html, cls) { const o = $('.v-out'); o.className = 'v-out ' + (cls || ''); o.innerHTML = html; }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function go(dept, heard, alternatives, serverReply) {
    const t = UI[lang];
    const room = dept ? nearestRoom(dept) : null;
    if (room) NAV.setDestination(room.id);
    const text = serverReply && dept ? serverReply.text : replyText(room ? dept : null, room, lang);
    let html = heard ? `<div class="v-heard">${t.said}: “${esc(heard)}”</div>` : '';
    html += `<div class="v-reply">${esc(text)}</div>`;
    if (alternatives && alternatives.length) {
      html += `<div class="v-alts">${t.mean}: ` + alternatives.map((a) => `<button type="button" data-d="${a}">${esc(deptName(a, lang))}</button>`).join('') + '</div>';
    }
    out(html, room ? 'ok' : 'warn');
    box.querySelectorAll('.v-alts button').forEach((b) => b.onclick = () => go(b.dataset.d, '', [], null));
    speak(text, lang, serverReply && serverReply.audio);
    if (room) NAV.closeDrawer && NAV.closeDrawer();
  }

  async function askServer(form) {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(API + '/ask', { method: 'POST', body: form, signal: ctrl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  async function handleText(text, fromServer) {
    if (fromServer) {
      const d = fromServer.destination;
      return go(d ? d.id : null, fromServer.heard, (fromServer.alternatives || []).map((a) => a.id), d ? { text: fromServer.reply_text, audio: fromServer.reply_audio } : null);
    }
    if (API) {
      try {
        const f = new FormData(); f.append('lang', lang); f.append('text', text);
        return handleText(text, await askServer(f));
      } catch (e) { /* server down: match in the browser */ }
    }
    const m = match(text, lang);
    go(m.best ? m.best.id : null, text, m.alternatives, null);
  }

  // speech in: server (SraVaani) if configured, else the browser's recogniser
  let busy = false;
  async function listen() {
    if (busy) return;
    const t = UI[lang];
    if (API && navigator.mediaDevices && window.MediaRecorder) return recordForServer();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { out(esc(t.nosupport), 'warn'); return; }
    const rec = new SR();
    rec.lang = LANGS.find((l) => l.code === lang).speech;
    rec.interimResults = false; rec.maxAlternatives = 3;
    busy = true; $('.v-mic').classList.add('rec'); out(esc(t.listening));
    let got = false;
    rec.onresult = (e) => {
      got = true;
      const alts = [...e.results[0]].map((a) => a.transcript);
      // pick the first alternative that matches a department
      const hit = alts.find((a) => match(a, lang).best) || alts[0];
      out(esc(t.thinking)); handleText(hit, null);
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') out(esc(t.denied), 'warn'); else if (!got) out(esc(t.nosupport), 'warn'); };
    rec.onend = () => { busy = false; const m = $('.v-mic'); if (m) m.classList.remove('rec'); if (!got && $('.v-out').textContent === t.listening) out(''); };
    try { rec.start(); } catch (e) { busy = false; out(esc(t.nosupport), 'warn'); }
  }

  async function recordForServer() {
    const t = UI[lang];
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { out(esc(t.denied), 'warn'); return; }
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      busy = false; $('.v-mic').classList.remove('rec'); out(esc(t.thinking));
      const mime = rec.mimeType || 'audio/webm';
      const f = new FormData(); f.append('lang', lang);
      f.append('audio', new Blob(chunks, { type: mime }), 'q.' + (mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'));
      try { handleText('', await askServer(f)); }
      catch (e) { out(esc(t.nosupport), 'warn'); }
    };
    busy = true; $('.v-mic').classList.add('rec'); out(esc(t.listening) + ' <button type="button" class="btn small v-stop">■</button>');
    $('.v-stop').onclick = () => rec.state === 'recording' && rec.stop();
    rec.start();
    setTimeout(() => rec.state === 'recording' && rec.stop(), 6000);
  }

  render();
  window.HospiVoice = { match, nearestRoom, replyText, setLang: (l) => { lang = l; render(); }, ask: (text) => handleText(text, null), api: () => API };
})();
