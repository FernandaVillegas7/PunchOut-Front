
let moneda = 'MXN'
let isClient = true
let subTotal = 0
let impuestos = 0
let granTotal = 0
let tipoMoneda = ''
let nombreAgente = ''
let cotizacionID = 0
let itemsCotizacion = []
let almancenes = ['VHSA', 'PAR', 'MTY', 'VER', 'VALL', 'TUL', 'MER', 'SCZ', 'TUX', 'MVA']

const apiCRM = '/api/ApiCRM/'
const apiIntel = '/api/ApiIsisIntel/'
const apiSucursales = '/api/ApiSucursales/CuentaSucursalXListaPrecio'
const myModalEl = document.getElementById('modalArticulos')

const extrProd = {
    lista: '',
    clave: '',
    articulo: ''
}

const items = {
    tableBody: $('#tablaProductos tbody'),
    tableProducs: $('#tbItemsCot'),
    labelCliente: $('#labelCliente'),
    listaPrecios: $('#cboListaPrecios'),
    listaAgentes: $('#cboAgAsignado'),
    listaClientes: $('#cboProspecto'),
    listaProducts: $('#cboListaProductos'),
    switchCliente: $('#flexSwitchCheckDefault'),
    buttonCotizar: $('#cotizar'),
    buttonAddOpcion: $('#btAddOpcion'),
    buttonInventario: $('#Nofocusable'),
    buttonEnviarAERP: $('#cotizarRP')
}

const selectConf = {
    placeholder: "Selecciona una opción",
    allowClear: true,
    minimumResultsForSearch: 0,
    selectOnClose: true
}

setTimeout(() => {
    let alert = document.getElementById("alertaAviso")
    if (alert) {
        alert.classList.add("d-none")
    }
}, 1500)

function validarDato(producto, valor, tipo = 'precio') {
    let continuar = true;

    if (producto.IsEditable) {
        return continuar;
    }

    if (tipo === 'Descuento' && valor > 15) {
        Swal.fire({
            title: 'Advertencia',
            text: 'El descuento no puede ser mayor al 15%.',
            icon: 'warning'
        });

        return false;
    }

    return continuar;
}

function abrirModalProducto(index) {
    const item = itemsCotizacion[index];

    const modalBody = document.querySelector('#modalExis .modal-body')

    modalBody.innerHTML = `
    <h6>${item.Descripcion} - Código: ${item.SKU}</h6>
    <table class="table table-striped">
    <thead>
        <tr>
            <th>Almacen</th>
            <th>Existencia</th>
        </tr>
    </thead>
    <tbody id="tablaExistencias">
    </tbody>
    </table>`

    $.ajax({
        url: `${apiIntel}GetSockProducto?Articulo=${item.CodigoArticulo}`,
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            const tablaExistencias = document.getElementById('tablaExistencias');

            data.forEach(existencia => {
                const row = document.createElement('tr');
                row.innerHTML = `
            <td>${existencia.Almacen}</td>
            <td>${existencia.Inventario}</td>`;
                tablaExistencias.appendChild(row);
            })
        },
        error: function (_xhr, _status, error) {
            console.error('Error al obtener las existencias:', error);
        }
    })

    const modal = new bootstrap.Modal(document.getElementById('modalExis'));

    modal.show()
    $('#modalExis').on('hidden.bs.modal', function () {
        $('body').removeClass('modal-open')
        $('.modal-backdrop').remove()
        $('body').css('overflow', 'auto')
    })
}

function itemsIngresados(codigoArticulo) {
    if (itemsCotizacion.length === 0 || codigoArticulo === 'CRM-000001') {
        return false
    }

    return itemsCotizacion.some(i => i.CodigoArticulo === codigoArticulo)
}

function setInputSelect() {
    let inputField = document.querySelector('.select2-search__field');
    if (inputField) {
        inputField.focus();
    }
}

function setProductoSeleccionado() {
    subTotal = 0
    impuestos = 0
    granTotal = 0

    let fila = ''

    items.tableBody.html('')

    itemsCotizacion.forEach((item, index) => {

        let total = (item.Precio * item.Cantidad) - ((item.Descuento / 100) * (item.Precio * item.Cantidad))
        subTotal += total

        fila += `<tr data-id="${item.SKU}" data-precio-base="${item.Precio}" data-indice="${index}" data-partida="${index + 1}">
                <td>${index + 1}</td>
                <td contenteditable="${item.IsEditable}" data-index="${index}" data-validar="0" data-property="SKU" class="editable sku" data-tipo="str">${item.SKU}</td>
                <td>${item.SubCuentaText}</tb>
                <td contenteditable="${item.IsEditable}" data-index="${index}" data-validar="0" data-property="Descripcion" class="editable descripcion" data-tipo="str">${item.Descripcion}</td>
                <td contenteditable="true" type="number" data-index="${index}" data-validar="0" data-property="Entrega" class="editable campo entrega" data-tipo="str">${item.Entrega}</td>
                <td contenteditable="true" type="number" data-index="${index}" data-validar="0" data-property="Cantidad" class="editable campo cantidad" data-tipo="number">${item.Cantidad}</td>
                <td contenteditable="${item.IsEditable}" type="number" data-index="${index}" data-validar="0" data-property="Unidad" class="editable campo unidad" data-tipo="str">${item.Unidad}</td>
                <td contenteditable="true" class="editable campo precio" data-index="${index}" data-validar="1" data-property="Precio" data-tipo="float">$ ${item.Precio.toFixed(2)}</td>
                <td contenteditable="true" type="number descuento" data-index="${index}" data-validar="1" data-property="Descuento" class="editable campo" data-tipo="number">${item.Descuento} %</td>
                <td class="editableTotal">$ ${total.toFixed(2)}</td>
                <td>
                    <button class="btn btnVerMas ocultar" data-index="${index}" data-bs-toggle="modal" data-bs-target="#modalExis">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </button>
                    <button type="button ocultar" data-index="${index}" class="btn dropItem">
                        <i class="fa-solid fa-trash text-danger"></i>
                    </button>
                </td>
            </tr>`
    })

    impuestos = subTotal * 0.16
    granTotal = subTotal + impuestos

    items.tableBody.html(fila)
    $('#Tax').html(numeral(impuestos).format('$0,0.00') + ` ${moneda}`)
    $('#Total').html(numeral(granTotal).format('$0,0.00') + ` ${moneda}`)
    $('#Subtotal').html(numeral(subTotal).format('$0,0.00') + ` ${moneda}`)
    $('#totalEnLetrasTexto').html(numeroALetras(granTotal, moneda))

}

function getSelectedItem(indice) {
    const item = itemsCotizacion.at(indice);
    return item ? { ...item } : null
}

function ArticuloOpciones(articulo, indice = -1) {

    let lista = items.listaPrecios.val()
    let sucursal = parseInt(lista.substring(0, 1))
    let alm = almancenes[sucursal]
    let prod = getSelectedItem(indice)

    $('#tbOpciones').html('')

    $.ajax({
        type: "GET",
        url: `${apiIntel}ArticuloOpciones`,
        data: {
            Articulo: articulo,
            Almacen: alm
        },
        dataType: "JSON",
        success: function (response) {
            if (response.length != 0) {
                $('#modalArtOpc').modal('show')

                $('#txtOpcion').html(`${prod.SKU} - ${prod.Descripcion}`)

                let row = ''

                response.forEach(o => {
                    row += `<tr>
                                <td>
                                    <div class="form-check">
                                        <input class="form-check-input artOption" type="checkbox" data-talla="${o.Nombre}" value="${o.SubCuenta}" id="flexCheckChecked">
                                    </div>
                                </td>
                                <td>${o.Nombre}</td>
                                <td>${o.Existencia}</td>
                            </tr>`
                })

                $('#tbOpciones').html(row)
            }
        }
    });
}

function formatResult(repo) {
    if (repo.loading) {
        return repo.text;
    }

    const rotacion = {
        'A': '<span class="badge badge-videollamada">Alta rotacion</span>',
        'B': '<span class="badge badge-actividad">Baja rotacion</span>',
        'N': '<span class="badge badge-email">Sin rotacion</span>'
    }[repo.tipoRotacion] || '<span class="badge badge-email">Sin datos</span>';

    let $container = `<div class="row">
                        <div class="col-md-2 text-center">
                            <img alt="" class="img-fluid w-50" src="https://mersolsureste.com.mx/articulos/index.php?clave=${repo.id}&amp;img=${repo.articulo}">
                        </div>
                        <div class="col-md-10">
                            ${repo.text}
                            <br>
                            ${rotacion}
                        </div>
                    </div>` 

    return $($container)
}

$(document).on('dblclick', '.select2-selection', function () {

    const opcionesSeleccionadas = $('#cboListaProductos').select2('data');
    let sku = opcionesSeleccionadas[0].id

    const producto = {
        SKU: null,
        Precio: null,
        Unidad: '',
        Partida: 0,
        Entrega: '',
        Cantidad: 1,
        Descuento: 0,
        SubCuenta: '',
        PrecioBase: 0,
        IsEditable: false,
        Descripcion: '',
        SubCuentaText: '',
        CodigoArticulo: ''
    }

    if (sku === "CRM-000001" || sku === 'EDITABLE') {
        producto.SKU = 'CRM-000001'
        producto.Precio = 0
        producto.Unidad = ''
        producto.Entrega = ''
        producto.Cantidad = 1
        producto.Descuento = 0
        producto.PrecioBase = 0
        producto.IsEditable = true
        producto.Descripcion = 'PRODUCTO EDITABLE'

        itemsCotizacion.push(producto)
        setProductoSeleccionado()
    }
})

items.listaAgentes.select2(selectConf).on('select2:open', setInputSelect).on('change', function () {
    nombreAgente = $(this).find(':selected').text().trim()
})

items.listaClientes.select2({
    selectConf,
    ajax: {
        url: function () {
            return isClient ? `${apiIntel}GetIntelClientes` : `${apiCRM}CRMListaCliente`
        },
        dataType: 'JSON',
        data: function (params) {
            let query = {
                search: params.term || '',
                start: 0,
                length: 9999,
                IsClient: isClient
            }

            if (isClient) {
                query.Agente = $('#cboAgAsignado').val()
            } else {
                query.UsuarioID = $('#UsuarioID').val()
            }

            return query;
        },
        processResults: function (result) {
            return {
                results: result.data.map(c => {
                    return {
                        'id': isClient ? c.Cliente : c.ClienteID,
                        'text': `${c.Nombre}`
                    }
                })
            }
        }
    }
}).on('select2:open', setInputSelect)

// azzel estuvo aqui

items.listaProducts.select2({
    selectConf,
    ajax: {
        url: `${apiIntel}GetListaPrecios`,
        dataType: 'JSON',
        data: function (params) {
            return {
                start: 0,
                length: 1000,
                search: params.term || '',
                ListaPrecio: items.listaPrecios.val()
            }
        },
        processResults: function (result) {
            return {
                results: result.data.map(c => ({
                    id: c.ClaveFabricante,
                    text: `${c.ClaveFabricante} - ${c.Descripcion1} - $ ${c.Precio}`,
                    articulo: c.Articulo,
                    tipoRotacion: c.TipoRotacion
                }))
            }
        }
    },
    templateResult: formatResult
})
.on('select2:open', setInputSelect)
.on('change', function (_e) {

        const sku = $(this).val()
        const articulo = $(this).select2('data')[0].articulo
        const productoIngresado = itemsIngresados(articulo)

        const producto = {
            SKU: null,
            Precio: null,
            Unidad: '',
            Partida: 0,
            Entrega: '',
            Cantidad: 1,
            Descuento: 0,
            SubCuenta: '',
            PrecioBase: 0,
            IsEditable: false,
            Descripcion: '',
            SubCuentaText: '',
            CodigoArticulo: ''
        }

        if (productoIngresado) {
            Swal.fire('Advertencia', 'El producto ya fue agregado.', 'warning');
            return
        }

        if (sku.includes('EDITABLE')) {
            producto.SKU = 'CRM-000001'
            producto.Precio = 0
            producto.Descripcion = 'PRODUCTO EDITABLE'
            producto.IsEditable = true

            itemsCotizacion.push(producto)

            $('#alertaEditable').removeClass('d-none')
            setProductoSeleccionado()
        } else {

            $.ajax({
                type: "GET",
                url: `${apiIntel}GetProductDetailsCRM`,
                data: {
                    ClaveFabricante: sku,
                    Articulo: articulo,
                    ListaPrecio: items.listaPrecios.val()
                },
                dataType: "JSON",
                success: function (response) {
                    producto.SKU = sku
                    producto.Precio = response.Precio
                    producto.Unidad = response.Unidad
                    producto.SubCuenta = ''
                    producto.PrecioBase = response.Precio
                    producto.Descripcion = response.Descripcion
                    producto.CodigoArticulo = response.ArticuloERP

                    itemsCotizacion.push(producto)

                    $('#cboListaPrecios').attr('disabled', itemsCotizacion.length != 0)
                    setProductoSeleccionado()
                    ArticuloOpciones(articulo)
                },
                error: errorResponse
            })
        }

        items.listaPrecios.attr('disabled', itemsCotizacion.length != 0)
})

items.listaPrecios.on('change', function () {
    tipoMoneda = $(this).val()

    if (tipoMoneda.toUpperCase().includes('MXN')) {
        moneda = 'MXN';
    } else if (tipoMoneda.toUpperCase().includes('USD')) {
        moneda = 'USD';
    } else {
        moneda = '';
    }

    if (moneda === 'USD') {
        $('#cuentas').html(
            `CUENTA EN DÓLARES AMERICANOS
* BANCO: BANAMEX - DÓLARES AMERICANOS
* SUCURSAL: 0362 PARAÍSO, TABASCO
* CUENTA: 9290035
* CLABE: 002804036292900351
* MONEDA: USD
USD DÓLARES AMERICANOS PAGADEROS EL DÍA DE LA OPERACIÓN AL TIPO DE CAMBIO DEL DIARIO OFICIAL DE LA FEDERACIÓN.
https://dof.gob.mx/indicadores.php#gsc.tab=0 Consultar Tipo de Cambio`
        )
    } else if (moneda === 'MXN') {
        $.ajax({
            type: "GET",
            url: `${apiSucursales}?ListaPrecio=${tipoMoneda}`,
            dataType: "json",
            success: function (response) {
                let cuenta = response?.data?.[0];
                if (cuenta) {
                    $('#cuentas').html(
                        `* BANCO: ${cuenta.Banco}
                        * SUCURSAL: ${cuenta.Sucursal} 
                        * CLABE: ${cuenta.CLABE}
                        * NÚMERO DE CUENTA: ${cuenta.Cuenta}
                        * MONEDA: MXN`
                    )
                } else {
                    $('#cuentas').html("No se encontraron datos de la cuenta.")
                }
            },
            error: errorResponse
        });
    } else {
        $('#cuentas').html("Seleccione una moneda válida.");
    }
})

items.switchCliente.on('change', function () {
    isClient = $(this).is(':checked')
    items.labelCliente.html(isClient ? 'Cliente' : 'Prospecto')

    if (!isClient) {
        $('#alertaProspecto').removeClass('d-none');
    } else {
        $('#alertaProspecto').addClass('d-none');
    }
})

items.tableProducs
.on('click', '.dropItem', function (e) {
        e.preventDefault()

        const indiceSeleccionado = $(this).data('index')
        const itemEliminado = itemsCotizacion[indiceSeleccionado]

        itemsCotizacion.splice(indiceSeleccionado, 1)
        setProductoSeleccionado()

        if (itemEliminado.IsEditable) {
            $('#alertaEditable').addClass('d-none')
        }
})
.on('click', '.btnVerMas', function (e) {
        e.preventDefault()
        const index = $(this).data('index')
        abrirModalProducto(index)
})
.on('blur', '.editable', function () {
        const dataField = $(this).data()
        const dataRawValue = $(this).text()
        const dataValue = dataRawValue.trim()
        const sanitizedValue = dataRawValue.replace(/[^0-9.-]+/g, '').trim()

        if ((dataField.tipo == 'number' || dataField.tipo == 'float') && sanitizedValue != '') {

            if (dataField.validar == 1) {
                let continuar = validarDato(itemsCotizacion[dataField.index], sanitizedValue, dataField.property)

                if (!continuar) {
                    setProductoSeleccionado()
                    return
                }
            }

            if (dataField.tipo == 'float') {
                itemsCotizacion[dataField.index][dataField.property] = parseFloat(sanitizedValue)
            } else if (dataField.tipo == 'number') {
                itemsCotizacion[dataField.index][dataField.property] = parseInt(dataValue)
            } else {
                Swal.fire('Advertencia', 'El tipo de dato no es correcto', 'warning')
            }
        } else if (dataField.tipo == 'str') {
            itemsCotizacion[dataField.index][dataField.property] = dataValue
        }

        setProductoSeleccionado()
})

items.buttonCotizar.on('click', function (e) {
    e.preventDefault()
    const tabla = document.getElementById("tablaProductos")
    const UsuarioID = parseInt(document.querySelector('#UsuarioID').value)
    const titulo = $('#titulo').val()
    const IntelID = $('#IntelID').val()
    const agente = $('#cboAgAsignado').val()
    const ClienteID = items.listaClientes.val()

    for (let fila of tabla.rows) {
        const id = fila.dataset.indice
        const partida = fila.dataset.partida

        if (id != undefined) {
            itemsCotizacion[id].Partida = partida
        }
    }

    const productosSinAutorizacion = 0 //////solicitudesAutorizacion.filter(s => !s.Solicitado)
    const validaciones = [
        { condicion: agente === '', mensaje: 'Por favor indique el agente.' },
        { condicion: titulo === '', mensaje: 'Agrega un título a tu cotización.' },
        { condicion: ClienteID == 0, mensaje: 'Selecciona un cliente/prospecto para continuar.' },
        { condicion: itemsCotizacion.length === 0, mensaje: 'Selecciona un artículo para continuar.' },
        { condicion: productosSinAutorizacion.length > 0, mensaje: 'Debes solicitar autorización para los productos antes de continuar.' }
    ]

    for (const { condicion, mensaje } of validaciones) {
        if (condicion) {
            Swal.fire('Advertencia', mensaje, 'warning');
            return;
        }
    }

    Swal.fire({
        title: '¿Estás seguro?',
        text: "¿Quieres avanzar con esta Cotización?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#B30000',
        cancelButtonColor: '#A3A19E',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'

    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: `${apiCRM}CRMCreateCotizacion`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    ClienteID: ClienteID,
                    UsuarioID: UsuarioID,
                    CotizacionID: 0,
                    Dirigido: $('#dirigido').val(),
                    OportunidadID: 0,
                    StatusCotizacionID: 1,
                    Titulo: titulo,
                    FolioCotizacion: 1,
                    CondicionesPago: document.getElementById("machote").value,
                    AplicaImpuesto: 0,
                    AgenteID: agente,
                    IsClient: isClient,
                    ItemsCotizacion: itemsCotizacion,
                    ListaPrecio: items.listaPrecios.val(),
                    IntelID: IntelID
                }),
                success: function (response) {
                    cotizacionID = response.Data1;
                    document.getElementById('generatePdf').classList.remove('d-none')
                    generarPDF(cotizacionID)
                    $('#regresar').text('Regresar a la lista de cotizaciones')
                    $('#cotizar, #facturacion').addClass('d-none')

                    if ($('#alertaProspecto').hasClass('d-none') && $('#alertaEditable').hasClass('d-none')) {
                        $('#cotizarRP').removeClass('d-none')
                    } else {
                        $('#cotizarRP').addClass('d-none')
                    }
                    Swal.fire(
                        '¡Guardado!',
                        'La Cotización ha sido creada correctamente.',
                        'success'
                    )


                },
                error: errorResponse
            })
        }
    })

})

items.buttonAddOpcion.on('click', function (e) {
    e.preventDefault()

    let first = true

    $('.artOption').each((_i, c) => {
        let talla = ''
        if ($(c).is(':checked')) {
            if (first) {
                talla = $(c).data('talla')
                let ultimoElemento = itemsCotizacion.length - 1
                itemsCotizacion[ultimoElemento].SubCuenta = $(c).val()
                itemsCotizacion[ultimoElemento].SubCuentaText = `${$(c).val()} - ${talla}`
                first = false
            } else {
                let prod = getSelectedItem(-1)
                talla = $(c).data('talla')

                prod.SubCuenta = $(c).val() 
                prod.SubCuentaText = `${$(c).val()} - ${talla}` 
                itemsCotizacion.push(prod)
            }
        }
    })

    setProductoSeleccionado()
    $('#modalArtOpc').modal('hide')
})

items.buttonInventario.on('click', function (e) {
    e.preventDefault()

    const priceList = $('#cboListaPrecios').val()

    if (priceList === null) {
        return
    }

    $('#modalArticulos').modal('show')
})

items.buttonEnviarAERP.on('click', function (e) {
    e.preventDefault()

    let sucursalID = -1

    const buscarSucursal = !/^\d/.test(tipoMoneda)
    const swalConf = {
        title: 'INTELISIS',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#B30000',
        cancelButtonColor: '#A3A19E',
        confirmButtonText: 'Sí, enviar',
        cancelButtonText: 'Cancelar'
    }

    if (buscarSucursal) {
        const sucursalesHtml = document.getElementById('sucursalesHtml').innerHTML;
        swalConf.html = `Por favor antes de continuar seleccione una sucursal 
                    <br> ${sucursalesHtml}`;

        swalConf.preConfirm = () => {
            const sucursalID = parseInt($('.swal2-html-container').find('select').val());
            if (isNaN(sucursalID) || sucursalID === -1) {
                Swal.showValidationMessage('Por favor debe seleccionar una sucursal antes de continuar');
                return null; // Mismo tipo de retorno que en el caso exitoso (number | null)
            }
            return sucursalID;
        }
    } else {
        swalConf.text = "¿Desea enviar esta Cotización al ERP?"
    }

    Swal.fire(swalConf).then((result) => {
        if (result.isConfirmed) {

            sucursalID = buscarSucursal ? result.value : -1;

            $.ajax({
                url: `${apiIntel}SendCotIntelisis`,
                method: 'Get',
                contentType: 'application/json',
                data: {
                    CotizacionID: cotizacionID,
                    SucursalID: sucursalID //enviar el id???
                },
                success: function (_r) {
                    Swal.fire(
                        '¡Guardado!',
                        'La Cotización ha sido enviada correctamente.',
                        'success'
                    );
                    $('#cotizarRP').addClass('d-none');
                },
                error: errorResponse
            })
        }
    })
})

//////////////////////////////////////////////////////////

$('#cboProduct').select2({
    dropdownParent: $("#modalArticulos"),
    ajax: {
        url: `${apiIntel}ListaArticulos`,
        dataType: 'JSON',
        data: function (params) {
            return {
                Articulo: params.term || ''
            };
        },
        processResults: function (result) {
            return {
                results: result.Data1.map(c => ({
                    id: c.Articulo,
                    text: `${c.ClaveFabricante} - ${c.Descripcion}`,
                    calvefabricante: c.ClaveFabricante
                }))
            }
        }
    }
}).on('change', function () {
    $('#tbUtil').html('')
    $('#tbDisp').html('')
})

$('#detalles').on('click', function (e) {
    e.preventDefault()

    const art = $('#cboProduct').val()
    const producto = $('#cboProduct').select2('data')[0]

    if (art == '') {
        return
    }

    $.ajax({
        type: "GET",
        url: `${apiIntel}ArticuloStockPrecio`,
        data: {
            Articulo: art
        },
        contentType: 'application/json',
        success: function (response) {
            const disponibilad = response.Data1
            const precios = response.Data

            const rowD = disponibilad.map(v => `
                <tr>
                    <td>${v.Almacen}</td>
                    <td>${v.Inventario}</td>
                </tr>
            `).join('');

            const rowP = precios.map(v => `
                <tr>
                    <td>
                        <div class="form-check">
                            <input data-clave="${producto.calvefabricante}" data-art="${art}" data-list="${v.Lista}" class="form-check-input radioMolotov" type="radio" name="rdoProduct">
                        </div>
                    </td>
                    <td>${v.Lista}</td>
                    <td>${v.Precio}</td>
                </tr>
            `).join('');

            $('#tbUtil').html(rowP)
            $('#tbDisp').html(rowD)
        },
        error: errorResponse
    });
})

$('#tbUtil').on('click', '.radioMolotov', function () {
    const data = $(this).data()

    extrProd.articulo = data.art
    extrProd.lista = data.list
    extrProd.clave = data.clave
})

$('#AgregarProducto').on('click', function (e) {
    e.preventDefault()

    const producto = {
        SKU: null,
        Precio: null,
        Unidad: '',
        Partida: 0,
        Entrega: '',
        Cantidad: 1,
        Descuento: 0,
        PrecioBase: 0,
        IsEditable: false,
        Descripcion: null,
        CodigoArticulo: '',
        SubCuenta: '',
        SubCuentaText: ''
    }

    if (extrProd.lista != items.listaPrecios.val()) {
        Swal.fire({
            title: 'Advertencia',
            text: `No puede agregar este articulo por favor verifique que tenga acceso a
                    la lista de precio y que sea la misma lista con la que este cotizando`,
            icon: 'warning'
        })

        return false
    }

    $.ajax({
        type: "GET",
        url: `${apiIntel}GetProductDetailsCRM`,
        data: {
            ClaveFabricante: extrProd.clave,
            Articulo: extrProd.articulo,
            ListaPrecio: extrProd.lista
        },
        dataType: "JSON",
        success: function (response) {
            producto.SKU = extrProd.clave
            producto.Precio = response.Precio
            producto.Unidad = response.Unidad
            producto.PrecioBase = response.Precio
            producto.Descripcion = response.Descripcion
            producto.CodigoArticulo = response.ArticuloERP

            itemsCotizacion.push(producto)

            $('#cboListaPrecios').attr('disabled', itemsCotizacion.length != 0)
            $('#modalArticulos').modal('hide')
            setProductoSeleccionado()
        },
        error: errorResponse
    })
})

myModalEl.addEventListener('hidden.bs.modal', event => {
    $('#tbUtil').html('')
    $('#tbDisp').html('')
    $('#cboProduct').val('86').trigger('change');
})
