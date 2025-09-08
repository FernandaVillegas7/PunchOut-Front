document.addEventListener("DOMContentLoaded", async () => {
  let debug = ''
  const url = "/b2c/app/api/CotizacionCRM.php?method=get-cotizacion-crm&ClienteID=CL-00078";
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
    }
    const data = await res.json();
    console.log("CRM get-cotizacion-crm:", data);
    if (debug) debug.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    console.error(e);
    if (debug) debug.textContent = `Error: ${e.message}`;
  }
});

(function () {
  // =========================
  // Utilidades
  // =========================
  const byId = id => document.getElementById(id);
  const num  = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fmtMoney = (v, currency) => {
    const cur = currency || 'MXN';
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur }).format(num(v));
    } catch {
      return `${cur} ${num(v).toFixed(2)}`;
    }
  };
  const fmtFecha = iso => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'2-digit' });
    } catch { return iso || '—'; }
  };
  const getQueryParam = k => new URLSearchParams(window.location.search).get(k);
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
    return res.json();
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

    // Totales
    const subtotal = items.reduce((s, it) => {
      const precioConIVA = num(it.precio) * (1 + num(it.impuesto1) / 100);
      return s + precioConIVA * num(it.cantidad);
    }, 0);
    const total = subtotal

    const rows = items.length
    
       ? items.map((it, idx) => {
      const precioConIVA = num(it.precio) * (1 + num(it.impuesto1) / 100)

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
          <td class="text-end money">${fmtMoney(num(precioConIVA) * num(it.cantidad), currency)}</td>
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
      return `
        <div class="alert alert-warning" role="alert">
          No hay cotizaciones para mostrar.
        </div>`;
    }

    const inner = list.map(buildCotizacionItem).join('');
    return `
      <div class="accordion" id="comprasLista">
        ${inner}
      </div>
    `;
  }

  // =========================
  // Init
  // =========================
  async function init() {
    const root = byId('comprasRoot');
    if (!root) return;

    const apiBase  = root.getAttribute('data-api')     || '/b2c/app/api/CotizacionCRM.php';
    const cliente  = root.getAttribute('data-cliente') || getQueryParam('ClienteID') || 'CL-00078';

    try {
      const data = await fetchCotizaciones(apiBase, cliente);
      root.innerHTML = renderCotizaciones(data);
      // Opcional: expandir la primera
      const firstBtn = root.querySelector('.accordion-button');
      if (firstBtn) firstBtn.click();
    } catch (e) {
      console.error(e);
      root.innerHTML = `
        <div class="alert alert-danger" role="alert">
          No se pudo cargar la información. <code>${String(e.message)}</code>
        </div>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})()