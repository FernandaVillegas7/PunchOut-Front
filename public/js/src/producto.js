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
    // Obtener session id desde servidor y guardarlo en JS
    const sid = (function(){ try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return null; } })();
    $.getJSON(`app/api/exiros.php?method=get-session${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`).done(function (resp) {
        if (resp && !resp.isError && resp.data) {
            window.phpSessionID = resp.data.sessionID || resp.data.cookieValue || null;
            console.log('PHP SessionID:', window.phpSessionID);
        } else {
            console.warn('No se pudo obtener session id', resp);
        }
    }).fail(function () { console.warn('Error al obtener session id'); });
    // Asegurarse que el botón no sea submit y registrar el handler una sola vez
    $('#btAddCar').attr('type', 'button');
    $('#btAddCar').off('click').on('click', function (e) {
        // Ignorar eventos programáticos
        if (e && e.isTrusted === false) return;
        e.preventDefault();

        const cantidadNum = parseInt($('#totalProducto').val(), 10) || 0;
        if (cantidadNum <= 0) {
            // Feedback for invalid quantity
            const $btn = $(this);
            const originalHtml = $btn.html();
            const originalClasses = $btn.attr('class') || '';
            $btn.prop('disabled', true).addClass('disabled btn-dark').removeClass('btn-danger btn-success');
            $btn.html('<i class="fa fa-times text-white"></i><span class="ms-2">Error</span>');
            setTimeout(function () {
                $btn.prop('disabled', false).removeClass('disabled btn-dark').addClass('btn-danger').attr('class', originalClasses).html(originalHtml);
            }, 2000);
            return;
        }

        const codigoInterno = productoActual ? productoActual.codigoInterno : $('#input-codigo').val();
        const payload = { cantidad: cantidadNum, codigoInterno: codigoInterno };

        // Evitar doble envío y guardar estado original
        const $btn = $(this);
        const originalHtml = $btn.html();
        const originalClasses = $btn.attr('class') || '';
        $btn.prop('disabled', true).addClass('disabled');
        $btn.html('<span class="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span><span class="ms-2">Agregando...</span>');

        const sid = (function(){ try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return null; } })();
        $.ajax({
            type: "POST",
            url: `app/api/exiros.php?method=insert-carrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
            dataType: "json",
            data: JSON.stringify(payload),
            contentType: "application/json",
        }).done(function (response) {
            console.log(response);
            if (response.isError) {
                $btn.removeClass('btn-danger btn-success').addClass('btn-dark');
                $btn.html('<i class="fa fa-times text-white"></i><span class="ms-2">Error</span>');
            } else {
                $btn.removeClass('btn-danger btn-dark').addClass('btn-success');
                $btn.html('<i class="fa fa-check text-white"></i><span class="ms-2">Agregado</span>');
                // Actualizar badge del carrito si existe
                if (typeof window.updateCartBadge === 'function') { try { window.updateCartBadge(); } catch(_){} }
                // Efecto visual en el badge del carrito
                var $badge = $('#TotalCarrito');
                if ($badge.length) {
                    $badge.addClass('cart-bounce');
                    setTimeout(function(){ $badge.removeClass('cart-bounce'); }, 600);
                }
                // Limpiar la lista y actualizar la tabla si aplica
                if (typeof itemsCotizacion !== 'undefined') itemsCotizacion = [];
                if (typeof listItems === 'function') listItems();
            }
            setTimeout(function () {
                $btn.prop('disabled', false).removeClass('disabled btn-success btn-dark').addClass('btn-danger').attr('class', originalClasses).html(originalHtml);
            }, 2000);
    }).fail(function () {
            $btn.removeClass('btn-danger btn-success').addClass('btn-dark');
            $btn.html('<i class="fa fa-times text-white"></i><span class="ms-2">Error</span>');
            setTimeout(function () {
                $btn.prop('disabled', false).removeClass('disabled btn-dark').addClass('btn-danger').attr('class', originalClasses).html(originalHtml);
            }, 2000);
        });
    });
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
