function getUrlParam(name) {
    let url = new URL(window.location.href);
    return url.searchParams.get(name);
}


let productoActual = null;

function cargarProducto() {
    let articulo = getUrlParam('articulo');
    if (!articulo) return;
    console.log(`Cargando producto con artículo: ${articulo}`);

    // Aquí haces la petición AJAX para obtener los datos del producto
    const sid = (function(){
        const u = new URLSearchParams(location.search).get('SessionID');
        if (u) { try { sessionStorage.setItem('punchoutSessionID', u); } catch(_){} }
        if (u) return u;
        try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return null; }
    })();
    $.ajax({
        type: "GET",
        url: `app/api/exiros.php?method=ExirosProductDetail&articulo=${encodeURIComponent(articulo)}${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
        dataType: "json",
        success: function (response) {
            if (response && response.data) {
                console.log(response)
                var p = response.data;
                productoActual = p;
                // Rellenar los campos
                $('#product-img').attr('src', p.imagen).attr('alt', p.longName);
                $('#product-longName, #product-longName-2').text(p.longName);
                $('#product-manufacturer, #product-manufacturer-2').text(p.manufacturer);
                $('#product-amount').text(p.amount);
                $('#product-currency').text(p.currency);
                $('#product-shortName, #product-shortName-2').text(p.shortName);
                $('#product-codigoInterno').text(p.supplierPartID);

                // Inputs ocultos para el carrito
                $('#input-codigo').val(p.codigoInterno);
                $('#input-nombre').val(p.supplierPartID);
                $('#input-precio').val(p.amount);
                $('#input-articulo').val(p.supplierPartID);
            } else {
                $(".h-100.p-30").html("<div>No se encontró el producto.</div>");
            }
        },
        error: function (xhr) {
            $(".h-100.p-30").html("<div>Error al cargar el producto.</div>");
        }
    });
}


$(document).ready(function () {
    cargarProducto();
    // Obtener session id desde URL o sessionStorage como en shop.twig
    const sid = (function(){
        const u = new URLSearchParams(location.search).get('SessionID');
        if (u) { try { sessionStorage.setItem('punchoutSessionID', u); } catch(_){} }
        if (u) return u;
        try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return null; }
    })();
    
    if (sid) {
        // Usar validateSessionID como en shop.twig
        fetch('app/api/exiros.php?method=validateSessionID', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({SessionID: sid})
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function (json) {
            if (json && !json.error) {
                window.phpSessionID = sid;
                console.log('PHP SessionID validado:', window.phpSessionID);
            } else {
                console.warn('SessionID inválido:', json);
            }
        }).catch(function (err) {
            console.warn('Error al validar session id:', err);
        });
    } else {
        console.warn('No se encontró SessionID en URL o sessionStorage');
    }
    // Asegurarse que el botón no sea submit y registrar el handler una sola vez
    $('#btAddCar').attr('type', 'button');
    $('#btAddCar').off('click').on('click', function (e) {
        // Ignorar eventos programáticos
        if (e && e.isTrusted === false) return;
        e.preventDefault();

        const cantidadNum = parseInt($('#totalProducto').val(), 10) || 0;
        if (cantidadNum <= 0) {
            alert('La cantidad debe ser mayor a 0');
            return;
        }

        const codigoInterno = productoActual ? productoActual.codigoInterno : $('#input-codigo').val();
        const payload = { cantidad: cantidadNum, codigoInterno: codigoInterno };

        // Evitar doble envío
        const $btn = $(this);
        $btn.prop('disabled', true).addClass('disabled');

    const sid = (function(){ try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return null; } })();
        $.ajax({
            type: "POST",
            url: `app/api/exiros.php?method=insert-carrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
            dataType: "json",
            data: JSON.stringify(payload),
            contentType: "application/json",
            success: function (response) {
                console.log('Respuesta insert-carrito:', response);
                
                if (response.error) {
                    console.error('Error del servidor:', response.message);
                    alert(response.message || "Ocurrió un error al procesar el articulo.");
                } else {
                    console.log('Éxito! Producto agregado');
                    alert(response.message || "Articulo creado correctamente.");
                    // Limpiar la lista y actualizar la tabla
                    if (typeof itemsCotizacion !== 'undefined') itemsCotizacion = [];
                    if (typeof listItems === 'function') listItems();
                }
            },
            error: function (xhr, status, error) {
                console.error('Error AJAX:', xhr.status, xhr.statusText);
                alert("Error al cargar el producto.");
            },
            complete: function () {
                $btn.prop('disabled', false).removeClass('disabled');
            }
        });
    });
});
