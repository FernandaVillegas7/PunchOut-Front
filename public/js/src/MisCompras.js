document.addEventListener("DOMContentLoaded", async () => {
  // ⚠️ Usa la misma base que el resto de tu proyecto: 'app/api/...'
  const url = "/b2c/app/api/misCompras.php?method=exiros-get-compra&id=1";
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
    }
    const data = await res.json();
    console.log("ExirosGetCompra:", data);

    const pre = document.getElementById("comprasDebug");
    if (pre) pre.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    console.error(e);
    const pre = document.getElementById("comprasDebug");
    if (pre) pre.textContent = `Error: ${e.message}`;
  }
});

(function () {
  // Utilidades
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function fmtMoney(v, currency) {
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(num(v));
    } catch {
      return `${currency || 'MXN'} ${num(v).toFixed(2)}`;
    }
  }
  function byId(id) { return document.getElementById(id); }
  function getQueryParam(k) { return new URLSearchParams(window.location.search).get(k); }

  async function fetchCompra(apiUrl, id) {
    const url = `${apiUrl}?method=exiros-get-compra&id=${encodeURIComponent(id)}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
    }
    return res.json();
  }

  function buildCompraAccordion(data) {
    const carritoId = data.carritoExirosID || data.carritoExirosId || data.carritoExiros || '—';
    const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.Items) ? data.Items : []);
    const currency = (items[0] && items[0].currency) || 'MXN';

    // Totales básicos
    const subtotal = items.reduce((s, it) => s + num(it.unitPrice ?? it.itemPrice) * num(it.quantity), 0);
    const impuestos = 0; // ajusta si tu API los entrega por separado
    const envio = 0;     // idem
    const total = subtotal + impuestos + envio;

    const accId = `col-${carritoId}`;
    const hdrId = `hdr-${carritoId}`;

    const rows = items.map((it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td class="fw-semibold">${it.codigoArticulo || it.supplierPartID || ''}</td>
        <td>
          ${it.shortname || it.longname || ''}
          <div class="small text-muted">
            ${it.manufacturer ? `Fabricante: ${it.manufacturer}` : ''}${it.manufacturer && it.manufacturerModelNumber ? ' — ' : ''}${it.manufacturerModelNumber ? `Modelo: ${it.manufacturerModelNumber}` : ''}
          </div>
        </td>
        <td class="text-end">${num(it.quantity).toFixed(2)}</td>
        <td class="text-center">${it.unitOfMeasure || it.uniteOfMeasure || it.unit || 'EA'}</td>
        <td class="text-end money">${fmtMoney(it.unitPrice ?? it.itemPrice, it.currency)}</td>
        <td class="text-end money">${fmtMoney(num(it.unitPrice ?? it.itemPrice) * num(it.quantity), it.currency)}</td>
      </tr>
    `).join('');

    return `
      <div class="accordion" id="comprasLista">
        <div class="accordion-item mb-3">
          <h2 class="accordion-header" id="${hdrId}">
            <button class="accordion-button collapsed" type="button"
                    data-bs-toggle="collapse" data-bs-target="#${accId}"
                    aria-expanded="false" aria-controls="${accId}">
              <div class="w-100 d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
                <div class="d-flex flex-wrap gap-3">
                  <span class="fw-semibold">Carrito #${carritoId}</span>
                  ${data.username ? `<span class="text-muted">Usuario: ${data.username}</span>` : ''}
                  ${data.statusResponse ? `<span class="text-muted">Estatus: ${data.statusResponse}</span>` : ''}
                </div>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge bg-success">${data.statusResponse || 'OK'}</span>
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
                      <div><strong>Carrito:</strong> ${carritoId}</div>
                      ${data.buyerCookie ? `<div><strong>Buyer Cookie:</strong> ${data.buyerCookie}</div>` : ''}
                      ${data.sessionID ? `<div><strong>Session ID:</strong> ${data.sessionID}</div>` : ''}
                      <div><strong>Moneda:</strong> ${currency}</div>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between small"><span>Subtotal</span><span class="money">${fmtMoney(subtotal, currency)}</span></div>
                    <div class="d-flex justify-content-between small"><span>Impuestos</span><span class="money">${fmtMoney(impuestos, currency)}</span></div>
                    <div class="d-flex justify-content-between small"><span>Envío</span><span class="money">${fmtMoney(envio, currency)}</span></div>
                    <div class="d-flex justify-content-between fw-semibold"><span>Total</span><span class="money">${fmtMoney(total, currency)}</span></div>
                    ${data.hookUrl ? `<hr><a class="btn btn-outline-primary btn-sm" href="${data.hookUrl}" target="_blank" rel="noopener">Ver en portal</a>` : ''}
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
                          ${rows || `<tr><td colspan="7" class="text-center text-muted py-4">Sin artículos</td></tr>`}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function init() {
    const root = byId('comprasRoot');
    if (!root) return;

    // Detecta API e ID
    const api = root.getAttribute('data-api') || '/b2c/app/api/misCompras.php';
    const idFromAttr = root.getAttribute('data-id');
    const id = idFromAttr || getQueryParam('id') || 6 ; // por defecto 1 para pruebas

    try {
      const data = await fetchCompra(api, id);
      root.innerHTML = buildCompraAccordion(data);
    } catch (e) {
      console.error(e);
      root.innerHTML = `
        <div class="alert alert-danger" role="alert">
          No se pudo cargar la compra. <code>${String(e.message)}</code>
        </div>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
