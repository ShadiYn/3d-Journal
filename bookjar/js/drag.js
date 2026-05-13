/* ══════════════════════════════════════════════════
   DRAG.JS — Sistema de interacción con libros:
   • Click corto en estantería → visor 3D
   • Mantener pulsado 400ms   → arrastre para mover
   • Libros del bote           → arrastre inmediato
══════════════════════════════════════════════════ */

var SNAP_HL    = 0.70;
var SNAP_PLACE = 1.00;
var LONG_PRESS = 400;   // ms para activar arrastre desde estantería

var magnetSlot  = null;
var _shelfBook  = null;   // libro de estantería pendiente
var _lpTimer    = null;   // timer de long press
var _lpStartX   = 0;
var _lpStartY   = 0;
var _lpFired    = false;  // el long press se activó

// ── Raycasting ─────────────────────────────────────

function setMV(e) {
  var r = ren.domElement.getBoundingClientRect();
  MV.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  MV.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
}

function rayPlane() {
  var pt = new THREE.Vector3();
  return rc.ray.intersectPlane(DPLANE, pt) ? pt : null;
}

function pickList(blist) {
  var ms = blist.filter(function(b) { return b.mesh; }).map(function(b) { return b.mesh; });
  return rc.intersectObjects(ms, false);
}

function distXY(pos, slot, bh) {
  return Math.hypot(pos.x - slot.x, pos.y - (slot.y + bh / 2));
}

function nearFreeXY(pos, bh) {
  var best = null, bd = Infinity;
  slots.forEach(function(s) {
    if (s.occupied) return;
    var d = distXY(pos, s, bh);
    if (d < bd) { bd = d; best = s; }
  });
  return best;
}

// ── Indicador de long press ────────────────────────

function showLPIndicator(x, y) {
  var el = document.getElementById('lp-ring');
  if (!el) return;
  el.style.left    = (x - 22) + 'px';
  el.style.top     = (y - 22) + 'px';
  el.style.display = 'block';
  el.style.animation = 'none';
  el.offsetHeight;   // reflow para reiniciar animación
  el.style.animation = 'lpFill ' + LONG_PRESS + 'ms linear forwards';
}
function hideLPIndicator() {
  var el = document.getElementById('lp-ring');
  if (el) el.style.display = 'none';
}

// ── MouseDown ──────────────────────────────────────

function onDn(e) {
  if (e.button !== 0) return;
  setMV(e); rc.setFromCamera(MV, cam);

  // Libros del bote → drag inmediato
  var hits = pickList(books.filter(function(b) { return b.location === 'jar'; }));
  if (hits.length) {
    var book = books.find(function(b) { return b.mesh === hits[0].object; });
    if (book) startDrag(book);
    return;
  }

  // Libros de estantería → esperar long press
  hits = pickList(books.filter(function(b) { return b.location === 'shelf'; }));
  if (hits.length) {
    var shelfBook = books.find(function(b) { return b.mesh === hits[0].object; });
    if (!shelfBook) return;
    _shelfBook = shelfBook;
    _lpStartX  = e.clientX;
    _lpStartY  = e.clientY;
    _lpFired   = false;
    showLPIndicator(e.clientX, e.clientY);

    _lpTimer = setTimeout(function() {
      _lpFired = true;
      hideLPIndicator();
      if (navigator.vibrate) navigator.vibrate(30);
      // Activar arrastre del libro de estantería
      var book = _shelfBook; _shelfBook = null;
      var sl = slots.find(function(s) { return s.id === book.slotId; });
      if (sl) { sl.occupied = false; sl.bookId = null; }
      book.location = 'jar'; book.slotId = null;
      startDrag(book);
    }, LONG_PRESS);
  }
}

// ── MouseMove ──────────────────────────────────────

function onMv(e) {
  setMV(e); rc.setFromCamera(MV, cam);

  // Si hay long press pendiente y el dedo se movió mucho → cancelar
  if (_shelfBook && _lpTimer) {
    var moved = Math.hypot(e.clientX - _lpStartX, e.clientY - _lpStartY);
    if (moved > 10) {
      clearTimeout(_lpTimer); _lpTimer = null;
      hideLPIndicator(); _shelfBook = null;
    }
    return;
  }

  // Reordenamiento horizontal activo
  if (_reorderBook) { updateReorder(e); return; }

  if (isDrag && dragB && dragB.mesh) {
    var pt  = rayPlane();
    var bh  = dragB._bh || 1.16;
    var ns  = pt ? nearFreeXY(pt, bh) : null;
    var near = ns && pt && distXY(pt, ns, bh) < SNAP_HL;

    if (near) {
      if (magnetSlot !== ns) {
        magnetSlot = ns;
        gsap.to(dragB.mesh.position, { x: ns.x, y: ns.y + bh/2, z: ns.z, duration:.18, ease:'back.out(2)' });
        gsap.to(dragB.mesh.rotation, { x:0, y:0, z:0, duration:.15 });
        showHL(ns);
      }
    } else {
      if (magnetSlot) { magnetSlot = null; clearHL(); }
      if (pt) {
        dragB.mesh.position.x = pt.x;
        dragB.mesh.position.y = pt.y;
        if (Math.abs(dragB.mesh.position.z - DRAG_Z) > 0.08) dragB.mesh.position.z = DRAG_Z;
      }
    }
    return;
  }

  // Tooltip en reposo
  var shelfHits = pickList(books.filter(function(b) { return b.location === 'shelf' && b !== dragB; }));
  var tt = document.getElementById('tt');
  if (shelfHits.length) {
    var b = books.find(function(x) { return x.mesh === shelfHits[0].object; });
    if (b) {
      var st = BOOK_STATUS[b.status || 'pendiente'];
      document.getElementById('tt-t').textContent = b.title;
      document.getElementById('tt-a').textContent = '✍️ ' + b.author;
      document.getElementById('tt-m').textContent = (b.readingDate ? '📅 ' + b.readingDate : '') + (b.pages ? '  · ' + b.pages + ' pág.' : '');
      document.getElementById('tt-s').textContent = '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating);
      document.getElementById('tt-status').textContent = st.icon + ' ' + st.label;
      tt.style.left = (e.clientX + 14) + 'px';
      tt.style.top  = (e.clientY - 8)  + 'px';
      tt.classList.add('show');
      ren.domElement.style.cursor = 'pointer';
      return;
    }
  }
  tt.classList.remove('show');
  ren.domElement.style.cursor =
    pickList(books.filter(function(b) { return b.location === 'jar'; })).length ? 'grab' : 'default';
}

// ── MouseUp ────────────────────────────────────────

function onUp(e) {
  // Long press no disparado → fue un click → abrir visor
  if (_shelfBook && _lpTimer) {
    clearTimeout(_lpTimer); _lpTimer = null;
    hideLPIndicator();
    var book = _shelfBook; _shelfBook = null;
    if (typeof openBookViewer === 'function') openBookViewer(book);
    return;
  }
  _shelfBook = null;

  if (_reorderBook) { endReorder(); return; }
  if (!isDrag || !dragB) { isDrag = false; dragB = null; return; }

  clearHL();
  ren.domElement.style.cursor = 'default';

  var bh     = dragB._bh || 1.16;
  var target = magnetSlot || (function() {
    var pt = dragB.mesh.position;
    var ns = nearFreeXY(pt, bh);
    return ns && distXY(pt, ns, bh) < SNAP_PLACE ? ns : null;
  })();

  if (target) snapToShelf(dragB, target);
  else returnToJar(dragB);

  isDrag = false; dragB = null; magnetSlot = null;
  document.getElementById('hint').style.opacity = '1';
}

// ── Drag ───────────────────────────────────────────

function startDrag(book) {
  _jarCacheDirty = true;
  isDrag = true; dragB = book; magnetSlot = null;
  gsap.killTweensOf(book.mesh.position);
  gsap.killTweensOf(book.mesh.rotation);
  gsap.to(book.mesh.position, { z: DRAG_Z, duration: .20, ease: 'power2.out' });
  gsap.to(book.mesh.rotation, { x: 0, y: 0, z: 0, duration: .18, ease: 'power2.out' });
  book.mesh.castShadow = true;
  markShadowDirty();
  sndPickup();
  ren.domElement.style.cursor = 'grabbing';
  document.getElementById('hint').style.opacity = '0';
}

function snapToShelf(book, slot) {
  _jarCacheDirty = true;
  slot.occupied = true; slot.bookId = book.id;
  book.location = 'shelf'; book.slotId = slot.id;
  book.mesh.castShadow = true;
  markShadowDirty();
  var bh = book._bh || 1.16;
  gsap.to(book.mesh.position, { x: slot.x, y: slot.y + bh/2, z: slot.z, duration:.30, ease:'back.out(1.6)' });
  gsap.to(book.mesh.rotation, { x:0, y:0, z:0, duration:.22, ease:'power2.out' });
  persist(); updStats(); checkUnlock(); sndPlace();
  toast('"' + book.title + '" en la estantería 📚');
  var h = document.getElementById('hint');
  h.textContent = '✦ Haz clic en un libro para verlo · Mantén para moverlo';
  h.style.opacity = '1';
}

function returnToJar(book) {
  _jarCacheDirty = true;
  book.location = 'jar';
  var pl = jarPlacement(book);
  book.jarPos = pl.pos; book.jarRot = pl.rot;
  book.mesh.castShadow = false;
  markShadowDirty();
  sndReturn();
  gsap.to(book.mesh.position, Object.assign({}, pl.pos, { duration:.50, ease:'power3.out' }));
  gsap.to(book.mesh.rotation, Object.assign({}, pl.rot, { duration:.40 }));
  persist(); updStats();
}

// ── Highlight ──────────────────────────────────────

function showHL(slot) {
  if (highSl === slot) return;
  clearHL();
  var hl = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 1.2, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xc8a748, transparent: true, opacity: .7 })
  );
  hl.position.set(slot.x, slot.y + 0.6, slot.z + 0.36);
  sc.add(hl); slHls.push(hl);
  var base = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.025, 0.70),
    new THREE.MeshBasicMaterial({ color: 0xc8a748, transparent: true, opacity: .4 })
  );
  base.position.set(slot.x, slot.y + 0.012, slot.z);
  sc.add(base); slHls.push(base);
  highSl = slot;
}

function clearHL() {
  slHls.forEach(function(h) { sc.remove(h); }); slHls = []; highSl = null;
}

/* ══════════════════════════════════════════════════
   REORDENAMIENTO EN BALDA
══════════════════════════════════════════════════ */

var _reorderBook  = null;
var _reorderSlot  = null;
var _reorderStart = null;

function tryStartReorder(book, e) {
  if (book.location !== 'shelf') return false;
  _reorderBook  = book;
  _reorderSlot  = slots.find(function(s) { return s.id === book.slotId; });
  _reorderStart = e.clientX;
  return true;
}

function updateReorder(e) {
  if (!_reorderBook || !_reorderSlot) return;
  var dx   = (e.clientX - _reorderStart) * 0.01;
  var mesh = _reorderBook.mesh;
  if (!mesh) return;
  mesh.position.x = _reorderSlot.x + dx;
  var shelfIdx = _reorderSlot.si, neighbor = null, minDist = 0.5;
  slots.forEach(function(s) {
    if (s.si !== shelfIdx || s.id === _reorderSlot.id) return;
    var d = Math.abs(mesh.position.x - s.x);
    if (d < minDist) { minDist = d; neighbor = s; }
  });
  if (neighbor && neighbor.bookId) {
    swapShelfBooks(_reorderSlot, neighbor);
    _reorderSlot = neighbor; _reorderStart = e.clientX;
  }
}

function endReorder() {
  if (!_reorderBook || !_reorderSlot) return;
  var bh = _reorderBook._bh || 1.16;
  gsap.to(_reorderBook.mesh.position, {
    x: _reorderSlot.x, y: _reorderSlot.y + bh/2, z: _reorderSlot.z,
    duration: .3, ease: 'back.out(1.8)'
  });
  persist();
  _reorderBook = null; _reorderSlot = null; _reorderStart = null;
}

function swapShelfBooks(slotA, slotB) {
  var bookA = books.find(function(b) { return b.id === slotA.bookId; });
  var bookB = books.find(function(b) { return b.id === slotB.bookId; });
  if (!bookA || !bookB) return;
  slotA.bookId = bookB.id; bookB.slotId = slotA.id;
  slotB.bookId = bookA.id; bookA.slotId = slotB.id;
  var bhB = bookB._bh || 1.16;
  gsap.to(bookB.mesh.position, { x: slotA.x, y: slotA.y + bhB/2, z: slotA.z, duration:.22, ease:'power2.out' });
  sndPlace && sndPlace();
  markShadowDirty();
}