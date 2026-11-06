// DOM wiring. Sign text is written with textContent so markup is never interpreted by the page.
(function () {
  'use strict';
  var core = window.SignCore;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('form');
  // One palette keeps text and highlight choices consistent.
  var PRESET_COLORS = ['#fff3d8', '#ffffff', '#ff0000', '#ffaa00', '#ffff00', '#00ff00', '#00ffff', '#4488ff', '#ff00ff', '#000000'];
  var IDS = ['text', 'useColor', 'color', 'alpha', 'useMark', 'markColor', 'markAlpha', 'useSize', 'size', 'stylePreset', 'flipSize',
    'bold', 'italic', 'underline', 'strike', 'smallcaps', 'monospace', 'cspace', 'lineHeight', 'rotate',
    'marginLeft', 'marginRight', 'supSub', 'pos', 'voffset', 'space', 'lineIndent', 'indent', 'useSpriteColor', 'spriteColor',
    'spriteSet', 'spriteFrom', 'spriteTo', 'spriteFps', 'useSprite2', 'sprite2From', 'sprite2To', 'sprite2Fps', 'research', 'favName', 'favSave', 'favList',
    'preview', 'output', 'count', 'copy', 'limitMsg', 'meterBar'];
  var els = {};
  IDS.forEach(function (id) { els[id] = $(id); });

  // Picking a color applies it immediately.
  [[els.color, els.useColor], [els.markColor, els.useMark], [els.spriteColor, els.useSpriteColor]].forEach(function (pair) {
    pair[0].addEventListener('input', function () { pair[1].checked = true; });
  });

  document.querySelectorAll('.swatches').forEach(function (group) {
    var input = $(group.dataset.target);
    var toggle = group.dataset.target === 'color' ? els.useColor : els.useMark;
    PRESET_COLORS.forEach(function (hex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.background = hex;
      b.setAttribute('aria-label', hex);
      b.addEventListener('click', function () {
        var before = snapshot();
        input.value = hex;
        toggle.checked = true;
        commit(before, 'This color');
      });
      group.appendChild(b);
    });
  });

  // Sprite selectors share a fixed 0..35 range; labels follow the chosen set.
  var MAX_SPRITES = 36;
  [els.spriteFrom, els.spriteTo, els.sprite2From, els.sprite2To].forEach(function (sel) {
    for (var i = 0; i < MAX_SPRITES; i++) {
      var opt = new Option(String(i), String(i));
      opt.defaultSelected = opt.selected = String(i) === sel.dataset.default;
      sel.appendChild(opt);
    }
  });
  function spriteNames() { return core.SPRITE_SETS[els.spriteSet.value] || core.EMOJI; }
  function relabelSprites() {
    var names = spriteNames();
    [els.spriteFrom, els.spriteTo, els.sprite2From, els.sprite2To].forEach(function (sel) {
      Array.prototype.forEach.call(sel.options, function (opt, i) {
        opt.hidden = opt.disabled = i >= names.length;
      opt.textContent = i < names.length ? i + ' · ' + names[i].replace(/_/g, ' ') : String(i);
      });
      if (Number(sel.value) >= names.length) sel.value = String(/To$/.test(sel.id) ? names.length - 1 : 0);
    });
  }

  // Gamepad icon look-alikes for the preview only.
  var PAD_COLORS = { 'xbox:button_a': '#5bb030', 'xbox:button_b': '#e0352b', 'xbox:button_x': '#2d6fe0', 'xbox:button_y': '#e8b923',
    'ps5:button_cross': '#5a8ee8', 'ps5:button_circle': '#e8505a', 'ps5:button_square': '#d878c8', 'ps5:button_triangle': '#3cb89a' };
  var PAD_LABELS = { button_cross: '✕', button_circle: '○', button_square: '□', button_triangle: '△', button_plus: '+', button_minus: '−',
    lshoulder: 'L', rshoulder: 'R', ltrigger: 'ZL', rtrigger: 'ZR', button_touchpad: 'TP', button_xbox: 'X', button_ps: 'PS' };
  function padLabel(name) {
    if (PAD_LABELS[name]) return PAD_LABELS[name];
    if (/^dpad/.test(name)) return '✚';
    if (/^lstick/.test(name)) return 'LS';
    if (/^rstick/.test(name)) return 'RS';
    return name.replace(/^button_/, '').slice(0, 5).toUpperCase();
  }
  function paintSprite(e, set, i) {
    if (set === 'emojione' || !core.SPRITE_SETS[set]) { e.className = 'emoji'; e.textContent = core.EMOJI[i]; e.style.background = ''; return; }
    var name = core.SPRITE_SETS[set][i];
    e.className = 'pad';
    e.textContent = padLabel(name);
    e.style.background = PAD_COLORS[set + ':' + name] || '#3a3f47';
  }

  // CSS filters approximate a selected tint on the browser's multicolor emoji font.
  function emojiTintFilter(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, hue = 0;
    if (delta) {
      if (max === r) hue = 60 * (((g - b) / delta) % 6);
      else if (max === g) hue = 60 * ((b - r) / delta + 2);
      else hue = 60 * ((r - g) / delta + 4);
    }
    return 'grayscale(1) sepia(1) saturate(5000%) hue-rotate(' + (hue - 35) + 'deg)';
  }

  function radio(name) {
    var r = form.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : '';
  }

  function options() {
    return {
      text: els.text.value,
      color: els.useColor.checked ? els.color.value : null,
      alpha: els.alpha.value,
      mark: els.useMark.checked ? els.markColor.value : null,
      markAlpha: els.markAlpha.value,
      size: els.useSize.checked ? els.size.value : null,
      flipSize: els.flipSize.checked, stylePreset: els.stylePreset.value,
      bold: els.bold.checked, italic: els.italic.checked, underline: els.underline.checked,
      strike: els.strike.checked, smallcaps: els.smallcaps.checked, monospace: els.monospace.checked,
      align: radio('align'),
      cspace: els.cspace.value, lineHeight: els.lineHeight.value,
      rotate: els.rotate.value, marginLeft: els.marginLeft.value, marginRight: els.marginRight.value,
      supSub: els.supSub.value, pos: els.pos.value, voffset: els.voffset.value, space: els.space.value, lineIndent: els.lineIndent.value, indent: els.indent.value,
      useSpriteColor: els.useSpriteColor.checked, spriteColor: els.spriteColor.value,
      sprite: radio('sprite'), spriteSet: els.spriteSet.value, spriteFrom: els.spriteFrom.value, spriteTo: els.spriteTo.value,
      spriteFps: els.spriteFps.value, spritePos: radio('spritePos'), sprite2: radio('sprite') === 'anim' && els.useSprite2.checked,
      sprite2From: els.sprite2From.value, sprite2To: els.sprite2To.value, sprite2Fps: els.sprite2Fps.value
    };
  }

  function bytesFor(o) { return core.utf8Bytes(core.buildSignText(o)); }

  // Hard cap: any change that pushes the result past 50 bytes is undone.
  function snapshot() {
    return Array.prototype.map.call(form.elements, function (el) { return [el.value, el.checked]; });
  }
  function restore(s) {
    Array.prototype.forEach.call(form.elements, function (el, i) { el.value = s[i][0]; el.checked = s[i][1]; });
  }
  function say(msg) {
    els.limitMsg.textContent = msg;
    clearTimeout(say.t);
    if (msg) say.t = setTimeout(function () { els.limitMsg.textContent = ''; }, 3000);
  }
  // A range value that does not fit snaps to the closest valid value, so dragging stays responsive.
  function nearestFit(range) {
    var want = Number(range.value), min = Number(range.min), max = Number(range.max), step = Number(range.step) || 1;
    for (var d = 0; d <= max - min; d += step) {
      var tries = [want - d, want + d];
      for (var i = 0; i < 2; i++) {
        if (tries[i] < min || tries[i] > max) continue;
        range.value = String(tries[i]);
        if (bytesFor(options()) <= core.MAX_BYTES) return true;
      }
    }
    range.value = String(want);
    return false;
  }

  var last = snapshot();
  function commit(before, what, target) {
    var over = bytesFor(options()) - core.MAX_BYTES;
    if (over > 0 && target && target.type === 'range' && nearestFit(target)) {
      say('Snapped to the closest value that fits in 50 bytes.');
    } else if (over > 0) {
      restore(before);
      say(what + ' needs ' + over + ' more byte' + (over > 1 ? 's' : '') + '. Shorten the text or drop a style.');
    } else {
      say('');
    }
    render();
    // Snapshot after rendering clamps frame selectors to the active sprite set.
    last = snapshot();
  }

  // Typing and pasting: insert only what fits instead of rejecting it all.
  els.text.addEventListener('beforeinput', function (e) {
    var data = e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph' ? '\n' : e.data;
    if (!e.inputType.startsWith('insert') || data == null) return;
    var t = els.text, s = t.selectionStart, end = t.selectionEnd;
    var o = options();
    var fits = function (ins) { o.text = t.value.slice(0, s) + ins + t.value.slice(end); return bytesFor(o) <= core.MAX_BYTES; };
    // No insertion over 50 UTF-16 units can fit: at most 50 Unicode code points can fit.
    // Avoid encoding or copying an unbounded clipboard payload just to reject most of it.
    if (data.length <= core.MAX_BYTES && fits(data)) return;
    e.preventDefault();
    var chars = [], offset = 0;
    while (offset < data.length && chars.length < core.MAX_BYTES) {
      var char = String.fromCodePoint(data.codePointAt(offset));
      chars.push(char);
      offset += char.length;
    }
    while (chars.length && !fits(chars.join(''))) chars.pop();
    if (chars.length) t.setRangeText(chars.join(''), s, end, 'end');
    say(chars.length ? 'Text cut at 50 bytes.' : 'Sign is full: 50 bytes max.');
    last = snapshot();
    render();
  });

  function setOut(id, text) { $(id + 'Out').textContent = text; }

  var animTimers = [];
  function previewSprite(o) {
    var e = document.createElement('span');
    var lastI = spriteNames().length - 1;
    var from = core.clampInt(o.spriteFrom, 0, lastI, 0), to = core.clampInt(o.spriteTo, 0, lastI, lastI);
    var reverse = from > to;
    var start = reverse ? to : from;
    var end = reverse ? from : to;
    var current = start;
    var paintFrame = function (frame) {
      paintSprite(e, o.spriteSet, frame);
      // Text labels use CSS color; emoji use a hue filter because color-font glyphs ignore CSS color.
      if (o.useSpriteColor) {
        e.style.color = o.spriteColor;
        if (o.spriteSet === 'emojione') e.style.filter = emojiTintFilter(o.spriteColor);
      }
    };
    paintFrame(start);
    if (o.sprite === 'anim' && to !== from && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animTimers.push(setInterval(function () {
        // Mirrors TMP_SpriteAnimator: render current frame, then step/wrap for the next tick.
        paintFrame(current);
        if (reverse) current = current > start ? current - 1 : end;
        else current = current < end ? current + 1 : start;
      }, 1000 / Math.min(core.clampInt(o.spriteFps, core.MIN_SPRITE_FPS, core.MAX_SPRITE_FPS, core.DEFAULT_SPRITE_FPS), core.PREVIEW_MAX_FPS)));
    }
    return e;
  }

  function renderPreview(o) {
    var p = els.preview;
    var q = document.createElement('span'); // inline, so the highlight hugs the letters
    p.replaceChildren(q);
    animTimers.forEach(clearInterval);
    animTimers = [];
    var sprite = o.sprite === 'anim' ? previewSprite(o) : null;
    var sprite2 = o.sprite2 ? previewSprite(Object.assign({}, o, { sprite: 'anim', spriteFrom: o.sprite2From, spriteTo: o.sprite2To, spriteFps: o.sprite2Fps })) : null;
    if (sprite && o.spritePos !== 'after') q.appendChild(sprite);
    if (sprite2 && o.spritePos !== 'after') q.appendChild(sprite2);
    if (o.stylePreset === 'H1') q.appendChild(document.createTextNode('*'));
    if (o.supSub) { q.style.fontSize = '.75em'; q.style.verticalAlign = o.supSub === 'sup' ? 'super' : 'sub'; }
    var rot = core.clampInt(o.rotate, -180, 180, 0);
    String(o.text).replace(/\r\n?/g, '\n').split('\n').forEach(function (line, i) {
      if (i) q.appendChild(document.createElement('br'));
      if (!rot) { q.appendChild(document.createTextNode(line)); return; }
      Array.from(line).forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'rot';
        s.style.transform = 'rotate(' + rot + 'deg)';
        s.textContent = ch;
        q.appendChild(s);
      });
    });
    if (sprite && o.spritePos === 'after') q.appendChild(sprite);
    if (sprite2 && o.spritePos === 'after') q.appendChild(sprite2);
    var a = core.clampInt(o.alpha, 0, 255, 255) / 255;
    p.style.color = o.color || (o.stylePreset === 'H1' ? '#86d867' : o.stylePreset === 'C2' ? '#c49cff' : '');
    p.style.opacity = Number(o.alpha) < 255 ? String(a) : '';
    // Keep layout fixed and scale the preview layer around the plank center; large values extend above/below instead of reflowing right.
    var previewSize = o.size ? Math.min(core.clampInt(o.size, core.MIN_SIZE, core.MAX_SIZE, core.DEFAULT_SIZE), core.PREVIEW_MAX_SIZE) : core.DEFAULT_SIZE;
    var previewScale = previewSize / core.DEFAULT_SIZE;
    p.style.transformOrigin = 'center center';
    p.style.transform = 'scale(' + previewScale + ')' + (o.size && o.flipSize ? ' scaleY(-1)' : '');
    p.style.fontStyle = o.italic ? 'italic' : '';
    p.style.fontVariant = o.smallcaps ? 'small-caps' : '';
    p.style.textDecoration = [o.underline && 'underline', o.strike && 'line-through'].filter(Boolean).join(' ');
    p.style.letterSpacing = core.clampInt(o.cspace, -20, 50, 0) + 'em';
    p.style.fontFamily = o.monospace ? 'var(--mono)' : '';
    p.style.marginLeft = core.clampInt(o.marginLeft, 0, 50, 0) + 'px';
    p.style.marginRight = core.clampInt(o.marginRight, 0, 50, 0) + 'px';
    p.style.textIndent = (core.clampInt(o.indent, 0, 50, 0) + core.clampInt(o.lineIndent, 0, 50, 0)) + 'px';
    q.style.position = 'relative';
    q.style.left = core.clampInt(o.pos, -50, 50, 0) + 'px';
    q.style.top = -core.clampInt(o.voffset, -500, 500, 0) + 'px';
    q.style.marginLeft = core.clampInt(o.space, 0, 50, 0) + 'px';
    var lh = core.clampInt(o.lineHeight, 0, 300, 0);
    p.style.lineHeight = lh ? String(1.15 * lh / 100) : '';
    if (o.mark) {
      var m = o.mark, ma = core.clampInt(o.markAlpha, 0, 254, 136) / 255;
      q.style.backgroundColor = 'rgba(' + parseInt(m.slice(1, 3), 16) + ',' + parseInt(m.slice(3, 5), 16) + ',' + parseInt(m.slice(5, 7), 16) + ',' + ma + ')';
    }
    p.parentElement.style.textAlign = o.align || 'center';
  }

  function render() {
    els.size.disabled = !els.useSize.checked;
    var animatingSprite = radio('sprite') === 'anim';
    var spriteEnabled = radio('sprite') !== '';
    $('spriteControls').hidden = !animatingSprite;
    els.useSprite2.disabled = !animatingSprite;
    $('sprite2Fields').hidden = !animatingSprite || !els.useSprite2.checked;
    els.useSpriteColor.disabled = !spriteEnabled;
    $('spriteColorField').hidden = !spriteEnabled || !els.useSpriteColor.checked;
    els.spriteColor.disabled = !spriteEnabled || !els.useSpriteColor.checked;
    form.querySelectorAll('input[type="range"]').forEach(function (r) {
      r.style.setProperty('--p', (r.value - r.min) / (r.max - r.min) * 100 + '%');
    });
    setOut('alpha', Math.round(els.alpha.value / 2.55) + '%');
    setOut('markAlpha', Math.round(els.markAlpha.value / 2.55) + '%');
    setOut('cspace', els.cspace.value === '0' ? 'off' : els.cspace.value);
    setOut('lineHeight', els.lineHeight.value === '0' ? 'off' : els.lineHeight.value + '%');
    setOut('rotate', els.rotate.value === '0' ? 'off' : els.rotate.value + '°');
    ['marginLeft', 'marginRight', 'pos', 'space', 'lineIndent', 'indent'].forEach(function (id) { setOut(id, els[id].value === '0' ? 'off' : els[id].value); });
    setOut('voffset', els.voffset.value === '0' ? 'off' : (els.voffset.value > 0 ? '+' : '') + els.voffset.value);
    setOut('spriteFps', els.spriteFps.value + ' fps');
    setOut('sprite2Fps', els.sprite2Fps.value + ' fps');
    relabelSprites();
    var o = options();
    var out = core.buildSignText(o);
    var bytes = core.utf8Bytes(out);
    els.output.value = out;
    els.count.textContent = bytes + ' / ' + core.MAX_BYTES + ' bytes (' + (core.MAX_BYTES - bytes) + ' left)';
    els.meterBar.style.width = Math.min(100, bytes / core.MAX_BYTES * 100) + '%';
    els.meterBar.classList.toggle('full', bytes >= core.MAX_BYTES - 5);
    renderPreview(o);
  }

  function copyText(field, btn) {
    field.select();
    var done = function (ok) {
      btn.textContent = ok ? 'Copied' : /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Press ⌘+C' : 'Press Ctrl+C';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(field.value).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  }
  els.copy.addEventListener('click', function () { copyText(els.output, els.copy); });

  form.addEventListener('input', function (e) {
    if (e.target === els.favName || e.target.classList.contains('lab-code')) return;
    if (e.target === els.stylePreset && els.stylePreset.value) els.useColor.checked = false;
    if (e.target === els.flipSize && els.flipSize.checked) els.useSize.checked = true;
    if (e.target === els.useSize && !els.useSize.checked) els.flipSize.checked = false;
    commit(last, e.target === els.text ? 'This text' : 'This style', e.target);
  });
  // Number fields can be temporarily empty while editing; normalize only when editing finishes.
  els.size.addEventListener('change', function () {
    els.size.value = String(core.clampInt(els.size.value, core.MIN_SIZE, core.MAX_SIZE, core.DEFAULT_SIZE));
    commit(last, 'Size');
  });
  $('resetAll').addEventListener('click', function () {
    form.reset(); // back to the defaults written in index.html
    document.querySelectorAll('details[open]').forEach(function (d) { d.open = false; });
    say('');
    last = snapshot();
    render();
    els.text.focus();
  });
  // Favorites: whole form state in localStorage. Stored data is treated as untrusted on load.
  var FAV_KEY = 'signglaze.favorites.v1', FAV_MAX = 30;
  function readFavs() {
    try {
      var v = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(v) ? v.filter(function (f) {
        return f && typeof f.name === 'string' && f.state && typeof f.state === 'object';
      }).slice(0, FAV_MAX) : [];
    } catch (e) { return []; }
  }
  function writeFavs(list) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); return true; }
    catch (e) { say('Could not save: browser storage is blocked.'); return false; }
  }
  function stateOf() {
    var s = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el === els.favName || el.classList.contains('lab-code') || el.type === 'button' || el.tagName === 'OUTPUT' || el.tagName === 'FIELDSET') return;
      if (el.type === 'radio') { if (el.checked) s['radio:' + el.name] = el.value; }
      else if (el.type === 'checkbox') s[el.id] = el.checked;
      else if (el.id && el !== els.output) s[el.id] = el.value;
    });
    return s;
  }
  function applyState(s) {
    var before = snapshot();
    form.reset();
    Object.keys(s).forEach(function (k) {
      if (k.indexOf('radio:') === 0) {
        var r = form.querySelector('input[type="radio"][name="' + CSS.escape(k.slice(6)) + '"][value="' + CSS.escape(String(s[k])) + '"]');
        if (r) r.checked = true;
        return;
      }
      var el = document.getElementById(k);
      if (!el || el.form !== form || el === els.favName || el === els.output) return;
      if (el.type === 'checkbox') el.checked = s[k] === true;
      else el.value = String(s[k]); // inputs sanitize their own values; core clamps the rest
    });
    commit(before, 'This favorite');
  }
  function renderFavs() {
    var list = readFavs();
    els.favList.replaceChildren();
    list.forEach(function (f, i) {
      var li = document.createElement('li');
      var load = document.createElement('button');
      load.type = 'button';
      load.className = 'fav';
      load.textContent = f.name;
      load.title = 'Load "' + f.name + '"';
      load.addEventListener('click', function () { applyState(f.state); });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'fav-del';
      del.textContent = '×';
      del.setAttribute('aria-label', 'Delete favorite ' + f.name);
      del.addEventListener('click', function () {
        if (!confirm('Delete favorite "' + f.name + '"?')) return;
        list.splice(i, 1);
        if (writeFavs(list)) renderFavs();
      });
      li.append(load, del);
      els.favList.appendChild(li);
    });
  }
  els.favSave.addEventListener('click', function () {
    var list = readFavs();
    var name = els.favName.value.trim().slice(0, 30) || 'Favorite ' + (list.length + 1);
    var at = list.findIndex(function (f) { return f.name === name; });
    if (at < 0 && list.length >= FAV_MAX) return say('Favorites full (' + FAV_MAX + '). Delete one first.');
    var fav = { name: name, state: stateOf() };
    if (at >= 0) list[at] = fav; else list.push(fav);
    if (writeFavs(list)) { els.favName.value = ''; renderFavs(); say(''); }
  });
  els.favName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); els.favSave.click(); } });

  // Partial, failed, and unconfirmed results stay visible without being presented as working editor controls.
  var RESEARCH = [
    ['No visible effect reported: width', '<width=50>WIDE'],
    ['No visible effect reported: uppercase', '<uppercase>rune'],
  ];
  function renderCodeList(target, items) {
  items.forEach(function (item) {
    var li = document.createElement('li');
    var name = document.createElement('span');
    name.className = 'lab-name';
    name.textContent = item[0] + ' · ' + core.utf8Bytes(item[1]) + ' B';
    var code = document.createElement('input');
    code.type = 'text';
    code.readOnly = true;
    code.defaultValue = item[1]; // survives form.reset()
    code.className = 'lab-code';
    code.setAttribute('aria-label', item[0]);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost small';
    b.textContent = 'Copy';
    b.addEventListener('click', function () { copyText(code, b); });
    li.append(name, code, b);
    target.appendChild(li);
  });
  }
  renderCodeList(els.research, RESEARCH);

  form.addEventListener('submit', function (e) { e.preventDefault(); });
  renderFavs();
  render();
})();
