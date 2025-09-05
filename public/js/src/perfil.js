const apiAuth = 'app/api/auth.php?method=';
const apiAgents = 'app/api/agents.php?method=';
const apiB2B = "app/api/b2b.php?method=";
let agentID = '';

// Realizar la solicitud a la API
$.ajax({
    type: 'GET',
    url: `app/api/auth.php?method=GetUserClientData`,
    contentType: 'application/json',
    dataType: 'json', // Asegura que la respuesta se interprete como JSON
    success: function (response) {
        try {
            // Verificar si la respuesta tiene la estructura esperada
            if (response && !response.error && response.objResponse) {
                // Llenar los campos de Datos Personales
                $('#nombreCliente').val(response.objResponse.nombreCliente || '');
                $('#emailIntelisis').val(response.objResponse.emailIntelsis || '');
                $('#telefonoIntelisis').val(response.objResponse.telefonoIntelisis || '');

                // Llenar los campos de Datos Fiscales
                $('#rfc').val(response.objResponse.rfc || '');

                // Almacenar el ID del agente en la variable global
                // agentID = response.objResponse.agente || '';
                // console.log('Agente obtenido:', agentID);

                // Realizar la solicitud para obtener los datos del agente
                getAgentData();
            } else {
                console.error('Error al obtener los datos del cliente:', response.message || 'Estructura de respuesta inesperada.');
            }
        } catch (e) {
            console.error('Error al procesar la respuesta:', e);
        }
    },
    error: function (xhr, status, error) {
        console.error('Error en la solicitud:', xhr.responseText);
    }
});

// Realizar la solicitud a la API para obtener las cuentas del cliente
$.ajax({
    type: 'POST',
    url: `app/api/auth.php?method=GetUserClientAccounts`,
    contentType: 'application/json',
    dataType: 'json', // Asegura que la respuesta se interprete como JSON
    data: JSON.stringify({ Cliente: 'VMTY-00075' }), // ClienteID dinámico
    success: function (response) {
        try {
            if (response && !response.isError && Array.isArray(response.objResponse)) {
                const tbody = $('#formMisCuentas tbody');
                tbody.empty(); // Limpiar la tabla antes de llenarla

                // Iterar sobre las cuentas y agregarlas a la tabla
                response.objResponse.forEach(account => {
                    const row = `
                        <tr>
                            <td>${account.email}</td>
                            <td>${account.telefono}</td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            } else {
                console.error('Error al obtener las cuentas:', response.message || 'Estructura de respuesta inesperada.');
            }
        } catch (e) {
            console.error('Error al procesar la respuesta:', e);
        }
    },
    error: function (xhr, status, error) {
        console.error('Error en la solicitud:', xhr.responseText);
    }
});

function getAgentData() {

    $.ajax({
        type: 'POST',
        url: `app/api/agents.php?method=GetDataAgent`,
        contentType: 'application/json',
        dataType: 'json', // Asegura que la respuesta se interprete como JSON
        success: function (response) {
            try {
                // Verificar si la respuesta tiene la estructura esperada
                if (response && !response.isError && response.objResponse) {
                    const agentData = response.objResponse;

                    // Llenar los campos del modal con los datos del agente
                    $('#nombreAgente').val(agentData.nombreAgente || 'No disponible');
                    $('#correoAgente').val(agentData.correoAgente || 'No disponible');
                    $('#celularAgente').val(agentData.celularAgente || 'No disponible');

                    // Renderizar la imagen en formato Base64
                    const fotoAgente = agentData.fotoAgente
                        ? `data:image/jpeg;base64,${agentData.fotoAgente}`
                        : 'public/img/incognito.jpg'; // Imagen por defecto si no hay foto
                    $('#fotoAgente').attr('src', fotoAgente);

                    console.log('Datos del agente renderizados en el modal:', agentData);
                } else {
                    console.error('Error al obtener los datos del agente:', response.message || 'Estructura de respuesta inesperada.');
                }
            } catch (e) {
                console.error('Error al procesar la respuesta:', e);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error en la solicitud:', xhr.responseText);
        }
    });
}

// Limpiar los datos del modal al abrirlo
$('#facturaModal').on('show.bs.modal', function () {
    // Limpiar los campos de texto
    $('#serieFolio').text('NA');
    $('#fechaEmision').text('NA');
    $('#agente').text('NA');
    $('#condicionesPago').text('NA');

    $('#domicilio1').text('NA');
    $('#domicilio2').text('NA');
    $('#domicilio3').text('NA');

    $('#rfc1').text('NA');
    $('#rfc2').text('NA');
    $('#rfc3').text('NA');

    $('#emiteSucursal').text('NA');

    $('#direccion1').text('NA');
    $('#direccion2').text('NA');
    $('#direccion3').text('NA');

    $('#nombreCliente2').text('NA');
    $('#rfcCliente').text('NA');
    $('#direccionCliente').text('NA');
    $('#coloniaCliente').text('NA');
    $('#estadoCliente').text('NA');

    $('#usoCFIDCliente').text('NA');
    $('#localidadCliente').text('NA');
    $('#delegacionMunicipioCliente').text('NA');
    $('#codigoPostalCliente').text('NA');
    $('#paisCliente').text('NA');

    // Limpiar la tabla de productos
    $('#detalleProductosTable tbody').empty();

    $('.row.text-center.mt-4 .col.border:nth-child(1) p:nth-child(2)').text('$0.00');
    $('.row.text-center.mt-4 .col.border:nth-child(2) p:nth-child(2)').text('$0.00');
    $('.row.text-center.mt-4 .col.border:nth-child(3) p:nth-child(2)').text('$0.00');
    $('.row.text-center.mt-4 .col.border:nth-child(4) p:nth-child(2)').text('$0.00');

});

let facturasTable;

$('#comprasFacturasModal').on('shown.bs.modal', function () {
    if (!$.fn.DataTable.isDataTable('#facturasTable')) {
        facturasTable = $('#facturasTable').DataTable({
            serverSide: true, // Habilitar el procesamiento del lado del servidor
            processing: true, // Mostrar indicador de carga
            ajax: {
                url: 'app/api/b2b.php?method=GetFacturasCliente',
                type: 'GET',
                data: function (d) {
                    return {
                        ...d,
                        start: d.start,
                        limit: d.length,
                        search: d.search.value || null,
                        fechaInicio: null,
                        fechaFin: null,
                        orderColumn: d.columns[d.order[0].column].data,
                        orderAsc: d.order[0].dir === 'asc'
                    };
                },
                dataSrc: function (json) {
                    //TODO ELIMINAR ESTE CONSOLE
                    console.log('Respuesta del backend para DataTable:', json);
                    return json.data;
                }
            },
            columns: [
                { data: 'movID' }, // MovID
                { 
                    data: 'fechaEmision',
                    render: function(data) {
                        return new Date(data).toLocaleDateString();
                    }
                }, // Fecha
                { data: 'movimiento' }, // Número de Factura
                { 
                    data: 'subTotal',
                    render: function(data) {
                        return `$${parseFloat(data).toFixed(2)}`;
                    }
                }, // Monto
                {
                    data: null,
                    render: function(data) {
                        // El botón toma el movID correcto
                        return `<button class="btn btn-primary btn-sm detalles-btn" data-movid="${data.movID}">Detalles</button>`;
                    },
                    orderable: false,
                    searchable: false
                }
            ],
            paging: true,
            searching: true,
            ordering: true,
            order: [[0, 'desc']], // Ordenar por fecha de emisión descendente
            language: {
                url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json' // Traducción al español
            },
            drawCallback: function () {
                console.log('Tabla de facturas actualizada.');
            }
        });
    } else {
        facturasTable.ajax.reload(); // Recargar datos si ya está inicializado
    }
});

// Manejar el evento del botón "Detalles"
$('#facturasTable').on('click', '.detalles-btn', function () {
    let movId = $(this).data('movid');
    $('#movId').text(movId);

    // Primera solicitud: Obtener los datos de la factura
    $.ajax({
        url: `app/api/b2b.php?method=GetDatosFactura&movID=${encodeURIComponent(movId)}`,
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            const factura = (response.objResponse && response.objResponse.length) ? response.objResponse[0] : null;
            if (factura) {
                console.log('Datos de la factura:', factura);
                const id = factura.id; // Asignar el ID de la factura

                // Actualizar los campos del modal con los datos de la factura
                $('#serieFolio').text(movId);
                $('#fechaEmision').text(new Date(factura.fechaEmision).toLocaleDateString());
                $('#agente').text(factura.agente);
                $('#condicionesPago').text(factura.condicionPago);

                $('#domicilio1').text(factura.domicilioFiscal1 || 'NA');
                $('#domicilio2').text(factura.domicilioFiscal2 || 'NA');
                $('#domicilio3').text(factura.domicilioFiscal3 || 'NA');

                $('#rfc1').text(factura.rfC1 || 'NA');
                $('#rfc2').text(factura.rfC2 || 'NA');
                $('#rfc3').text(factura.rfC3 || 'NA');

                $('#emiteSucursal').text(factura.emiteSucursal || 'NA');

                $('#direccion1').text(factura.direccion1 || 'NA');
                $('#direccion2').text(factura.direccion2 || 'NA');
                $('#direccion3').text(factura.direccion3 || 'NA');

                $('#nombreCliente2').text(factura.nombreCliente || 'NA');
                $('#rfcCliente').text(factura.rfcCliente || 'NA');
                $('#direccionCliente').text(factura.direccionCliente || 'NA');
                $('#coloniaCliente').text(factura.coloniaCliente || 'NA');
                $('#estadoCliente').text(factura.estadoCliente || 'NA');

                $('#usoCFIDCliente').text(factura.usoCFIDCliente || 'NA');
                $('#localidadCliente').text(factura.localidadCliente || 'NA');
                $('#delegacionMunicipioCliente').text(factura.delegacionMunicipioCliente || 'NA');
                $('#codigoPostalCliente').text(factura.codigoPostalCliente || 'NA');
                $('#paisCliente').text(factura.paisCliente || 'NA');

                // Segunda solicitud: Obtener los productos de la factura
                $.ajax({
                    url: `app/api/b2b.php?method=GetProductosFactura&id=${encodeURIComponent(id)}`,
                    type: 'GET',
                    dataType: 'json',
                    success: function (response) {
                        if (response && response.objResponse && !response.objResponse.isError && Array.isArray(response.objResponse.data)) {
                            //TODO: ELIMINAR CONSOLELOG
                            console.log('Productos obtenidos:', response.objResponse.data);
                            const productos = response.objResponse.data;

                            // Limpiar la tabla antes de llenarla
                            $('#detalleProductosTable tbody').empty();

                            // Iterar sobre los productos y agregarlos a la tabla
                            productos.forEach(producto => {
                                const row = `
                                    <tr>
                                        <td>${producto.cantidad}</td>
                                        <td>${producto.unidad}</td>
                                        <td>${producto.codigo}</td>
                                        <td>${producto.descripcion}</td>
                                        <td>${producto.valorUnitario.toFixed(2)}</td>
                                        <td>${producto.importe.toFixed(2)}</td>
                                    </tr>
                                `;
                                $('#detalleProductosTable tbody').append(row);
                            });
                            // TODO ELIMINAR CONSOLELOG
                            console.log('Productos cargados en la tabla.');
                            $.ajax({
                                url: `app/api/b2b.php?method=GetFacturasTotales&id=${encodeURIComponent(id)}`,
                                type: 'GET',
                                dataType: 'json',
                                success: function (response) {
                                    if (response && response.objResponse && !response.objResponse.isError) {
                                        console.log('Totales obtenidos:', response.objResponse.data);
                                        const totales = response.objResponse.data;

                                        // Actualizar los valores en el HTML
                                        $('.row.text-center.mt-4 .col.border:nth-child(1) p:nth-child(2)').text(`$${totales.subtotal.toFixed(2)}`);
                                        $('.row.text-center.mt-4 .col.border:nth-child(2) p:nth-child(2)').text(`$${totales.iva.toFixed(2)}`);
                                        $('.row.text-center.mt-4 .col.border:nth-child(3) p:nth-child(2)').text(`$${totales.retencion ? totales.retencion.toFixed(2) : '0.00'}`);
                                        $('.row.text-center.mt-4 .col.border:nth-child(4) p:nth-child(2)').text(`$${totales.total.toFixed(2)}`);
                                    } else {
                                        console.error('Error al obtener los totales:', response?.objResponse?.message || 'Respuesta inesperada.');
                                        alert('No se pudieron obtener los totales de la factura.');
                                    }
                                },
                                error: function (xhr, status, error) {
                                    console.error('Error en la solicitud:', xhr.responseText);
                                    alert('Ocurrió un error al intentar obtener los totales.');
                                }
                            });

                        } else {
                            console.error('Error al obtener los productos:', response?.objResponse?.message || 'Respuesta inesperada.');
                            alert('No se pudieron obtener los productos de la factura.');
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error('Error en la solicitud:', xhr.responseText);
                        alert('Ocurrió un error al intentar obtener los productos.');
                    }
                });
            } else {
                $('#facturaDetalles').html('No hay detalles disponibles.');
            }
        },
        error: function () {
            $('#facturaDetalles').html('Error al cargar los detalles de la factura.');
        }
    });

    // Mostrar el modal
    $('#facturaModal').modal('show');
});

$('#estadoCuentaModal').on('show.bs.modal', function () {
    const tbody = $('#estadoCuentaContent tbody');
    tbody.empty();

    $.ajax({
        url: 'app/api/b2b.php?method=GetCxcCliente',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            const data = response && response.objResponse && Array.isArray(response.objResponse.data)
                ? response.objResponse.data
                : [];

            // Mostrar la tabla siempre que se intente llenar
            $('#estadoCuentaContent .table-responsive').show();

            if (data.length === 0) {
                tbody.append('<tr><td colspan="6" class="text-center text-muted">No hay datos disponibles</td></tr>');
            } else {
                data.forEach(item => {
                    const row = `
                        <tr>
                            <td>${item.referencia || ''}</td>
                            <td>${item.fechaEmision ? new Date(item.fechaEmision).toLocaleDateString() : ''}</td>
                            <td>${item.vencimiento ? new Date(item.vencimiento).toLocaleDateString() : ''}</td>
                            <td>${item.saldo || ''}</td>
                            <td>${item.estado || ''}</td>
                            <td>${item.dias || ''}</td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            }
        },
        error: function() {
            $('#estadoCuentaContent .table-responsive').show();
            tbody.append('<tr><td colspan="6" class="text-center text-danger">Error de conexión</td></tr>');
        }
    });
});