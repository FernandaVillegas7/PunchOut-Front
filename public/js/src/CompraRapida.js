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
$('#btnEnviarOCI').on('click', function (e) {
    e.preventDefault();

    if (!itemsCotizacion || itemsCotizacion.length === 0) {
        alert('No hay artículos para enviar.');
        return;
    }

    // Construir orderData como en DetallesCarrito
    const hook = (window.exportedCarrito && window.exportedCarrito.hook) || {
        buyerCookie: null,
        browserFormPostUrl: 'https://punchoutcommerce.com/tools/oci-roundtrip-return',
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
    GenerarOCI_Quick(orderData);
});

function GenerarOCI_Quick(orderData) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.enctype = 'application/x-www-form-urlencoded';
    form.acceptCharset = 'UTF-8';

    const hookUrl = (typeof orderData.hook === 'string' && orderData.hook)
        || (orderData.hook && typeof orderData.hook.browserFormPostUrl === 'string' && orderData.hook.browserFormPostUrl)
        || '';
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
        ta.cols = 20;
        ta.value = text != null ? String(text) : '';
        form.appendChild(ta);
    };

    (orderData.items || []).forEach((wrapper, idx) => {
        const n = idx + 1;
        const item = (wrapper && wrapper.item) || {};

        const price = Number(item.unitPrice ?? item.itemPrice ?? 0);
        const qty = Number(item.quantity ?? 0);
        const matgrp = (item.category || '').trim().substring(0, 10);
        const safeTrim = (v) => (v != null ? String(v).trim() : '');
        const shortnm = safeTrim(item.shortname || '');
        const longnm = safeTrim(item.longname || '');

        const _claveForImg = item.supplierPartID || item.supplierPartAuxiliaryID || item.buyerPartID || '';
        const _codigoForImg = item.codigoArticulo || item.codigoInterno || item.supplierPartAuxiliaryID || item.supplierPartID || '';
        let _dynImgUrl = (_claveForImg && _codigoForImg)
            ? `https://mersolsureste.com.mx/articulos/index.php?img=${encodeURIComponent(_codigoForImg)}`
            : (item.imagen || '');
        _dynImgUrl = _dynImgUrl.replace(/[\r\n]+/g, '&').replace(/\s*&\s*/g, '&').replace('?&', '?').replace(/&&+/g, '&').trim();

        addHidden(`NEW_ITEM-VENDORMAT[${n}]`, item.supplierPartID);
        addHidden(`NEW_ITEM-MATGROUP[${n}]`, matgrp);
        addHidden(`NEW_ITEM-DESCRIPTION[${n}]`, shortnm);
        addHidden(`NEW_ITEM-LANGUAGE[${n}]`, 'ES');
        addHidden(`NEW_ITEM-PRICE[${n}]`, price.toFixed(2));
        addHidden(`NEW_ITEM-CURRENCY[${n}]`, item.currency);
        addHidden(`NEW_ITEM-QUANTITY[${n}]`, qty);
        addHidden(`NEW_ITEM-PRICEUNIT[${n}]`, item.priceUnit ?? 1);
        addHidden(`NEW_ITEM-UNIT[${n}]`, item.unitOfMeasure);
        addHidden(`NEW_ITEM-ATTACHMENT[${n}]`, _dynImgUrl);
        addHidden(`NEW_ITEM-VENDOR[${n}]`, '108752');
        addHidden(`NEW_ITEM-MANUFACTCODE[${n}]`, item.manufacturer || '');
        addHidden(`NEW_ITEM-MANUFACTMAT[${n}]`, item.manufacturerModelNumber || item.supplierPartID || '');
        // CUST_FIELD1: max length 10 -> remove non-alphanumerics then clamp to 10
        (function(){
            const raw = (item.supplierPartAuxiliaryID || item.codigoArticulo || '');
            const sanitized = raw.replace(/[^A-Za-z0-9]/g, '');
            const clamped = sanitized.substring(0, 10);
            addHidden(`NEW_ITEM-CUST_FIELD1[${n}]`, clamped);
        })();
        addHidden(`NEW_ITEM-URL[${n}]`, window.location.href);
        addLongText(`NEW_ITEM-LONGTEXT_${n}:132[]`, longnm);
    });

    document.body.appendChild(form);
    console.log(form.outerHTML);
    if (hookUrl) {
        HTMLFormElement.prototype.submit.call(form);
    }
    return form;
}

// 3. Array de cotización
let itemsCotizacion = [];

// Maneja el click en "Agregar a la lista"
$('#btnAgregar').on('click', function (e) {
  e.preventDefault();

  const producto = $('#articulo').select2('data')[0];
  const cantidad = parseInt($('#cantidad').val(), 10);

  if (!producto || producto.id === '-1') { alert('Selecciona un artículo.'); return; }
  if (!cantidad || cantidad <= 0)        { alert('Ingresa una cantidad válida.'); return; }

  // Inyecta la cantidad al objeto Select2 y reusa la misma lógica
  producto.cantidad = cantidad;
  agregarAlCarritoDesdeFuente(producto);

    // Agrega al array de cotización con los campos del payload Exiros
    itemsCotizacion.push({
        supplierPartID: producto.supplierPartID,
        buyerPartID: producto.buyerPartID,
        supplierPartAuxiliaryID: producto.supplierPartAuxiliaryID,
        currency: currency,
        shortName: producto.shortName,
        unitOfMeasure: producto.unitOfMeasure,
        category: producto.category,
        codigoInterno: producto.codigoInterno,
        longName: producto.longName,
        manufacturer: producto.manufacturer,
        manufacturerModelNumber: producto.manufacturerModelNumber,
        materialGroup: producto.materialGroup,
        amount: precio,
        imagen: producto.imagen,
        cantidad: cantidad,
        subTotal: subTotal
    });

    // Limpia el campo de cantidad
    $('#cantidad').val('1');

    // Actualiza la tabla de cotización
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
                <td>${item.cantidad || ''}</td>
                <td>$ ${Number(item.subTotal || 0).toFixed(2)} ${item.currency || ''}</td>
                <td>
                    <img alt="${item.shortName || ''}" class="img-fluid" style="max-width:64px;max-height:64px;object-fit:cover;" src="${imgSrc}">
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
    // Puedes mostrar un total general si es útil (aunque la tabla solicitada no lo requiere)
    $('#totalItems').html(`$ ${total.toFixed(2)} ${currency}`);
}

$('#btnSolicitar').on('click', function(e){
    e.preventDefault();

    // Construir y mostrar JSON similar a DetallesCarrito.js
    try {
        const hook = (window.exportedCarrito && window.exportedCarrito.hook) || null;
        const items = (itemsCotizacion || []).map(it => ({
            item: {
                shortname: it.shortName || '',
                longname: it.longName || '',
                unitOfMeasure: it.unitOfMeasure || '',
                itemPrice: Number((Number(it.amount || 0) * Number(it.cantidad || 1)).toFixed(2)),
                priceUnit: 1,
                unitPrice: Number(Number(it.amount || 0).toFixed(2)),
                quantity: Number(it.cantidad || 1),
                currency: it.currency || 'MXN',
                category: it.category || '',
                supplierPartID: it.supplierPartID || '',
                // extra fields used by OCI
                supplierPartAuxiliaryID: it.supplierPartAuxiliaryID || '',
                manufacturer: it.manufacturer || '',
                manufacturerModelNumber: it.manufacturerModelNumber || '',
                codigoArticulo: it.codigoInterno || it.supplierPartAuxiliaryID || it.supplierPartID || ''
            }
        }));

        const previewPayload = { hook, items };
        const $wrap = $('#jsonPreviewContainer');
        const $pre = $('#jsonPreview');
        if ($wrap.length && $pre.length) {
            $pre.text(JSON.stringify(previewPayload, null, 2));
            $wrap.show();
        }
        window.quickCartPreview = previewPayload;
        console.log('QuickCart JSON preview:', previewPayload);
    } catch (err) {
        console.warn('No se pudo generar la vista previa JSON:', err);
    }

    // Preparamos el array con el número de partida
    const itemsConPartida = itemsCotizacion.map((item, idx) => ({
        partida: idx + 1,
        articulo: item.articulo,
        cantidad: item.cantidad
        // Si necesitas más campos, agrégalos aquí
    }));

    if (itemsConPartida.length === 0) {
        alert('No hay productos para procesar.');
        return;
    }

    $.ajax({
        type: "POST",
        url: `app/api/compraRapida.php?method=compra-rapida`,
        dataType: "json",
        data: JSON.stringify(itemsConPartida),
        contentType: "application/json",
        success: function(response) {
            console.log(response);
            if (response.isError) {
                alert(response.message || "Ocurrió un error al procesar la compra.");
            } else {
                alert(response.message || "Cotización creada correctamente.");
                // Limpiar la lista y actualizar la tabla
                itemsCotizacion = [];
                listItems();
            }
        },
        error: function(xhr) {
            alert("Error al cargar el producto.");
        }
    });
});

// Elimina artículo de la lista
$('#itemList').on('click', '.drop', function () {
    const idx = $(this).data('index');
    itemsCotizacion.splice(idx, 1);
    listItems();
});

// C G R L
//funcion para manejar el drawer de pedidos
(function () {
  const lista = document.getElementById('listaPedidos')
  const inputBuscar = document.getElementById('buscarPedido')

  const pedidos = [
    { id: 'PO-3702266273', fecha: '2025-08-30', items: 4, total: 1580.40, estatus: 'Completado' },
    { id: 'PO-3702266201', fecha: '2025-08-24', items: 2, total: 420.00,  estatus: 'Enviado' },
    { id: 'PO-3702266155', fecha: '2025-08-17', items: 7, total: 3299.90, estatus: 'Completado' },
  ]

  const money = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'})

  function render(data){
  lista.innerHTML = ''
  if (!data.length) {
    lista.innerHTML = `<li class="list-group-item text-muted">Sin pedidos</li>`
    return
  }

  const money = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'})
  const fmtFecha = iso => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'2-digit' })
    } catch { return iso }
  }

  const statusBadge = s => {
    const k = (s||'').toLowerCase()
    if (k.includes('complet')) return `<span class="badge-status badge-ok"><i class="fa-solid fa-circle-check"></i> Completado</span>`
    if (k.includes('envi'))     return `<span class="badge-status badge-ship"><i class="fa-solid fa-truck"></i> Enviado</span>`
    return `<span class="badge-status badge-pend"><i class="fa-solid fa-clock"></i> Pendiente</span>`
  }

  const thumb = p => {
    return p.thumb || 'public/img/logo.png'
  }

  data.forEach(p => {
    const li = document.createElement('li')
    li.className = 'pedido-item'
    li.innerHTML = `
      <div class="pedido-card">
        <img class="pedido-thumb" src="${thumb(p)}" alt="Miniatura del pedido ${p.id}" loading="lazy">

        <div>
          <div class="pedido-title">${p.id}</div>
          <div class="pedido-meta">
            <i class="fa-regular fa-calendar"></i> ${fmtFecha(p.fecha)}
            &nbsp;·&nbsp;<i class="fa-solid fa-boxes-stacked"></i> ${p.items} artículos
            &nbsp;·&nbsp; ${statusBadge(p.estatus)}
          </div>
        </div>

        <div>
          <div class="pedido-price">${money(p.total)}</div>
          <div class="pedido-actions">
            <button class="btn btn-outline-primary btn-sm btn-ver" title="Ver detalle">
              <i class="fa-regular fa-eye"></i> Ver
            </button>
            <button class="btn btn-dark btn-sm btn-reordenar" title="Reordenar">
              <i class="fa-solid fa-rotate-right"></i> Reordenar
            </button>
          </div>
        </div>
      </div>
    `

    li.querySelector('.btn-ver').addEventListener('click', (e) => {
      e.stopPropagation()
      console.log('Ver detalle', p.id)

    })
    li.querySelector('.btn-reordenar').addEventListener('click', (e) => {
      e.stopPropagation()
      console.log('Reordenar', p.id)

    })

   
    li.addEventListener('click', () => {
      console.log('Abrir pedido', p.id)
    })

    lista.appendChild(li)
  })
}


  render(pedidos)

  inputBuscar?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase()
    const f = !q ? pedidos : pedidos.filter(p =>
      (p.id + p.fecha + p.estatus).toLowerCase().includes(q)
    )
    render(f)
  })

})()



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
          cargarCarritoExistente(carrito);
          console.log("✅ Carrito recargado:", carritoId);
        } else {
          console.warn("⚠️ No se encontró el carrito en la respuesta");
        }
      })
      .catch(err => console.error("❌ Error cargando carrito existente:", err));
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

// ⚡ Convierte un carrito de MisCompras a itemsCotizacion
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

  // ⚡ Refresca la tabla en Compra Rápida
  listItems();
}


