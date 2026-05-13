/* ══════════════════════════════════════════════════
   CLOUD.JS — Sincronización con el backend propio.
   Reemplaza Firebase por Node.js + Express + MongoDB.

   CONFIGURACIÓN:
   1. Despliega bookjar-backend (ver README.md)
   2. Cambia API_URL a la URL de tu servidor
══════════════════════════════════════════════════ */

// ▼ Cambia esto por la URL de tu backend desplegado
// En local: 'http://localhost:3001'
// En Railway: 'https://tu-app.up.railway.app'

const API_URL = 'https://bookjar-backend.up.railway.app';


var _token     = null;   // JWT guardado en localStorage
var _cloudSync = false;  // sync activo

// ── Token ──────────────────────────────────────────

function loadToken() {
  _token = localStorage.getItem('bj_token') || null;
  return !!_token;
}
function saveToken(t) {
  _token = t;
  localStorage.setItem('bj_token', t);
}
function clearToken() {
  _token = null;
  localStorage.removeItem('bj_token');
}

// ── Headers helper ─────────────────────────────────

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + _token,
  };
}

// ── Inicialización ─────────────────────────────────

function initCloud() {
  // Solo reconectar si ya hay token guardado (sesión previa)
  if (!loadToken()) return;
  setCloudStatus('connecting');
  fetch(API_URL + '/health')
    .then(function(r) { return r.json(); })
    .then(function() {
      _cloudSync = true;
      setCloudStatus('connected');
      pullCloud();
    })
    .catch(function() { setCloudStatus('offline'); });
}

// ── Login / Register desde auth.js ─────────────────

/**
 * Llamado desde loginOk() — hace login en el backend y obtiene el JWT.
 * Si el usuario no existe en el backend, lo registra automáticamente.
 */
var _lastPasswordForCloud = null;
function cloudLogin(username, password) {
  _lastPasswordForCloud = password;
  setCloudStatus('connecting');

  console.log('[cloud] cloudLogin llamado para:', username, '→', API_URL);
  fetch(API_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, password: password }),
  })
    .then(function(r) {
      console.log('[cloud] Login response status:', r.status);
      return r.json();
    })
    .then(function(data) {
      console.log('[cloud] Login response data:', data);
      if (data.error) {
        console.log('[cloud] Usuario no existe, registrando…');
        return cloudRegister(username, password);
      }
      saveToken(data.token);
      _cloudSync = true;
      setCloudStatus('connected');
      pullCloud();
    })
    .catch(function(err) {
      console.error('[cloud] Error de red:', err);
      setCloudStatus('offline');
    });
}

function cloudRegister(username, password) {
  fetch(API_URL + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.token) {
        saveToken(data.token);
        _cloudSync = true;
        setCloudStatus('connected');
        // Primera vez — subir datos locales
        pushCloud();
      } else {
        setCloudStatus('error');
      }
    })
    .catch(function() { setCloudStatus('offline'); });
}

// ── Push — guardar en el servidor ──────────────────

function pushCloud() {
  if (!_cloudSync || !_token) return;
  setCloudStatus('syncing');

  var data = {
    updatedAt:   Date.now(),
    cases:       {},
    decors:      {},
    unlocked:    getUnlocked(),
    currentCase: currentCase,
    jarType:     jarType,
  };

  for (var c = 0; c < CASE_STYLES.length; c++) {
    data.cases[c]  = gbk(CU, c);
    data.decors[c] = gdec(CU, c);
  }

  fetch(API_URL + '/api/sync', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
    .then(function(r) {
      if (r.status === 409) return r.json().then(handleConflict);
      if (r.status === 401) { clearToken(); setCloudStatus('unconfigured'); return; }
      return r.json();
    })
    .then(function(res) {
      if (res && res.ok) {
        localStorage.setItem('bj_ts_' + CU, data.updatedAt.toString());
        setCloudStatus('connected');
      }
    })
    .catch(function() { setCloudStatus('offline'); });
}

// ── Pull — leer del servidor ───────────────────────

function pullCloud() {
  if (!_cloudSync || !_token) return;

  fetch(API_URL + '/api/sync', { headers: authHeaders() })
    .then(function(r) {
      if (r.status === 401) { clearToken(); setCloudStatus('unconfigured'); return null; }
      return r.json();
    })
    .then(function(data) {
      if (!data) return;

      var localTs = parseInt(localStorage.getItem('bj_ts_' + CU) || '0', 10);

      if (data.updatedAt > localTs) {
        applyCloudData(data);
        toast('☁️ Sincronizado desde la nube');
      } else {
        // Local más reciente → subir
        pushCloud();
      }
      setCloudStatus('connected');
    })
    .catch(function() { setCloudStatus('offline'); });
}

// ── Aplicar datos de la nube ───────────────────────

function applyCloudData(data) {
  if (data.cases) {
    Object.keys(data.cases).forEach(function(c) {
      sbk(CU, data.cases[c], parseInt(c));
    });
  }
  if (data.decors) {
    Object.keys(data.decors).forEach(function(c) {
      sdec(CU, data.decors[c], parseInt(c));
    });
  }
  if (data.unlocked) saveUnlocked(data.unlocked);
  if (data.currentCase !== undefined) {
    currentCase = data.currentCase;
    localStorage.setItem('bj_case_' + CU, data.currentCase);
  }
  if (data.jarType) {
    jarType = data.jarType;
    localStorage.setItem('bj_jar_' + CU, data.jarType);
  }
  localStorage.setItem('bj_ts_' + CU, data.updatedAt.toString());

  // Recargar escena con datos frescos
  loadBooks();
  loadDecors();
  recheckUnlocks();
}

// ── Conflicto: servidor más reciente ──────────────

function handleConflict(res) {
  if (res.conflict && res.data) {
    // El servidor gana — aplicar sus datos
    applyCloudData(res.data);
    toast('☁️ Conflicto resuelto — datos del servidor aplicados');
  }
}

// ── Persistencia con sync ──────────────────────────

var _pushTimer = null;
function persistAndSync() {
  sbk(CU, books.map(function(b) {
    var d = Object.assign({}, b);
    delete d.mesh; delete d.jarPos; delete d.jarRot; delete d._bh;
    return d;
  }), currentCase);
  localStorage.setItem('bj_ts_' + CU, Date.now().toString());
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushCloud, 1500);
}

// ── Cerrar sesión ──────────────────────────────────

function cloudLogout() {
  clearToken();
  _cloudSync = false;
  setCloudStatus('unconfigured');
}

// ── Indicador de estado ────────────────────────────

var CLOUD_ICONS = {
  unconfigured: '☁️',
  connecting:   '🔄',
  connected:    '✅',
  syncing:      '🔄',
  error:        '❌',
  offline:      '📴',
};

var CLOUD_TITLES = {
  unconfigured: 'Nube no activa — pulsa para configurar',
  connecting:   'Conectando…',
  connected:    'Sincronizado ✓ — pulsa para forzar sync',
  syncing:      'Guardando…',
  error:        'Error — pulsa para reintentar',
  offline:      'Sin conexión',
};

function setCloudStatus(status) {
  var btn = document.getElementById('btn-cloud');
  if (!btn) return;
  btn.textContent    = CLOUD_ICONS[status] || '☁️';
  btn.title          = CLOUD_TITLES[status] || '';
  btn.dataset.status = status;
}

function onCloudBtn() {
  var status = document.getElementById('btn-cloud').dataset.status;
  if (status === 'connected') {
    pushCloud();
    toast('☁️ Sincronizando…');
  } else if (status === 'syncing' || status === 'connecting') {
    toast('☁️ Conectando…');
  } else {
    // unconfigured / offline / error — intentar conectar
    // Intentar reconectar con token guardado
    if (loadToken()) {
      _cloudSync = true;
      setCloudStatus('connecting');
      pullCloud();
    } else if (CU) {
      // Recuperar contraseña del almacén local de BookJar
      var localUsers = JSON.parse(localStorage.getItem('bj_u') || '{}');
      var pw = _lastPasswordForCloud || localUsers[CU];
      if (pw) {
        cloudLogin(CU, pw);
      } else {
        toast('☁️ Cierra sesión y vuelve a entrar para activar la nube');
      }
    } else {
      toast('☁️ Inicia sesión primero');
    }
  }
}