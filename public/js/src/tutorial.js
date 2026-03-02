document.addEventListener("DOMContentLoaded", function() {
    
    if (!window.driver || !window.driver.js) {
        console.warn("Driver.js no está cargado.");
        return;
    }

    const driver = window.driver.js.driver;

    // --- MAGIA NUEVA: Bloqueo por CSS (Infalible) ---
    // Creamos una etiqueta <style> dinámica para congelar los botones
    function addTutorialStyles() {
    if (document.getElementById('tutorial-lock-styles')) return;

    const style = document.createElement('style');
    style.id = 'tutorial-lock-styles';
    style.innerHTML = `
        #b2bModule .btn-procesar-compra,
        #b2bModule #btnSearch,
        #b2bModule .addCar,
        #b2bModule .quantity-control,
        #b2bModule .quantity-input {
            pointer-events: none !important;
            opacity: .6 !important;
            cursor: not-allowed !important;
            box-shadow: none !important;
        }
    `;

    document.head.appendChild(style);
}

    function removeTutorialStyles() {
        const style = document.getElementById('tutorial-lock-styles');
        if (style) {
            style.remove();
            console.log("🔓 Botones liberados.");
        }
    }
    // ------------------------------------------------

    const baseConfig = {
        showProgress: true,
        animate: true,
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        doneBtnText: '¡Finalizar!',
        allowClose: true,
        smoothScroll: true,
        
        // Al terminar, quitamos el CSS de bloqueo
        onDestroyed: () => {
            removeTutorialStyles();
        }
    };

    const stepsConfig = {
        'shop': [
            // Paso 1: Buscador (ID Corregido: #productSearchInput)
            { 
                element: '#productSearchInput', 
                popover: { 
                    title: 'Buscador Inteligente', 
                    description: 'Escribe el <b>Código (SKU)</b>, nombre o marca del producto aquí.' 
                } 
            },
            // Paso 2: Botón Buscar (ID Corregido: #btnSearch)
            { 
                element: '#btnSearch', 
                popover: { 
                    title: 'Ejecutar Búsqueda', 
                    description: 'Haz clic aquí para filtrar los resultados.' 
                } 
            },
            // Paso 3: Filtros (ID Corregido: #exiros-categories)
            { 
                element: '#exiros-categories', 
                popover: { 
                    title: 'Filtros (OPCIONALES)', 
                    description: 'Selecciona una categoría o fabricante para refinar tu búsqueda.' 
                } 
            },
            // Paso 4: Área de Resultados (Clase Corregida: .itemScroll)
            { 
                element: '.itemScroll', 
                popover: { 
                    title: 'Catálogo', 
                    description: 'Aquí aparecerán los productos con tu precio especial y stock en tiempo real.' 
                } 
            },

          { 
                element: '.quantity-input', 
                popover: { 
                    title: 'Define la Cantidad', 
                    description: 'Escribe o usa los botones +/- para definir cuántas piezas necesitas.' 
                } 
            },

            // Paso 6: Botón Agregar (Usa tu clase .addCar)
            { 
                element: '.addCar', 
                popover: { 
                    title: 'Agregar al Carrito', 
                    description: 'Presiona el botón <b>Agregar</b> para incluir este producto en tu pedido.' 
                } 
            },
            // Paso 5: Carrito (ID Corregido: #TotalCarrito)
            { 
                element: '#TotalCarrito', 
                popover: { 
                    title: 'Tu Carrito', 
                    description: 'Aquí verás el resumen de tus agregados para proceder al pago.' 
                } 
            }


            
        ],

    
        'misCotizaciones': [
            { 
                element: 'h1', 
                popover: { title: 'Mis Cotizaciones', description: 'Cotizaste algo y ya cuentas con tu numero de cliente, ¡compralo sin necesidad de cargarlo manualmente!' } 
            },
            { 
                element: '#claveC', 
                popover: { title: 'Buscar por Folio', description: '¿Tienes tu numero de cliente? ¡Escríbelo aquí! ejemplo, escribe: CL-00078' } 
            },
            { 
                element: '#searchCot', 
                popover: { title: 'Aplicar Filtro', description: 'Haz clic aquí para ejecutar la búsqueda y traer tus cotizaciones' } 
            },
            { 
                element: '#comprasRoot', 
                popover: { title: 'Tus Resultados', description: 'Aquí verás la lista. Revisa el detalle y tus articulos seleccionados' } 
            },
            // Este paso ahora es seguro porque el CSS ya bloqueó el botón
            { 
                element: '.btn-procesar-compra', 
                popover: { 
                    title: 'Procesar Compra', 
                    description: 'Al hacer clic aquí, convertirás esta cotización en un pedido firme. <b>(Deshabilitado por seguridad durante el tutorial)</b>.' 
                } 
            },
            { 
                element: '#btnActualizacion', 
                popover: { title: '¡Todo listo!', description: 'Ahora inténtalo tú mismo: ingresa un folio cliente o revisa tu historial.' } 
            }
        ],

        'cotizar': [
            { element: 'h3', popover: { title: 'Compra Rápida', description: 'La herramienta para pedidos masivos.' } },
             { 
                element: '#rapida', 
                popover: { 
                    title: '¿Que es diferente?', 
                    description: '¡Es más rapido!, agrega el código, un nombre, una descripción y te mostraremos los resultados para que los agregues en este mismo carrito y compres inmediatamente' 
                } 
            },
             { 
                element: '#seleccion', 
                popover: { 
                    title: 'Paso 1:', 
                    description: 'Simplemente busca un articulo, dale cick para seleccionarlo' 
                } 
            },
              { 
                element: '#cantidad', 
                popover: { 
                    title: 'Paso 2:', 
                    description: '¿Cantos llevarás? ¡Puedes editarlo aqui mismo!' 
                } 
            },
             { 
                element: '#btnAgregar', 
                popover: { 
                    title: 'Paso 3:', 
                    description: '¡Agregalos a tu carrito!, aparecerán con sus precios, cantidades, etc, todo antes del IVA' 
                } 
            },
             { 
                element: '#tbListItems', 
                popover: { 
                    title: 'Paso 4:', 
                    description: 'Aqui aparecerán tus productos, ¿te equivocaste de cantidad? ¡Puedes editarlo!, ¿no es este producto?. ¡Elimina y carga otro de nuevo!' 
                } 
            },
            { 
                element: '#sugerenciasContainer', 
                popover: { 
                    title: 'Sugerencias para ti', 
                    description: '¡Conoce nuestros productos!, ¿recordaste que necesitas alguno?, ¿buscas algo mas? ¡Agregalos a tu carrito!' 
                } 
            },
              { 
                element: '#resumen', 
                popover: { 
                    title: 'Paso 5:', 
                    description: '¡Resumen de tus pedidos, aqui aparecerá el total entre todos tus pedidos!' 
                } 
            },
               { 
                element: '#btnSolicitar', 
                popover: { 
                    title: 'Paso 6:', 
                    description: '¿Listo para comprar?, ¡Perfecto!, al darle click aqui mismo enviaremos este carrito a tu SAP!' 
                } 
            },
        ],
        'carrito': [
            { element: 'h5', popover: { title: 'Tutorial Carrito', description: '¿Llenase tu carrito en tienda y quieres proceder con la compra?, ¡Vamos a ello!' } },
               { 
                element: '#listaArticulos', 
                popover: { 
                    title: 'Lista de articulos', 
                    description: 'Aqui apareceran los articulos que anteriormente agregaste en "tienda", podrás observar las caracteristicas que aqui se te muestran de cada producto.' 
                } 
            },
              { 
                element: '#resumenCarrito', 
                popover: { 
                    title: 'Resumen de tu carrito', 
                    description: 'Aqui se ve el resumen de tu compra, el total estimado entre todos los productos antes del IVA' 
                } 
            },

              { 
                element: '#btnCXML', 
                popover: { 
                    title: 'Proceder con la compra', 
                    description: 'Aqui, al hacer click sobre el botón se enviará directamente a tu SAP para que procedamos con la compra' 
                } 
            },
            { 
                element: '', 
                popover: { 
                    title: '¡Eso es todo!', 
                    description: 'Gracias por comprar en Mersol Sureste' 
                } 
            },
        ],
        
        'default': [
            { element: '#btnActualizacion', popover: { title: 'Centro de Ayuda', description: 'Aquí encontrarás tutoriales y explicaciones de cada módulo.' } },
            { element: '#link-tienda', popover: { title: 'Ir a Tienda', description: 'Comienza a explorar nuestro catálogo completo.' } }
        ]
    };

    function getCurrentSteps() {
        const path = window.location.pathname;
        if (path.includes('shop')) return stepsConfig['shop'];
        if (path.includes('misCotizaciones')) return stepsConfig['misCotizaciones'];
        if (path.includes('cotizar')) return stepsConfig['cotizar'];
        if (path.includes('carrito')) return stepsConfig['carrito'];
        return stepsConfig['default'];
    }

    function startTutorial() {
        const steps = getCurrentSteps();
        
        if (steps) {
            // 1. APLICAR BLOQUEO ANTES DE INICIAR
            // Si estamos en cotizaciones, inyectamos el CSS protector
            if (window.location.pathname.includes('misCotizaciones')) {
                addTutorialStyles();
            }

            const driverObj = driver({
                ...baseConfig, 
                steps: steps
            });
            
            driverObj.drive();
        } else {
            console.log("No hay pasos definidos.");
        }
    }

    const btnTutorial = document.getElementById('btn-start-tutorial');
    if (btnTutorial) {
        btnTutorial.onclick = function(e) {
            e.preventDefault();
            startTutorial();
        };
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tutorial') === 'true') {
        // Aumenté un poco el tiempo por seguridad, pero con el CSS no importa si tarda más
        setTimeout(() => {
            startTutorial();
        }, 1500); 
        
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: newUrl}, '', newUrl);
    }
});