let currentClienteID = "";

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

      Category: it.categoria || it.familia || it.linea || '', // MATGROUP (PUNTA MONT)
      SupplierPartID: it.productoID || '',                      // VENDORMAT y MANUFACTMAT (ABAU-000157)
      SupplierPartAuxiliaryID: it.productoID || '',
      Manufacturer: it.marca || it.Marca || it.fabricante || it.Fabricante || '',              // MANUFACTCODE (AUSTROMEX)
      ManufacturerModelNumber: it.claveFabricante || '',        // CUST_FIELD1 (407)
      CodigoArticulo: it.productoID || ''
    }))
    const sess = window.PunchoutSession || {}

    let hookUrl = window.HOOK_URL || window.BrowserFormPostUrl || sess.HookUrl;
    if (!hookUrl || hookUrl === '-' || hookUrl === 'null') {
      console.warn("⚠️ Sesión no tiene HookUrl. Aplicando fallback de Tester OCI.");
      hookUrl = "https://punchoutcommerce.com/tools/oci-roundtrip-return";
    }
    return {
      ClienteID: cot.clienteID?.trim() || window.currentClienteID?.trim() || null,
      HookUrl: hookUrl,
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

  const tracker = {
    sendToServer: function(type, msg, data = null){
      const sess =  window.PunchoutSession || {};
      let sid = sess.SessionID || new URLSearchParams(location.search).get('SessionID') || sessionStorage.getItem('punchoutSessionID') || 'SinSesion';
       fetch('app/api/loggerExiros.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origen: 'DesdeCotizacionCRM', // <-- Identificador de este archivo
                type: type,
                session: sid,
                message: msg,
                data: data
            })
        }).catch(err => { /* Ignoramos fallos de red silenciosamente */ });
    },
    step: function(msg, data = null) { this.sendToServer('INFO', msg, data); },
    success: function(msg, data = null) { this.sendToServer('OK', msg, data); },
    error: function(msg, err) { this.sendToServer('ERROR', msg, err ? (err.message || err.toString()) : null); }
  };
 
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
 
    // =============================================================
    // Totales y Renderizado (Unificación para evitar repetir lógica)
    // =============================================================
    let subtotalFinal = 0;

    const rows = items.length
      ? items.map((it, idx) => {
          const precioSubtotal = num(it.precio) * (1 - num(it.descuento) / 100)
          const cantidad = num(it.cantidad) || 1
          const importe = precioSubtotal * cantidad
          
          subtotalFinal += importe; // Acumulamos en una sola pasada

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
              <td class="text-end">${cantidad.toFixed(2)}</td>
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
                <span class="h6 mb-0 money">${fmtMoney(subtotalFinal, currency)}</span>
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
                  <div class="d-flex justify-content-between fw-semibold"><span>Total</span><span class="money">${fmtMoney(subtotalFinal, currency)}</span></div>
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
    const apiBase = root.getAttribute('data-api') || '/app/api/cotizacionCRM.php'
 
    const claveInput = byId('claveC')
    const clienteId = (claveInput?.value || '').trim()
    if (!clienteId) {
      alert('Por favor ingresa tu clave/ClienteID')
      claveInput?.focus()
      return
    }
 
    currentClienteID = clienteId

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
  // Init
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
  // POST a tu endpoint PHP
  // =========================
async function postCompra(apiBase, payload, btn) {
    const url = `${apiBase}?method=exiros-Cotizacion-carrito`
    console.log("POST a:", url, payload)
    tracker.step('Iniciando fetch a postCompra (Guardando carrito en BD)', { url: url });
    
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
        // Abrimos el paquete que viene de la red
        json = JSON.parse(txt)
        
        // 👇 EL DESEMPAQUETADOR DOBLE 👇
        // Si el backend nos mandó el JSON disfrazado de texto (con las diagonales \), 
        // lo volvemos a parsear para convertirlo en un objeto real.
        if (typeof json === 'string') {
            json = JSON.parse(json);
        }

      } catch {
        console.warn("Respuesta no JSON:", txt)
        json = {}
      }

      // ... el resto de tu código de postCompra sigue igualito ...

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`)
      
      tracker.success('Respuesta exitosa de postCompra', json);
      
      // 👇 EXTRACCIÓN DEL ID A PRUEBA DE BALAS 👇
      let carritoId = parseInt(json.data, 10); 

      // 2. Si no pudo (porque viene adentro de un arreglo o con otro nombre)
      if (isNaN(carritoId) || carritoId <= 0) {
          if (Array.isArray(json.data) && json.data.length > 0) {
              carritoId = parseInt(json.data[0].CarritoExirosID || json.data[0].carritoExirosID, 10);
          } else {
              carritoId = parseInt(json.carritoExirosID || json.CarritoExirosID, 10);
          }
      }

      // 3. Si después de todo esto sigue vacío, imprimimos el RAW para ver al culpable
      if (isNaN(carritoId) || carritoId <= 0) {
         throw new Error("El servidor respondió esto, pero no encontré el número de ID: " + JSON.stringify(json));
      }
      
      // SOLO RETORNAMOS EL ID, CERO REDIRECCIONES AQUÍ
      return carritoId;

    } catch (err) {
      console.error(err)
      tracker.error('Fallo crítico en postCompra', err);
      // Lanzamos el error hacia arriba para que initProcesarCompra lo atrape y muestre el alert
      throw err; 
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
 
    const apiBase = root.getAttribute('data-api') || '/app/api/cotizacionCRM.php'
 
    root.addEventListener('click', async (e) => { 
      const btn = e.target.closest('.btn-procesar-compra')
      if (!btn) return
 
      const folio = btn.dataset.folio
      const cot = cotIndex.get(folio)
      
      if (!cot) {
        alert('No se encontró la cotización.')
        return
      }
      tracker.step('Inspeccionando cotizacion cruda', { 
          folio: folio, 
          itemsCrudos: cot.items // Aquí mandamos el arreglo completo
      });
      console.log("🕵️‍♀️ === DATOS CRUDOS DE LA COTIZACIÓN ===");
      console.log("Revisa cómo se llaman exactamente las variables de marca, categoría, etc.");
      console.table(cot.items); // Te dibuja una tabla perfecta
      console.dir(cot.items);
      tracker.step('Boton procesar compra click', {folio: folio});

      // =========================================================
      // 1. RECUPERAR LA SESIÓN PRIMERO
      // =========================================================
      try {
        tracker.step('Buscando sesión activa de PunchOut en el servidor...');
        
        let sid = new URLSearchParams(location.search).get('SessionID') || sessionStorage.getItem('punchoutSessionID');
        
        if (sid) {
          const sessionRes = await fetch(`/app/api/exiros.php?method=get-session&SessionID=${encodeURIComponent(sid)}`).then(r => r.json());
          
          if (sessionRes && !sessionRes.isError && sessionRes.data && sessionRes.data.hook) {
             window.HOOK_URL = sessionRes.data.hook.browserFormPostUrl;
             window.BrowserFormPostUrl = sessionRes.data.hook.browserFormPostUrl;
             tracker.success('Sesión recuperada desde la API local', { hook: window.HOOK_URL });
          } else {
             tracker.step('La API no devolvió un hook válido, se usará el fallback');
          }
        } else {
          tracker.step('No hay SessionID en la URL ni en Storage.');
        }
      } catch (err) {
        tracker.error('Fallo al intentar recuperar la sesión del servidor', err);
      }

      // =========================================================
      // 2. ARMAR PAYLOAD
      // =========================================================
      const payload = buildGuardarCompraPayload(cot)
      
      tracker.success("Sesión y Hook listos para enviar", { hookUrl: payload.HookUrl });
      tracker.step('Preparando envío OCI', { 
          folio: folio, 
          hookUrlResuelto: payload.HookUrl 
      });

      // =========================================================
      // 3. EL NUEVO ORDEN: GUARDAR BD -> OCI -> REDIRIGIR
      // =========================================================
      try {
        tracker.step('Iniciando guardado en Base de Datos...');
        
        // PRIMERO: Esperamos a que la base de datos nos conteste y nos dé el ID
        const nuevoCarritoID = await postCompra(apiBase, payload, btn);
        tracker.success("Carrito guardado en BD", { ID: nuevoCarritoID });
        
        // SEGUNDO: Disparamos el OCI enviándole el Payload y el Nuevo ID
        GenerarOCI(payload, nuevoCarritoID); 
        tracker.success("Formulario OCI armado y enviado al navegador.");
        
        // TERCERO: Redirigimos la pantalla principal a Mis Compras
        let clienteFinal = currentClienteID || payload.ClienteID || payload.Username || null;
        const redirectUrl = (clienteFinal && clienteFinal !== "-")
          ? `/misCompras?clienteID=${encodeURIComponent(clienteFinal)}&carritoId=${encodeURIComponent(nuevoCarritoID)}`
          : `/misCompras?carritoId=${encodeURIComponent(nuevoCarritoID)}`;
        
        window.location.href = redirectUrl;

      } catch (err) {
        tracker.error("Flujo detenido por error", err);
        alert("Ocurrió un error al procesar el carrito: " + err.message);
      }
    })
  }
 
// ============================
// GENERADOR DE OCI
// ============================

function GenerarOCI(cot, nuevoCarritoID) {
  if (!cot || !cot.Items || cot.Items.length === 0) {
      throw new Error("No hay artículos en la cotización para armar el OCI.");
  }

  let form = document.createElement("form");
  form.method = "POST";
  form.enctype = "application/x-www-form-urlencoded";
  form.acceptCharset = "UTF-8";
 
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
    const VendorMat     = item.SupplierPartID || item.supplierPartID || item.CodigoArticulo || item.codigoArticulo || ""; 
    const ManufactMat   = item.SupplierPartID || item.supplierPartID || item.CodigoArticulo || item.codigoArticulo || "";
    const MatGroup      = (item.Category || item.category || "").toString().trim().substring(0, 10);
    const ManufactCode  = item.Manufacturer || item.manufacturer || "";

    const dynImgUrl = ManufactMat
      ? `https://mersolsureste.com.mx/articulos/index.php?img=${encodeURIComponent(ManufactMat)}`
      : (item.imagen || "");
 
   addHidden(`NEW_ITEM-VENDORMAT[${n}]`, VendorMat);       // ABAU-000157
    addHidden(`NEW_ITEM-MATGROUP[${n}]`, MatGroup || "OTROS");         // PUNTA MONT
    addHidden(`NEW_ITEM-DESCRIPTION[${n}]`, Shortname);
    addHidden(`NEW_ITEM-LANGUAGE[${n}]`, "es-ES");
    addHidden(`NEW_ITEM-PRICE[${n}]`, Price.toFixed(2));
    addHidden(`NEW_ITEM-CURRENCY[${n}]`, Currency);
    addHidden(`NEW_ITEM-QUANTITY[${n}]`, Qty);
    addHidden(`NEW_ITEM-PRICEUNIT[${n}]`, item.PriceUnit ?? 1);
    addHidden(`NEW_ITEM-UNIT[${n}]`, UoM);
    addHidden(`NEW_ITEM-ATTACHMENT[${n}]`, dynImgUrl);
    addHidden(`NEW_ITEM-VENDOR[${n}]`, "108752");
    addHidden(`NEW_ITEM-MANUFACTCODE[${n}]`, ManufactCode); // AUSTROMEX
    addHidden(`NEW_ITEM-MANUFACTMAT[${n}]`, ManufactMat);   // ABAU-000157

    const _rawC1 = item.ManufacturerModelNumber || item.CodigoArticulo || "";
    const _sanC1 = _rawC1.replace(/[^A-Za-z0-9]/g, "").substring(0, 10);
    addHidden(`NEW_ITEM-CUST_FIELD1[${n}]`, _sanC1);
    if (nuevoCarritoID) {
        addHidden(`NEW_ITEM-CUST_FIELD2[${n}]`, String(nuevoCarritoID));
    }
    // Mandamos el folio para tu control
    addHidden(`NEW_ITEM-CUST_FIELD4[${n}]`, String(cot.FolioCotizacion || ""));
    addHidden(`NEW_ITEM-URL[${n}]`, window.location.href);
    addLongText(`NEW_ITEM-LONGTEXT_${n}:132[]`, Longname);
  });
 
  document.body.appendChild(form);
 
  if (hookUrl) {
    form.target = "_blank";
    HTMLFormElement.prototype.submit.call(form);
  }
  
  setTimeout(() => form.remove(), 500);
  return form;
}

 init(); 
})()