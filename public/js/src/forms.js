$('#contactForm').on('submit', function (e) {
        e.preventDefault();

        // Obtener los valores del formulario
        const listaSelectFormularioClienteID = $('#reason').val(); // El value del select ya es el ID
        const mensaje = $('#message').val();

        // Construir el payload para la API
        const payload = {
            listaSelectFormularioClienteID: listaSelectFormularioClienteID,
            mensaje: mensaje
        };

        $.ajax({
            type: 'POST',
            url: '/b2c/app/api/forms.php?method=CrearFormularioCliente',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(payload),
            success: function (response) {
                try {
                    if (response && !response.error) {
                        alert('¡Formulario enviado correctamente!');
                        $('#contactForm')[0].reset();
                    } else {
                        alert('Error: ' + (response.message || 'No se pudo enviar el formulario.'));
                    }
                } catch (e) {
                    alert('Error al procesar la respuesta: ' + e.message);
                }
            },
            error: function (xhr, status, error) {
                alert('Error en la solicitud: ' + (xhr.responseText || error));
            }
        });
    });