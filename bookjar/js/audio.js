/* ══════════════════════════════════════════════════
   AUDIO.JS — Sonidos procedurales con Web Audio API.
   Sin archivos externos — todo generado en tiempo real.
══════════════════════════════════════════════════ */

var _actx  = null;   // AudioContext (lazy)
var _muted = false;

function getACtx() {
  if (!_actx) {
    try { _actx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  if (_actx.state === 'suspended') _actx.resume();
  return _actx;
}

function toggleMute() {
  _muted = !_muted;
  var btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = _muted ? '🔇' : '🔊';
}

// ── Primitivas de síntesis ─────────────────────────

/** Nodo de ganancia con fade-out automático */
function mkGain(ctx, vol, duration) {
  var g = ctx.createGain();
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  g.connect(ctx.destination);
  return g;
}

/** Oscilador simple que se para solo */
function playTone(freq, type, vol, attack, duration) {
  var ctx = getACtx(); if (!ctx || _muted) return;
  var osc = ctx.createOscillator();
  var g   = mkGain(ctx, 0.001, duration + attack);
  osc.type      = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.connect(g);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
  osc.start();
  osc.stop(ctx.currentTime + duration + attack);
}

/** Buffer de ruido blanco */
function mkNoise(ctx, duration) {
  var sr  = ctx.sampleRate;
  var buf = ctx.createBuffer(1, sr * duration, sr);
  var d   = buf.getChannelData(0);
  for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  var src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

// ── Sonidos de la app ──────────────────────────────

/** Al coger un libro del bote — whoosh suave ascendente */
function sndPickup() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  var osc = ctx.createOscillator();
  var g   = mkGain(ctx, 0.08, 0.22);
  var filt = ctx.createBiquadFilter();
  filt.type            = 'bandpass';
  filt.frequency.value = 800;
  filt.Q.value         = 0.8;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.18);
  osc.connect(filt); filt.connect(g);
  osc.start(); osc.stop(ctx.currentTime + 0.22);
}

/** Al colocar un libro en la estantería — golpe sordo */
function sndPlace() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  // Componente de golpe (ruido corto filtrado)
  var noise = mkNoise(ctx, 0.12);
  var filt  = ctx.createBiquadFilter();
  var g     = mkGain(ctx, 0.18, 0.12);
  filt.type            = 'lowpass';
  filt.frequency.value = 320;
  noise.connect(filt); filt.connect(g);
  noise.start(); noise.stop(ctx.currentTime + 0.12);
  // Tono grave de resonancia
  playTone(90, 'sine', 0.12, 0.004, 0.18);
}

/** Al volver el libro al bote — golpe más blando */
function sndReturn() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  var noise = mkNoise(ctx, 0.08);
  var filt  = ctx.createBiquadFilter();
  var g     = mkGain(ctx, 0.10, 0.10);
  filt.type            = 'lowpass';
  filt.frequency.value = 200;
  noise.connect(filt); filt.connect(g);
  noise.start(); noise.stop(ctx.currentTime + 0.10);
}

/** Al abrir un modal — clic suave */
function sndModalOpen() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  playTone(640, 'sine',     0.07, 0.004, 0.10);
  playTone(820, 'triangle', 0.04, 0.008, 0.08);
}

/** Al cerrar un modal */
function sndModalClose() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  playTone(520, 'sine', 0.06, 0.003, 0.08);
}

/** Al desbloquear una estantería nueva — chime ascendente */
function sndUnlock() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  var notes = [523, 659, 784, 1047];   // C5 E5 G5 C6
  notes.forEach(function(freq, i) {
    setTimeout(function() {
      playTone(freq, 'triangle', 0.12, 0.01, 0.35);
      playTone(freq * 2, 'sine', 0.04, 0.01, 0.25);
    }, i * 90);
  });
}

/** Al cambiar de estantería */
function sndSwitchCase() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  playTone(440, 'sine', 0.08, 0.01, 0.20);
  playTone(550, 'sine', 0.06, 0.02, 0.18);
}

/** Al añadir una decoración */
function sndDecorPlace() {
  var ctx = getACtx(); if (!ctx || _muted) return;
  playTone(880, 'triangle', 0.07, 0.005, 0.14);
  playTone(1100,'sine',     0.04, 0.010, 0.10);
}

/** Música ambiente muy suave (opcional, activada aparte) */
var _ambientNode = null;
function toggleAmbient() {
  var ctx = getACtx(); if (!ctx) return;
  if (_ambientNode) {
    _ambientNode.stop(); _ambientNode = null; return;
  }
  // Pad armónico suave con dos osciladores detuneados
  var g = ctx.createGain();
  g.gain.value = 0.018;
  g.connect(ctx.destination);
  var freqs = [110, 165, 220, 277];
  freqs.forEach(function(f) {
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    o1.type = o2.type = 'sine';
    o1.frequency.value = f;
    o2.frequency.value = f * 1.003;   // ligero detune para chorus
    o1.connect(g); o2.connect(g);
    o1.start(); o2.start();
    if (!_ambientNode) _ambientNode = o1;
  });
}
