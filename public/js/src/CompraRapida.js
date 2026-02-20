// Configuración global
//const repoBase = '/AXEL-B2B-EXIROS-FRONT';
// const repoBase = '/B2B-EXIROS-FRONT'; 
const repoBase = ''; 
const apiMisCompras = `${repoBase}/app/api/misCompras.php`;
let currentClienteID = "";
// Select2 de artículos (Exiros Search Products)
function formatResult(repo) {
    if (repo.loading) return repo.text;
    const imgSrc = repo.imagen || (repo.supplierPartID && repo.codigoInterno
        ? `https://mersolsureste.com.mx/articulos/index.php?clave=${encodeURIComponent(repo.supplierPartID)}&img=${encodeURIComponent(repo.codigoInterno)}`
        : '');
    const name = repo.shortName || repo.longName || repo.text || '';
    const code = repo.supplierPartID || repo.codigoInterno || repo.id || '';
    const brand = repo.manufacturer || '';
    return $(`
        <div class="row align-items-center">
            <div class="col-md-2 text-center">
                <img alt="${name}" class="img-fluid w-50" src="${imgSrc}">
            </div>
            <div class="col-md-10">
                <div><strong>${code} - ${name}</strong></div>
                ${brand ? `<div>Marca: ${brand}</div>` : ''}
            </div>
        </div>
    `);
}

$('#articulo').select2({
    placeholder: "Selecciona una opción",
    allowClear: true,
    minimumResultsForSearch: 0,
    delay: 300,
    selectOnClose: true,
    dropdownParent: $('#frmArticulos'),
    ajax: {
        url: "app/api/b2b.php?method=GetExirosProducts",
        dataType: 'json',
        data: function (params) {
            return {
                pageSize: 20,
                pageNumber: 0,
                search: params.term || ''
            };
        },
        processResults: function (response) {
            // response: { products: [...], searchCount: n }
            const products = (response && response.products) || [];
            return {
                results: products.map(function (p) {
                    return {
                        id: p.codigoInterno,
                        text: `${p.supplierPartID} - ${p.shortName}`,
                        // Campos del payload Exiros que usaremos en la tabla y para PunchOut
                        supplierPartID: p.supplierPartID,
                        buyerPartID: p.buyerPartID,
                        supplierPartAuxiliaryID: p.supplierPartAuxiliaryID,
                        currency: p.currency,
                        shortName: p.shortName,
                        unitOfMeasure: p.unitOfMeasure,
                        category: p.category,
                        codigoInterno: p.codigoInterno,
                        longName: p.longName,
                        manufacturer: p.manufacturer,
                        manufacturerModelNumber: p.manufacturerModelNumber,
                        materialGroup: p.materialGroup,
                        amount: p.amount,
                        imagen: p.imagen
                    };
                })
            };
        }
    },
    templateResult: formatResult
});

// Enviar OCI desde Compra Rápida
$('#btnEnviarOCI').on('click', async function (e) {
    e.preventDefault();

    if (!itemsCotizacion || itemsCotizacion.length === 0) {
        alert('No hay artículos para enviar.');
        return;
    }

    const $btn = $(this);
    const originalHtml = $btn.html();
    
    try {
        // Mostrar estado de carga
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Enviando...');
        
        // Obtener datos de sesión PunchOut
        const hookData = await obtenerDatosSesionPunchOut();
        
        // Construir orderData con datos reales de la sesión
        const hook = hookData?.data?.hook || {
            buyerCookie: sessionStorage.getItem('punchoutSessionID') || '',
            browserFormPostUrl: window.HOOK_URL || window.BrowserFormPostUrl || hookData?.data?.hook?.browserFormPostUrl || '',
            extrinsics: []
        };
        
        const items = itemsCotizacion.map(it => ({
            item: {
                shortname: String(it.shortName || '').trim(),
                longname: String(it.longName || '').trim(),
                unitOfMeasure: it.unitOfMeasure || '',
                itemPrice: Number((Number(it.amount || 0) * Number(it.cantidad || 1)).toFixed(2)),
                priceUnit: 1,
                unitPrice: Number(Number(it.amount || 0).toFixed(2)),
                quantity: Number(it.cantidad || 1),
                currency: it.currency || 'MXN',
                category: (it.category || '').trim(),
                supplierPartID: it.supplierPartID || '',
                supplierPartAuxiliaryID: it.supplierPartAuxiliaryID || '',
                manufacturer: it.manufacturer || '',
                manufacturerModelNumber: it.manufacturerModelNumber || '',
                codigoArticulo: it.codigoInterno || it.supplierPartAuxiliaryID || it.supplierPartID || ''
            }
        }));

        const orderData = { hook, items };
        console.log('Enviando OCI con datos:', orderData);
        GenerarOCI_Quick(orderData);
        
    } catch (error) {
        console.error('Error al obtener datos de sesión:', error);
        alert('Error al preparar el envío. Verifique su sesión PunchOut.');
    } finally {
        // Restaurar botón después de 2 segundos
        setTimeout(() => {
            $btn.prop('disabled', false).html(originalHtml);
        }, 2000);
    }
});

function GenerarOCI_Quick(orderData) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.enctype = 'application/x-www-form-urlencoded';
    form.acceptCharset = 'UTF-8';

    let hookUrl = (typeof orderData.hook === 'string' && orderData.hook)
        || (orderData.hook && orderData.hook.browserFormPostUrl)
        || window.HOOK_URL || '';
        
    if (!hookUrl) {
        alert('No se encontró URL de destino.');
        return;
    }
    
    form.action = hookUrl;

    const addHidden = (name, value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value != null ? String(value) : '';
        form.appendChild(input);
    };

    const addLongText = (name, text) => {
        const ta = document.createElement('textarea');
        ta.name = name;
        ta.style.display = 'none';
        ta.value = text != null ? String(text) : '';
        form.appendChild(ta);
    };

    (orderData.items || []).forEach((wrapper, idx) => {
        const n = idx + 1;
        const item = wrapper.item || {};

        // Mapeo exacto de DetallesCarrito.js
        addHidden(`NEW_ITEM-VENDORMAT[${n}]`, item.supplierPartAuxiliaryID || item.codigoArticulo);
        addHidden(`NEW_ITEM-MATGROUP[${n}]`, (item.category || '').substring(0, 10));
        addHidden(`NEW_ITEM-DESCRIPTION[${n}]`, item.shortname);
        addHidden(`NEW_ITEM-LANGUAGE[${n}]`, 'ES');
        addHidden(`NEW_ITEM-PRICE[${n}]`, Number(item.unitPrice).toFixed(2));
        addHidden(`NEW_ITEM-CURRENCY[${n}]`, item.currency);
        addHidden(`NEW_ITEM-QUANTITY[${n}]`, item.quantity);
        addHidden(`NEW_ITEM-PRICEUNIT[${n}]`, item.priceUnit || 1);
        addHidden(`NEW_ITEM-UNIT[${n}]`, item.unitOfMeasure);
        
        // URL de Imagen
        const imgUrl = `https://mersolsureste.com.mx/articulos/index.php?img=${encodeURIComponent(item.codigoArticulo)}`;
        addHidden(`NEW_ITEM-ATTACHMENT[${n}]`, imgUrl);
        
        addHidden(`NEW_ITEM-VENDOR[${n}]`, '108752');
        addHidden(`NEW_ITEM-MANUFACTCODE[${n}]`, item.manufacturer || '');
        addHidden(`NEW_ITEM-MANUFACTMAT[${n}]`, item.codigoArticulo || '');

        // CUST_FIELD1 (Sanitizado)
        const rawC1 = (item.manufacturerModelNumber || item.codigoArticulo || '');
        const clampedC1 = rawC1.replace(/[^A-Za-z0-9]/g, '').substring(0, 10);
        addHidden(`NEW_ITEM-CUST_FIELD1[${n}]`, clampedC1);

        addHidden(`NEW_ITEM-URL[${n}]`, window.location.href);
        addLongText(`NEW_ITEM-LONGTEXT_${n}:132[]`, item.longname);
    });

    document.body.appendChild(form);
    HTMLFormElement.prototype.submit.call(form);
}


// Función auxiliar para obtener SessionID de PunchOut
function getPunchoutSID() {
  try {
    return sessionStorage.getItem('punchoutSessionID');
  } catch (e) {
    return null;
  }
}

async function obtenerDatosSesionPunchOut() {
  const sessionID = sessionStorage.getItem('punchoutSessionID');
  if (!sessionID) {
    console.warn('No se encontró SessionID de PunchOut');
    return null;
  }

  try {
    const res = await fetch(`app/api/exiros.php?method=get-session&SessionID=${encodeURIComponent(sessionID)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    if (data.error || data.isError) {
      console.error('Error del servidor:', data.message);
      return null;
    }
    
    console.log('Datos de sesión obtenidos:', data);
    return data;
  } catch (err) {
    console.error('Error al recuperar sesión:', err);
    return null;
  }
}


//. Array de cotización
let itemsCotizacion = [];


// Maneja el click en "Agregar a la lista"
$('#btnAgregar').on('click', function (e) {
  e.preventDefault();

  const producto = $('#articulo').select2('data')[0];
  const cantidad = parseInt($('#cantidad').val(), 10);

  if (!producto || producto.id === '-1') { alert('Selecciona un artículo.'); return; }
  if (!cantidad || cantidad <= 0)        { alert('Ingresa una cantidad válida.'); return; }

  producto.cantidad = cantidad;
  agregarAlCarritoDesdeFuente(producto); // ya hace push y calcula subtotal

  $('#cantidad').val('1');
  listItems();
});


function listItems() {
  let row = `<tr>
      <td colspan="8">No se ha ingresado ningun articulo</td>
  </tr>`;

  let total = 0;
  let currency = 'MXN';

  if (itemsCotizacion.length > 0) {
    row = '';
    currency = itemsCotizacion[0].currency || 'MXN';
    itemsCotizacion.forEach((item, index) => {
      total += Number(item.subTotal || 0);

      const imgSrc = item.imagen || (item.supplierPartID && item.codigoInterno
        ? `https://mersolsureste.com.mx/articulos/index.php?clave=${encodeURIComponent(item.supplierPartID)}&img=${encodeURIComponent(item.codigoInterno)}`
        : '');

      row += `<tr>
          <td>${index + 1}</td>
          <td>${item.codigoInterno || ''}</td>
          <td class="d-none">${item.codigoInterno || ''}</td>
          <td>${item.manufacturer || ''}</td>
          <td>${item.shortName || ''}</td>
          <td>${item.unitOfMeasure || ''}</td>
          <td>$ ${Number(item.amount || 0).toFixed(2)} ${item.currency || ''}</td>
          <td>
            <input type="number" class="form-control form-control-sm input-cantidad" 
                   data-index="${index}" 
                   value="${item.cantidad || 1}" 
                   min="1" style="width:80px;">
          </td>
          <td>$ ${Number(item.subTotal || 0).toFixed(2)} ${item.currency || ''}</td>
          <td>
              <img alt="${item.shortName || ''}" class="img-fluid" 
                   style="max-width:64px;max-height:64px;object-fit:cover;" 
                   src="${imgSrc}">
          </td>
          <td>
              <button class="btn btn-danger btn-sm drop" data-index="${index}">
                  <i class="fa-solid fa-circle-minus"></i>
              </button>
          </td>
      </tr>`;
    });
  }

  $('#itemList').html(row);
  $('#totalItems').html(`$ ${total.toFixed(2)} ${currency}`);
}

const tracker = {
    // Función central que envía datos a PHP asíncronamente
    sendToServer: function(type, msg, data = null) {
        // Intentamos obtener la sesión activa
        let sid = new URLSearchParams(location.search).get('SessionID') || sessionStorage.getItem('punchoutSessionID') || 'SinSesion';
        
        fetch('app/api/loggerExiros.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origen: 'CompraRapida', // Saber qué archivo generó el log
                type: type,
                session: sid,
                message: msg,
                data: data
            })
        }).catch(err => { /* Ignoramos fallos de red silenciosamente */ });
    },
    step: function(msg, data = null) {
        this.sendToServer('INFO', msg, data);
    },
    success: function(msg, data = null) {
        this.sendToServer('OK', msg, data);
    },
    error: function(msg, err) {
        this.sendToServer('ERROR', msg, err ? err.toString() : null);
    }
};


$('#btnSolicitar').on('click', async function (e) {
    e.preventDefault();
    const $btn = $(this);
    const originalHtml = $btn.html();

    tracker.step("Iniciando clic en #btnSolicitar");

    // 0. Recuperar SessionID (Clave para que exiros.php reconozca la sesión)
    let sid = (function () {
        let u = new URLSearchParams(location.search).get('SessionID');
        if (u) { try { sessionStorage.setItem('punchoutSessionID', u); } catch (_) { } }
        return u || sessionStorage.getItem('punchoutSessionID');
    })();

    // UI State
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Procesando...');

    try {
        // PASO 1: Obtener la sesión y el HookUrl (Tal cual lo hace DetallesCarrito)
      // PASO 1: Obtener la sesión y el HookUrl
        tracker.step("Paso 1: Recuperando sesión activa de la API");
        const sessionRes = await $.getJSON(`app/api/exiros.php?method=get-session${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`);
        
        if (!sessionRes || sessionRes.isError || sessionRes.error === true) {
            throw new Error(sessionRes.message || "No se pudo recuperar la sesión de PunchOut");
        }

        // Extraemos HOOK_URL. 
        // Si viene NULL de la API (como en tu log), buscamos en window.HOOK_URL.
        // Si todo falla, ponemos el tester por defecto como SALVAVIDAS para que no rompa.
        // Buscamos el Hook en todas las rutas posibles donde tu API lo puede esconder:
        let hookUrl = 
            (sessionRes.data && sessionRes.data.hook && sessionRes.data.hook.browserFormPostUrl) || // 1. Como lo lee DetallesCarrito (Oficial)
            sessionRes.HOOK_URL ||                                                                  // 2. Como lo lee OCI puro
            (sessionRes.extrinsics && sessionRes.extrinsics.HOOK_URL) ||                            // 3. Dentro de extrinsics
            window.HOOK_URL;                                                                        // 4. Memoria global (Caché)
                
        if (!hookUrl || hookUrl === 'null') {
            console.warn("⚠️ Sesión PHP devolvió Hook Nulo. Aplicando fallback de Tester OCI.");
            hookUrl = "https://punchoutcommerce.com/tools/oci-roundtrip-return"; 
            // Opcional: throw new Error("La sesión de PunchOut caducó o no tiene HookUrl. Por favor, reinicia el flujo desde el ERP.");
        }
        
        tracker.success("Sesión y Hook recuperados", { hookUrl });


        // PASO 2: Guardando en base de datos
        tracker.step("Paso 2: Construyendo Payload de Carrito");
        
        // Vamos a intentar leer de las 3 variables más comunes que usas en tu sistema
        // window.exportedCarrito (usado en DetallesCarrito)
        // window.itemsCotizacion (tu array global)
        // window.carrito (otra posibilidad común)
        let itemsFuente = [];
        if (typeof itemsCotizacion !== 'undefined' && itemsCotizacion.length > 0) {
            itemsFuente = itemsCotizacion;
        } else if (window.exportedCarrito && window.exportedCarrito.items && window.exportedCarrito.items.length > 0) {
            itemsFuente = window.exportedCarrito.items;
        } else if (typeof carrito !== 'undefined' && carrito.length > 0) {
            itemsFuente = carrito;
        }

        const itemsParaGuardar = itemsFuente.map(it => ({
            item: {
                shortname: String(it.shortName || it.shortname || '').trim(),
                longname: String(it.longName || it.longname || '').trim(),
                unitOfMeasure: it.unitOfMeasure || '',
                itemPrice: Number((Number(it.amount || it.itemPrice || it.unitPrice || 0) * Number(it.cantidad || it.quantity || 1)).toFixed(2)),
                priceUnit: 1,
                unitPrice: Number(Number(it.amount || it.unitPrice || it.itemPrice || 0).toFixed(2)),
                quantity: Number(it.cantidad || it.quantity || 1),
                currency: it.currency || 'MXN',
                category: String(it.category || '').trim(),
                supplierPartID: it.supplierPartID || '',
                supplierPartAuxiliaryID: it.supplierPartAuxiliaryID || '',
                manufacturer: it.manufacturer || '',
                manufacturerModelNumber: it.manufacturerModelNumber || '',
                codigoArticulo: it.codigoInterno || it.codigoArticulo || it.supplierPartAuxiliaryID || it.supplierPartID || '',
                imagen: it.imagen || ''
            }
        }));

        if (itemsParaGuardar.length === 0) {
            console.error("⚠️ Variables de carrito vacías:", { itemsCotizacion: typeof itemsCotizacion, windowExported: typeof window.exportedCarrito });
            throw new Error("El carrito está vacío o las variables globales no están definidas en esta vista. Revisa la consola.");
        }
        // ==========================================
        // LÓGICA DE FOLIO IDENTIFICADOR (COMPRA RÁPIDA)
        // ==========================================
        let sufijoUnico = Date.now().toString().slice(-8); 
        
        // Aseguramos que tome el prefijo CR si window.folioCotizacion está vacío, nulo o undefined
        let folioTemporal = (window.folioCotizacion && window.folioCotizacion.trim() !== "") 
                            ? window.folioCotizacion 
                            : `CR${sufijoUnico}`;
        
        folioTemporal = String(folioTemporal).substring(0, 10);


        tracker.step("Paso 2B: Guardando en base de datos local", { items: itemsParaGuardar.length, folio: folioTemporal });

        const saveResp = await $.ajax({
            url: `app/api/exiros.php?method=SaveCarrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                SessionID: sid,
                hook: hookUrl, 
                items: itemsParaGuardar,
                FolioCotizacion: folioTemporal 
            })
        });
        
        // === NUEVA VALIDACIÓN ESTRICTA ===
        if (!saveResp || saveResp.isError || (saveResp.data && typeof saveResp.data === 'object' && saveResp.data.status === 400)) {
            let errorMsg = saveResp.message || "Error desconocido en el servidor al guardar el carrito.";
            if (saveResp.data && saveResp.data.errors) {
                errorMsg = JSON.stringify(saveResp.data.errors);
            }
            throw new Error(`Error en API Local (SaveCarrito): ${errorMsg}`);
        }

        const nuevoCarritoID = saveResp.data; 
        
        if (typeof nuevoCarritoID === 'object') {
             throw new Error("El servidor devolvió un objeto en lugar de un ID de carrito válido.");
        }

        tracker.success("Carrito guardado localmente", { ID: nuevoCarritoID });

        // PASO 3: Disparar a Exiros (GenerarOCI)
        tracker.step("Paso 3: Disparando formulario OCI hacia el Hook");
        
        // === EL OTRO CAMBIO CLAVE ===
        // Pasamos directamente el string 'hookUrl' al objeto para que GenerarOCI lo entienda
        const orderData = {
            hook: hookUrl, 
            items: itemsParaGuardar
        };

        // LLAMADA CLAVE: Se le pasa el ID local para el CUST_FIELD2
        GenerarOCI(orderData, nuevoCarritoID);
        
        tracker.success("Formulario OCI enviado. Saliendo del sitio...");

    } catch (err) {
        tracker.error("Falla en el flujo de Compra Rápida", err.message);
        Swal.fire("Error", err.message, "error");
        $btn.prop('disabled', false).html(originalHtml);
    }
});

// AÑADIDO: Recibe el segundo parámetro 'nuevoCarritoID'
function GenerarOCI(orderData, nuevoCarritoID) {
    const form = document.createElement("form")
    form.method = "POST"
    // Ensure standard URL-encoded POST for OCI
    form.enctype = "application/x-www-form-urlencoded"
    form.acceptCharset = "UTF-8"
    form.target = "_blank";

    const hookUrl =
        (typeof orderData.hook === 'string' && orderData.hook) ||
        (orderData.hook && typeof orderData.hook.browserFormPostUrl === 'string' && orderData.hook.browserFormPostUrl) ||
        "";
    form.action = hookUrl

    const addHidden = (name, value) => {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = name
        input.value = value != null ? String(value) : ""
        form.appendChild(input)
    }

    const addLongText = (name, text) => {
        const ta = document.createElement("textarea")
        ta.name = name
        ta.style.display = "none"
        ta.cols = 20
        ta.value = text != null ? String(text) : ""
        form.appendChild(ta)
    }

    (orderData.items || []).forEach((wrapper, idx) => {
        const n = idx + 1
        const item = (wrapper && wrapper.item) || {}

        // OCI expects unit price in NEW_ITEM-PRICE; not total
        const price = Number(item.unitPrice ?? item.itemPrice ?? 0)
        const qty = Number(item.quantity ?? 0)
        const matgrp = (item.category || "").trim().substring(0, 10)
        const safeTrim = (v) => (v != null ? String(v).trim() : "")
        const shortnm = safeTrim(item.shortname || "")
        const longnm = safeTrim(item.longname || "")

        // Build OCI attachment URL: clave from supplierPartID, img from codigoArticulo (with fallbacks)
        const _claveForImg = item.supplierPartID || item.supplierPartAuxiliaryID || item.buyerPartID || "";
        const _codigoForImg = item.codigoArticulo || item.codigoInterno || item.supplierPartAuxiliaryID || item.supplierPartID || "";
        let _dynImgUrl = (_claveForImg && _codigoForImg)
            ? `https://mersolsureste.com.mx/articulos/index.php?img=${encodeURIComponent(_codigoForImg)}`
            : (item.imagen || "");
        // Normalize any accidental breaks/spaces for tester RAW view
        _dynImgUrl = _dynImgUrl.replace(/[\r\n]+/g, '&').replace(/\s*&\s*/g, '&').replace('?&', '?').replace(/&&+/g, '&').trim();
        
        addHidden(`NEW_ITEM-VENDORMAT[${n}]`, item.supplierPartAuxiliaryID)
        addHidden(`NEW_ITEM-MATGROUP[${n}]`, matgrp)
        addHidden(`NEW_ITEM-DESCRIPTION[${n}]`, shortnm)
        addHidden(`NEW_ITEM-LANGUAGE[${n}]`, "ES")
        addHidden(`NEW_ITEM-PRICE[${n}]`, price.toFixed(2))
        addHidden(`NEW_ITEM-CURRENCY[${n}]`, item.currency)
        addHidden(`NEW_ITEM-QUANTITY[${n}]`, qty)
        addHidden(`NEW_ITEM-PRICEUNIT[${n}]`, item.priceUnit ?? 1)
        addHidden(`NEW_ITEM-UNIT[${n}]`, item.unitOfMeasure)
        addHidden(`NEW_ITEM-ATTACHMENT[${n}]`, _dynImgUrl)
        addHidden(`NEW_ITEM-VENDOR[${n}]`, "108752")
        // Manufacturer and custom fields
        addHidden(`NEW_ITEM-MANUFACTCODE[${n}]`, item.manufacturer || '')
        addHidden(`NEW_ITEM-MANUFACTMAT[${n}]`, item.codigoArticulo  || '')
        
        // CUST_FIELD1: max length 10 -> remove non-alphanumerics then clamp to 10
        const _rawC1 = (item.manufacturerModelNumber || item.codigoArticulo || '');
        const _sanC1 = _rawC1.replace(/[^A-Za-z0-9]/g, '');
        const _clampC1 = _sanC1.substring(0, 10);
        addHidden(`NEW_ITEM-CUST_FIELD1[${n}]`, _clampC1)
        
        // ==========================================
        // AÑADIDO: VINCULAR EL ID DEL CARRITO (Auditoría)
        // ==========================================
        if (nuevoCarritoID) {
            addHidden(`NEW_ITEM-CUST_FIELD2[${n}]`, nuevoCarritoID)
        }

        addHidden(`NEW_ITEM-URL[${n}]`, window.location.href)
        // LONGTEXT (bracketless as requested), keep hidden input for tester visibility
        addLongText(`NEW_ITEM-LONGTEXT_${n}:132[]`, longnm)
    })

    document.body.appendChild(form)

    // Míralo en consola
    console.log(form.outerHTML)

    if (hookUrl) {
        HTMLFormElement.prototype.submit.call(form)
    }

    return form
}



// Elimina artículo de la lista
// Delegación de evento para editar cantidad
$('#itemList').on('input','.input-cantidad', function () {
  const idx = $(this).data('index');
  const nuevaCantidad = Number($(this).val()) || 1;

  if (itemsCotizacion[idx]) {
    itemsCotizacion[idx].cantidad = nuevaCantidad;
    itemsCotizacion[idx].subTotal = Number((itemsCotizacion[idx].amount * nuevaCantidad).toFixed(2));
  }

  // Vuelve a repintar la tabla
  listItems();
});
// Evento: eliminar producto
$('#itemList').on('click', '.drop', function () {
  const idx = $(this).data('index');
  itemsCotizacion.splice(idx, 1);
  listItems();
});

// C G R L
//funcion para manejar el drawer de pedidos

// Drawer de pedidos (basado en MisCompras)
(function () {
  const lista = document.getElementById('listaPedidos');
  const inputBuscar = document.getElementById('buscarPedido');

  const money = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const fmtFecha = iso => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'2-digit' });
    } catch { return iso }
  };

  const statusBadge = s => {
    const k = (s||'').toLowerCase();
    if (k.includes('entreg')) return `<span class="badge-status badge-ok"><i class="fa-solid fa-circle-check"></i> ${s}</span>`;
    if (k.includes('rechaz')) return `<span class="badge-status badge-pend"><i class="fa-solid fa-ban"></i> ${s}</span>`;
    if (k.includes('envi'))   return `<span class="badge-status badge-ship"><i class="fa-solid fa-truck"></i> ${s}</span>`;
    if (k.includes('compr'))  return `<span class="badge-status badge-ship"><i class="fa-solid fa-cart-shopping"></i> ${s}</span>`;
    return `<span class="badge-status badge-pend"><i class="fa-solid fa-clock"></i> ${s||'Pendiente'}</span>`;
  };

 function render(data){
  lista.innerHTML = '';
  if (!data.length) {
    lista.innerHTML = `<li class="list-group-item text-muted">Sin compras</li>`;
    return;
  }

  data.forEach(c => {
    const li = document.createElement('li');
    li.className = 'pedido-item list-group-item';

    const fecha = c.fechaCreacion || c.fecha || "";
    const productos = (c.items || []).length;
    const total = (c.items||[]).reduce((s,it)=>
      s + (Number(it.unitPrice||it.itemPrice)||0) * (Number(it.quantity)||0),0);

    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-3">
          <img class="pedido-thumb rounded" 
               src="public/img/logo.png" 
               alt="Carrito ${c.carritoExirosID}" 
               width="48" height="48">
          <div>
            <div class="fw-semibold">Carrito #${c.carritoExirosID}</div>
            <div class="small text-muted">
              <i class="fa-regular fa-calendar"></i> ${fmtFecha(fecha)}
              &nbsp;·&nbsp; Folio: ${c.folioCotizacion || '—'}
              &nbsp;·&nbsp; ${productos} producto${productos!==1 ? 's' : ''}
              &nbsp;·&nbsp; ${statusBadge(c.estado?.nombre || '')}
            </div>
          </div>
        </div>
        <div class="text-end">
          <div class="fw-semibold">${money(total)}</div>
          <div class="mt-1">
          <a class="btn btn-dark btn-sm" 
            href="${repoBase}/cotizar?clienteID=${encodeURIComponent(currentClienteID)}&carritoId=${encodeURIComponent(c.carritoExirosID)}">
            Cargar <i class="fa-solid fa-rotate-right"></i>
          </a>
          </div>
        </div>
      </div>
    `;

    lista.appendChild(li);
  });
}


  async function cargarPedidos(clienteID){
    try {
      // const res = await fetch(`/B2B-EXIROS-FRONT/app/api/misCompras.php?method=exiros-get-compra&clienteID=${encodeURIComponent(clienteID)}`);
      const res = await fetch(`/app/api/misCompras.php?method=exiros-get-compra&clienteID=${encodeURIComponent(clienteID)}`);
      const data = await res.json();
      
      render(Array.isArray(data)? data : [data]);
    } catch(err){
      console.error(" Error cargando pedidos:",err);
      lista.innerHTML = `<li class="list-group-item text-danger">Error al cargar</li>`;
    }
  }

  //  Buscar cliente y cargar pedidos
  inputBuscar?.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clienteID = inputBuscar.value.trim();
      if (clienteID) {
        currentClienteID = clienteID;
        cargarPedidos(clienteID);
      }
    }
  });

  // carga demo opcional
  //cargarPedidos("CL-00078");

})();







// Sugerencias del producto
function renderSugerencia(producto) {
  const manufacturer = (producto.manufacturer || "Sugerido").toUpperCase();
  const image = producto.imagen || "/assets/placeholder.jpg";
  const nombre = producto.shortName || producto.nombre || "Producto";
  const precio = `$${Number(producto.amount || producto.precio || 0).toFixed(2)} MXN`;

  return `
    <div class="wrapper me-3">
      <div class="container">
        <div class="top" style="background: url('${image}') no-repeat center center / cover;"></div>
        <div class="bottom">
          <div class="left">
            <div class="details">
              <h1>${nombre}</h1>
              <p>${precio}</p>
            </div>
            <div class="buy">
              <button class="btn btn-dark w-100 btnAgregarCarrito" 
                      data-producto='${JSON.stringify(producto)}' 
                      tooltip="Agregar">
                <i class="fa-solid fa-cart-plus"></i>
              </button>
            </div>
          </div>
          <div class="right">
            <div class="done"><i class="material-icons">done</i></div>
            <div class="details">
              <h1>${nombre}</h1>
              <p>Agregado al carrito</p>
            </div>
            <div class="remove"><i class="material-icons">clear</i></div>
          </div>
        </div>
      </div>
      <div class="inside">
        <div class="icon" style="font-weight: bold; font-size: 0.8rem;">${manufacturer}</div>
        <div class="contents">
          <h4>${manufacturer}</h4>
          <table>
            <tr><th>Producto</th><td>${nombre}</td></tr>
            <tr><th>Precio unitario</th><td>${precio}</td></tr>
          </table>
        </div>
      </div>
    </div>
  `;
}

function cargarSugerencias() {
  const grid = document.getElementById('sugerenciasGrid');
  if (!grid) return;

  const sessionId = getPunchoutSID();
  const url = `app/api/b2b.php?method=GetExirosProducts&pageSize=50&pageNumber=1${sessionId ? `&SessionID=${encodeURIComponent(sessionId)}` : ''}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data || !Array.isArray(data.products)) return;

      // Usa el mismo formato que en select2
      const productos = data.products.map(p => ({
        id: p.codigoInterno,
        text: `${p.supplierPartID} - ${p.shortName}`,
        supplierPartID: p.supplierPartID,
        buyerPartID: p.buyerPartID,
        supplierPartAuxiliaryID: p.supplierPartAuxiliaryID,
        currency: p.currency || "MXN",
        shortName: (p.shortName || p.longName || "SIN NOMBRE").substring(0, 40),
        unitOfMeasure: p.unitOfMeasure && p.unitOfMeasure.trim() !== "" ? p.unitOfMeasure : "EA",
        category: p.category || "",
        codigoInterno: p.codigoInterno || "",
        longName: p.longName || "",
        manufacturer: p.manufacturer || "",
        manufacturerModelNumber: p.manufacturerModelNumber || "",
        materialGroup: p.materialGroup || "",
        amount: Number(p.amount || 0),
        imagen: p.imagen || "/assets/placeholder.jpg"
      }));

      if (productos.length === 0) return;

      const sugeridos = productos.sort(() => 0.5 - Math.random()).slice(0, 6);

      let html = '';
      sugeridos.forEach(p => {
        // Aquí pasamos el objeto completo
        html += renderSugerencia(p);
      });

      grid.innerHTML = html;
    })
    .catch(err => console.warn("Error al cargar sugerencias:", err));
}

// Delegación de eventos para agregar al carrito
document.addEventListener("click", function(e) {
  const btn = e.target.closest(".btnAgregarCarrito");
  if (!btn) return;
  e.preventDefault();
  const producto = JSON.parse(btn.getAttribute("data-producto"));
  itemsCotizacion.push({ ...producto, cantidad: 1, subTotal: producto.amount });
  listItems();
});



document.addEventListener('DOMContentLoaded', () => {
  // seguir mostrando sugerencias como antes
  cargarSugerencias();

  // capturar parámetros de la URL
  const params = new URLSearchParams(window.location.search);
  const clienteID = params.get("clienteID");
  const carritoId = params.get("carritoId");

  if (clienteID && carritoId) {
    fetch(`app/api/misCompras.php?method=exiros-get-compra&clienteID=${encodeURIComponent(clienteID)}`)
      .then(res => res.json())
      .then(data => {
        const compras = Array.isArray(data) ? data : [data];
        const carrito = compras.find(c => String(c.carritoExirosID) === carritoId);
        if (carrito && carrito.items) {
          // 👇 ahora clonamos los productos como nuevos
          clonarCarritoComoNuevo(carrito);
          //console.log("Carrito recargado como nuevo:", carritoId);
        } else {
          // console.warn("No se encontró el carrito en la respuesta");
        }
      })
      .catch(err => console.error("Error cargando carrito existente:", err));
  }

  const cotTrasferida = sessionStorage.getItem('transferencia_cotizacion');
  if (cotTrasferida) {
    try {
      const items = JSON.parse(cotTrasferida);
      if (Array.isArray(items) && items.length > 0) {
        // Limpiamos el carrito actual y cargamos los nuevos
        itemsCotizacion = items;
        
        // Refrescamos la tabla visual
        listItems();
        
        // Limpiamos el storage para que no se repita al recargar la página
        sessionStorage.removeItem('transferencia_cotizacion');
        
        console.log("Cotización cargada desde transferencia");
      }
    } catch (e) {
      console.error("Error al procesar transferencia de cotización", e);
    }
  }

});








function agregarAlCarritoDesdeFuente(fuente, cantidadFallback = 1) {
  // Normaliza origen: Select2 trae campos Exiros completos; Sugerencias trae nombre/precio/imagen.
  const isSelect2 = !!fuente.supplierPartID || !!fuente.codigoInterno;

  const cantidad = Number(fuente.cantidad || cantidadFallback || 1);
  const precio   = Number(fuente.amount ?? fuente.precio ?? 0);
  const currency = fuente.currency || 'MXN';

  const item = {
    supplierPartID:            fuente.supplierPartID || '',
    buyerPartID:               fuente.buyerPartID || '',
    supplierPartAuxiliaryID:   fuente.supplierPartAuxiliaryID || '',
    currency:                  currency,
    shortName:                 fuente.shortName || fuente.nombre || '',
    unitOfMeasure:             fuente.unitOfMeasure || '',
    category:                  fuente.category || '',
    codigoInterno:             fuente.codigoInterno || '',
    longName:                  fuente.longName || fuente.nombre || '',
    manufacturer:              fuente.manufacturer || '',
    manufacturerModelNumber:   fuente.manufacturerModelNumber || '',
    materialGroup:             fuente.materialGroup || '',
    amount:                    precio,
    imagen:                    fuente.imagen || '',
    cantidad:                  cantidad,
    subTotal:                  Number((cantidad * precio).toFixed(2))
  };

  // Si viene de sugerencias sin IDs, usa nombre como fallback suave (no ideal, pero funcional)
  if (!isSelect2 && !item.supplierPartID && !item.codigoInterno) {
    item.supplierPartID = (item.shortName || 'SKU')   // fallback
      .toString().slice(0, 20).toUpperCase();
  }

  itemsCotizacion.push(item);
  listItems();
}

// Convierte un carrito de MisCompras a itemsCotizacion
function cargarCarritoExistente(carrito) {
  if (!carrito || !Array.isArray(carrito.items)) return;

  // Limpia la lista actual
  itemsCotizacion = [];

  carrito.items.forEach(it => {
    const precio = Number(it.unitPrice ?? it.itemPrice ?? 0);
    const cantidad = Number(it.quantity ?? 1);

    itemsCotizacion.push({
      supplierPartID: it.supplierPartID || '',
      buyerPartID: it.buyerPartID || '',
      supplierPartAuxiliaryID: it.supplierPartAuxiliaryID || '',
      currency: it.currency || 'MXN',
      shortName: it.shortname || it.longname || '',
      unitOfMeasure: it.unitOfMeasure || 'EA',
      category: it.category || '',
      codigoInterno: it.codigoArticulo || '',
      longName: it.longname || it.shortname || '',
      manufacturer: it.manufacturer || '',
      manufacturerModelNumber: it.manufacturerModelNumber || '',
      materialGroup: it.materialGroup || '',
      amount: precio,
      imagen: it.imagen || '',
      cantidad: cantidad,
      subTotal: Number((precio * cantidad).toFixed(2))
    });
  });

  // Refresca la tabla en Compra Rápida
  listItems();
}




async function clonarCarritoComoNuevo(carritoAnterior) {
  if (!carritoAnterior || !Array.isArray(carritoAnterior.items)) return;

  // Limpia el carrito actual para empezar uno nuevo
  itemsCotizacion = [];

  for (const it of carritoAnterior.items) {
    const codigo = it.codigoArticulo || it.supplierPartID || "";

    try {
      // Buscar el producto en la API por código
      const url = `app/api/b2b.php?method=GetExirosProducts&pageSize=1&pageNumber=0&search=${encodeURIComponent(codigo)}`;
      const res = await fetch(url);
      const data = await res.json();

      const producto = (data.products && data.products[0]) || null;
      if (!producto) {
        console.warn(`No se encontró el producto ${codigo}, usando datos heredados`);
        // Si no existe en catálogo, usamos lo que venga en el carrito viejo
        agregarAlCarritoDesdeFuente({
          supplierPartID: it.supplierPartID,
          codigoInterno: it.codigoArticulo,
          shortName: it.shortname,
          longName: it.longname,
          manufacturer: it.manufacturer,
          amount: it.unitPrice || it.itemPrice,
          unitOfMeasure: it.unitOfMeasure,
          imagen: it.imagen,
          cantidad: it.quantity
        }, it.quantity);
        continue;
      }

      // Inyectar cantidad y precio heredados en el producto encontrado
      producto.cantidad = Number(it.quantity || 1);
      producto.amount   = Number(it.unitPrice || it.itemPrice || producto.amount);

      // Reusar función normalizadora
      agregarAlCarritoDesdeFuente(producto, producto.cantidad);
    } catch (err) {
      console.error("Error buscando producto", codigo, err);
    }
  }

  // Actualizar tabla visual
  listItems();
}
