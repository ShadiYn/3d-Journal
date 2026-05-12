/* ══════════════════════════════════════════════════
   STATS.JS — Panel de estadísticas de lectura
══════════════════════════════════════════════════ */

function toggleStats() {
  const panel = document.getElementById('stats-panel');
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
  } else {
    renderStats();
    panel.classList.add('open');
  }
}

function closeStats() {
  document.getElementById('stats-panel').classList.remove('open');
}

function renderStats() {
  const all      = books;
  const shelved  = all.filter(b => b.location === 'shelf');
  const inJar    = all.filter(b => b.location === 'jar');
  const leidos   = all.filter(b => b.status === 'leido');
  const leyendo  = all.filter(b => b.status === 'leyendo');
  const pend     = all.filter(b => !b.status || b.status === 'pendiente');

  const avgRating = shelved.length
    ? (shelved.reduce((s, b) => s + (b.rating || 0), 0) / shelved.length).toFixed(1)
    : '—';

  const totalPages = all.reduce((s, b) => s + (b.pages || 0), 0);

  // Libros por mes (de los que tienen fecha)
  const byMonth = {};
  all.forEach(b => {
    if (!b.readingDate) return;
    const key = b.readingDate.slice(0, 7);   // 'YYYY-MM'
    byMonth[key] = (byMonth[key] || 0) + 1;
  });
  const monthKeys   = Object.keys(byMonth).sort().slice(-6);
  const monthMax    = Math.max(...monthKeys.map(k => byMonth[k]), 1);
  const monthLabels = monthKeys.map(k => {
    const [y, m] = k.split('-');
    return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+m-1];
  });

  document.getElementById('stats-panel').querySelector('.sp-body').innerHTML = `

    <!-- Números principales -->
    <div class="st-grid">
      <div class="st-card">
        <div class="st-num">${all.length}</div>
        <div class="st-lbl">Total libros</div>
      </div>
      <div class="st-card">
        <div class="st-num">${shelved.length}</div>
        <div class="st-lbl">En estantería</div>
      </div>
      <div class="st-card">
        <div class="st-num">${avgRating}★</div>
        <div class="st-lbl">Rating medio</div>
      </div>
      <div class="st-card">
        <div class="st-num">${totalPages > 0 ? totalPages.toLocaleString() : '—'}</div>
        <div class="st-lbl">Páginas totales</div>
      </div>
    </div>

    <!-- Estados -->
    <div class="st-section">Estados</div>
    <div class="st-states">
      <div class="st-state-row">
        <span>✓ Leídos</span>
        <div class="st-bar-wrap">
          <div class="st-bar-fill" style="width:${all.length ? (leidos.length/all.length*100).toFixed(0) : 0}%;background:#44cc66"></div>
        </div>
        <span class="st-bar-n">${leidos.length}</span>
      </div>
      <div class="st-state-row">
        <span>📖 Leyendo</span>
        <div class="st-bar-wrap">
          <div class="st-bar-fill" style="width:${all.length ? (leyendo.length/all.length*100).toFixed(0) : 0}%;background:#00aaff"></div>
        </div>
        <span class="st-bar-n">${leyendo.length}</span>
      </div>
      <div class="st-state-row">
        <span>⏳ Pendientes</span>
        <div class="st-bar-wrap">
          <div class="st-bar-fill" style="width:${all.length ? (pend.length/all.length*100).toFixed(0) : 0}%;background:#c8a748"></div>
        </div>
        <span class="st-bar-n">${pend.length}</span>
      </div>
    </div>

    <!-- Gráfico por mes -->
    ${monthKeys.length ? `
    <div class="st-section">Últimos 6 meses</div>
    <div class="st-chart">
      ${monthKeys.map((k, i) => `
        <div class="st-col">
          <div class="st-col-bar" style="height:${Math.round((byMonth[k]/monthMax)*80)+8}px" title="${byMonth[k]} libro${byMonth[k]>1?'s':''}">
            <span class="st-col-n">${byMonth[k]}</span>
          </div>
          <div class="st-col-lbl">${monthLabels[i]}</div>
        </div>
      `).join('')}
    </div>
    ` : `<div class="st-empty">Añade fechas de lectura para ver el gráfico</div>`}

    <!-- Top rated -->
    ${leidos.length ? `
    <div class="st-section">Mejor valorados</div>
    <div class="st-toplist">
      ${[...leidos].sort((a,b) => b.rating - a.rating).slice(0,4).map(b => `
        <div class="st-toprow">
          <div class="st-topdot" style="background:${b.color}"></div>
          <div class="st-topname">${b.title}</div>
          <div class="st-toprating">${'★'.repeat(b.rating)}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;
}
