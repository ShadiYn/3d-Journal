/* ══════════════════════════════════════════════════
   SEARCH.JS — Buscador en tiempo real.
   Filtra por título/autor y resalta en la escena 3D.
══════════════════════════════════════════════════ */

var searchOpen   = false;
var searchQuery  = '';
var _hlMeshes    = [];   // meshes temporales de highlight en escena

// ── Panel ──────────────────────────────────────────

function toggleSearch() {
  searchOpen = !searchOpen;
  var panel = document.getElementById('search-panel');
  panel.classList.toggle('open', searchOpen);
  if (searchOpen) {
    setTimeout(function() { document.getElementById('search-inp').focus(); }, 80);
    sndModalOpen();
  } else {
    clearSearchHL();
    sndModalClose();
  }
}

function closeSearch() {
  searchOpen = false;
  document.getElementById('search-panel').classList.remove('open');
  clearSearchHL();
}

// ── Búsqueda en tiempo real ────────────────────────

function onSearchInput(el) {
  searchQuery = el.value.trim().toLowerCase();
  renderSearchResults();
  updateSceneHL();
}

function renderSearchResults() {
  var list = document.getElementById('search-results');
  if (!searchQuery) { list.innerHTML = ''; return; }

  var matches = books.filter(function(b) {
    return b.title.toLowerCase().includes(searchQuery)
        || b.author.toLowerCase().includes(searchQuery);
  });

  if (!matches.length) {
    list.innerHTML = '<div class="sr-empty">Sin resultados</div>';
    return;
  }

  list.innerHTML = matches.map(function(b) {
    var st   = BOOK_STATUS[b.status || 'pendiente'];
    var loc  = b.location === 'shelf' ? '📚 Estantería' : '🫙 Bote';
    var hi   = function(str) {
      var re = new RegExp('(' + searchQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
      return str.replace(re, '<mark>$1</mark>');
    };
    return '<div class="sr-card" onclick="focusBook(\'' + b.id + '\')">'
      + '<div class="sr-dot" style="background:' + b.color + '"></div>'
      + '<div class="sr-info">'
      +   '<div class="sr-title">' + hi(b.title) + '</div>'
      +   '<div class="sr-meta">' + hi(b.author) + ' · ' + loc + ' · ' + st.icon + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

/** Resalta en 3D los libros coincidentes, atenúa el resto */
function updateSceneHL() {
  clearSearchHL();
  if (!searchQuery) {
    // Restaurar opacidad de todos
    books.forEach(function(b) {
      if (b.mesh) b.mesh.traverse(function(c) {
        if (c.isMesh && c.material) {
          if (Array.isArray(c.material)) c.material.forEach(function(m) { m.opacity = 1; m.transparent = false; });
          else { c.material.opacity = 1; c.material.transparent = false; }
        }
      });
    });
    return;
  }

  var matches = books.filter(function(b) {
    return b.title.toLowerCase().includes(searchQuery)
        || b.author.toLowerCase().includes(searchQuery);
  });
  var matchIds = matches.map(function(b) { return b.id; });

  books.forEach(function(b) {
    if (!b.mesh) return;
    var isMatch = matchIds.includes(b.id);
    b.mesh.traverse(function(c) {
      if (!c.isMesh) return;
      var mats = Array.isArray(c.material) ? c.material : [c.material];
      mats.forEach(function(m) {
        m.transparent = true;
        m.opacity     = isMatch ? 1.0 : 0.18;
      });
    });

    // Añadir anillo dorado sobre los coincidentes en estantería
    if (isMatch && b.location === 'shelf' && b.mesh) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.018, 6, 20),
        new THREE.MeshBasicMaterial({ color: 0xc8a748, transparent: true, opacity: 0.8 })
      );
      ring.position.copy(b.mesh.position);
      ring.position.y += (b._bh || 1.16) / 2 + 0.12;
      ring.rotation.x = Math.PI / 2;
      sc.add(ring);
      _hlMeshes.push(ring);
    }
  });
}

function clearSearchHL() {
  _hlMeshes.forEach(function(m) { sc.remove(m); });
  _hlMeshes = [];
  // Restaurar opacidad
  books.forEach(function(b) {
    if (b.mesh) b.mesh.traverse(function(c) {
      if (c.isMesh && c.material) {
        var mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(function(m) { m.opacity = 1; m.transparent = false; });
      }
    });
  });
}

/** Centra la cámara sobre el libro seleccionado */
function focusBook(id) {
  var book = books.find(function(b) { return b.id === id; });
  if (!book || !book.mesh) return;
  var p = book.mesh.position;
  gsap.to(cam.position, { x: p.x, y: p.y + 1.5, z: p.z + 5, duration: 1.0, ease: 'power2.inOut',
    onUpdate: function() { cam.lookAt(p.x, p.y, p.z); }
  });
  // Volver a posición normal tras 2s
  setTimeout(function() {
    gsap.to(cam.position, { x: CAM_FINAL.x, y: CAM_FINAL.y, z: CAM_FINAL.z,
      duration: 1.2, ease: 'power2.inOut',
      onUpdate: function() { cam.lookAt(CAM_LOOK.x, CAM_LOOK.y, CAM_LOOK.z); }
    });
  }, 2000);
  closeSearch();
  sndModalClose();
}
