const items = {
    AddCar: $('#btAddCar')
}

let carritoID = null;

items.AddCar.on('click', function (e) {
    e.preventDefault();

    // Mostrar loader SweetAlert2
    Swal.fire({
        title: 'Procesando...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const sid = (function(){ try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return new URLSearchParams(location.search).get('SessionID'); } })();
    $.ajax({
        type: 'POST',
        url: `/b2c/app/api/exiros.php?method=insert-carrito${sid ? `&SessionID=${encodeURIComponent(sid)}` : ''}`,
        contentType: 'application/json',
        dataType: 'json',
        success: function (response) {
            try {
                if (response && !response.error) {
                    carritoID = response.objResponse.carritoID;
                    let articulo = $('input[name="articulo"]').val();
                    let cantidad = $('#totalProducto').val();

                    const payload = {
                        carritoID: carritoID,
                        producto: articulo,
                        totalProducto: cantidad
                    };

                    $.ajax({
                        type: 'POST',
                        url: '/b2c/app/api/carrito.php?method=insertItemCarrito',
                        contentType: 'application/json',
                        dataType: 'json',
                        data: JSON.stringify(payload),
                        success: function (response) {
                            Swal.close();
                            try {
                                if (response.objResponse === true) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'success',
                                        title: response.message || '¡Artículo agregado correctamente!',
                                        showConfirmButton: false,
                                        timer: 3000
                                    });
                                } else {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'error',
                                        title: response.message || 'No se pudo enviar el artículo, contacte a su asesor de ventas.',
                                        showConfirmButton: false,
                                        timer: 3000
                                    });
                                }
                            } catch (e) {
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'error',
                                    title: 'Error al procesar la respuesta: ' + e.message,
                                    showConfirmButton: false,
                                    timer: 3000
                                });
                            }
                        },
                        error: function (xhr, status, error) {
                            Swal.close();
                            if (
                                xhr.responseJSON &&
                                xhr.responseJSON.responseCode === 400 &&
                                xhr.responseJSON.message &&
                                xhr.responseJSON.message.includes('Error al conectar con el endpoint')
                            ) {
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'info',
                                    title: 'El artículo ya ha sido agregado',
                                    showConfirmButton: false,
                                    timer: 3000
                                });
                            } else {
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'error',
                                    title: 'Error en la solicitud: ' + (xhr.responseText || error),
                                    showConfirmButton: false,
                                    timer: 3000
                                });
                            }
                        },
                    });
                } else {
                    Swal.close();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: response.message || 'No se pudo enviar el artículo, contacte a su asesor de ventas.',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            } catch (e) {
                Swal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Error al procesar la respuesta: ' + e.message,
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        },
        error: function (xhr, status, error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Error en la solicitud: ' + (xhr.responseText || error),
                showConfirmButton: false,
                timer: 3000
            });
        }
    });
});