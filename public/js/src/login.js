const apiAuth = 'app/api/auth.php?method=';
// ! condicion para iniciar sesion a travéz de exiros

// Detectar parámetros EXIROS en la URL
let urlParams = new URLSearchParams(window.location.search);
let exirosReady =
    typeof urlParams.get('Username') === 'string' && urlParams.get('Username') &&
    typeof urlParams.get('Password') === 'string' && urlParams.get('Password') &&
    typeof urlParams.get('HOOK_URL') === 'string' && urlParams.get('HOOK_URL');

if (exirosReady) {
    console.log("PREPARANDO PARAMETROS PARA EXIROS");
}


// ! fin de condicion para iniciar sesion a travéz de exiros

let items = {
    frm: $('#frmLogin'),
    iniciar: $('#btLogin'),
    modal: $('#authModal') // Referencia al modal
};

// Evento para manejar el login
items.iniciar.on('click', function (e) {
    e.preventDefault();

    if (!items.frm.valid()) {
        return;
    }

    let fm = {
        usuario: $('#usuario').val(),
        userPass: $('#userPass').val()
    };

    // Cambiar el botón a estado de carga con animación
    items.iniciar.prop('disabled', true).addClass('loading').html(`
        <div class="spinner-border text-light" role="status" style="width: 1.5rem; height: 1.5rem;">
            <span class="visually-hidden">Loading...</span>
        </div>
    `);

    $.ajax({
        type: "POST",
        url: `${apiAuth}Login`,
        data: JSON.stringify(fm),
        contentType: "application/json",
        success: function (response) {
            try {
                if (!response.error) {
                    // Login exitoso: abrir el modal de autenticación
                    items.modal.modal({
                        backdrop: 'static', // Evitar que se cierre al hacer clic fuera del modal
                        keyboard: false     // Evitar que se cierre con la tecla ESC
                    });
                    items.modal.modal('show'); // Mostrar el modal
                } else {
                    // Mostrar error si el login no es exitoso
                    items.iniciar.prop('disabled', false).removeClass('loading').addClass('error').html('Contraseña incorrecta').css({
                        backgroundColor: '#000',
                        color: '#fff'
                    });
                }
            } catch (e) {
                console.error('Error al procesar la respuesta:', e);
                items.iniciar.prop('disabled', false).removeClass('loading').addClass('error').html('Error inesperado').css({
                    backgroundColor: '#000',
                    color: '#fff'
                });
            }
        },
        error: function (xhr, status, error) {
            console.error('Error:', xhr.responseText);

            // Manejar específicamente el error 401
            if (xhr.status === 401) {
                items.iniciar.prop('disabled', false).removeClass('loading').addClass('error').html('Contraseña incorrecta').css({
                    backgroundColor: '#000', // Cambiar a negro
                    color: '#fff'
                });

                // Regresar el botón a su estado normal después de 1 segundo
                setTimeout(() => {
                    items.iniciar.removeClass('error').html('Iniciar sesión').css({
                        backgroundColor: '', // Restaurar el color original
                        color: ''
                    });
                }, 1000); // 1 segundo
            } else {
                // Manejar otros errores
                items.iniciar.prop('disabled', false).removeClass('loading').addClass('error').html('Error de conexión').css({
                    backgroundColor: '#000',
                    color: '#fff'
                });
            }
        }
    });
});

$('#authForm').on('submit', function (e) {
    e.preventDefault();
    let code = $('#codigo').val();

    // Cambiar el botón a estado de carga
    let submitButton = $('#authForm button[type="submit"]');
    submitButton.prop('disabled', true).addClass('loading').html(`
        <div class="spinner-border text-light" role="status" style="width: 1.5rem; height: 1.5rem;">
            <span class="visually-hidden">Loading...</span>
        </div>
    `);

    $.ajax({
        type: 'POST',
        url: `${apiAuth}Authenticate`,
        data: JSON.stringify({ code }),
        contentType: 'application/json',
        success: function (response) {
            try {
                if (response.error) {
                    // Mostrar error en el botón
                    submitButton.prop('disabled', false).removeClass('loading').addClass('error').html('Código inválido').css({
                        backgroundColor: '#dc3545', // Rojo para error
                        color: '#fff'
                    });
                    window.location.href = '/index.php'; // Cambia '/b2c/' según tu estructura de carpetas
                } else {
                    // Mostrar éxito en el botón
                    submitButton.removeClass('loading').addClass('success').html(`
                        <span class="text-light">
                            <i class="bi bi-check-circle-fill"></i> Autenticación exitosa
                        </span>
                    `).css({
                        backgroundColor: '#28a745', // Verde para éxito
                        color: '#fff'
                    }).prop('disabled', true);

                    // Llamar a InitPlantaPorDefecto para asignar la planta en la sesión
                    $.ajax({
                        type: 'POST',
                        url: 'app/api/b2b.php?method=InitPlantaPorDefecto',
                        contentType: 'application/json',
                        success: function () {
                            // Recargar la página después de asignar la planta
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        },
                        error: function (xhr, status, error) {
                            console.error('Error al inicializar la planta por defecto:', xhr.responseText);
                            // Recargar de todos modos para no bloquear el flujo
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        }
                    });
                }
            } catch (e) {
                console.error('Error al procesar la respuesta:', e);
                submitButton.prop('disabled', false).removeClass('loading').addClass('error').html('Error inesperado').css({
                    backgroundColor: '#000',
                    color: '#fff'
                });
            }
        },
        error: function (xhr, status, error) {
            console.error('Error:', xhr.responseText);
            submitButton.prop('disabled', false).removeClass('loading').addClass('error').html('Error de conexión').css({
                backgroundColor: '#000',
                color: '#fff'
            });
        }
    });
});

$('#formSolicitudAcceso').on('submit', function (e) {
    e.preventDefault();

    // Obtener valores del formulario
    let nombreEmpresa = $('#empresa').val().trim();
    let nombreSolicita = $('#solicitante').val().trim();
    let correoElectronico = $('#correoSolicitud').val().trim();
    let numeroTelefono = $('#telefonoSolicitud').val().trim();
    let mensaje = $('#mensajeSolicitud').val().trim();

    // Limpia mensajes anteriores
    let $msg = $('#solicitudAccesoMsg');
    $msg.hide().removeClass('text-danger text-success').text('');

    // Validación básica (opcional, ya que el HTML5 required ya valida)
    if (!nombreEmpresa || !nombreSolicita || !correoElectronico || !numeroTelefono) {
        $msg.addClass('text-danger').text('Por favor, completa todos los campos obligatorios.').show();
        return;
    }

    // Deshabilita el botón mientras se envía
    let $btn = $(this).find('button[type="submit"]');
    $btn.prop('disabled', true).text('Enviando...');

    // Prepara el payload para el backend
    let payload = {
        nombreEmpresa,
        nombreSolicita,
        correoElectronico,
        numeroTelefono,
        mensaje
    };

    $.ajax({
        type: 'POST',
        url: '/b2c/app/api/forms.php?method=CrearFormularioSolicitudAcceso',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(payload),
        success: function (response) {
            // TODO: ELIMINAR ESTE CONSOLE.LOG
        console.log('Respuesta del backend:', response);
        // Validar si el backend o el endpoint externo marcó error
        let isError = response.error || (response.data && (response.data.isError === true || response.data.IsError === true));
        if (!isError) {
            $msg.removeClass('text-danger').addClass('text-success').text('¡Solicitud enviada correctamente! Nos pondremos en contacto contigo pronto.').show();
            $('#formSolicitudAcceso')[0].reset();
            setTimeout(() => {
                $('#solicitudAccesoModal').modal('hide');
                $msg.hide();
            }, 2000);
        } else {
            $msg.removeClass('text-success').addClass('text-danger').text(
                (response.data && response.data.message) || response.message || 'No se pudo enviar la solicitud.'
            ).show();
        }
    },
        error: function (xhr, status, error) {
            $msg.removeClass('text-success').addClass('text-danger').text('Error en la solicitud: ' + (xhr.responseText || error)).show();
        },
        complete: function () {
            $btn.prop('disabled', false).text('Enviar solicitud');
        }
    });
});


// Validación del formulario
items.frm.validate({
    rules: {
        usuario: { required: true },
        userPass: { required: true }
    },
    messages: {
        usuario: {
            required: "Por favor ingrese su usuario"
        },
        userPass: {
            required: "Por favor ingrese su contraseña"
        }
    }
});