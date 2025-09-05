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

// TODO: HABILITAR SESION AQUI - Helper para obtener SessionID
// function _getPunchoutSID() {
//     try {
//         var sid = sessionStorage.getItem('punchoutSessionID');
//         if (sid && sid !== '') return sid;
//     } catch (_) {}
//     try {
//         var p = new URLSearchParams(location.search).get('SessionID');
//         return p || '';
//     } catch (_) { return ''; }
// }

$('#articulo').select2({
    placeholder: "Selecciona una opción",
    allowClear: true,
    minimumResultsForSearch: 0,
    delay: 300,
    selectOnClose: true,
    dropdownParent: $('#frmArticulos'),
    ajax: {
        // TODO: HABILITAR SESION AQUI - anexar SessionID si aplica
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
        addHidden(`NEW_ITEM-MANUFACTMAT[${n}]`, item.codigoArticulo || '');
        // CUST_FIELD1: max length 10 -> remove non-alphanumerics then clamp to 10
        (function () {
            const raw = (item.supplierPartAuxiliaryID || item.codigoArticulo || '');
            const sanitized = raw.replace(/[^A-Za-z0-9]/g, '');
            const clamped = sanitized.substring(0, 10);
            addHidden(`NEW_ITEM-CUST_FIELD1[${n}]`, clamped);
        })();
        // TODO: AGREGAR EL ID DEL CARRITO CUANDO SE HAYA CREADO
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

    // Obtén el producto seleccionado del select2
    let producto = $('#articulo').select2('data')[0];
    let cantidad = parseInt($('#cantidad').val(), 10);

    // Validación
    if (!producto || producto.id === '-1') {
        alert('Selecciona un artículo.');
        return;
    }
    if (!cantidad || cantidad <= 0) {
        alert('Ingresa una cantidad válida.');
        return;
    }

    // Calcula el subtotal desglosado por cantidad
    const precio = Number(producto.amount || 0);
    const currency = producto.currency || 'MXN';
    const subTotal = cantidad * precio;

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
    $('#cantidad').val('');

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
                <td>${item.supplierPartID || ''}</td>
                <td class="d-none">${item.buyerPartID || ''}</td>
                <td class="d-none">${item.supplierPartAuxiliaryID || ''}</td>
                <td class="d-none">${item.currency || ''}</td>
                <td class="d-none">${item.shortName || ''}</td>
                <td>${item.unitOfMeasure || ''}</td>
                <td>${item.category || ''}</td>
                <td class="d-none">${item.codigoInterno || ''}</td>
                <td>${item.longName || ''}</td>
                <td>${item.manufacturer || ''}</td>
                <td>${item.manufacturerModelNumber || ''}</td>
                <td class="d-none">${item.materialGroup || ''}</td>
                <td>$ ${Number(item.amount || 0).toFixed(2)} ${item.currency || ''}</td>
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

$('#btnSolicitar').on('click', function (e) {
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
        success: function (response) {
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
        error: function (xhr) {
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