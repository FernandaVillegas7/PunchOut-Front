(function () {
  // =========================
  // Utilidades
  // =========================
  const byId = id => document.getElementById(id);
  const num  = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const fmtMoney = (v, currency='MXN') =>
    new Intl.NumberFormat('es-MX', { style:'currency', currency }).format(num(v));
  const fmtFecha = iso => {
    try { return new Date(iso).toLocaleDateString('es-MX',{year:'numeric',month:'short',day:'2-digit'}) }
    catch { return iso || '—' }
  };
  const guessCurrencyFromLista = lista => /USD/i.test(lista || '') ? 'USD' : 'MXN';
  const sanitizeId = s => String(s || 'x').replace(/[^a-zA-Z0-9_-]/g, '');

  // =========================
  // Fetch (AJAX)
  // =========================
  async function fetchCotizaciones(apiBase, clienteId) {
    const url = `${apiBase}?method=get-cotizacion-crm&ClienteID=${encodeURIComponent(clienteId)}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
    }
    return res.json(); // ← arreglo de cotizaciones
  }

  // =========================
  // Render de UNA cotización → accordion-item
  // =========================
  function buildCotizacionItem(cot) {
    const folio = cot.folioCotizacion || '—';
    const accId = `cot-${sanitizeId(folio)}`;
    const hdrId = `hdr-${sanitizeId(folio)}`;

    const listaPrecio = cot.listaPrecio || 'B2BMXN';
    const currency = guessCurrencyFromLista(listaPrecio);

    const items = Array.isArray(cot.items) ? cot.items : [];

    // Totales con IVA incluido por item (precio * (1 + impuesto/100))
    const subtotal = items.reduce((s, it) => {
      const precioConIVA = num(it.precio) * (1 + num(it.impuesto1) / 100);
      return s + precioConIVA * num(it.cantidad);
    }, 0);
    const total = subtotal;

    const rows = items.length
      ? items.map((it, idx) => {
          const precioConIVA = num(it.precio) * (1 + num(it.impuesto1) / 100);
          const importeConIVA = precioConIVA * num(it.cantidad);
          return `
            <tr>
              <td>${idx + 1}</td>
              <td class="fw-semibold">${it.productoID || ''}</td>
              <td>
                ${it.descripcion || it.nombre || ''}
                <div class="small text-muted">
                  ${it.claveFabricante ? `Fabricante: ${it.claveFabricante}` : ''}${it.claveFabricante && it.descripcionExtra ? ' — ' : ''}${it.descripcionExtra ? `Extra: ${it.descripcionExtra}` : ''}
                </div>
              </td>
              <td class="text-end">${num(it.cantidad).toFixed(2)}</td>
              <td class="text-center">${it.unidad || 'EA'}</td>
              <td class="text-end money">${fmtMoney(precioConIVA, currency)}</td>
              <td class="text-end money">${fmtMoney(importeConIVA, currency)}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="7" class="text-center text-muted py-4">Sin artículos</td></tr>`;

    return `
      <div class="accordion-item mb-3">
        <h2 class="accordion-header" id="${hdrId}">
          <button class="accordion-button collapsed" type="button"
                  data-bs-toggle="collapse" data-bs-target="#${accId}"
                  aria-expanded="false" aria-controls="${accId}">
            <div class="w-100 d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
              <div class="d-flex flex-wrap gap-3">
                <span class="fw-bold">${folio}</span>
                <span class="text-semibold">Fecha: ${fmtFecha(cot.fechaCreacion)}</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="h6 mb-0 money">${fmtMoney(total, currency)}</span>
              </div>
            </div>
          </button>
        </h2>

        <div id="${accId}" class="accordion-collapse collapse" aria-labelledby="${hdrId}" data-bs-parent="#comprasLista">
          <div class="accordion-body">
            <div class="row g-3">
              <div class="col-12 col-lg-4">
                <div class="border rounded p-3 h-100">
                  <div class="fw-semibold mb-2">Resumen</div>
                  <div class="small">
                    <div><strong>Folio:</strong> ${folio}</div>
                    <div><strong>Moneda:</strong> ${currency}</div>
                    ${cot.titulo ? `<div><strong>Título:</strong> ${cot.titulo}</div>` : ''}
                    ${cot.dirigido ? `<div><strong>Dirigido:</strong> ${cot.dirigido}</div>` : ''}
                    <div><strong>Fecha:</strong> ${fmtFecha(cot.fechaCreacion)}</div>
                  </div>
                  <hr>
                  <div class="d-flex justify-content-between fw-semibold"><span>Total</span><span class="money">${fmtMoney(total, currency)}</span></div>
                </div>
              </div>

              <div class="col-12 col-lg-8">
                <div class="border rounded p-0">
                  <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>#</th>
                          <th>Código</th>
                          <th>Descripción</th>
                          <th class="text-end">Cantidad</th>
                          <th class="text-center">Unidad</th>
                          <th class="text-end">Precio</th>
                          <th class="text-end">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  </div>
                  <div class="d-flex justify-content-end p-3">
                    <button type="button" class="btn btn-success" id="btnProcesarCompra">
                      <i class="fa-solid fa-check"></i> Procesar Compra
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================
  // Render de TODAS las cotizaciones
  // =========================
  function renderCotizaciones(cots) {
    const list = Array.isArray(cots) ? cots : [];
    if (!list.length) {
      return `<div class="alert alert-warning" role="alert">No hay cotizaciones para mostrar.</div>`;
    }
    return `<div class="accordion" id="comprasLista">${list.map(buildCotizacionItem).join('')}</div>`;
  }

  // =========================
  // Cargar con el ClienteID del input
  // =========================
  async function cargarDesdeInput() {
    const root = byId('comprasRoot');
    const apiBase = root.getAttribute('data-api') || '/b2c/app/api/CotizacionCRM.php';

    const claveInput = byId('claveC');
    const clienteId = (claveInput?.value || '').trim();
    if (!clienteId) {
      alert('Por favor ingresa tu clave/ClienteID');
      claveInput?.focus();
      return;
    }

    root.innerHTML = `<div class="text-center text-muted py-5 skeleton">Cargando cotizaciones…</div>`;
    try {
      const data = await fetchCotizaciones(apiBase, clienteId);
      root.innerHTML = renderCotizaciones(data);
      const firstBtn = root.querySelector('.accordion-button');
      if (firstBtn) firstBtn.click();
    } catch (e) {
      root.innerHTML = `
        <div class="alert alert-danger" role="alert">
          No se pudo cargar la información. <code>${String(e.message)}</code>
        </div>`;
    }
  }

  // =========================
  // Init: SOLO configura eventos (no hace fetch automático)
  // =========================
  function init() {
    const btnSearch = byId('searchCot');
    btnSearch?.addEventListener('click', cargarDesdeInput);

    // disparar con Enter dentro del input
    const claveInput = byId('claveC');
    claveInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cargarDesdeInput();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
