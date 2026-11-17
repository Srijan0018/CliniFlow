/*
 * Hospital voice navigation - website widget (no framework needed).
 *
 *   <div id="hospital-voice"></div>
 *   <script src="https://YOUR-SERVER/web/voice-widget.js"></script>
 *   <script>
 *     HospitalVoice.mount('#hospital-voice', {
 *       apiUrl: 'https://YOUR-SERVER',
 *       defaultLang: 'kn',
 *       onNavigate: function (dest) { showRouteOnMap(dest.map_node); }
 *     });
 *   </script>
 *
 * The microphone only works on https:// pages (or http://localhost).
 */
(function () {
  'use strict';

  var LANGS = [
    { code: 'en', label: 'English', tts: 'en-IN' },
    { code: 'kn', label: 'ಕನ್ನಡ', tts: 'kn-IN' },
    { code: 'hi', label: 'हिन्दी', tts: 'hi-IN' },
    { code: 'ml', label: 'മലയാളം', tts: 'ml-IN' },
    { code: 'tcy', label: 'ತುಳು', tts: 'kn-IN' } // no Tulu voice exists; Kannada voice as fallback
  ];

  var T = {
    en: { title: 'Where do you want to go?', tap: 'Tap the mic and speak', listening: 'Listening… tap again when done', thinking: 'Finding the way…', said: 'You said', route: 'Show route', mean: 'Did you mean', list: 'Choose from list', search: 'Search department', close: 'Close', offline: 'Could not reach the server. Please choose from the list.', mic: 'Microphone not available. Please allow microphone access, or choose from the list.', type: 'Or type here…', example: 'e.g. "Where is the pharmacy?"' },
    kn: { title: 'ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?', tap: 'ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ', listening: 'ಕೇಳುತ್ತಿದೆ… ಮುಗಿದ ನಂತರ ಮತ್ತೆ ಒತ್ತಿ', thinking: 'ದಾರಿ ಹುಡುಕುತ್ತಿದೆ…', said: 'ನೀವು ಹೇಳಿದ್ದು', route: 'ದಾರಿ ತೋರಿಸಿ', mean: 'ನೀವು ಇದನ್ನು ಹೇಳಿದಿರಾ', list: 'ಪಟ್ಟಿಯಿಂದ ಆಯ್ಕೆಮಾಡಿ', search: 'ವಿಭಾಗ ಹುಡುಕಿ', close: 'ಮುಚ್ಚಿ', offline: 'ಸರ್ವರ್ ಸಂಪರ್ಕ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪಟ್ಟಿಯಿಂದ ಆಯ್ಕೆಮಾಡಿ.', mic: 'ಮೈಕ್ ಲಭ್ಯವಿಲ್ಲ. ಮೈಕ್ ಅನುಮತಿ ನೀಡಿ ಅಥವಾ ಪಟ್ಟಿಯಿಂದ ಆಯ್ಕೆಮಾಡಿ.', type: 'ಅಥವಾ ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ…', example: 'ಉದಾ: "ಫಾರ್ಮಸಿ ಎಲ್ಲಿದೆ?"' },
    hi: { title: 'आपको कहाँ जाना है?', tap: 'माइक दबाएँ और बोलें', listening: 'सुन रहा है… बोलने के बाद फिर दबाएँ', thinking: 'रास्ता ढूंढ रहा है…', said: 'आपने कहा', route: 'रास्ता दिखाएँ', mean: 'क्या आपका मतलब था', list: 'सूची से चुनें', search: 'विभाग खोजें', close: 'बंद करें', offline: 'सर्वर से संपर्क नहीं हो पाया। कृपया सूची से चुनें।', mic: 'माइक उपलब्ध नहीं है। माइक की अनुमति दें या सूची से चुनें।', type: 'या यहाँ लिखें…', example: 'जैसे: "फार्मेसी कहाँ है?"' },
    ml: { title: 'നിങ്ങൾക്ക് എവിടെ പോകണം?', tap: 'മൈക്ക് അമർത്തി സംസാരിക്കുക', listening: 'കേൾക്കുന്നു… കഴിഞ്ഞാൽ വീണ്ടും അമർത്തുക', thinking: 'വഴി കണ്ടെത്തുന്നു…', said: 'നിങ്ങൾ പറഞ്ഞത്', route: 'വഴി കാണിക്കുക', mean: 'ഇതാണോ ഉദ്ദേശിച്ചത്', list: 'പട്ടികയിൽ നിന്ന് തിരഞ്ഞെടുക്കുക', search: 'വിഭാഗം തിരയുക', close: 'അടയ്ക്കുക', offline: 'സെർവറുമായി ബന്ധപ്പെടാനായില്ല. ദയവായി പട്ടികയിൽ നിന്ന് തിരഞ്ഞെടുക്കുക.', mic: 'മൈക്ക് ലഭ്യമല്ല. മൈക്ക് അനുമതി നൽകുക അല്ലെങ്കിൽ പട്ടികയിൽ നിന്ന് തിരഞ്ഞെടുക്കുക.', type: 'അല്ലെങ്കിൽ ഇവിടെ ടൈപ്പ് ചെയ്യുക…', example: 'ഉദാ: "ഫാർമസി എവിടെയാണ്?"' },
    tcy: { title: 'ಈರ್ ಓಲುಗು ಪೋವೊಡು?', tap: 'ಮೈಕ್ ಒತ್ತುದು ಪಾತೆರ್ಲೆ', listening: 'ಕೇನೊಂದುಂಡು… ಮುಗಿನ ಬೊಕ್ಕ ಕುಡ ಒತ್ತುಲೆ', thinking: 'ಸಾದಿ ನಾಡೊಂದುಂಡು…', said: 'ಈರ್ ಪಂಡಿನವು', route: 'ಸಾದಿ ತೋಜಾಲೆ', mean: 'ಈರ್ ಇಂದೇ ಪಂಡಿನವಾ', list: 'ಪಟ್ಟಿಡ್ದ್ ಆಯ್ಕೆ ಮಲ್ಪುಲೆ', search: 'ವಿಭಾಗ ನಾಡ್ಲೆ', close: 'ಮುಚ್ಚುಲೆ', offline: 'ಸರ್ವರ್ ಸಂಪರ್ಕ ತಿಕ್ಕಿಜಿ. ಪಟ್ಟಿಡ್ದ್ ಆಯ್ಕೆ ಮಲ್ಪುಲೆ.', mic: 'ಮೈಕ್ ತಿಕ್ಕಿಜಿ. ಮೈಕ್ ಅನುಮತಿ ಕೊರ್ಲೆ ಅತ್ತಂಡ ಪಟ್ಟಿಡ್ದ್ ಆಯ್ಕೆ ಮಲ್ಪುಲೆ.', type: 'ಅತ್ತಂಡ ಮುಲ್ಪ ಟೈಪ್ ಮಲ್ಪುಲೆ…', example: 'ಉದಾ: "ಫಾರ್ಮಸಿ ಓಲು ಉಂಡು?"' }
  };

  var CSS =
    '.hv{font-family:system-ui,-apple-system,"Noto Sans",sans-serif;max-width:480px;margin:0 auto;padding:16px;text-align:center;color:#1a1a1a}' +
    '.hv *{box-sizing:border-box}.hv-langs{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px}' +
    '.hv-chip{border:1px solid #0B6BCB;color:#0B6BCB;background:#fff;border-radius:20px;padding:8px 14px;font-size:16px;cursor:pointer}' +
    '.hv-chip.on{background:#0B6BCB;color:#fff;font-weight:600}.hv h2{font-size:22px;margin:4px 0}.hv-hint{color:#666;font-size:14px;margin:0 0 18px}' +
    '.hv-mic{width:96px;height:96px;border-radius:50%;border:0;background:#0B6BCB;color:#fff;font-size:38px;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.2)}' +
    '.hv-mic.rec{background:#D32F2F;animation:hvp 1.2s infinite}.hv-mic:disabled{opacity:.7;cursor:wait}@keyframes hvp{50%{box-shadow:0 0 0 14px rgba(211,47,47,.15)}}' +
    '.hv-status{margin-top:12px;color:#444;min-height:20px}.hv-heard{font-style:italic;color:#555;margin-top:10px}' +
    '.hv-card{margin-top:14px;padding:16px;border-radius:12px;background:#EEF5FD;text-align:left}.hv-card.warn{background:#FFF4E5}' +
    '.hv-card b{display:block;font-size:20px;color:#0B6BCB;margin-bottom:6px}.hv-card p{margin:0;font-size:17px;line-height:1.45}' +
    '.hv-btn{display:block;width:100%;margin-top:12px;background:#0B6BCB;color:#fff;border:0;border-radius:8px;padding:12px;font-size:17px;font-weight:600;cursor:pointer}' +
    '.hv-alts{margin-top:12px;text-align:left;font-size:14px;color:#666}.hv-alts button{margin:6px 6px 0 0;border:0;background:#E8E8E8;border-radius:16px;padding:6px 12px;font-size:15px;cursor:pointer}' +
    '.hv-type{display:flex;gap:8px;margin-top:16px}.hv-type input,.hv-search{flex:1;padding:10px 12px;font-size:16px;border:1px solid #ccc;border-radius:8px;width:100%}' +
    '.hv-type button{border:0;background:#0B6BCB;color:#fff;border-radius:8px;padding:0 16px;font-size:18px;cursor:pointer}' +
    '.hv-link{margin-top:16px;background:none;border:0;color:#0B6BCB;text-decoration:underline;font-size:16px;cursor:pointer}' +
    '.hv-modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:flex-end;justify-content:center;z-index:9999}' +
    '.hv-sheet{background:#fff;width:100%;max-width:520px;max-height:85vh;border-radius:14px 14px 0 0;display:flex;flex-direction:column;padding:12px}' +
    '.hv-sheet-head{display:flex;gap:8px;align-items:center}.hv-sheet-head button{background:none;border:0;color:#0B6BCB;font-size:16px;cursor:pointer;padding:8px}' +
    '.hv-rows{overflow:auto;margin-top:8px;text-align:left}.hv-row{padding:12px 6px;border-bottom:1px solid #eee;cursor:pointer}.hv-row:hover{background:#f6f9fd}' +
    '.hv-row small{display:block;color:#777;margin-top:2px}';

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function mount(target, opts) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) throw new Error('HospitalVoice: element not found');
    if (!document.getElementById('hv-css')) document.head.appendChild(el('style', { id: 'hv-css', text: CSS }));

    var api = (opts.apiUrl || '').replace(/\/+$/, '');
    var onNavigate = opts.onNavigate || function () {};
    var maxSeconds = opts.maxSeconds || 7;
    var timeoutMs = opts.timeoutMs || 10000;
    var state = { lang: opts.defaultLang || 'en', status: 'idle', result: null, msg: '' };
    var recorder = null, chunks = [], stream = null, autoStop = null, player = new Audio();

    function t() { return T[state.lang]; }

    function request(path, init) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
      init = init || {};
      init.signal = ctrl.signal;
      return fetch(api + path, init).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }, function (e) { clearTimeout(timer); throw e; });
    }

    function speak(text, audioPath, lang) {
      if (opts.speakReplies === false) return;
      try { player.pause(); window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
      if (audioPath) { player.src = api + audioPath; player.play().catch(function () {}); return; }
      if (!window.speechSynthesis || !text) return;
      var code = LANGS.filter(function (l) { return l.code === lang; })[0].tts;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = code;
      var v = speechSynthesis.getVoices().filter(function (x) { return x.lang && x.lang.replace('_', '-').indexOf(code.split('-')[0]) === 0; })[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    }

    function show(r) {
      state.result = r; state.msg = r.reply_text; state.status = 'answered';
      render();
      speak(r.reply_text, r.reply_audio, r.lang);
    }

    function fail(msg, openTheList) {
      state.status = 'error'; state.msg = msg; state.result = null;
      render();
      if (openTheList) openList();
    }

    function ask(form) {
      state.status = 'thinking'; render();
      request('/ask', { method: 'POST', body: form }).then(show, function () { fail(t().offline, true); });
    }

    function askText(text) {
      if (!text.trim()) return;
      var f = new FormData(); f.append('lang', state.lang); f.append('text', text);
      ask(f);
    }

    function start() {
      if (!navigator.mediaDevices || !window.MediaRecorder) return fail(t().mic, false);
      try { player.pause(); window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
      navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then(function (s) {
        stream = s; chunks = [];
        var type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0];
        recorder = type ? new MediaRecorder(s, { mimeType: type }) : new MediaRecorder(s);
        recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          stream.getTracks().forEach(function (tr) { tr.stop(); });
          var mime = recorder.mimeType || 'audio/webm';
          var ext = mime.indexOf('mp4') >= 0 ? 'm4a' : mime.indexOf('ogg') >= 0 ? 'ogg' : 'webm';
          var f = new FormData();
          f.append('lang', state.lang);
          f.append('audio', new Blob(chunks, { type: mime }), 'question.' + ext);
          ask(f);
        };
        recorder.start();
        state.status = 'recording'; state.result = null; state.msg = '';
        render();
        autoStop = setTimeout(stop, maxSeconds * 1000);
      }, function () { fail(t().mic, false); });
    }

    function stop() {
      clearTimeout(autoStop);
      if (recorder && recorder.state === 'recording') recorder.stop();
    }

    function pick(d) {
      closeList();
      request('/departments/' + encodeURIComponent(d.id) + '?lang=' + state.lang).then(function (full) {
        show({ lang: state.lang, heard: '', destination: full, alternatives: [], reply_text: full.reply_text, reply_audio: full.reply_audio });
      }, function () { fail(t().offline, false); });
    }

    var modal = null;
    function closeList() { if (modal) { modal.remove(); modal = null; } }
    function openList() {
      closeList();
      var rows = el('div', { class: 'hv-rows', text: '…' });
      var search = el('input', { class: 'hv-search', placeholder: t().search });
      var all = [];
      function draw() {
        var q = search.value.trim().toLowerCase();
        rows.innerHTML = '';
        all.filter(function (d) { return !q || d.name.toLowerCase().indexOf(q) >= 0 || d.name_en.toLowerCase().indexOf(q) >= 0; })
          .forEach(function (d) {
            rows.appendChild(el('div', { class: 'hv-row', onclick: function () { pick(d); } }, [
              document.createTextNode(d.name), el('small', { text: d.floor_text + ' · ' + d.place })
            ]));
          });
      }
      search.addEventListener('input', draw);
      modal = el('div', { class: 'hv-modal', onclick: function (e) { if (e.target === modal) closeList(); } }, [
        el('div', { class: 'hv-sheet' }, [
          el('div', { class: 'hv-sheet-head' }, [search, el('button', { text: t().close, onclick: closeList })]),
          rows
        ])
      ]);
      document.body.appendChild(modal);
      request('/departments?lang=' + state.lang).then(function (r) { all = r.departments; draw(); }, function () { rows.textContent = t().offline; });
    }

    function render() {
      var s = t(), r = state.result, dest = r && r.destination;
      root.innerHTML = '';
      var langs = el('div', { class: 'hv-langs' }, LANGS.map(function (l) {
        return el('button', { class: 'hv-chip' + (l.code === state.lang ? ' on' : ''), text: l.label, onclick: function () {
          state.lang = l.code; state.status = 'idle'; state.result = null; state.msg = ''; render();
          if (opts.onLanguageChange) opts.onLanguageChange(l.code);
        } });
      }));
      var mic = el('button', {
        class: 'hv-mic' + (state.status === 'recording' ? ' rec' : ''),
        'aria-label': s.tap,
        text: state.status === 'recording' ? '■' : state.status === 'thinking' ? '…' : '🎤',
        onclick: function () { state.status === 'recording' ? stop() : start(); }
      });
      if (state.status === 'thinking') mic.disabled = true;
      var statusText = { idle: s.tap, recording: s.listening, thinking: s.thinking }[state.status] || '';

      var card = null;
      if (state.msg) {
        card = el('div', { class: 'hv-card' + (dest ? '' : ' warn') }, [
          dest ? el('b', { text: dest.name }) : null,
          el('p', { text: state.msg }),
          dest && dest.available ? el('button', { class: 'hv-btn', text: s.route, onclick: function () { onNavigate(dest); } }) : null
        ]);
      }
      var alts = null;
      if (r && r.alternatives && r.alternatives.length) {
        alts = el('div', { class: 'hv-alts', text: s.mean + ': ' }, r.alternatives.map(function (a) {
          return el('button', { text: a.name, onclick: function () { pick(a); } });
        }));
      }
      var input = el('input', { placeholder: s.type });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') askText(input.value); });
      var typeRow = el('div', { class: 'hv-type' }, [input, el('button', { text: '→', onclick: function () { askText(input.value); } })]);

      root.appendChild(el('div', { class: 'hv' }, [
        langs,
        el('h2', { text: s.title }),
        el('p', { class: 'hv-hint', text: s.example }),
        mic,
        el('div', { class: 'hv-status', text: statusText }),
        r && r.heard ? el('div', { class: 'hv-heard', text: s.said + ': “' + r.heard + '”' }) : null,
        card, alts, typeRow,
        el('button', { class: 'hv-link', text: s.list, onclick: openList })
      ]));
    }

    render();
    return { setLanguage: function (l) { state.lang = l; render(); }, destroy: function () { stop(); closeList(); root.innerHTML = ''; } };
  }

  window.HospitalVoice = { mount: mount };
})();
