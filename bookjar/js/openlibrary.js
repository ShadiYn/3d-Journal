/* ══════════════════════════════════════════════════
   OPENLIBRARY.JS — Búsqueda de libros en Open Library,
   descarga de portadas y extracción de color dominante.
   API pública, sin clave necesaria.
══════════════════════════════════════════════════ */

var _olTimer   = null;    // debounce timer
var _olResults = [];      // últimos resultados
var _coverImg  = null;    // HTMLImageElement de la portada seleccionada
var _coverUrl  = '';      // URL de portada seleccionada

// ── Búsqueda con debounce ──────────────────────────

function olSearchInput(el) {
  clearTimeout(_olTimer);
  var q = el.value.trim();
  document.getElementById('ol-results').innerHTML = '';
  if (q.length < 3) { hideOlResults(); return; }
  document.getElementById('ol-results').innerHTML = '<div class="ol-loading">Buscando…</div>';
  showOlResults();
  _olTimer = setTimeout(function() { olSearch(q); }, 420);
}

function olSearch(q) {
  var url = 'https://openlibrary.org/search.json?q='
    + encodeURIComponent(q)
    + '&fields=title,author_name,isbn,cover_i,number_of_pages_median,first_publish_year&limit=7';

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) { renderOlResults(data.docs || []); })
    .catch(function() {
      document.getElementById('ol-results').innerHTML =
        '<div class="ol-loading">Sin conexión — rellena manualmente</div>';
    });
}

function renderOlResults(docs) {
  _olResults = docs;
  var list = document.getElementById('ol-results');
  if (!docs.length) { list.innerHTML = '<div class="ol-loading">Sin resultados</div>'; return; }

  list.innerHTML = docs.map(function(d, i) {
    var cover = d.cover_i
      ? 'https://covers.openlibrary.org/b/id/' + d.cover_i + '-S.jpg'
      : '';
    var author = d.author_name ? d.author_name[0] : 'Autor desconocido';
    var year   = d.first_publish_year ? ' · ' + d.first_publish_year : '';
    return '<div class="ol-item" onclick="olSelect(' + i + ')">'
      + (cover
          ? '<img class="ol-thumb" src="' + cover + '" onerror="this.style.display=\'none\'">'
          : '<div class="ol-thumb ol-nothumb">📖</div>')
      + '<div class="ol-info">'
      +   '<div class="ol-title">' + escHtml(d.title) + '</div>'
      +   '<div class="ol-meta">' + escHtml(author) + year + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Selección de un resultado ──────────────────────

function olSelect(idx) {
  var d = _olResults[idx];
  if (!d) return;

  // Rellenar campos del formulario
  document.getElementById('mt').value  = d.title || '';
  document.getElementById('ma').value  = d.author_name ? d.author_name[0] : '';
  if (d.number_of_pages_median) {
    document.getElementById('mpg').value = d.number_of_pages_median;
    onPg(document.getElementById('mpg'));
  }

  hideOlResults();

  // Portada
  if (d.cover_i) {
    var bigUrl = 'https://covers.openlibrary.org/b/id/' + d.cover_i + '-M.jpg';
    _coverUrl  = bigUrl;
    loadCoverAndExtractColor(bigUrl, d);
    showCoverPreview(bigUrl);
  } else {
    _coverUrl  = '';
    _coverImg  = null;
    hideCoverPreview();
  }

  sndModalOpen && sndModalOpen();
}

// ── Portada y extracción de color ──────────────────

function loadCoverAndExtractColor(url, bookData) {
  // Cargar imagen para el canvas de Three.js (portada 3D)
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() { _coverImg = img; };
  img.onerror = function() { _coverImg = null; };
  img.src = url;

  // Extraer color dominante desde el backend (evita restricciones CORS del canvas)
  if (bookData && bookData.cover_i) {
    fetch(API_URL + '/api/cover-color?coverId=' + bookData.cover_i)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.color) return;
        pc = data.color;
        document.getElementById('cc').value = data.color;
        document.querySelectorAll('.sw').forEach(function(s) { s.classList.remove('sel'); });
        // Mostrar el color extraído visualmente
        document.getElementById('cc').style.boxShadow = '0 0 0 3px ' + data.color;
        setTimeout(function() {
          var el = document.getElementById('cc');
          if (el) el.style.boxShadow = '';
        }, 1500);
      })
      .catch(function() {
        // Backend no disponible — mantener color por defecto
      });
  }
}

/** Convierte RGB a HSL, satura y vuelve a hex */
function saturateColor(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r,g,b), min = Math.min(r,g,b);
  var h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default:h = ((r - g) / d + 4) / 6;
    }
  }
  // Aumentar saturación y ajustar luminosidad para que sea vistoso
  s = Math.min(1, s * 1.6 + 0.2);
  l = Math.max(0.25, Math.min(0.55, l));
  return hslToHex(h, s, l);
}

function hslToHex(h, s, l) {
  var r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return '#' + [r,g,b].map(function(x) {
    return Math.round(x * 255).toString(16).padStart(2,'0');
  }).join('');
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1/6) return p + (q-p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q-p) * (2/3-t) * 6;
  return p;
}

// ── Preview de portada en el modal ─────────────────

function showCoverPreview(url) {
  var prev = document.getElementById('cover-preview');
  prev.style.backgroundImage = 'url(' + url + ')';
  prev.style.display = 'block';
  document.getElementById('cover-preview-wrap').style.display = 'flex';
}

function hideCoverPreview() {
  document.getElementById('cover-preview-wrap').style.display = 'none';
  _coverUrl = ''; _coverImg = null;
}

function removeCover() {
  hideCoverPreview();
  toast('Portada eliminada — se usará color sólido');
}

// ── Dropdown helpers ───────────────────────────────

function showOlResults() { document.getElementById('ol-dropdown').style.display = 'block'; }
function hideOlResults()  { document.getElementById('ol-dropdown').style.display = 'none'; }

// ── Generación de textura con portada real ─────────

/**
 * Construye una CanvasTexture de portada usando la imagen descargada.
 * Si no hay imagen cae back al generador procedural.
 */
function mkCoverTexFromImg(book, img) {
  var cw = 200, ch = 320;
  var cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  var ctx = cv.getContext('2d');

  // Dibujar portada real escalada
  ctx.drawImage(img, 0, 0, cw, ch);

  // Overlay sutil para que el título sea legible si la portada es muy clara
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, ch - 52, cw, 52);

  return new THREE.CanvasTexture(cv);
}