function formatMoney(v) {
    try {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
    } catch (e) {
        return '$ ' + parseFloat(v || 0).toFixed(2);
    }
}

function renderCarrito(items) {
    const $tbody = $('#extras');
    let rows = '';
    let grandTotal = 0;

    items.forEach(function (item, idx) {
        let partida = idx + 1;
        let codigo = item.codigoInterno || item.supplierPartID || '';
        let CodigoFabricante = item.supplierPartID
        let nombre = item.longName || item.shortName || '';
        let cantidad = item.quantity || 0;
        let precioAplicado = parseFloat(item.amount || 0);

        //Para el muestro del descuento
        let grandTotalItems = parseFloat(item.amountTotal || (cantidad * precioAplicado)) || 0;
        grandTotal += grandTotalItems
        let total = parseFloat(item.amountTotal || (cantidad * (parseFloat(item.amount || 0)))) || 0;
        grandTotal += grandTotalItems;
        let precioBaseOriginal = parseFloat(item.amountBaseOriginal || 0);
        let totalOriginalSinPromo = cantidad * precioBaseOriginal;

        //Visual para el descuento
        let vizDescuento = '';
        let vizPrecioTotal= '';

        let promos = item.promocion || item.Promocion;
        if(promos && promos.length > 0){
            let promosOrdenadas = [...promos].sort((a,b) => b.cantidadMinima - a.cantidadMinima);
            for (let promo of promosOrdenadas){
                if (cantidad >= promo.cantidadMinima) {
                    vizDescuento = `
                        <div class="mt-2 text-start">
                            <span class="badge bg-danger rounded shadow-sm px-2 py-1" style="font-size: 0.75rem; font-weight: bold; letter-spacing: 0.5px; animation: pulse-promo 2s infinite;">
                                <i class="fa fa-fire"></i> ¡OFERTA POR VOLUMEN!
                            </span>
                            <div class="text-danger small fw-bold mt-1">
                                Compraste ${promo.cantidadMinima}+ piezas. (Precio Unit: ${formatMoney(precioAplicado)})
                            </div>
                        </div>`;

                        let ahorroTotalRow = totalOriginalSinPromo - grandTotalItems;
                        vizPrecioTotal = `
                        <div class="text-end">
                            <span class="text-muted text-decoration-line-through small d-block mb-1">${formatMoney(totalOriginalSinPromo)}</span>
                            <span class="fw-bold text-danger fs-5 d-block">${formatMoney(grandTotalItems)}</span>
                            <span class="text-success small fw-bold mt-1 d-block">
                                Ahorraste ${formatMoney(ahorroTotalRow)}
                            </span>
                        </div>
                    `;
                    break;
                }
            }
        }
        if(vizPrecioTotal == ''){
            vizPrecioTotal = `
                <div class="text-end fw-bold text-dark fs-6">${formatMoney(grandTotalItems)}</div>
            `;
        }
        
        // Build dynamic image URL: clave = supplierPartID, img = codigo (fallbacks)
        const claveImg = item.supplierPartID || item.supplierPartAuxiliaryID || item.buyerPartID || '';
        const dynImg = (claveImg && codigo)
            ? `https://mersolsureste.com.mx/articulos/index.php?clave=${encodeURIComponent(claveImg)}&img=${encodeURIComponent(codigo)}`
            : (item.imagen || '');

        rows += `
            <tr class="${vizDescuento !== '' ? 'table-warning-bg' : ''}"> <td class="d-none">${partida}</td>
                <td class="d-none">${codigo}</td>
                <td class="text-muted fw-bold">${partida}</td>
                
                <td><span class="badge bg-light text-dark border border-secondary">${CodigoFabricante}</span></td>
                
                <td>
                    <img src="${dynImg}" alt="${nombre}" class="rounded shadow-sm border" style="width:55px; height:55px; object-fit:contain; background:#fff;">
                </td>
                
                <td class="text-start">
                    <span class="d-block fw-bold text-dark" style="font-size: 0.9rem; max-width: 250px; white-space: normal;">${nombre}</span>
                    <small class="text-muted">${item.manufacturer || ''}</small>
                    ${vizDescuento}
                </td>
                
                <td>
                    <span class="fw-bold fs-6">${cantidad}</span>
                </td>
                
                <td>
                    ${vizPrecioTotal}
                </td>
                
                <td>
                    <button class="btn btn-sm btn-link text-danger btn-remove-item rounded-circle" data-codigo="${codigo}" title="Eliminar artículo" style="width: 32px; height: 32px; padding: 0;">
                        <i class="fa fa-trash fs-5"></i>
                    </button>
                </td>
            </tr>`;
    });

    if (!items || items.length === 0) {
        rows = `
            <tr>
                <td colspan="10" class="text-center py-5">
                    <i class="fa fa-shopping-cart fa-3x text-light mb-3"></i>
                    <h5 class="text-muted">Tu carrito está vacío</h5>
                    <p class="text-muted small">¡Explora nuestra tienda y descubre grandes ofertas!</p>
                </td>
            </tr>`;
    }

    $tbody.html(rows);
    $('#granTotal').text(formatMoney(grandTotal));
}

function loadCarrito() {
    // First fetch session to include any PunchOut hook data (buyerCookie, browserFormPostUrl, extrinsics)
    let sid = (function () {
        let u = new URLSearchParams(location.search).get('SessionID');
        if (u) { try { sessionStorage.setItem('punchoutSessionID', u); } catch (_) { } }
        if (u) return u;
        try { return sessionStorage.getItem('punchoutSessionID'); } catch (_) { return null; }
    })();
    $.getJSON(`app/api/exiros.php?method=get-session${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`)
        .done(function (sessionRes) {
            let hook = (sessionRes && !sessionRes.isError && sessionRes.data && sessionRes.data.hook) ? sessionRes.data.hook : null;

            // Almacenar HOOK_URL globalmente si está disponible
            if (hook && hook.browserFormPostUrl) {
                window.HOOK_URL = hook.browserFormPostUrl;
                window.BrowserFormPostUrl = hook.browserFormPostUrl; // Mantener compatibilidad
            }

            // Then fetch carrito items
            $.getJSON(`app/api/exiros.php?method=get-carrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`)
                .done(function (res) {
                    console.log('Respuesta completa del carrito:', res);
                    
                    if (!res || res.isError) {
                        console.warn('Error al obtener carrito', res);
                        renderCarrito([]);
                        return;
                    }

                    console.log('Carrito (session):', res.data);
                    console.log('Número de items en carrito:', (res.data || []).length);

                    // Si no hay items, mostrar carrito vacío
                    if (!res.data || res.data.length === 0) {
                        console.log('Carrito vacío, renderizando tabla vacía');
                        renderCarrito([]);
                        return;
                    }

                    // Construir y exponer JSON exportable del carrito
                    try {
                        // Construir un array de objetos { item: {...} } (sin wrapper 'items')
                        let exportArray = (res.data || []).map(it => {
                            let amount = Number(it.amount || 0);
                            let originalQuantity = Number(it.quantity || it.cantidad || 0) || 1;

                            // itemPrice: total value covering the original quantity (amount * originalQuantity)
                            let itemPrice = Number((amount * originalQuantity).toFixed(2));

                            // priceUnit: factor indicating how many units the price covers.
                            // Default to 1 unless an explicit PRICEUNIT/NEW_ITEM-PRICEUNIT is provided in Extrinsics.
                            let priceUnit = 1;
                            try {
                                let extr = it.Extrinsics || it.extrinsics || it.Extrinsic || it.extrinsic || null;
                                if (extr) {
                                    if (Array.isArray(extr)) {
                                        for (let e of extr) {
                                            if (!e) continue;
                                            if (typeof e === 'object') {
                                                for (let k in e) {
                                                    if (/NEW_ITEM-PRICEUNIT/i.test(k) || /PRICEUNIT/i.test(k)) {
                                                        priceUnit = Number(e[k]) || priceUnit;
                                                    }
                                                }
                                            } else if (typeof e === 'string') {
                                                let m = e.match(/NEW_ITEM-PRICEUNIT\[(\d+)\]|NEW_ITEM-PRICEUNIT=(\d+)|PRICEUNIT=(\d+)/i);
                                                if (m) priceUnit = Number(m[1] || m[2] || m[3]) || priceUnit;
                                            }
                                        }
                                    } else if (typeof extr === 'object') {
                                        for (let k in extr) {
                                            if (/NEW_ITEM-PRICEUNIT/i.test(k) || /PRICEUNIT/i.test(k)) {
                                                priceUnit = Number(extr[k]) || priceUnit;
                                            }
                                        }
                                    } else if (typeof extr === 'string') {
                                        let m = extr.match(/NEW_ITEM-PRICEUNIT\[(\d+)\]|NEW_ITEM-PRICEUNIT=(\d+)|PRICEUNIT=(\d+)/i);
                                        if (m) priceUnit = Number(m[1] || m[2] || m[3]) || priceUnit;
                                    }
                                }
                            } catch (e) {
                                // leave priceUnit as default 1 on any parsing error
                            }

                            if (!priceUnit || priceUnit <= 0) priceUnit = 1;

                            // unitPrice: individual product price without alteration (use it.amount)
                            let unitPrice = Number(amount.toFixed(2));

                            return ({
                                item: {
                                    shortname: it.shortName || it.shortname || it.descripcion || '',
                                    longname: it.longName || it.longname || it.descripcion || '',
                                    unitOfMeasure: it.unitOfMeasure || it.unitOfMeasure || it.unitOfMeasure || it.unit_of_measure || it.unit || '',
                                    itemPrice: itemPrice,
                                    priceUnit: priceUnit,
                                    unitPrice: unitPrice,
                                    // quantity should reflect the original requested quantity
                                    quantity: originalQuantity,
                                    currency: it.currency || 'MXN',
                                    category: it.category || it.materialGroup || '',
                                    supplierPartID: it.supplierPartID || it.supplierPartAuxiliaryID || it.buyerPartID || '',
                                    // extra fields for OCI
                                    supplierPartAuxiliaryID: it.supplierPartAuxiliaryID || '',
                                    manufacturer: it.manufacturer || '',
                                    manufacturerModelNumber: it.manufacturerModelNumber || '',
                                    codigoArticulo: it.codigoArticulo || it.codigoInterno || it.supplierPartAuxiliaryID || it.supplierPartID || ''
                                }
                            });
                        });

                        // Exponer globalmente para uso manual y loguear como JSON formateado
                        // Include the session hook information alongside items
                        const exported = {
                            hook: hook,
                            items: exportArray
                        };

                        window.exportedCarrito = exported;
                        console.log('Carrito (JSON export):\n', JSON.stringify(exported, null, 2));
                    } catch (e) {
                        console.warn('Error al formatear carrito para export:', e);
                    }
                    renderCarrito(res.data || []);
                    // Añadir botón de exportar si no existe
                    try {
                        if (!document.getElementById('btnExportCarrito')) {
                            let $btn = $('<button id="btnExportCarrito" class="btn btn-sm btn-outline-primary ms-3 d-none">Exportar JSON</button>');
                            // Insertar cerca del total si existe, sino al principio del contenedor
                            let $target = $('#granTotal').parent();
                            if ($target && $target.length) {
                                $target.append($btn);
                            } else {
                                $('body').prepend($btn);
                            }
                            // Para ocultar el botón sin borrarlo:
                            window.hideExportCarritoBtn = function() {
                                $btn.addClass('d-none');
                            };

                            $btn.on('click', function () {
                                // Hide (not remove) the export button after it is used
                                let $self = $(this);
                                let payload = window.exportedCarrito || [];
                                let json = JSON.stringify(payload, null, 2);
                                console.log('Exportando carrito JSON:\n', json);

                                // Descarga como archivo
                                let blob = new Blob([json], { type: 'application/json' });
                                let url = URL.createObjectURL(blob);
                                let a = document.createElement('a');
                                a.href = url;
                                a.download = 'carrito.json';
                                document.body.appendChild(a);
                                a.click();
                                // Mantener el DOM limpio del enlace temporal, pero conservar el botón
                                a.remove();
                                URL.revokeObjectURL(url);
                                try { $self.addClass('d-none'); } catch (_) {}
                            });
                        }
                    } catch (e) {
                        console.warn('No se pudo crear el botón de export:', e);
                    }
                })
                .fail(function (xhr, status, err) {
                    console.error('Error al obtener carrito', status, err);
                    renderCarrito([]);
                });
        })
        .fail(function (xhr, status, err) {
            console.error('Error al obtener session', status, err);
            // Fallback: still try to fetch carrito without hook
            $.getJSON(`app/api/exiros.php?method=get-carrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`)
                .done(function (res) {
                    if (!res || res.isError) {
                        console.warn('Error al obtener carrito', res);
                        renderCarrito([]);
                        return;
                    }

                    console.log('Carrito (session, no hook):', res.data);
                    // build exportArray as before but without hook
                    try {
                        let exportArray = (res.data || []).map(it => {
                            let amount = Number(it.amount || 0);
                            let originalQuantity = Number(it.quantity || it.cantidad || 0) || 1;
                            let itemPrice = Number((amount * originalQuantity).toFixed(2));
                            let priceUnit = 1;
                            try {
                                let extr = it.Extrinsics || it.extrinsics || it.Extrinsic || it.extrinsic || null;
                                if (extr) {
                                    if (Array.isArray(extr)) {
                                        for (const e of extr) {
                                            if (!e) continue;
                                            if (typeof e === 'object') {
                                                for (let k in e) {
                                                    if (/NEW_ITEM-PRICEUNIT/i.test(k) || /PRICEUNIT/i.test(k)) {
                                                        priceUnit = Number(e[k]) || priceUnit;
                                                    }
                                                }
                                            } else if (typeof e === 'string') {
                                                let m = e.match(/NEW_ITEM-PRICEUNIT\[(\d+)\]|NEW_ITEM-PRICEUNIT=(\d+)|PRICEUNIT=(\d+)/i);
                                                if (m) priceUnit = Number(m[1] || m[2] || m[3]) || priceUnit;
                                            }
                                        }
                                    } else if (typeof extr === 'object') {
                                        for (let k in extr) {
                                            if (/NEW_ITEM-PRICEUNIT/i.test(k) || /PRICEUNIT/i.test(k)) {
                                                priceUnit = Number(extr[k]) || priceUnit;
                                            }
                                        }
                                    } else if (typeof extr === 'string') {
                                        let m = extr.match(/NEW_ITEM-PRICEUNIT\[(\d+)\]|NEW_ITEM-PRICEUNIT=(\d+)|PRICEUNIT=(\d+)/i);
                                        if (m) priceUnit = Number(m[1] || m[2] || m[3]) || priceUnit;
                                    }
                                }
                            } catch (e) { }
                            if (!priceUnit || priceUnit <= 0) priceUnit = 1;
                            let unitPrice = Number(amount.toFixed(2));

                            return ({
                                item: {
                                    shortname: it.shortName || it.shortname || it.descripcion || '',
                                    longname: it.longName || it.longname || it.descripcion || '',
                                    unitOfMeasure: it.unitOfMeasure || it.unitOfMeasure || it.unitOfMeasure || it.unit_of_measure || it.unit || '',
                                    itemPrice: itemPrice,
                                    priceUnit: priceUnit,
                                    unitPrice: unitPrice,
                                    quantity: originalQuantity,
                                    currency: it.currency || 'MXN',
                                    category: it.category || it.materialGroup || '',
                                    supplierPartID: it.supplierPartID || it.supplierPartAuxiliaryID || it.buyerPartID || '',
                                    // extra fields for OCI (no-hook)
                                    supplierPartAuxiliaryID: it.supplierPartAuxiliaryID || '',
                                    manufacturer: it.manufacturer || '',
                                    manufacturerModelNumber: it.manufacturerModelNumber || '',
                                    codigoArticulo: it.codigoArticulo || it.codigoInterno || it.supplierPartAuxiliaryID || it.supplierPartID || ''
                                }
                            });
                        });

                        let exported = { hook: null, items: exportArray };
                        window.exportedCarrito = exported;
                        console.log('Carrito (JSON export no-hook):\n', JSON.stringify(exported, null, 2));
                    } catch (e) {
                        console.warn('Error al formatear carrito para export sin hook:', e);
                    }
                    renderCarrito(res.data || []);
                })
                .fail(function () {
                    console.error('Error al obtener carrito (fallback)');
                    renderCarrito([]);
                });
        });
}

$(document).ready(function () {
    loadCarrito();

    // Delegated handler para eliminar item (funciona tras recargas del tbody)
    $('#tbListItems').on('click', '.btn-remove-item', function () {
        let codigo = $(this).data('codigo');
        if (!codigo) return;

        if (!confirm('¿Eliminar este artículo del carrito?')) return;

        let payload = { codigoInterno: codigo };

        const sid = (function () { try { return sessionStorage.getItem('punchoutSessionID'); } catch (_) { return null; } })();
        $.ajax({
            type: 'POST',
            url: `app/api/exiros.php?method=remove-carrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
            data: JSON.stringify(payload),
            contentType: 'application/json',
            dataType: 'json'
        }).done(function (resp) {
            console.log('remove-carrito:', resp);
            if (!resp || resp.isError) {
                alert(resp.message || 'Error al eliminar el artículo');
                return;
            }
            if (typeof window.updateCartBadge === 'function') { try { window.updateCartBadge(); } catch (_) { } }
            // Efecto visual en el badge del carrito
            var $badge = $('#TotalCarrito');
            if ($badge.length) {
                $badge.addClass('cart-bounce');
                setTimeout(function(){ $badge.removeClass('cart-bounce'); }, 600);
            }
            loadCarrito();
        }).fail(function () {
            alert('Error de red al eliminar el artículo');
        });
    });
});
function renderLoaderTable() {
    let $tbody = $('#extras');
    $tbody.empty();
    $tbody.append(`
        <tr>
            <td colspan="10" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <div class="mt-2 text-muted">Cargando carrito...</div>
            </td>
        </tr>
    `);
}

function renderCarritoTable(dataCarrito) {
    const $tbody = $('#extras');
    $tbody.empty();

    let granTotal = 0;

    if (!dataCarrito || dataCarrito.length === 0) {
        $('#granTotal').text('$ 0.00');
        $tbody.append(`
            <tr>
                <td colspan="10" class="text-center py-5">
                    <span class="text-muted">¡Visita la tienda y agrega artículos a tu carrito!</span>
                </td>
            </tr>
        `);
        return;
    }

    dataCarrito.forEach(item => {
        granTotal += Number(item.total) || 0;
        const claveImg = item.supplierPartID || item.supplierPartAuxiliaryID || item.buyerPartID || '';
        const codigo = item.codigoArticulo || item.codigoInterno || item.supplierPartAuxiliaryID || item.supplierPartID || '';
        const dynImg = (claveImg && codigo)
            ? `https://mersolsureste.com.mx/articulos/index.php?clave=${encodeURIComponent(claveImg)}&img=${encodeURIComponent(codigo)}`
            : (item.imagen || '');
        $tbody.append(`
            <tr>
                <td class="d-none">${item.itemCarritoID}</td>
                <td class="d-none">${item.carritoID}</td>
                <td>${item.partidaID}</td>
                <td>${item.codigoArticulo}</td>
        <td>
                    <div class="img-container position-relative" style="width: 50px; height: 50px; display: inline-block;">
                        <span class="img-loader position-absolute top-50 start-50 translate-middle">
                            <span class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></span>
                        </span>
            <img src="${dynImg}" alt="${item.codigoArticulo}" 
                            style="width: 50px; height: 50px; border-radius: 6px; display: none;" 
                            onload="this.style.display='block'; this.previousElementSibling.style.display='none';">
                    </div>
                </td>
                <td>${item.descripcion}</td>
                <td>
                    <div class="input-group">
                        <input type="number" class="form-control cantidad-input" aria-label="cantidad" value="${item.cantidad}" data-item="${item.itemCarritoID}">
                    </div>
                </td>
                <td class="border">$${Number(item.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger dropItem" data-id="${item.itemCarritoID}">
                        <i class="fa fa-times"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    // Actualiza el total en el resumen
    $('#granTotal').text(`$${granTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);


    $('.cantidad-input').on('change', function () {
        let $input = $(this);
        let itemId = $input.data('item');
        let nuevaCantidad = $input.val();

        // Remueve cualquier icono previo
        $input.next('.cantidad-status').remove();

        // Loader animado al lado del input
        $input.after(`
            <span class="cantidad-status ms-2 text-primary">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            </span>
        `);

        $.ajax({
            type: 'PUT',
            url: '/app/api/carrito.php?method=updateCantidadItemCarrito',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                ItemCarritoID: itemId,
                Cantidad: nuevaCantidad
            }),
            success: function (response) {
                $input.next('.cantidad-status').remove(); // Quita el loader
                if (response && response.error === false) {
                    // Muestra el check al terminar
                    $input.after(`
                        <span class="cantidad-status ms-2 text-success">
                            <i class="fa fa-check-circle fa-lg"></i>
                        </span>
                    `);
                    setTimeout(() => {
                        $input.next('.cantidad-status').fadeOut(400, function () {
                            $(this).remove();
                            getCarrito(); // Recarga la tabla después de desaparecer el check
                        });
                    }, 1500);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.message || 'Error, contacte a su asesor de ventas',
                    });
                }
            },
            error: function (xhr, status, error) {
                $input.next('.cantidad-status').remove(); // Quita el loader si hay error
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error, contacte a su asesor de ventas',
                });
            }
        });
    });

    $('.dropItem').on('click', function () {
        let $btn = $(this);
        let itemId = $btn.data('id');

        // Remueve cualquier icono previo y muestra loader
        $btn.html(`
            <span class="spinner-border spinner-border-sm text-danger" role="status" aria-hidden="true"></span>
        `).prop('disabled', true);

        $.ajax({
            type: 'PUT',
            url: '/app/api/carrito.php?method=eliminarItemCarrito',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({ ItemCarritoID: itemId }),
            success: function (response) {
                if (response && response.error === false) {
                    $btn.html(`<i class="fa fa-trash fa-lg text-success"></i>`);
                    setTimeout(() => {
                        getCarrito(); // Recarga la tabla después de mostrar el icono
                    }, 1200);
                } else {
                    $btn.html(`<i class="fa fa-times"></i>`).prop('disabled', false);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.message || 'Error, contacte a su asesor de ventas',
                    });
                }
            },
            error: function (xhr, status, error) {
                $btn.html(`<i class="fa fa-times"></i>`).prop('disabled', false);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error, contacte a su asesor de ventas',
                });
            }
        });
    });
}

$('#btnCXML').on('click', function (e) {
    e.preventDefault();
    let $btn = $(this);
    let orderData = {
        hook: window.exportedCarrito?.hook || {
            buyerCookie: null,
            browserFormPostUrl: window.HOOK_URL || window.BrowserFormPostUrl,
            extrinsics: []
        },
        items: window.exportedCarrito?.items || []
    };

    // Validar que hay items
    if (!orderData.items || orderData.items.length === 0) {
        alert('No hay artículos en el carrito para enviar.');
        return;
    }

    // Obtener SessionID
    let sid = (function () {
        let u = new URLSearchParams(location.search).get('SessionID');
        if (u) { try { sessionStorage.setItem('punchoutSessionID', u); } catch (_) { } }
        if (u) return u;
        try { return sessionStorage.getItem('punchoutSessionID'); } catch (_) { return null; }
    })();

    // Construir payload para SaveCarrito
    let payload = {
        SessionID: sid,
        hook: orderData.hook,
        items: orderData.items
    };

    // Deshabilitar botón durante el guardado
    let originalHtml = $btn.html();
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');

    $.ajax({
        type: 'POST',
        url: `app/api/exiros.php?method=SaveCarrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
        data: JSON.stringify(payload),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (resp) {
        // Esperamos { isError: false, data: NuevoCarritoID }
        if (!resp || resp.isError || typeof resp.data === 'undefined' || resp.data === null) {
            console.warn('SaveCarrito respuesta inesperada:', resp);
            alert(resp?.message || 'No se pudo guardar el carrito antes del OCI.');
            return;
        }

        let nuevoCarritoID = resp.data;
        // Ahora sí, generar y enviar el OCI con CUST_FIELD2 = NuevoCarritoID
        GenerarOCI(orderData, nuevoCarritoID);
    }).fail(function (xhr, status, err) {
        console.error('Error SaveCarrito:', status, err);
        alert('Error al guardar el carrito antes del OCI.');
    }).always(function () {
        $btn.prop('disabled', false).html(originalHtml);
    });
});

function GenerarOCI(orderData) {
    const form = document.createElement("form")
    form.method = "POST"
    // Ensure standard URL-encoded POST for OCI
    form.enctype = "application/x-www-form-urlencoded"
    form.acceptCharset = "UTF-8"

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


$(document).ready(function () {
    // Asegurarse de recargar el carrito desde la API
    loadCarrito();
});

// CSS para el efecto de animación del carrito (cart-bounce)
var style = document.createElement('style');
style.innerHTML = `
    #TotalCarrito.cart-bounce {
        animation: cart-bounce 0.6s cubic-bezier(.68,-0.55,.27,1.55);
    }
    @keyframes cart-bounce {
        0% { transform: scale(1); }
        20% { transform: scale(1.25); }
        40% { transform: scale(0.92); }
        60% { transform: scale(1.12); }
        80% { transform: scale(0.98); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);