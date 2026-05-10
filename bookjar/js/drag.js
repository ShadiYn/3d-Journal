'use strict';

/* ══════════════════════════════════════════════════
   DRAG.JS — Arrastre en plano vertical (Z=0.5)
             El ratón mueve el libro en X e Y libremente.
             Snap magnético: al acercarse a un slot el libro
             se pega visualmente como preview antes de soltar.
══════════════════════════════════════════════════ */

// ── Umbrales ───────────────────────────────────────
const SNAP_HL    = 0.70;   // distancia XY para preview magnético + highlight
const SNAP_PLACE = 1.00;   // distancia XY máxima para colocar al soltar (fallback)

// ── Estado del snap magnético ──────────────────────
let magnetSlot = null;     // slot al que está pegado el libro durante el preview

// ── Raycasting ─────────────────────────────────────

function setMV(e) {
  const r = ren.domElement.getBoundingClientRect();
  MV.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  MV.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
}

/** Intersecta el rayo con DPLANE (plano vertical Z=0.5) → punto XY libre */
function rayPlane() {
  const pt = new THREE.Vector3();
  return rc.ray.intersectPlane(DPLANE, pt) ? pt : null;
}

function pickList(blist) {
  const ms = blist.filter(b => b.mesh).map(b => b.mesh);
  return rc.intersectObjects(ms, false);
}

// ── Distancia XY entre posición de drag y slot ─────
// Compara X directamente y Y con el centro del libro una vez colocado.

function distXY(pos, slot, bh) {
  return Math.hypot(pos.x - slot.x, pos.y - (slot.y + bh / 2));
}

/** Slot libre más cercano en XY a pos */
function nearFreeXY(pos, bh) {
  let best = null, bd = Infinity;
  slots.forEach(s => {
    if (s.occupied) return;
    const d = distXY(pos, s, bh);
    if (d < bd) { bd = d; best = s; }
  });
  return best;
}

// ── Eventos ────────────────────────────────────────

function onDn(e) {
  if (e.button !== 0) return;
  setMV(e); rc.setFromCamera(MV, cam);

  // 1. Libros en el bote
  let hits = pickList(books.filter(b => b.location === 'jar'));

  if (!hits.length) {
    // 2. Libros en estantería (re-drag)
    hits = pickList(books.filter(b => b.location === 'shelf'));
    if (hits.length) {
      const book = books.find(b => b.mesh === hits[0].object);
      if (!book) return;
      const sl = slots.find(s => s.id === book.slotId);
      if (sl) { sl.occupied = false; sl.bookId = null; }
      book.location = 'jar'; book.slotId = null;
      startDrag(book);
    }
    return;
  }

  const book = books.find(b => b.mesh === hits[0].object);
  if (book) startDrag(book);
}

function startDrag(book) {
  isDrag = true; dragB = book; magnetSlot = null;
  gsap.killTweensOf(book.mesh.position);
  gsap.killTweensOf(book.mesh.rotation);

  // Mover libro al plano frontal de la estantería, sin inclinación
  gsap.to(book.mesh.position, { z: DRAG_Z, duration: .20, ease: 'power2.out' });
  gsap.to(book.mesh.rotation, { x: 0, y: 0, z: 0, duration: .18, ease: 'power2.out' });

  book.mesh.castShadow = true;
  markShadowDirty();
  ren.domElement.style.cursor = 'grabbing';
  document.getElementById('hint').style.opacity = '0';
}

function onMv(e) {
  setMV(e); rc.setFromCamera(MV, cam);

  if (isDrag && dragB?.mesh) {
    const pt   = rayPlane();
    const bh   = dragB._bh || 1.16;
    const ns   = pt ? nearFreeXY(pt, bh) : null;
    const near = ns && pt && distXY(pt, ns, bh) < SNAP_HL;

    if (near) {
      // ── Snap magnético: libro se pega al slot como preview ──
      if (magnetSlot !== ns) {
        magnetSlot = ns;
        gsap.to(dragB.mesh.position, {
          x: ns.x, y: ns.y + bh / 2, z: ns.z,
          duration: .18, ease: 'back.out(2)',
        });
        gsap.to(dragB.mesh.rotation, { x: 0, y: 0, z: 0, duration: .15 });
        showHL(ns);
      }
    } else {
      // ── Seguimiento libre del cursor ──
      if (magnetSlot) { magnetSlot = null; clearHL(); }
      if (pt) {
        // X e Y siguen al ratón; Z ya está fija en DRAG_Z desde startDrag
        dragB.mesh.position.x = pt.x;
        dragB.mesh.position.y = pt.y;
        // Mantener Z (no dejar que se hunda al pasar sobre geometría)
        if (Math.abs(dragB.mesh.position.z - DRAG_Z) > 0.08) {
          dragB.mesh.position.z = DRAG_Z;
        }
      }
    }
    return;
  }

  // ── Tooltip en reposo ──
  const hits = pickList(books.filter(b => b.location === 'shelf' && b !== dragB));
  const tt   = document.getElementById('tt');

  if (hits.length) {
    const b = books.find(x => x.mesh === hits[0].object);
    if (b) {
      document.getElementById('tt-t').textContent = b.title;
      document.getElementById('tt-a').textContent = '✍️ ' + b.author;
      document.getElementById('tt-m').textContent = b.readingDate ? '📅 ' + b.readingDate : '';
      document.getElementById('tt-s').textContent = '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating);
      tt.style.left = (e.clientX + 14) + 'px';
      tt.style.top  = (e.clientY - 8)  + 'px';
      tt.classList.add('show');
      ren.domElement.style.cursor = 'pointer';
      return;
    }
  }

  tt.classList.remove('show');
  ren.domElement.style.cursor =
    pickList(books.filter(b => b.location === 'jar')).length ? 'grab' : 'default';
}

function onUp() {
  if (!isDrag || !dragB) { isDrag = false; dragB = null; return; }

  clearHL();
  ren.domElement.style.cursor = 'default';

  // Prioridad: slot en preview magnético → slot cercano → volver al bote
  const bh = dragB._bh || 1.16;
  const target = magnetSlot
    || (() => {
         const pt = dragB.mesh.position;
         const ns = nearFreeXY(pt, bh);
         return ns && distXY(pt, ns, bh) < SNAP_PLACE ? ns : null;
       })();

  if (target) snapToShelf(dragB, target);
  else returnToJar(dragB);

  isDrag = false; dragB = null; magnetSlot = null;
  document.getElementById('hint').style.opacity = '1';
}

// ── Colocación definitiva ──────────────────────────

function snapToShelf(book, slot) {
  slot.occupied = true; slot.bookId = book.id;
  book.location = 'shelf'; book.slotId = slot.id;
  book.mesh.castShadow = true;
  markShadowDirty();

  const bh = book._bh || 1.16;
  // Animar desde la posición de preview al slot exacto (Z: 0.5 → 0.38)
  gsap.to(book.mesh.position, {
    x: slot.x, y: slot.y + bh / 2, z: slot.z,
    duration: .30, ease: 'back.out(1.6)',
  });
  gsap.to(book.mesh.rotation, { x: 0, y: 0, z: 0, duration: .22, ease: 'power2.out' });

  persist(); updStats();
  toast('"' + book.title + '" en la estantería 📚');
  const h = document.getElementById('hint');
  h.textContent   = '✦ Pasa el ratón por un libro para ver sus detalles';
  h.style.opacity = '1';
}

function returnToJar(book) {
  book.location = 'jar';
  const { pos, rot } = jarPlacement(book);
  book.jarPos = pos; book.jarRot = rot;
  book.mesh.castShadow = false;
  markShadowDirty();

  gsap.to(book.mesh.position, { ...pos, duration: .50, ease: 'power3.out' });
  gsap.to(book.mesh.rotation, { ...rot, duration: .40 });
  persist(); updStats();
}

// ── Highlight ──────────────────────────────────────

function showHL(slot) {
  if (highSl === slot) return;
  clearHL();

  // Indicador completo: línea vertical que marca el hueco entre libros
  const hl = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 1.2, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xc8a748, transparent: true, opacity: .7 })
  );
  hl.position.set(slot.x, slot.y + 0.6, slot.z + 0.36);
  sc.add(hl); slHls.push(hl);

  // Plataforma en el suelo del slot
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.025, 0.70),
    new THREE.MeshBasicMaterial({ color: 0xc8a748, transparent: true, opacity: .4 })
  );
  base.position.set(slot.x, slot.y + 0.012, slot.z);
  sc.add(base); slHls.push(base);

  highSl = slot;
}

function clearHL() {
  slHls.forEach(h => sc.remove(h)); slHls = []; highSl = null;
}