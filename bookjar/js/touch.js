/* ══════════════════════════════════════════════════
   TOUCH.JS — Soporte táctil completo para móvil.
   Envuelve los handlers de ratón existentes sin
   modificarlos. Long press = clic derecho (eliminar deco).
══════════════════════════════════════════════════ */

// ── Estado táctil ──────────────────────────────────
let _touchActive    = false;   // hay un toque activo
let _longPressTimer = null;    // timer para long press
let _touchMoved     = false;   // el dedo se movió (cancela long press)
let _lastTapBook    = null;    // libro al que se hizo tap (para tooltip)

const LONG_PRESS_MS = 500;     // ms para activar long press
const MOVE_CANCEL   = 8;       // píxeles de movimiento que cancelan long press
let   _startX = 0, _startY = 0;

// ── Helper: sintetiza un objeto event compatible con setMV ──

function touchToMouse(touch) {
  return { clientX: touch.clientX, clientY: touch.clientY };
}

// ── Handlers táctiles ──────────────────────────────

function onTouchStart(e) {
  if (e.touches.length !== 1) return;   // ignorar multitouch
  e.preventDefault();

  const t = e.touches[0];
  _touchActive = true;
  _touchMoved  = false;
  _startX = t.clientX;
  _startY = t.clientY;

  // Long press: si no hay movimiento en LONG_PRESS_MS → clic derecho
  _longPressTimer = setTimeout(() => {
    if (!_touchMoved && _touchActive) {
      // Vibrar si el dispositivo lo soporta
      if (navigator.vibrate) navigator.vibrate(40);
      // Simular evento contextmenu para eliminar decoraciones
      const fake = new MouseEvent('contextmenu', {
        clientX: t.clientX, clientY: t.clientY, bubbles: true
      });
      ren.domElement.dispatchEvent(fake);
      // Cancelar el drag que se inició con touchstart
      if (isDrag) {
        clearHL();
        returnToJar(dragB);
        isDrag = false; dragB = null; magnetSlot = null;
      }
    }
  }, LONG_PRESS_MS);

  // Alimentar el handler de mousedown
  onDn(Object.assign(touchToMouse(t), { button: 0 }));
}

function onTouchMove(e) {
  if (e.touches.length !== 1) return;
  e.preventDefault();

  const t = e.touches[0];
  const dx = t.clientX - _startX;
  const dy = t.clientY - _startY;

  if (Math.hypot(dx, dy) > MOVE_CANCEL) {
    _touchMoved = true;
    clearTimeout(_longPressTimer);
  }

  onMv(touchToMouse(t));
}

function onTouchEnd(e) {
  clearTimeout(_longPressTimer);
  _touchActive = false;

  const t = e.changedTouches[0];

  // Si no arrastró nada → puede ser un tap sobre libro en estantería (tooltip)
  if (!_touchMoved && !isDrag) {
    handleTap(t);
  }

  onUp();
}

// ── Tap en libro de estantería → tooltip ──────────

function handleTap(touch) {
  // Raycast contra libros de estantería
  const rect = ren.domElement.getBoundingClientRect();
  MV.x =  ((touch.clientX - rect.left) / rect.width)  * 2 - 1;
  MV.y = -((touch.clientY - rect.top)  / rect.height) * 2 + 1;
  rc.setFromCamera(MV, cam);

  const hits = pickList(books.filter(b => b.location === 'shelf'));
  const tt   = document.getElementById('tt');

  if (hits.length) {
    const b = books.find(x => x.mesh === hits[0].object);
    if (b) {
      // Si es el mismo libro, toggle (segundo tap cierra)
      if (_lastTapBook === b) {
        tt.classList.remove('show');
        _lastTapBook = null;
        return;
      }
      _lastTapBook = b;
      document.getElementById('tt-t').textContent = b.title;
      document.getElementById('tt-a').textContent = '✍️ ' + b.author;
      document.getElementById('tt-m').textContent =
        (b.readingDate ? '📅 ' + b.readingDate : '') +
        (b.pages ? '  · ' + b.pages + ' pág.' : '');
      document.getElementById('tt-s').textContent = '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating);

      // Posicionar el tooltip centrado sobre el toque, ajustado a pantalla
      const x = Math.min(touch.clientX + 14, window.innerWidth  - 165);
      const y = Math.max(touch.clientY - 80, 70);
      tt.style.left = x + 'px';
      tt.style.top  = y + 'px';
      tt.classList.add('show');

      // Auto-cerrar tras 3 segundos
      clearTimeout(tt._hideTimer);
      tt._hideTimer = setTimeout(() => {
        tt.classList.remove('show');
        _lastTapBook = null;
      }, 3000);
      return;
    }
  }

  // Tap en zona vacía → cerrar tooltip
  tt.classList.remove('show');
  _lastTapBook = null;
}

// ── Registro y baja de listeners ──────────────────

function registerTouchListeners() {
  const el = ren.domElement;
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchmove',  onTouchMove,  { passive: false });
  el.addEventListener('touchend',   onTouchEnd,   { passive: false });
  el.addEventListener('touchcancel',onTouchEnd,   { passive: false });
}

function unregisterTouchListeners() {
  const el = ren.domElement;
  if (!el) return;
  el.removeEventListener('touchstart', onTouchStart);
  el.removeEventListener('touchmove',  onTouchMove);
  el.removeEventListener('touchend',   onTouchEnd);
  el.removeEventListener('touchcancel',onTouchEnd);
}
