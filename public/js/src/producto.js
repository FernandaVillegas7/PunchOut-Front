// =====================================================================
// FUNCIONES DE UTILIDAD PARA URL Y SESIÓN
// =====================================================================
function getUrlParam(name) {
    let url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// Obtiene el SessionID de forma segura desde URL o sessionStorage
function getSessionID() {
    const urlSid = new URLSearchParams(location.search).get('SessionID');
    if (urlSid) {
        try { sessionStorage.setItem('punchoutSessionID', urlSid); } catch(_) {}
        return urlSid;
    }
    try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return null; }
}

let productoActual = null; // Guardará los datos del producto para el carrito
let stockRealDisponible = 0; // NUEVO: Guardará el stock disponible del producto actual

// =====================================================================
// LÓGICA DE INVENTARIO Y SEMÁFORO
// =====================================================================
function consultarStock(codigoInterno) {
    if(localStorage.getItem('sucursalID')){
        askStock(codigoInterno);
    } else {
        $('#product-stock-status').html('<span class="text-muted"><i class="fas fa-spinner fa-spin mr-1"></i> Esperando ubicación...</span>');
        $('#btAddCar').prop('disabled', true);

        document.addEventListener('ubication', function(){
            askStock(codigoInterno);
        }, {once: true});
    }
}

    function askStock(codigoInterno) {

    const sucursalID = localStorage.getItem('sucursalID') || 1; // 1 por defecto (Apodaca)
    const latUsuario = localStorage.getItem('latUsuario') || '';
    const lonUsuario = localStorage.getItem('lonUsuario') || '';

    $('#product-stock-status').html('<span class="text-muted"><i class="fas fa-spinner fa-spin mr-1"></i> Consultando disponibilidad...</span>');
    // Bloqueamos el botón mientras consulta
    $('#btAddCar').prop('disabled', true); 

    $.ajax({
        type: "GET",
        url: `app/api/exiros.php?method=ExirosStock&articulo=${encodeURIComponent(codigoInterno)}&sucursalID=${sucursalID}&latUsuario=${latUsuario}&lonUsuario=${lonUsuario}`,
        dataType: "json",
        success: function (response) {
            if (response && !response.isError && response.data) {
                stockRealDisponible = parseFloat(response.data.totalInventario) || 0;
                const almacenConsultado = response.data.claveAlmace || "Desconocido";

            } else {
                stockRealDisponible = 0;
            
            }
            actualizarSemaforo();
        },
        error: function () {
            stockRealDisponible = 0;
            actualizarSemaforo();
        }
    });
}

function actualizarSemaforo() {
    let cantidadSolicitada = parseInt($('#totalProducto').val()) || 1;
    let $status = $('#product-stock-status');
    let $btnCart = $('#btAddCar'); // Tu botón principal

    if (stockRealDisponible === 0) {
        // 🔴 ROJO: Sin inventario
         $status.html(`<span class="badge px-3 py-2" style="background-color: #fff3e0; color: #e65100; border: 1px solid #ffe082; font-weight: 600;">
            <i class="fas fa-times-circle mr-1"></i> Entregas de 2 a 5 días
        </span>`);
        $btnCart.prop('disabled', false).removeClass('is-success').html('Agregar de todos modos');

    } else if (cantidadSolicitada > stockRealDisponible) {
        // 🟡 AMARILLO/NARANJA: Pide más de lo que hay
        $status.html(`<span class="badge px-3 py-2" style="background-color: #fff3e0; color: #e65100; border: 1px solid #ffe082; font-weight: 600;">
            <i class="fas fa-exclamation-triangle mr-1"></i> Solo ${stockRealDisponible} disponibles, (Extras disponibles de 2 a 5 dias)
        </span>`);
        // Dejamos el botón activo para que puedan pedir en Backorder si así lo deseas
        $btnCart.prop('disabled', false).removeClass('is-success').html('<i class="fas fa-cart-plus mr-3"></i> Agregar de todos modos');

    } else {
        // 🟢 VERDE: Hay stock suficiente
        $status.html(`<span class="badge px-3 py-2" style="background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; font-weight: 600;">
            <i class="fas fa-check-circle mr-1"></i> Entrega inmediata
        </span>`);
        $btnCart.prop('disabled', false).removeClass('is-success').html('<i class="fas fa-cart-plus mr-3"></i> Agregar al carrito');
    }
}

// =====================================================================
// CARGA DEL PRODUCTO PRINCIPAL
// =====================================================================
function cargarProducto() {
    let articulo = getUrlParam('articulo');
    if (!articulo) return;

    const sid = getSessionID();
    
    $.ajax({
        type: "GET",
        url: `app/api/exiros.php?method=ExirosProductDetail&articulo=${encodeURIComponent(articulo)}${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
        dataType: "json",
        success: function (response) {
            if (response && response.data) {
                var p = response.data;
                productoActual = p;

                $('#product-img').attr('src', p.imagen).attr('alt', p.longName);
                let urlBase = p.imagen;
                let galeria = $('#contenedor-galeria'); 
                galeria.empty();

                galeria.append(`
                    <img src="${urlBase}" 
                         class="img-thumbnail m-1 shadow-sm" 
                         style="width: 70px; height: 70px; object-fit: contain; cursor: pointer;"
                         onclick="$('#product-img').attr('src', this.src);"
                         alt="Vista Principal">
                `);

                function buscarImagenAdicional(numero){
                    if (numero > 5) {
                        //console.log("Limite de seguridad");
                        return;
                    }
                    
                    let urlPrueba = urlBase + '-' + numero;
                    let imgTemp =  new Image();
                    imgTemp.onload = function () {
                        //console.log("Interaccion" +  numero + "-El ancho que recibe es " +  imgTemp.naturalWidth);
                        if (imgTemp.naturalWidth === 1600) {
                         //console.log("logo en la iteración de" + numero + "Deteniendo ciclo");
                            return;
                        }
                    let imgHTML = `
                        <img src="${urlPrueba}" 
                             class="img-thumbnail m-1 shadow-sm" 
                             style="width: 70px; height: 70px; object-fit: contain; cursor: pointer;"
                             onerror="this.remove();" 
                             onclick="$('#product-img').attr('src', this.src);" 
                             alt="Vista ${numero}">
                    `;
                    galeria.append(imgHTML);   

                    buscarImagenAdicional(numero + 1);
                    };

                    imgTemp.onerror = function(){
                       // console.log("Fin de la galeria, se encontraron" + (numeo - 1) + "fotos adicionales");
                    };
                    imgTemp.src = urlPrueba;
                }
                buscarImagenAdicional(1);
                // galeria.append(imgPrincipalHTML);

                // [1, 2, 3].forEach(function(numero){
                //     let urlAdicional = urlBase + '-' + numero;
                //     let imgHTML = `
                //         <img src="${urlAdicional}" 
                //              class="img-thumbnail m-1 shadow-sm" 
                //              style="width: 70px; height: 70px; object-fit: contain; cursor: pointer;"
                //              onerror="this.remove();" 
                //              onclick="$('#product-img').attr('src', this.src);" 
                //              alt="Vista ${numero}">
                //     `;
                //     galeria.append(imgHTML);
                // });
                $('#product-longName, #product-longName-2').text(p.longName);
                $('#product-manufacturer, #product-manufacturer-2').text(p.manufacturer);
                $('#product-amount').text(p.amount);
                $('#product-currency').text(p.currency);
                $('#product-shortName, #product-shortName-2').text(p.shortName);
                $('#product-codigoInterno').text(p.supplierPartID);

                // 2. Rellenar Inputs ocultos del formulario para el carrito
                $('#input-codigo').val(p.codigoInterno);
                $('#input-nombre').val(p.supplierPartID);
                $('#input-precio').val(p.amount);
                $('#input-articulo').val(p.supplierPartID);

                // 3. Rellenar la tabla de especificaciones técnicas dentro de la sección revelable
                let specsHtml = '';
                
                // Agregamos filas solo si el dato existe en el modelo de C#
                if (p.category && p.category.toUpperCase() !== 'OTROS') {
                    specsHtml += `<tr><th>Categoría</th><td>${p.category}</td></tr>`;
                }
                if (p.unitOfMeasure) {
                    specsHtml += `<tr><th>Unidad de Medida</th><td>${p.unitOfMeasure}</td></tr>`;
                }
                // Si tienes los datos de peso y medidas habilitados en tu modelo de C#:
                if (p.peso && p.peso > 0) {
                    specsHtml += `<tr><th>Peso</th><td>${p.peso} kg</td></tr>`;
                }
                if (p.alto && p.alto > 0) {
                    specsHtml += `<tr><th>Alto</th><td>${p.alto}</td></tr>`;
                }
                if (p.ancho && p.ancho > 0) {
                    specsHtml += `<tr><th>Ancho</th><td>${p.ancho}</td></tr>`;
                }
                if (p.longitud && p.longitud > 0) {
                    specsHtml += `<tr><th>Longitud</th><td>${p.longitud}</td></tr>`;
                }
                if (specsHtml === '') {
                    specsHtml = '<tr><td colspan="2" class="text-center text-muted bg-white py-4">No hay especificaciones técnicas adicionales registradas.</td></tr>';
                }
                
                $('#tabla-especificaciones').html(specsHtml);
                $('#content-detalles').slideDown('fast');
                $('#trigger-detalles').removeClass('collapsed'); 
             
                let precioBaseOriginal = parseFloat(p.amount) || 0;
                let escalasPromocion = [];

                let promosApi = p.promocion || p.Promocion;
                if (promosApi && promosApi.length > 0){
                    escalasPromocion = promosApi.sort((a,b) => b.cantidadMinima - a.cantidadMinima);
                    //Para el contenedor de promociones
                let contenedorPromos = $('#contenedor-promociones');
                contenedorPromos.empty();

                // Ordenamos de menor a mayor para que el formato tipo planes se vea natural
                let escalasVisuales = [...escalasPromocion].sort((a, b) => a.cantidadMinima - b.cantidadMinima);

                // Marcamos una promo como destacada (por ejemplo la segunda, si existe)
                let indicePopular = escalasVisuales.length > 1 ? 1 : 0;

                let htmlPromos = `
                    <div class="card border-success shadow-sm mt-2 mb-3">
                        <div class="card-header bg-success text-white py-2">
                            <h6 class="mb-0 fw-bold" style="font-size: 0.95rem;">
                                <i class="fa fa-tags me-1"></i> Ahorra comprando por volumen
                            </h6>
                        </div>
                        <div class="card-body p-3 bg-light">
                            <div class="row g-3">
                `;

                escalasVisuales.forEach((promo, index) => {
                    let esPopular = index === indicePopular;

                    htmlPromos += `
                        <div class="col-12 col-sm-6 col-lg-3 mt-3">
                            <div class="card h-100 border ${esPopular ? 'border-danger shadow' : 'border-light shadow-sm'} rounded-4 position-relative">
                                
                                ${esPopular ? `
                                    <span class="position-absolute top-0 start-50 translate-middle badge bg-danger rounded-pill px-3 py-2 shadow-sm"
                                        style="font-size: 0.75rem; z-index: 2;">
                                        Más popular
                                    </span>
                                ` : ''}

                                <div class="card-body text-center px-3 py-4 bg-white rounded-4">
                                    <div class="text-uppercase text-muted fw-semibold mb-2" 
                                        style="font-size: 0.75rem; letter-spacing: 0.8px;">
                                        ${promo.cantidadMinima}+ pzas
                                    </div>

                                    <h5 class="fw-bold mb-1 ${esPopular ? 'text-danger' : 'text-dark'}" style="font-size: 1.35rem;">
                                        $${parseFloat(promo.precioPromocion).toFixed(2)}
                                    </h5>

                                    <div class="text-muted mb-3" style="font-size: 0.85rem;">
                                        MXN c/u
                                    </div>

                                    <div class="d-grid">
                                        <button type="button"
                                                onclick="$('#totalProducto').val(${promo.cantidadMinima}).trigger('change');"
                                                class="btn ${esPopular ? 'btn-danger shadow-sm' : 'btn-outline-success'} rounded-pill fw-semibold btn-seleccionar-promo"
                                                style="font-size: 0.85rem; transition: all 0.2s;">
                                            Agregar ${promo.cantidadMinima} pzas
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });

                htmlPromos += `
                            </div>
                            <div class="text-muted text-center mt-3" style="font-size: 0.8rem;">
                                Todos los precios mostrados son antes del IVA
                            </div>
                        </div>
                    </div>
                `;

                contenedorPromos.html(htmlPromos);
                    

                } else {
                    $('#contenedor-promociones').empty();
                }
            
                const actualizarPrecioTotal = (cantidad) => {
                    if (isNaN(cantidad) || cantidad < 1) {
                        cantidad = 1;
                        $('#totalProducto').val(1);
                    }
                    let precioUnitarioActual = precioBaseOriginal;
                    for(let escala of escalasPromocion){
                        if(cantidad >= escala.cantidadMinima) {
                            precioUnitarioActual = parseFloat(escala.precioPromocion);
                            console.log(`¡Promoción aplicada! Compró ${cantidad}, el precio bajó a $${precioUnitarioActual} (Unidad: ${escala.unidadOriginal})`);
                            break;
                        }
                    }
                    let precioTotal = precioUnitarioActual * cantidad;
                    $('#product-amount').text(precioTotal.toFixed(2));
                    $('#input-precio').val(precioTotal.toFixed(2));
                    if(typeof actualizarSemaforo === 'function'){
                         actualizarSemaforo();
                    }
                };

                // Suma
                $('.btn-plus').off('click').on('click', function(e) {
                    e.preventDefault(); 
                    
                    let valorBase = parseInt($('#totalProducto').val()) || 1;
                    let valorNuevo = valorBase + 1;
                    
                    $('#totalProducto').val(valorNuevo);

                    actualizarPrecioTotal(valorNuevo);
                    
                });

                // Resta
                $('.btn-minus').off('click').on('click', function(e) {
                    e.preventDefault(); 
                    
                    let valorBase = parseInt($('#totalProducto').val()) || 1;
                    
                    if (valorBase > 1) {
                        let valorNuevo = valorBase - 1;
                        $('#totalProducto').val(valorNuevo);
                        
                        actualizarPrecioTotal(valorNuevo);
                    }
                });

                //Prevenir recarga
                $('#totalProducto').off('keydown change').on('keydown change', function(e) {
                    if (e.type === 'keydown' && e.which === 13) {
                        e.preventDefault(); 
                        $(this).blur(); 
                    }
                    
                    if (e.type === 'change' || e.type === 'input') {
                        let valorNuevo = parseInt($(this).val());
                        if(!isNaN(valorNuevo)){
                            actualizarPrecioTotal(valorNuevo);
                        }
                    }
                });

                actualizarPrecioTotal(parseInt($('#totalProducto').val()) || 1);
                $('#product-img')
                    .css('cursor', 'zoom-in') 
                    .off('click').on('click', function() {
                        const imgSrc = $(this).attr('src');
                        
                        // Verificamos si SweetAlert2 está disponible en esta vista
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                imageUrl: imgSrc,
                                imageAlt: p.shortName,
                                title: p.shortName,
                                showCloseButton: true,
                                showConfirmButton: false,
                                width: 'auto', // Permite que el modal crezca según la imagen
                                padding: '1em',
                                backdrop: `rgba(0,0,0,0.85)`, // Fondo oscuro transparente
                                customClass: {
                                    image: 'img-fluid rounded shadow', // Clases de Bootstrap
                                    title: 'h5 text-dark'
                                }
                            });
                        } else {
                            // Fallback de seguridad: si no hay SweetAlert, la abre en una pestaña nueva
                            window.open(imgSrc, '_blank');
                        }
                    });
                    consultarStock(p.codigoInterno);
                    cargarDescripcionLarga(articulo);
            } else {
                $(".product-info-box").html("<div class='text-center text-muted py-5'><i class='fas fa-search fa-3x mb-3'></i><br>No se encontró el producto solicitado.</div>");
            }
        },

        
        error: function (xhr) {
            $(".product-info-box").html("<div class='text-center text-danger py-5'><i class='fas fa-exclamation-triangle fa-3x mb-3'></i><br>Ocurrió un error interno al intentar cargar el producto.</div>");
        }
    });
}

// CARGA DE SUGERENCIAS (EQUIVALENTES Y COMPLEMENTARIOS)

function cargarSugerencias(articulo) {
    const sid = getSessionID();
    
    $.ajax({
        url: `app/api/exiros.php?method=ExirosSugerencias${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
        type: 'GET',
        data: { articulo: articulo, top: 3 }, // Traemos hasta 5 para que cuadren en la fila col-quinto
        dataType: 'json',
        success: function(res) {
            
            if (!res.isError && res.data && res.data.length > 0) {
                // Filtramos por tipo soportando mayúsculas y minúsculas por serialización
                const equivalentes = res.data.filter(x => (x.tipoSugerencia || x.TipoSugerencia) === 'EQUIVALENTE');
                const complementarios = res.data.filter(x => (x.tipoSugerencia || x.TipoSugerencia) === 'COMPLEMENTARIO');

                // 1. Procesar y preparar Complementarios (Lateral Derecho Oculto por defecto)
                if (complementarios.length > 0) {
                    // ¡Enciende el BOTÓN INTEGRADO en lugar de mostrar la sección!
                    $('#caja-seccion-complementarios').show();
                    
                    const containerComp = $('#contenedor-complementarios');
                    containerComp.empty(); // Limpieza de seguridad
                    complementarios.forEach(prod => {
                        // Tarjeta col-12 para ocupar toda la columna lateral
                        containerComp.append(crearTarjetaProducto(prod, 'col-12'));
                    });
                }

                // 2. Procesar y preparar Equivalentes (Fila Inferior Oculta por defecto)
                if (equivalentes.length > 0) {
                    // ¡Enciende el BOTÓN INTEGRADO en lugar de mostrar la sección!
                    $('#caja-seccion-similares').show();
                    
                    const containerEq = $('#contenedor-equivalentes');
                    containerEq.empty(); // Limpieza de seguridad
                    equivalentes.forEach(prod => {
                        // Usamos col-quinto definida en CSS de Twig para 5 por fila
                        containerEq.append(crearTarjetaProducto(prod, 'col-lg-2 col-md-4 col-sm-4'));
                    });
                }
            }
        },
        error: function(err) {
            console.error("Error crítico al cargar sugerencias: ", err);
        }
    });
}

// Generador de Componentes UI 
function crearTarjetaProducto(item, colsClasses) {
    // Normalización de variables
    const name = item.shortName || item.ShortName || 'Producto sin nombre';
    const img = item.imagen || item.Imagen || 'public/img/noimg.png';
    const price = item.amount || item.Amount || 0;
    const currency = item.currency || item.Currency || 'MXN';
    const id = item.codigoInterno || item.CodigoInterno || item.supplierPartID || item.SupplierPartID;
    
    // Datos adicionales para el nuevo diseño (con fallbacks seguros)
    const category = item.category || item.Category || '';
    const brand = item.manufacturer || item.Manufacturer || '';
    const description = item.longName || 'Especificaciones detalladas disponibles en la página del producto.';
  
    return `
    <div class="${colsClasses} pb-3">
        <div class="card h-100 border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
            
            <div class="position-relative d-flex justify-content-center align-items-center" 
                 style="height: 100px; padding: 1.5rem;">
                
                <img class="img-fluid" src="${img}" alt="${name}" 
                     style="max-height: 100%; max-width: 100%; object-fit: contain; mix-blend-mode: multiply; filter: contrast(1.1);">
            </div>

            <div class="card-body d-flex flex-column" style="padding: 1.25rem;">
                
                <a class="h6 text-dark text-decoration-none font-weight-bold mb-2 text-truncate" href="product?articulo=${id}" title="${name}" style="font-size: 1.1rem;">
                    ${name}
                </a>

                <div class="d-flex flex-wrap mb-2" style="gap: 5px;">
                    ${category ? `<span class="badge border text-muted" style="font-weight: 500;">${category}</span>` : ''}
                    ${brand ? `<span class="badge border text-muted" style="font-weight: 500;">${brand}</span>` : ''}
                </div>

                <p class="card-text text-muted mb-4" style="font-size: 0.85rem; line-height: 1.4; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${description}
                </p>

                <div class="d-flex justify-content-between align-items-center mt-auto">
                    <div>
                        <small class="text-muted d-block" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px;">PRECIO</small>
                        <span class="h5 mb-0 text-dark font-weight-bold">$${parseFloat(price).toFixed(2)}</span>
                    </div>
                    
                    
                    <a href="product?articulo=${id}" class="btn text-white px-3 py-2" style="background-color: #D2242a; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                        Ver detalle
                    </a>
                </div>
            </div>
            
        </div>
    </div>`;
}

function cargarDescripcionLarga(codigoInterno) {
   
    $('#product-long-description').html('<span class="text-muted"><i class="fas fa-spinner fa-spin mr-1"></i> Cargando especificaciones detalladas...</span>');

    $.ajax({
        type: "GET",
        // 2. Le pegamos a tu nuevo puente de PHP
        url: `app/api/exiros.php?method=ExirosGetLongDescription&articulo=${encodeURIComponent(codigoInterno)}`,
        dataType: "json",
        success: function (response) {
           
            // 3. Validamos si hay error o si la data viene vacía (null)
            if (!response || response.isError || !response.data) {
                $('#product-long-description').html('<span class="text-muted">No hay especificaciones adicionales para este producto.</span>');
                return;
            }

            // 4. Si todo está perfecto, pintamos el texto que vino de SQL Server
            const descripcionLarga = response.data.descripcionLarga || '';
            
            
            if (descripcionLarga.trim() === '') {
                $('#product-long-description').html('<span class="text-muted">No hay especificaciones adicionales para este producto.</span>');
            } else {
                $('#product-long-description').text(descripcionLarga);
            }
        },
        error: function () {
            $('#product-long-description').html('<span class="text-muted">No se pudieron cargar las especificaciones en este momento.</span>');
        }
    });
}

function toggleReadMore(){
    const wrapper = document.getElementById('desc-wrapper');
    const btn = document.getElementById('btn-read-more');

    wrapper.classList.toggle('is-expanded');
    if(wrapper.classList.contains('is-expanded')){
        btn.innerHTML = 'Ver menos <i class="fas fa-chevron-up"></i>';
    } else {
        btn.innerHTML = 'Ver más <i class="fas fa-chevron-down"></i>';
    }
}

$(document).ready(function () {
    // 1. Cargar el producto y las sugerencias asíncronamente
    cargarProducto();
   
    const articuloActual = getUrlParam('articulo');
    if(articuloActual) {
        cargarSugerencias(articuloActual);
    }

    // 2. Control de revelado moderno para todas las secciones integradas
    // Cualquier clic en la cabecera (incluido el título y el icono) activa el control
    $(document).on('click', '.b2b-details-header', function(e) {
        e.preventDefault();
        
        // El target está guardado en el atributo data-target de la cabecera
        const targetSelector = $(this).attr('data-target');
        if (!targetSelector) return;
        const $content = $(targetSelector);
        const $triggerBtn = $(this).find('.btn-b2b-trigger'); // Busca el icono dentro de la cabecera
        
        // Usamos slideToggle para una aparición suave y natural
        $content.slideToggle('fast', function() {
            // Actualizamos la clase .collapsed para que el icono gire con CSS
            $triggerBtn.toggleClass('collapsed');
            
            // Si la sección se acaba de abrir, hacemos scroll automático para guiar al usuario
            if (!$triggerBtn.hasClass('collapsed')) {
                $('html, body').animate({
                    // Calculamos la posición del target restando un offset de 80px para que no quede pegado arriba
                    scrollTop: $content.offset().top - 120 
                }, 500); // 500ms de animación de scroll
            }
        });
    });

    // 3. Validación de SessionID
    const sid = getSessionID();
    if (sid) {
        // ... (Tu código de validación de SessionID se mantiene intacto) ...
        fetch('app/api/exiros.php?method=validateSessionID', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({SessionID: sid})
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function (json) {
            if (json && !json.error) {
                window.phpSessionID = sid;
                // console.log('PHP SessionID validado:', window.phpSessionID);
            } else {
                console.warn('SessionID inválido:', json);
            }
        }).catch(function (err) {
            console.warn('Error al validar session id:', err);
        });
    } else {
        console.warn('No se encontró SessionID activo');
    }
    
    // 4. Lógica de agregar al carrito (Se mantiene intacta)
    $('#btAddCar').attr('type', 'button'); // Asegura que no sea un submit automático
    $('#btAddCar').off('click').on('click', function (e) {
        if (e && e.isTrusted === false) return;
        e.preventDefault();

        const cantidadNum = parseInt($('#totalProducto').val(), 10) || 0;
        if (cantidadNum <= 0) { alert('La cantidad debe ser mayor a 0'); return; }

        const codigoInterno = productoActual ? productoActual.codigoInterno : $('#input-codigo').val();
        const payload = { cantidad: cantidadNum, codigoInterno: codigoInterno };

        // Evitar doble envío
        const $btn = $(this);
        $btn.prop('disabled', true).addClass('disabled').html('<i class="fas fa-spinner fa-spin mr-2"></i> Agregando...');

        const sid = getSessionID();
        $.ajax({
            type: "POST",
            url: `app/api/exiros.php?method=insert-carrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
            dataType: "json",
            data: JSON.stringify(payload),
            contentType: "application/json",
            success: function (response) {
                console.log('Respuesta insert-carrito:', response);
                if (response.error) {
                    alert(response.message || "Ocurrió un error al procesar el articulo.");
                } else {
                    // 1. Encendemos el estado de éxito y cambiamos el texto
                    $btn.addClass('is-success')
                        .html('<i class="fas fa-check mr-2"></i> ¡Agregado!');

                    // 2. Apagamos el estado de éxito después de 2 segundos
                    setTimeout(() => {
                        $btn.removeClass('is-success')
                            .prop('disabled', false) // Por si lo habías deshabilitado al hacer clic
                            .html('<i class="fas fa-cart-plus mr-3"></i> Agregar al carrito');
                    }, 2000);
                    
                    // Actualizar listas si existen
                    if (typeof itemsCotizacion !== 'undefined') itemsCotizacion = [];
                    if (typeof listItems === 'function') listItems();
                }
            },
            error: function (xhr) {
                console.error('Error AJAX insert-carrito:', xhr.status, xhr.statusText);
                alert("Error crítico al intentar agregar el producto al carrito.");
            },
            complete: function () {
                // Si la petición falla, el botón se restaura en el bloque error o setTimeout del éxito
            }
        });
    });
});