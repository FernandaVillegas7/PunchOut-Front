(function () {
  // =========================
  // Utilidades
  // =========================
  const byId = id => document.getElementById(id)
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0
  const fmtMoney = (v, currency = 'MXN') =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(num(v))
  const fmtFecha = iso => {
    try { return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: '2-digit' }) }
    catch { return iso || '—' }
  }
  const guessCurrencyFromLista = lista => /USD/i.test(lista || '') ? 'USD' : 'MXN'
  const sanitizeId = s => String(s || 'x').replace(/[^a-zA-Z0-9_-]/g, '')
 
  let cotIndex = new Map()
 
  // =========================
  // Payload
  // =========================
  const N = v => Number(v) || 0
  const currencyFromLista = lista => /USD/i.test(lista || '') ? 'USD' : 'MXN'
  const clip = (s, n) => String(s || '').slice(0, n)
 
  function buildGuardarCompraPayload(cot) {
    const currency = currencyFromLista(cot.listaPrecio)
 
    const items = (cot.items || []).map((it, idx) => ({
      Partida: it.partida ?? (idx + 1),
      Shortname: clip(it.descripcion, 40),
      Longname: it.descripcion,
      UnitOfMeasure: it.unidad,
      ItemPrice: (N(it.precio)-(N(it.precio)*(N(it.descuento)/100))),
      PriceUnit: 1,
      UnitPrice: N(it.precio),
      Quantity: N(it.cantidad) || 1,
      Currency: currency,
      Category: '',
      SupplierPartID: it.claveFabricante || '',
      SupplierPartAuxiliaryID: it.productoID || '',
      Manufacturer: it.Marca || '',
      ManufacturerModelNumber: it.claveFabricante ?? '',
      CodigoArticulo: it.productoID ?? ''
    }))
    const sess = window.PunchoutSession || {}
    return {
      HookUrl: window.BrowserFormPostUrl || sess.HookUrl|| "-",
      Username: window.Username ||  "-",
      Password: window.Password ||  "-",
      BuyerCookie : window.BuyerCookie ||sess.BuyerCookie||  "-",
      SessionID: sess.SessionID ||  "-",
      cXMLResponse: sess.cXMLResponse ||  "-",
      Extrinsics: sess.Extrinsics || {},
      StatusResponse: sess.StatusResponse || 'OK',
      BrowserFormPostUrl: sess.BrowserFormPostUrl ||  "-",
      FolioCotizacion: cot.folioCotizacion ||  "-",
      Items: items
    }
  }
 
  // =========================
  // Fetch (AJAX)
  // =========================
  async function fetchCotizaciones(apiBase, clienteId) {
    const url = `${apiBase}?method=get-cotizacion-crm&ClienteID=${encodeURIComponent(clienteId)}`
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`)
    }
    return res.json()
  }
 
  // =========================
  // Render de UNA cotización
  // =========================
  function buildCotizacionItem(cot) {
    const folio = cot.folioCotizacion || '—'
    const accId = `cot-${sanitizeId(folio)}`
    const hdrId = `hdr-${sanitizeId(folio)}`
 
    const listaPrecio = cot.listaPrecio || 'B2BMXN'
    const currency = guessCurrencyFromLista(listaPrecio)
 
    const items = Array.isArray(cot.items) ? cot.items : []
 
//=============================================================
// Totales: aplica descuento y luego IVA por ítem
//=============================================================
    const subtotal = items.reduce((s, it) => {
    const precioSubtotal = num(it.precio) * (1 - num(it.descuento) / 100)
    // const precioConIVA   = precioSubtotal * (1 + num(it.impuesto1) / 100)
    return s + precioSubtotal * (num(it.cantidad) || 1)
    }, 0)
    const total = subtotal
 
    const rows = items.length
      ? items.map((it, idx) => {
        const precioSubtotal = num(it.precio) - (num(it.precio) * (num(it.descuento) / 100))// aplica % de descuento
         //const precioConIVA = precioSubtotal * (1 + num(it.impuesto1) / 100)                 aplica % IVA
        const importe = precioSubtotal * (num(it.cantidad) || 1)                        // por cantidad
 
        return `
            <tr>
              <td>${idx + 1}</td>
              <td class="fw-semibold col-md-2">${it.productoID || ''}</td>
              <td>
                ${it.descripcion || it.nombre || ''}
                <div class="small text-muted">
                  ${it.marca ? `Fabricante: ${it.marca}` : ''}
                </div>
              </td>
              <td class="text-end">${num(it.cantidad).toFixed(2)}</td>
              <td class="text-center">${it.unidad || 'EA'}</td>
              <td class="text-end money">${fmtMoney(precioSubtotal, currency)}</td>
              <td class="text-end money">% ${it.descuento}</td>
              <td class="text-end money">${fmtMoney(importe, currency)}</td>
            </tr>
          `
      }).join('')
      : `<tr><td colspan="8" class="text-center text-muted py-4">Sin artículos</td></tr>`
 
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
              <div class="col-12 col-lg-3">
                <div class="border rounded p-3 h-100">
                  <div class="fw-bold mb-2">Resumen</div>
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
 
              <div class="col-12 col-lg-9">
                <div class="border rounded p-0">
                  <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>#</th>
                          <th>Código</th>
                          <th>Descripción</th>
                          <th class="text-end">Cant.</th>
                          <th class="text-center">Unidad</th>
                          <th class="text-end">Precio</th>
                          <th class="text-end">Desc.</th>
                          <th class="text-end">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  </div>
                  <div class="d-flex justify-content-end p-3">
                    <button type="button" class="btn btn-success btn-procesar-compra" data-folio="${folio}">
                      <i class="fa-solid fa-check"></i> Procesar Compra
                    </button>
                  </div>
                </div>
              </div>
 
            </div>
          </div>
        </div>
      </div>
    `
  }
 
  // ================================
  // Render de TODAS las cotizaciones
  // ================================
  function renderCotizaciones(cots) {
    const list = Array.isArray(cots) ? cots : []
    cotIndex.clear()
    list.forEach(c => cotIndex.set(c.folioCotizacion, c))
    if (!list.length) {
      return `<div class="alert alert-warning" role="alert">No hay cotizaciones para mostrar.</div>`
    }
    return `<div class="accordion" id="comprasLista">${list.map(buildCotizacionItem).join('')}</div>`
  }
 
  // ===================================
  // Cargar con el ClienteID del input
  // ===================================
  async function cargarDesdeInput() {
    const root = byId('comprasRoot')
    const apiBase = root.getAttribute('data-api') || '/b2b-exiros-front/app/api/cotizacionCRM.php'
 
    const claveInput = byId('claveC')
    const clienteId = (claveInput?.value || '').trim()
    if (!clienteId) {
      alert('Por favor ingresa tu clave/ClienteID')
      claveInput?.focus()
      return
    }
 
    root.innerHTML = `<div class="text-center text-muted py-5 skeleton">Cargando cotizaciones…</div>`
    try {
      const data = await fetchCotizaciones(apiBase, clienteId)
      root.innerHTML = renderCotizaciones(data)
      const firstBtn = root.querySelector('.accordion-button')
      if (firstBtn) firstBtn.click()
    } catch (e) {
      root.innerHTML = `
        <div class="alert alert-danger" role="alert">
          No se pudo cargar la información. <code>${String(e.message)}</code>
        </div>`
    }
  }
 
  // =========================
  // Init: SOLO configura eventos (no hace fetch automático)
  // =========================
  function init() {
    const btnSearch = byId('searchCot')
    btnSearch?.addEventListener('click', cargarDesdeInput)
 
    // disparar con Enter dentro del input
    const claveInput = byId('claveC')
    claveInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        cargarDesdeInput()
      }
    })
    initProcesarCompra()
  }
 
  // =========================
  // POST a tu endpoint PHP (?method=exiros-Cotizacion-carrito)
  // =========================
  async function postCompra(apiBase, payload, btn) {
    const url = `/B2B-EXIROS-FRONT/app/api/cotizacionCRM.php?method=exiros-Cotizacion-carrito`
    const old = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Procesando…`
 
    try {
      const payloadCorregido = {
          ...payload,
          Extrinsics: JSON.stringify(payload.Extrinsics || {}),
          StatusResponse: JSON.stringify(payload.StatusResponse || 'OK')
      }
 
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(payloadCorregido)
      })
 
      const txt = await res.text()
      let json
      try {
        json = JSON.parse(txt)
      } catch (errJson) {
        json = { raw: txt }
      }
 
 
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`)
 
      const alertBox = document.getElementById('alertCompra')
      if (alertBox) {
        alertBox.style.display = 'block'
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setTimeout(() => {
          alertBox.style.display = 'none'
        }, 5000)
      }
 
    } catch (err) {
      console.error(err)
    } finally {
      btn.disabled = false
      btn.innerHTML = old
    }
  }
 
  // ============================
  // ARMA el PAYLOAD y se ENVÍA
  // ============================
  function initProcesarCompra() {
    const root = byId('comprasRoot')
     if (!root) return
 
    const apiBase = root.getAttribute('data-api') || '/b2c/app/api/cotizacionCRM.php'
 
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-procesar-compra')
      if (!btn) return
 
      const folio = btn.dataset.folio
      const cot = cotIndex.get(folio)
      console.log("[CLICK] Botón de procesar compra presionado")
      console.log("Folio:", folio)
      console.log("Cotización encontrada:", cot)
      if (!cot) {
                  alert('No se encontró la cotización.')
                  return
                }
 
      const payload = buildGuardarCompraPayload(cot)
      console.log("[BUILD] Payload generado:", payload)
      GenerarOCI(payload)
      postCompra(apiBase, payload, btn)
    })
  }
 
  document.addEventListener('DOMContentLoaded', init)
})()
 
// ============================
// GENERADOR DE OCI
// ============================
function GenerarOCI(cot) {
  let form = document.createElement("form");
  form.method = "POST";
  form.enctype = "application/x-www-form-urlencoded";
  form.acceptCharset = "UTF-8";
 
  // let hookUrl = "https://punchoutcommerce.com/tools/oci-roundtrip-return";
 
  let hookUrl = (cot.HookUrl && String(cot.HookUrl).trim());
  form.action = hookUrl;
 
  const addHidden = (name, value) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value != null ? String(value) : "";
    form.appendChild(input);
  };
 
  const addLongText = (name, text) => {
    const ta = document.createElement("textarea");
    ta.name = name;
    ta.style.display = "none";
    ta.cols = 20;
    ta.value = text != null ? String(text) : "";
    form.appendChild(ta);
  };
 
  const rawItems = Array.isArray(cot.Items) ? cot.Items
                  : Array.isArray(cot.items) ? cot.items
                  : [];
 
  rawItems.forEach((wrapper, idx) => {
    const n = idx + 1;
    const item = (wrapper && wrapper.item) ? wrapper.item : wrapper;
 
    const Price         = Number(item.ItemPrice ?? item.UnitPrice ?? 0);
    const Qty           = Number(item.Quantity ?? 0);
    const Currency      = item.Currency || "MXN";
    const UoM           = item.UnitOfMeasure || item.Unit || "EA";
    const Shortname     = (item.Shortname || "").toString().trim();
    const Longname      = (item.Longname  || "").toString().trim();
    const VendorMat     = item.SupplierPartID || ""; // código fabricante
    const ManufactMat   = item.SupplierPartID || ""; // opcional
    const MatGroup      = (item.Category || "").toString().trim().substring(0, 10);
    const CodigoArticulo= item.CodigoArticulo || item.SupplierPartAuxiliaryID || "";
 
    // Puedes construir una imagen dinámica si la tienes (opcional)
    const dynImgUrl = CodigoArticulo
      ? `https://mersolsureste.com.mx/articulos/index.php?img=${encodeURIComponent(CodigoArticulo)}`
      : (item.imagen || "");
 
    // 4) Campos OCI requeridos
    addHidden(`NEW_ITEM-VENDORMAT[${n}]`, VendorMat);
    addHidden(`NEW_ITEM-MATGROUP[${n}]`, MatGroup);
    addHidden(`NEW_ITEM-DESCRIPTION[${n}]`, Shortname);
    addHidden(`NEW_ITEM-LANGUAGE[${n}]`, "ES");
    addHidden(`NEW_ITEM-PRICE[${n}]`, Price.toFixed(2));
    addHidden(`NEW_ITEM-CURRENCY[${n}]`, Currency);
    addHidden(`NEW_ITEM-QUANTITY[${n}]`, Qty);
    addHidden(`NEW_ITEM-PRICEUNIT[${n}]`, item.PriceUnit ?? 1);
    addHidden(`NEW_ITEM-UNIT[${n}]`, UoM);
    addHidden(`NEW_ITEM-ATTACHMENT[${n}]`, dynImgUrl);
 
    // Ajusta si tienes un vendor fijo
    addHidden(`NEW_ITEM-VENDOR[${n}]`, "108752");
 
    // Manufacturer opcional
    addHidden(`NEW_ITEM-MANUFACTCODE[${n}]`, item.Manufacturer || "");
    addHidden(`NEW_ITEM-MANUFACTMAT[${n}]`, ManufactMat);
 
    // Custom fields (ejemplo: Folio y código limpio)
    const c1Raw  = CodigoArticulo;
    const c1San  = c1Raw.replace(/[^A-Za-z0-9]/g, "").substring(0, 10);
    addHidden(`NEW_ITEM-CUST_FIELD1[${n}]`, c1San);
    addHidden(`NEW_ITEM-CUST_FIELD4[${n}]`, String(cot.FolioCotizacion || ""));
 
    // URL de retorno opcional
    addHidden(`NEW_ITEM-URL[${n}]`, window.location.href);
 
    // LONGTEXT (formato común aceptado por probadores OCI)
    addLongText(`NEW_ITEM-LONGTEXT_${n}:132[]`, Longname);
  });
 
  document.body.appendChild(form);
 
  // Debug visual en consola
  console.log("[OCI FORM HTML]\n", form.outerHTML);
 
  if (hookUrl) {
    HTMLFormElement.prototype.submit.call(form);
  }
  return form;
}