// Pure logic: builds Valheim sign text. No DOM, so it can be tested with Node.
(function (root) {
  'use strict';

  // Valheim wiki: sign text max is 50 bytes of UTF-8; tags count too.
  var MAX_BYTES = 50;
  // The numeric field uses TMP's signed-integer range rather than an arbitrary visual slider ceiling.
  var MIN_SIZE = 1;
  var MAX_SIZE = 2147483647;
  var DEFAULT_SIZE = 10;
  // Keep enormous input values from turning the small browser preview into a solid glyph block.
  var PREVIEW_MAX_SIZE = 300;
  // TMP accepts rates above 30; 120 is the editor's practical slider ceiling, not a game limit.
  var MIN_SPRITE_FPS = 1;
  var MAX_SPRITE_FPS = 120;
  var DEFAULT_SPRITE_FPS = 4;
  // The browser preview only needs to update at a normal display refresh rate.
  var PREVIEW_MAX_FPS = 60;

  function clampInt(value, min, max, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function utf8Bytes(str) {
    return new TextEncoder().encode(str).length;
  }

  // Shortest TextMeshPro hex color: #rgb / #rgba when every channel is a doubled nibble.
  function shortHex(hex, alpha) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
    var a = clampInt(alpha, 0, 255, 255);
    var parts = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(function (p) { return p.toLowerCase(); });
    if (a < 255) parts.push(('0' + a.toString(16)).slice(-2));
    var canShorten = parts.every(function (p) { return p[0] === p[1]; });
    return '#' + parts.map(function (p) { return canShorten ? p[0] : p; }).join('');
  }

  // Closing tags are omitted on purpose: the game accepts it and it saves bytes.
  function buildSignText(o) {
    var tags = '';
    if (o.stylePreset === 'H1' || o.stylePreset === 'C2') tags += '<style=' + o.stylePreset + '>';
    if (o.color) {
      var c = shortHex(o.color, o.alpha);
      if (c) tags += '<' + c + '>';
    } else if (clampInt(o.alpha, 0, 255, 255) < 255) tags += '<alpha=#' + ('0' + clampInt(o.alpha, 0, 255, 255).toString(16)).slice(-2) + '>';
    if (o.size) tags += '<size=' + (o.flipSize ? '-' : '') + clampInt(o.size, MIN_SIZE, MAX_SIZE, DEFAULT_SIZE) + '>';
    if (o.align === 'left' || o.align === 'right') tags += '<align=' + o.align + '>';
    if (o.bold) tags += '<b>';
    if (o.italic) tags += '<i>';
    if (o.underline) tags += '<u>';
    if (o.strike) tags += '<s>';
    if (o.smallcaps) tags += '<smallcaps>';
    if (o.monospace) tags += '<mspace=2>';
    if (o.supSub === 'sup' || o.supSub === 'sub') tags += '<' + o.supSub + '>';
    if (o.mark) {
      // TextMeshPro draws mark over the text, so it must stay translucent (alpha capped below 255).
      var m = shortHex(o.mark, clampInt(o.markAlpha, 0, 254, 136));
      if (m) tags += '<mark=' + m + '>';
    }
    var cs = clampInt(o.cspace, -20, 50, 0);
    if (cs) tags += '<cspace=' + cs + 'em>';
    // Confirmed layout effects populate the editor; unverified tags remain experimental.
    [['marginLeft', 'margin-left'], ['marginRight', 'margin-right'], ['pos', 'pos'], ['space', 'space'], ['lineIndent', 'line-indent'], ['indent', 'indent']].forEach(function (tag) {
      // Negative horizontal positions are useful for moving the caret/text left of center.
      var min = tag[0] === 'pos' ? -50 : 0;
      var value = clampInt(o[tag[0]], min, 50, 0);
      if (value) tags += '<' + tag[1] + '=' + value + '>';
    });
    // Keep voffset available as an advanced control while its in-game effect remains unverified.
    var voffset = clampInt(o.voffset, -100, 100, 0);
    if (voffset) tags += '<voffset=' + voffset + '>';
    var lh = clampInt(o.lineHeight, 0, 300, 0);
    if (lh) tags += '<line-height=' + lh + '%>';
    var rot = clampInt(o.rotate, -180, 180, 0);
    if (rot) tags += '<rotate=' + rot + '>';
    // Real line breaks become a typed "\n", which the sign turns into a newline.
    var text = String(o.text || '').replace(/\r\n?/g, '\n').replace(/\n/g, '\\n');
    var sprite = spriteTag(o);
    var secondSprite = o.sprite2 ? spriteTag(Object.assign({}, o, { sprite: 'anim', spriteFrom: o.sprite2From, spriteTo: o.sprite2To, spriteFps: o.sprite2Fps })) : '';
    return o.spritePos === 'after' ? tags + text + sprite + secondSprite : tags + sprite + secondSprite + text;
  }

  // Emoji labels follow the in-game frame order; glyphs are close Unicode previews, not atlas captures.
  // Frame 0 awaits identification; frames 1–15 follow the tested Valheim sprite index list.
  var EMOJI = ['❔', '😛', '😍', '😎', '😃', '😆', '😂', '😄', '😆', '😅', '😢', '😜', '❔', '🤣', '🙂', '☹️'];
  var EMOJI_LABELS = ['Unverified frame', 'Tongue out', 'Heart eyes', 'Sunglasses', 'Grinning', 'Laughing', 'Laughing with tears',
    'Grinning, wide eyes', 'Laughing (duplicate)', 'Laughing with sweat', 'Crying', 'Winking with tongue', 'Question-mark tile',
    'Tilted laughing with tears', 'Smiling', 'Sad'];
  var SPRITE_SETS = {
    emojione: EMOJI_LABELS,
    xbox: ['rstick_down', 'button_ls', 'lstick', 'rstick_right', 'dpad', 'dpad_left', 'rstick_updown', 'lstick_leftright',
      'rstick_up', 'rstick', 'lstick_left', 'rstick_left', 'dpad_wpns', 'button_rt', 'dpad_updown', 'button_a',
      'rstick_leftright', 'lstick_right', 'button_start', 'dpad_up', 'button_b', 'dpad_down', 'lstick_updown', 'button_rs',
      'button_lb', 'button_back', 'button_xbox', 'button_lt', 'button_y', 'lstick_down', 'button_x', 'dpad_leftright',
      'button_specialcenter', 'dpad_right', 'button_rb', 'lstick_up'],
    ps5: ['rstick_down', 'button_l3', 'rstick_right', 'button_share', 'lstick_right', 'button_triangle', 'lstick_up', 'button_r2',
      'button_circle', 'rstick_left', 'dpad_right', 'dpad_down', 'button_r3', 'lstick_left', 'button_square', 'lstick_down',
      'button_l2', 'dpad_left', 'button_options', 'button_cross', 'button_r1', 'rstick_up', 'button_l1', 'dpad_up',
      'button_ps', 'button_touchpad', 'dpad', 'dpad_leftright', 'dpad_updown', 'dpad_wpns', 'lstick', 'lstick_leftright',
      'lstick_updown', 'rstick', 'rstick_leftright', 'rstick_updown'],
    switch2: ['button_b', 'lshoulder', 'button_plus', 'dpad_left', 'dpad_up', 'button_minus', 'button_y', 'dpad_right',
      'rtrigger', 'dpad_left_and_right', 'dpad_up_and_down', 'lstick_pressed', 'rstick', 'ltrigger', 'button_a', 'dpad_blank',
      'rstick_pressed', 'stick_pressed', 'lstick', 'button_x', 'dpad_down', 'rshoulder', 'rshoulder_doubleclick', 'rstick_updown',
      'rstick_up', 'rstick_down']
  };

  // anim="first,last,fps" uses ordered bounds; a negative fps plays that range backward.
  // Non-default sprite sets are named: <sprite="xbox" ...>.
  function spriteTag(o) {
    var set = SPRITE_SETS.hasOwnProperty(o.spriteSet) ? o.spriteSet : 'emojione';
    var last = SPRITE_SETS[set].length - 1;
    var from = clampInt(o.spriteFrom, 0, last, 0);
    var head = set === 'emojione' ? '<sprite' : '<sprite="' + set + '"';
    var tintColor = o.useSpriteColor ? shortHex(o.spriteColor, 255) : null;
    var tint = tintColor ? ' color=' + tintColor : '';
    if (o.sprite === 'anim') {
      var to = clampInt(o.spriteTo, 0, last, last);
      var fps = clampInt(o.spriteFps, MIN_SPRITE_FPS, MAX_SPRITE_FPS, DEFAULT_SPRITE_FPS);
      // TMP's animator uses a negative framerate for reverse playback and expects ordered bounds.
      return from <= to
        ? head + ' anim="' + from + ',' + to + ',' + fps + '"' + tint + '>'
        : head + ' anim="' + to + ',' + from + ',-' + fps + '"' + tint + '>';
    }
    return '';
  }

  var api = {
    MAX_BYTES: MAX_BYTES,
    MIN_SIZE: MIN_SIZE,
    MAX_SIZE: MAX_SIZE,
    DEFAULT_SIZE: DEFAULT_SIZE,
    PREVIEW_MAX_SIZE: PREVIEW_MAX_SIZE,
    MIN_SPRITE_FPS: MIN_SPRITE_FPS,
    MAX_SPRITE_FPS: MAX_SPRITE_FPS,
    DEFAULT_SPRITE_FPS: DEFAULT_SPRITE_FPS,
    PREVIEW_MAX_FPS: PREVIEW_MAX_FPS,
    EMOJI: EMOJI,
    EMOJI_LABELS: EMOJI_LABELS,
    SPRITE_SETS: SPRITE_SETS,
    clampInt: clampInt,
    utf8Bytes: utf8Bytes,
    shortHex: shortHex,
    buildSignText: buildSignText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SignCore = Object.freeze(api);
})(this);
