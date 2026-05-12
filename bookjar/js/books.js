/* ══════════════════════════════════════════════════
   BOOKS.JS — Texturas, mesh y posicionamiento en bote
══════════════════════════════════════════════════ */

// ── Utilidad de color ──────────────────────────────

function darker(hex, a) {
  const c = new THREE.Color(hex);
  return new THREE.Color(
    Math.max(0, c.r + a / 255),
    Math.max(0, c.g + a / 255),
    Math.max(0, c.b + a / 255)
  );
}

// ── Texturas ───────────────────────────────────────

function mkSpineTex(book) {
  const cw = 64, ch = 256;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = book.color; ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#' + darker(book.color, -55).getHexString();
  ctx.fillRect(0, 0, cw, 18); ctx.fillRect(0, ch - 18, cw, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.11)';
  ctx.fillRect(cw - 7, 18, 7, ch - 36);
  // Franja de estado en la parte inferior del lomo
  if (book.status && book.status !== 'pendiente') {
    const tint = book.status === 'leido' ? '#44cc66' : '#00aaff';
    ctx.fillStyle = tint;
    ctx.fillRect(0, ch - 18, cw, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(book.status === 'leido' ? '✓' : '▶', cw/2, ch - 6);
  }
  ctx.save();
  ctx.translate(cw / 2, ch - 24); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 15px Georgia,serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const t = book.title.length > 13 ? book.title.slice(0, 12) + '…' : book.title;
  ctx.fillText(t, 0, 0); ctx.restore();
  return new THREE.CanvasTexture(cv);
}

function mkCoverTex(book) {
  const cw = 200, ch = 320;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = book.color; ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, cw - 20, ch - 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let d = -ch; d < cw + ch; d += 22) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + ch, ch); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const fs = Math.min(26, (cw - 30) / Math.max(4, book.title.length / 2) * 1.5);
  ctx.font = `bold ${fs}px Georgia,serif`; ctx.textAlign = 'center';
  const words = book.title.split(' '), lines = [], maxW = cw - 30;
  let cur = '';
  words.forEach(w => {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW) { lines.push(cur); cur = w; } else cur = test;
  });
  if (cur) lines.push(cur);
  const lh = fs * 1.32, ty = ch / 2 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => ctx.fillText(l, cw / 2, ty + i * lh));
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = 'italic 15px Georgia,serif';
  ctx.fillText(book.author, cw / 2, ch - 28);
  return new THREE.CanvasTexture(cv);
}

function mkPageTex() {
  if (ptex) return ptex;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0e2c4'; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(155,125,80,0.2)'; ctx.lineWidth = 1;
  for (let y = 6; y < 64; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke(); }
  ptex = new THREE.CanvasTexture(cv); return ptex;
}

// ── Mesh ───────────────────────────────────────────

function buildMesh(book) {
  const bw = 0.28 * book.wm;
  const bh = 1.16 * book.hm;
  const bd = 0.7;
  const pg    = mkPageTex();
  const spine = mkSpineTex(book);
  // Usar portada real si existe, si no la procedural
  const cover = (book.coverImg && book.coverImg.complete && book.coverImg.naturalWidth)
    ? mkCoverTexFromImg(book, book.coverImg)
    : mkCoverTex(book);
  const base  = new THREE.Color(book.color);
  const dark  = base.clone().multiplyScalar(0.68);
  const mats = [
    new THREE.MeshLambertMaterial({ map: cover }),
    new THREE.MeshLambertMaterial({ color: dark }),
    new THREE.MeshLambertMaterial({ map: pg }),
    new THREE.MeshLambertMaterial({ map: pg }),
    new THREE.MeshLambertMaterial({ map: spine }),
    new THREE.MeshLambertMaterial({ color: dark }),
  ];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mats);
  mesh.castShadow = false; mesh.receiveShadow = false; // se activa al colocar en estantería
  mesh.userData.bookId = book.id;
  book.mesh = mesh; book._bh = bh; book._bw = bw;
  return mesh;
}

// ── Índice en el bote ──────────────────────────────

function jarIdx(book) {
  return books.filter(b => b.location === 'jar').indexOf(book);
}

/* ══════════════════════════════════════════════════
   POSICIONAMIENTO — dispatcher por tipo de bote
══════════════════════════════════════════════════ */

/**
 * Devuelve { pos, rot } — posición y rotación del libro
 * dentro del bote activo, según jarType.
 */
function jarPlacement(book) {
  switch (jarType) {
    case 'caja':    return jarPlacementCaja(book);
    default:        return jarPlacementCylinder(book);
  }
}

// ── Cilíndricos (cristal / tarro / botella) ────────
// Espiral apilada, libros con orientación caótica.

function jarPlacementCylinder(book) {
  const idx = jarIdx(book);
  const ang = idx * 2.4;
  const r   = 0.08 + (idx % 4) * 0.08;
  const pos = {
    x: JP.x + Math.cos(ang) * r,
    y: JP.y - 0.78 + idx * 0.22,
    z: JP.z + Math.sin(ang) * r,
  };
  const rot = {
    x: (Math.random() - .5) * .14,
    y: Math.random() * Math.PI * 2,
    z: (Math.random() - .5) * .22,
  };
  return { pos, rot };
}

// ── Caja de madera ─────────────────────────────────
// Libros de pie en fila, orientados hacia la cámara,
// con ligera variación de posición y giro.

function jarPlacementCaja(book) {
  const idx = jarIdx(book);
  const bh  = book._bh || 1.16;  // altura real del libro (disponible tras buildMesh)

  // Interior de la caja: ancho ≈ 1.30, profundidad ≈ 0.76
  // Suelo interior en local y = -0.78
  const BOOKS_PER_ROW = 4;
  const INNER_W       = 1.26;
  const col           = idx % BOOKS_PER_ROW;
  const row           = Math.floor(idx / BOOKS_PER_ROW);

  // Distribuir uniformemente por ancho
  const step   = INNER_W / BOOKS_PER_ROW;
  const startX = -INNER_W / 2 + step / 2;
  // Pequeño jitter en X para que no parezcan soldados en fila
  const jitterX = (Math.random() - .5) * 0.05;
  const localX  = startX + col * step + jitterX;

  // Y: pie del libro sobre el suelo interior. Las filas siguientes
  // suben para no solaparse (libros leaning sobre los anteriores).
  const localY = -0.78 + bh / 2 + row * 0.18;

  // Z: centrado en la caja, ligero jitter de profundidad
  const localZ = (Math.random() - .5) * 0.12;

  const pos = {
    x: JP.x + localX,
    y: JP.y + localY,
    z: JP.z + localZ,
  };

  // Libros de pie — lomo mirando hacia la cámara (+Z)
  // Ligero lean (z) y giro sobre Y para variedad
  const rot = {
    x:  (Math.random() - .5) * 0.06,
    y:  (Math.random() - .5) * 0.25,
    z:  (Math.random() - .5) * 0.10,
  };

  return { pos, rot };
}

// ── addToJar ───────────────────────────────────────

function addToJar(book, animate) {
  buildMesh(book);

  const { pos, rot } = jarPlacement(book);
  book.jarPos = pos;
  book.jarRot = rot;

  const m = book.mesh;
  Object.assign(m.rotation, rot);

  if (animate) {
    m.position.set(pos.x, JP.y + 4.5, pos.z);
    sc.add(m);
    gsap.to(m.position, { ...pos, duration: .9, ease: 'bounce.out' });
    gsap.from(m.rotation, { y: m.rotation.y + Math.PI * 2, duration: .9, ease: 'bounce.out' });
  } else {
    m.position.set(pos.x, pos.y, pos.z);
    sc.add(m);
  }
}

/**
 * Recalcula y anima las posiciones de todos los libros en el bote.
 * Llamado desde jar-picker.js al cambiar el tipo de contenedor.
 */
function repositionJarBooks() {
  books
    .filter(b => b.location === 'jar' && b.mesh)
    .forEach(book => {
      const { pos, rot } = jarPlacement(book);
      book.jarPos = pos;
      book.jarRot = rot;
      gsap.to(book.mesh.position, { ...pos, duration: .55, ease: 'power3.out' });
      gsap.to(book.mesh.rotation, { ...rot, duration: .45, ease: 'power2.out' });
    });
}