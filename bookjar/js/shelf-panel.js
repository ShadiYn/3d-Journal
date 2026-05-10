'use strict';

/* ══════════════════════════════════════════════════
   SHELF-PANEL.JS — Panel lateral de estanterías:
   selección, desbloqueo por progresión y cambio
   de estilo de escena en tiempo real.
══════════════════════════════════════════════════ */

// ── Persistencia del progreso ──────────────────────

function getUnlocked() {
  return JSON.parse(localStorage.getItem('bj_unlocked_' + CU) || '[0]');
}
function saveUnlocked(arr) {
  localStorage.setItem('bj_unlocked_' + CU, JSON.stringify(arr));
}
function isLocked(id) {
  return !getUnlocked().includes(id);
}

// ── Comprobar desbloqueo tras colocar un libro ─────

function checkUnlock() {
  const unlocked = getUnlocked();
  const next     = currentCase + 1;
  if (next >= CASE_STYLES.length || unlocked.includes(next)) return;

  const shelved = books.filter(b => b.location === 'shelf').length;
  if (shelved >= UNLOCK_THRESHOLD) {
    unlocked.push(next);
    saveUnlocked(unlocked);
    renderShelfPanel();
    showUnlockBanner(CASE_STYLES[next]);
  }
}

/** Notificación especial de desbloqueo (más llamativa que un toast) */
function showUnlockBanner(style) {
  const el = document.getElementById('unlock-banner');
  document.getElementById('ub-icon').textContent = style.icon;
  document.getElementById('ub-name').textContent  = style.name;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4200);
}


/**
 * Comprueba retroactivamente todos los desbloqueos pendientes.
 * Se llama al cargar libros para detectar desbloqueos que ocurrieron
 * antes de que esta función existiera o mientras se estaba offline.
 */
function recheckUnlocks() {
  const unlocked = getUnlocked();
  let changed = false;

  for (let i = 1; i < CASE_STYLES.length; i++) {
    if (unlocked.includes(i)) continue;
    // Comprobar si la estantería anterior (i-1) ya tiene suficientes libros
    const prevBooks   = gbk(CU, i - 1);
    const prevShelved = prevBooks.filter(b => b.location === 'shelf').length;
    if (prevShelved >= UNLOCK_THRESHOLD) {
      unlocked.push(i);
      changed = true;
    } else {
      break; // Desbloqueo secuencial: si la cadena se rompe, paramos
    }
  }

  if (changed) {
    saveUnlocked(unlocked);
    // Actualizar panel si está abierto
    if (document.getElementById('shelf-panel').classList.contains('open')) {
      renderShelfPanel();
    }
  }
}
// ── Panel toggle ───────────────────────────────────

function toggleShelfPanel() {
  const panel = document.getElementById('shelf-panel');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
  } else {
    renderShelfPanel();
    panel.classList.add('open');
  }
}

function closeShelfPanel() {
  document.getElementById('shelf-panel').classList.remove('open');
}

// ── Renderizado del panel ──────────────────────────

function renderShelfPanel() {
  const unlocked = getUnlocked();
  const list     = document.getElementById('sp-list');

  list.innerHTML = CASE_STYLES.map((st, i) => {
    const locked  = !unlocked.includes(i);
    const active  = i === currentCase;
    const saved   = gbk(CU, i);
    const total   = 3 * SPR;
    const shelved = saved.filter(b => b.location === 'shelf').length;
    const pct     = Math.round((shelved / total) * 100);

    // Mini preview: estantería en miniatura con colores del estilo
    const woodHex = '#' + st.wood.toString(16).padStart(6,'0');
    const darkHex = '#' + st.dark.toString(16).padStart(6,'0');
    const backHex = '#' + st.back.toString(16).padStart(6,'0');
    const trimHex = '#' + st.trim.toString(16).padStart(6,'0');

    // Libros de ejemplo con colores fijos
    const bookColors = ['#c0392b','#1565c0','#27ae60','#d4ac0d','#6a1b9a','#e67e22','#00838f'];
    const booksHtml  = bookColors.map((c,bi) => {
      const h = 60 + (bi % 3) * 8;
      return `<div style="
        position:absolute; bottom:8px; left:${6 + bi * 9}px;
        width:7px; height:${h}%; background:${locked ? '#333' : c};
        border-radius:1px 1px 0 0; opacity:${locked ? 0.3 : 0.9};
      "></div>`;
    }).join('');

    // Baldas (3 líneas horizontales)
    const shelvesHtml = [28,55,82].map(y =>
      `<div style="position:absolute;left:0;right:0;top:${y}%;height:3px;background:${locked?'#333':woodHex};opacity:.9"></div>`
    ).join('');

    // Texto de condición de desbloqueo
    let lockInfo = '';
    if (locked && i > 0) {
      const prevSaved   = gbk(CU, i - 1);
      const prevShelved = prevSaved.filter(b => b.location === 'shelf').length;
      const need        = UNLOCK_THRESHOLD - prevShelved;
      lockInfo = `<div class="sp-lock-info">Coloca ${need} libro${need>1?'s':''} más en "${CASE_STYLES[i-1].name}"</div>`;
    }

    return `
      <div class="sp-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}"
           onclick="switchCase(${i})"
           style="${active ? `--accent:${st.accent};border-color:${st.accent}` : ''}">

        <div class="sp-preview" style="background:${locked ? '#1a1a22' : backHex}">
          ${shelvesHtml}
          ${booksHtml}
          ${locked ? '<div class="sp-lock-overlay">🔒</div>' : ''}
        </div>

        <div class="sp-info">
          <div class="sp-title">
            <span class="sp-icon">${st.icon}</span>
            <span class="sp-name">${st.name}</span>
            ${active ? '<span class="sp-badge">Activa</span>' : ''}
          </div>
          <div class="sp-desc">${st.desc}</div>
          ${!locked ? `
            <div class="sp-progress">
              <div class="sp-bar">
                <div class="sp-fill" style="width:${pct}%;background:${st.accent}"></div>
              </div>
              <span class="sp-count">${shelved}/${total}</span>
            </div>
          ` : lockInfo}
        </div>

      </div>`;
  }).join('');
}

// ── Cambio de estantería ───────────────────────────

function switchCase(id) {
  if (isLocked(id)) {
    // Sacudir la card para dar feedback
    const cards = document.querySelectorAll('.sp-card');
    if (cards[id]) { cards[id].classList.add('shake'); setTimeout(() => cards[id].classList.remove('shake'), 400); }
    return;
  }
  if (id === currentCase) { closeShelfPanel(); return; }

  // 1 — Quitar meshes de los libros actuales de la escena
  books.forEach(b => { if (b.mesh) sc.remove(b.mesh); });
  books = [];
  slots.forEach(s => { s.occupied = false; s.bookId = null; });
  clearHL();

  // 2 — Cambiar case y persistir
  currentCase = id;
  localStorage.setItem('bj_case_' + CU, id);

  // 3 — Actualizar atmósfera de la escena
  const st = CASE_STYLES[id];
  sc.background = new THREE.Color(st.bg);
  sc.fog         = new THREE.FogExp2(st.fog, 0.028);

  // 4 — Reconstruir estantería con el nuevo estilo
  mkShelf();
  markShadowDirty();

  // 5 — Cargar libros del nuevo case
  loadBooks();

  // 6 — Cerrar panel
  closeShelfPanel();
  toast(`${st.icon} ${st.name}`);
}