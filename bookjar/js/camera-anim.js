/* ══════════════════════════════════════════════════
   CAMERA-ANIM.JS — Animación de entrada cinematográfica
   y caída de libros al cargar la estantería.
══════════════════════════════════════════════════ */

// ── Posición final de la cámara ────────────────────
var CAM_FINAL = { x: 0.4, y: 3.8, z: 11.8 };
var CAM_LOOK  = { x: 0.4, y: 1.5, z: 0.0  };

// ── Intro de cámara ────────────────────────────────

/**
 * Animación cinematográfica al hacer login.
 * La cámara empieza elevada y a la derecha, orbita suavemente
 * hasta su posición de reposo mientras la escena aparece.
 */
function playIntro(onComplete) {
  if (!cam || !ren) { if (onComplete) onComplete(); return; }

  // Posición inicial: elevada, girada, lejos
  cam.position.set(6, 8, 16);
  cam.lookAt(0.4, 1.5, 0);

  // Niebla densa al principio — se despeja
  var startFog = 0.09;
  var endFog   = 0.028;
  if (sc.fog) sc.fog.density = startFog;

  // Fase 1 — fundido desde negro (overlay HTML)
  var overlay = document.getElementById('intro-overlay');
  if (overlay) {
    overlay.style.opacity = '1';
    overlay.style.display = 'block';
    gsap.to(overlay, { opacity: 0, duration: 1.4, delay: 0.3, ease: 'power2.out',
      onComplete: function() { overlay.style.display = 'none'; }
    });
  }

  // Fase 2 — cámara orbita a posición final
  gsap.to(cam.position, {
    x: CAM_FINAL.x, y: CAM_FINAL.y, z: CAM_FINAL.z,
    duration: 2.8, delay: 0.2, ease: 'power3.out',
    onUpdate: function() { cam.lookAt(CAM_LOOK.x, CAM_LOOK.y, CAM_LOOK.z); },
    onComplete: function() {
      if (onComplete) onComplete();
    }
  });

  // Fase 3 — niebla se despeja
  if (sc.fog) {
    gsap.to(sc.fog, { density: endFog, duration: 2.4, delay: 0.4, ease: 'power2.out' });
  }
}

// ── Animación de caída de libros ───────────────────

/**
 * Los libros de la estantería "caen" uno a uno desde arriba
 * al cargar la escena, con retardo escalonado.
 * Llamar tras loadBooks().
 */
function animShelfBooks() {
  var shelfBooks = books.filter(function(b) { return b.location === 'shelf' && b.mesh; });
  if (!shelfBooks.length) return;

  // Ordenar por posición X para que caigan de izquierda a derecha
  shelfBooks.sort(function(a, b) { return a.mesh.position.x - b.mesh.position.x; });

  shelfBooks.forEach(function(book, i) {
    var finalY = book.mesh.position.y;
    var finalX = book.mesh.position.x;

    // Empezar encima de la estantería
    book.mesh.position.y = finalY + 5 + Math.random() * 2;
    book.mesh.rotation.z = (Math.random() - 0.5) * 0.4;

    gsap.to(book.mesh.position, {
      y: finalY,
      duration: 0.55 + Math.random() * 0.15,
      delay: 0.05 * i + 0.4,
      ease: 'bounce.out',
      onComplete: function() { markShadowDirty(); }
    });
    gsap.to(book.mesh.rotation, {
      z: 0,
      duration: 0.4,
      delay: 0.05 * i + 0.4,
      ease: 'power2.out'
    });
  });
}

// ── Animación de libros del bote ───────────────────

/** Los libros del bote entran flotando uno a uno */
function animJarBooks() {
  var jarBooks = books.filter(function(b) { return b.location === 'jar' && b.mesh; });
  if (!jarBooks.length) return;

  jarBooks.forEach(function(book, i) {
    var final = book.jarPos;
    if (!final) return;
    book.mesh.position.y = final.y + 4;
    gsap.to(book.mesh.position, {
      y: final.y,
      duration: 0.7,
      delay: 0.08 * i + 0.6,
      ease: 'elastic.out(1, 0.6)'
    });
  });
}
