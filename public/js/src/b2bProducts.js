// Parámetros de paginación y búsqueda
const pageSize = 50;
let currentPage = 1;
let loading = false;
let currentSearch = "";
let currentCategory = "";
let searchTimer = null;
const SEARCH_DELAY = 3000; // ms

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Helper to get/store SessionID across pages (same tab)
function getPunchoutSID() {
    const fromUrl = getUrlParameter('SessionID');
    if (fromUrl) {
        try { sessionStorage.setItem('punchoutSessionID', fromUrl); } catch (_) {}
        return fromUrl;
    }
    try { return sessionStorage.getItem('punchoutSessionID'); } catch (_) {}
    return null;
}

// Obtener y validar el SessionID de la URL o storage
const sessionId = getPunchoutSID();
if (sessionId) {
    console.log('SessionID:', sessionId);
    $.ajax({
        type: "POST",
        url: `app/api/exiros.php?method=validateSessionID${sessionId ? `&SessionID=${encodeURIComponent(sessionId)}` : ''}`,
        data: JSON.stringify({ SessionID: sessionId }),
        contentType: "application/json",
        success: function (response) {
            if (response && !response.error) {
                console.log(`Sesión validada: `, response);
                // Almacenar HOOK_URL globalmente para uso en toda la aplicación
                if (response.HOOK_URL) {
                    window.HOOK_URL = response.HOOK_URL;
                    window.BrowserFormPostUrl = response.HOOK_URL; // Mantener compatibilidad
                }
                // Aquí puedes mostrar datos del usuario si lo deseas
            } else {
                console.log(`Sesión error: `, response.error);
                window.location.href = "https://http.cat/images/401.jpg";
            }
        },
        error: function (xhr, status, error) {
            console.log(`Sesión error: `, error);
            console.log(xhr);
            console.log(status);
            window.location.href = "https://http.cat/images/401.jpg";
        },
    });
}

function renderProductItem(p) {
    return `
    <div class="col-12 mb-3 product-card" data-articulo="${p.supplierPartAuxiliaryID}">
        <div class="product-item bg-light">
            <div class="row g-0">
                <div class="col-4 col-md-2">
                    <div class="product-img position-relative overflow-hidden h-100">
                        <input type="hidden" class="product-link" value="${p.longName}">
                        <img class="img-fluid w-100 h-100" src="${p.imagen}" alt="${p.longName}" style="object-fit: cover;">
                    </div>
                </div>
                <div class="col-8 col-md-10">
                    <div class="p-2 p-md-3 d-flex flex-column h-100">
                        <div>
                            <p class="text-danger mb-1 small">${p.manufacturer}</p>
                            <a href="javascript:void(0);" class="h6 text-decoration-none text-dark">
                                ${p.longName} SKU:${p.supplierPartID}
                            </a>
                            <p class="text-muted small" style="font-weight: normal;">${p.longName}</p>
                            <p class="small" style="font-size: 0.75rem; font-weight: bold;">${p.longName}</p>
                        </div>
                        <div class="d-flex align-items-center justify-content-between mt-auto pt-2 pt-md-3">
                            <h6 class="text-dark mb-0">$${p.amount} ${p.currency}</h6>
                            <div class="d-flex align-items-center">
                                <div class="input-group input-group-sm me-2 quantity-control" style="width:120px;">
                                    <button class="btn btn-outline-secondary btn-sm btn-decrement" type="button">-</button>
                                    <input type="number" min="1" value="1" class="form-control form-control-sm quantity-input" aria-label="Cantidad" style="text-align:center;" />
                                    <button class="btn btn-outline-secondary btn-sm btn-increment" type="button">+</button>
                                </div>

                                <a class="btn btn-danger btn-sm addCar" href="#" data-detail='${JSON.stringify(p)}'>
                                    <i class="fa-solid fa-cart-plus text-white"></i>
                                    <span class="ms-2 d-none d-md-inline">Agregar</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

// Función para cargar productos con reintentos automáticos
function fetchProducts(page, append = false) {
    if (loading) return;
    setSearchLoading(true);
    loading = true;

    // Bloquear categorías mientras carga
    $(".exiros-cat").prop("disabled", true);

    const params = new URLSearchParams({
        pageSize: pageSize,
        pageNumber: page,
        search: currentSearch,
        category: currentCategory
    });

    function attemptFetch(retryCount = 0) {
        $.ajax({
            type: "GET",
            url: `app/api/b2b.php?method=GetExirosProducts&${params.toString()}${sessionId ? `&SessionID=${encodeURIComponent(sessionId)}` : ''}`,
            dataType: "json",
            success: function (response) {
                if (response && response.products) {
                    let html = "";
                    response.products.forEach(function (p) {
                        html += renderProductItem(p);
                    });
                    if (append) {
                        $(".itemScroll").append(html);
                    } else {
                        $(".itemScroll").html(html);
                    }
                    $("#btnShowMore").toggle(response.products.length > 0);
                } else {
                    $(".itemScroll").html("<div>No se encontraron productos.</div>");
                    $("#btnShowMore").hide();
                }
                loading = false;
                setSearchLoading(false);
                $(".exiros-cat").prop("disabled", false);
            },
            error: function (xhr, status, error) {
                console.log('Error en fetchProducts:', xhr.responseText);
                
                // Determinar si es un error que puede beneficiarse de reintentos
                const shouldRetry = (
                    xhr.status === 500 || // Error interno del servidor
                    xhr.status === 400 || // Bad Request (posibles problemas de transacción)
                    xhr.status === 502 || // Bad Gateway
                    xhr.status === 503 || // Service Unavailable
                    xhr.status === 504 || // Gateway Timeout
                    status === 'timeout' || // Timeout de la petición
                    status === 'error' && !xhr.status // Error de red sin código específico
                );
                
                if (shouldRetry && retryCount < 4) {
                    console.log(`Reintentando carga de productos (intento ${retryCount + 1}/5) - Error ${xhr.status || status}...`);
                    setTimeout(function() {
                        attemptFetch(retryCount + 1);
                    }, 1000 * (retryCount + 1)); // Espera incremental: 1s, 2s, 3s, 4s
                    return;
                }
                
                // Error final - mostrar mensaje apropiado según el tipo de error
                let errorMessage = 'Error temporal del servidor';
                if (xhr.status === 400) {
                    errorMessage = 'Error de procesamiento de datos';
                } else if (xhr.status >= 500) {
                    errorMessage = 'Error interno del servidor';
                } else if (status === 'timeout') {
                    errorMessage = 'Tiempo de espera agotado';
                }
                
                $(".itemScroll").html(`
                    <div class="alert alert-warning text-center">
                        <i class="fa fa-exclamation-triangle"></i>
                        <strong>${errorMessage}</strong><br>
                        <small>Código: ${xhr.status || 'Red'} - Intenta recargar la página o buscar de nuevo</small>
                        <br><button class="btn btn-sm btn-outline-primary mt-2" onclick="location.reload()">
                            <i class="fa fa-refresh"></i> Recargar
                        </button>
                    </div>
                `);
                $("#btnShowMore").hide();
                loading = false;
                setSearchLoading(false);
                $(".exiros-cat").prop("disabled", false);
            },
        });
    }
    
    // Iniciar el primer intento
    attemptFetch();
}


function setSearchLoading(on) {
    try {
        const $icon = $('#addon-wrapping i');
        if (!$icon || $icon.length === 0) return;
        if (on) {
            $icon.removeClass('fa-search').addClass('fa-spinner fa-spin');
            $('#addon-wrapping').addClass('loading');
        } else {
            $icon.removeClass('fa-spinner fa-spin').addClass('fa-search');
            $('#addon-wrapping').removeClass('loading');
        }
    } catch (e) { /* silent */ }
}

// Inicialización al cargar la página
$(document).ready(function () {
    // Carga inicial de productos
    fetchProducts(currentPage, false);

    // Evento del botón "Mostrar más productos"
    $(document).on("click", "#btnShowMore", function () {
        currentPage++;
        fetchProducts(currentPage, true); // Agrega productos al final
    });

    // Evento de búsqueda por formulario
    $("#productSearchForm").on("submit", function (e) {
        e.preventDefault();
        const searchTerm = $("#productSearchInput").val().trim();
        currentSearch = searchTerm;
        currentPage = 0;
        fetchProducts(currentPage, false); // Reinicia lista con búsqueda
    });

    // Debounced search: dispara automáticamente ~4s después de dejar de escribir
    $("#productSearchInput").on("input", function (e) {
        const val = $(this).val().trim();
        currentSearch = val;
        currentPage = 1;
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
            fetchProducts(currentPage, false);
        }, SEARCH_DELAY);
    });

    // Habilita el botón al lado del input para buscar igual que Enter
    $("#addon-wrapping").on("click", function () {
        $("#productSearchForm").submit();
    });

    // Función para cargar categorías con reintentos automáticos
    function fetchCategories(retryCount = 0) {
        $.ajax({
            type: "GET",
            url: `app/api/exiros.php?method=ExirosGetCategorias${sessionId ? `&SessionID=${encodeURIComponent(sessionId)}` : ''}`,
            dataType: "json",
            success: function (resp) {
                const $container = $('#exiros-categories');
                if (!resp || resp.isError || !Array.isArray(resp.data)) {
                    $container.html('<div class="text-muted small">No hay categorías disponibles</div>');
                    return;
                }

                const html = ['<div class="list-group">'];
                resp.data.forEach(function (c) {
                    const id = c.categoria;
                    const label = c.categoria;
                    html.push(`
                        <label class="list-group-item d-flex align-items-center">
                            <input type="checkbox" class="form-check-input me-2 exiros-cat" value="${id}"> ${label}
                        </label>
                    `);
                });
                html.push('</div>');
                $container.html(html.join(''));
            },
            error: function (xhr, status, error) {
                console.log('Error en fetchCategories:', xhr.responseText);
                
                // Determinar si es un error que puede beneficiarse de reintentos
                const shouldRetry = (
                    xhr.status === 500 || // Error interno del servidor
                    xhr.status === 400 || // Bad Request (posibles problemas de transacción)
                    xhr.status === 502 || // Bad Gateway
                    xhr.status === 503 || // Service Unavailable
                    xhr.status === 504 || // Gateway Timeout
                    status === 'timeout' || // Timeout de la petición
                    status === 'error' && !xhr.status // Error de red sin código específico
                );
                
                if (shouldRetry && retryCount < 4) {
                    console.log(`Reintentando carga de categorías (intento ${retryCount + 1}/5) - Error ${xhr.status || status}...`);
                    setTimeout(function() {
                        fetchCategories(retryCount + 1);
                    }, 1000 * (retryCount + 1)); // Espera incremental: 1s, 2s, 3s, 4s
                    return;
                }
                
                // Error final - mostrar mensaje apropiado según el tipo de error
                let errorMessage = 'Error al cargar categorías';
                if (xhr.status === 400) {
                    errorMessage = 'Error de procesamiento';
                } else if (xhr.status >= 500) {
                    errorMessage = 'Error del servidor';
                } else if (status === 'timeout') {
                    errorMessage = 'Tiempo agotado';
                }
                
                $('#exiros-categories').html(`
                    <div class="text-muted small">
                        <i class="fa fa-exclamation-triangle"></i>
                        ${errorMessage} (${xhr.status || 'Red'})
                        <br><button class="btn btn-xs btn-outline-secondary mt-1" onclick="fetchCategories()">
                            <i class="fa fa-refresh"></i> Reintentar
                        </button>
                    </div>
                `);
            }
        });
    }
    
    // Iniciar carga de categorías
    fetchCategories();

    // When category checkboxes change, allow only one selection and reload products
    $(document).on('change', '.exiros-cat', function () {
        if (loading) {
            // Evita cambios mientras carga
            $(this).prop("checked", false);
            return;
        }

        const $this = $(this);
        if ($this.is(':checked')) {
            $('.exiros-cat').not($this).prop('checked', false);
            currentCategory = $this.val() || '';
        } else {
            currentCategory = '';
        }

        currentPage = 0;
        setSearchLoading(true);
        fetchProducts(currentPage, false);
    });
});

$(document).on("click", ".product-card", function () {
    const articulo = $(this).data("articulo");
    if (articulo) {
    const sid = getPunchoutSID();
    const qs = sid ? `&SessionID=${encodeURIComponent(sid)}` : '';
    window.location.href = `/B2B-EXIROS-FRONT/product?articulo=${encodeURIComponent(articulo)}${qs}`;
    // window.location.href = `/product?articulo=${encodeURIComponent(articulo)}${qs}`;
    }
});

// Evitar que el botón "Agregar" dispare el evento de la card
// $(document).on("click", ".addCar", function (e) {
//     e.stopPropagation();
//     // ...acción del botón agregar...
// });

// Delegated handlers for quantity controls and add-to-cart
$(document).on('click', '.btn-increment', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $group = $(this).closest('.quantity-control');
    const $input = $group.find('.quantity-input');
    const val = Number($input.val() || 0) + 1;
    $input.val(val);
});

$(document).on('click', '.btn-decrement', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $group = $(this).closest('.quantity-control');
    const $input = $group.find('.quantity-input');
    const val = Math.max(1, Number($input.val() || 1) - 1);
    $input.val(val);
});

// Prevent clicks on the quantity input from triggering the product-card click
$(document).on('click', '.quantity-input', function (e) {
    e.stopPropagation();
});

// Add to cart reading selected quantity
$(document).on('click', '.addCar', function (e) {
    e.preventDefault();
    e.stopPropagation();

    const $btn = $(this);
    const originalHtml = $btn.html();
    const originalClasses = $btn.attr('class') || '';

    const detail = $btn.attr('data-detail');
    let product = {};
    try { product = JSON.parse(detail); } catch (err) { console.warn('Invalid product detail', err); return; }

    // Find the nearest quantity input (in the same product card)
    const $card = $btn.closest('.product-card');
    const qty = Number($card.find('.quantity-input').val() || 1);

    // Prepare payload for insert-carrito
    const payload = {
        cantidad: qty,
        codigoInterno: product.supplierPartAuxiliaryID || product.supplierPartID || product.codigoInterno || ''
    };

    // First, check existing carrito to avoid duplicates
    $.getJSON(`app/api/exiros.php?method=get-carrito${sessionId ? `&SessionID=${encodeURIComponent(sessionId)}` : ''}`)
        .done(function (cartResp) {
            const existing = (cartResp && !cartResp.isError && Array.isArray(cartResp.data)) ? cartResp.data : [];
            const exists = existing.some(it => {
                const ids = [it.supplierPartAuxiliaryID, it.supplierPartID, it.codigoInterno, it.buyerPartID, it.supplierPartAuxiliaryID];
                return ids.includes(payload.codigoInterno) || ids.includes(product.supplierPartAuxiliaryID) || ids.includes(product.supplierPartID);
            });

            if (exists) {
                // If already in cart, show success state briefly but do not POST
                $btn.removeClass('btn-danger').addClass('btn-success');
                $btn.html('<i class="fa fa-check text-white"></i><span class="ms-2">Agregado</span>');
                setTimeout(function () {
                    $btn.removeClass('btn-success').addClass('btn-danger');
                    $btn.attr('class', originalClasses).html(originalHtml);
                }, 1500);
                return;
            }

            // Not existing: proceed with add flow
            try {
                $btn.addClass('disabled').attr('aria-disabled', 'true');
                $btn.html('<span class="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span><span class="ms-2">Agregando...</span>');
            } catch (e) { }

            $.ajax({
                type: 'POST',
                url: `app/api/exiros.php?method=insert-carrito${sessionId ? `&SessionID=${encodeURIComponent(sessionId)}` : ''}`,
                data: JSON.stringify(payload),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function (resp) {
                console.log('insert-carrito:', resp);
                if (!resp || resp.error) {
                    alert(resp.message || 'Error al agregar el artículo');
                    // restore
                    $btn.removeClass('disabled').removeAttr('aria-disabled').attr('class', originalClasses).html(originalHtml);
                    return;
                }

                // Success state: show check and 'Agregado'
                $btn.removeClass('btn-danger').addClass('btn-success');
                $btn.html('<i class="fa fa-check text-white"></i><span class="ms-2">Agregado</span>');

                // Refresh navbar cart badge immediately
                if (typeof window.updateCartBadge === 'function') { try { window.updateCartBadge(); } catch(_){} }
                // Efecto visual en el badge del carrito
                var $badge = $('#TotalCarrito');
                if ($badge.length) {
                    $badge.addClass('cart-bounce');
                    setTimeout(function(){ $badge.removeClass('cart-bounce'); }, 600);
                }

                // Refresh carrito UI if available
                if (typeof loadCarrito === 'function') loadCarrito();

                // Revert to original after 2 seconds
                setTimeout(function () {
                    $btn.removeClass('btn-success').addClass('btn-danger');
                    $btn.removeClass('disabled').removeAttr('aria-disabled').attr('class', originalClasses).html(originalHtml);
                }, 2000);

            }).fail(function () {
                alert('Error de red al agregar el artículo');
                // restore
                $btn.removeClass('disabled').removeAttr('aria-disabled').attr('class', originalClasses).html(originalHtml);
            });
        })
        .fail(function () {
            // If check fails, fallback to original POST behavior
            try {
                $btn.addClass('disabled').attr('aria-disabled', 'true');
                $btn.html('<span class="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span><span class="ms-2">Agregando...</span>');
            } catch (e) { }

            $.ajax({
                type: 'POST',
                url: `app/api/exiros.php?method=insert-carrito${sessionId ? `&SessionID=${encodeURIComponent(sessionId)}` : ''}`,
                data: JSON.stringify(payload),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function (resp) {
                if (!resp || resp.error) {
                    alert(resp.message || 'Error al agregar el artículo');
                    $btn.attr('class', originalClasses).html(originalHtml);
                    return;
                }
                $btn.removeClass('btn-danger').addClass('btn-success');
                $btn.html('<i class="fa fa-check text-white"></i><span class="ms-2">Agregado</span>');
                if (typeof window.updateCartBadge === 'function') { try { window.updateCartBadge(); } catch(_){} }
                var $badge = $('#TotalCarrito');
                if ($badge.length) {
                    $badge.addClass('cart-bounce');
                    setTimeout(function(){ $badge.removeClass('cart-bounce'); }, 600);
                }
                if (typeof loadCarrito === 'function') loadCarrito();
                setTimeout(function () {
                    $btn.removeClass('btn-success').addClass('btn-danger');
                    $btn.attr('class', originalClasses).html(originalHtml);
                }, 2000);
            }).fail(function () {
                alert('Error de red al agregar el artículo');
                $btn.attr('class', originalClasses).html(originalHtml);
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