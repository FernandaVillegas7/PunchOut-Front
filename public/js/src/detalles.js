
const items = {
    frm: $('#frmProducto'),
    AddCar: $('#btAddCar')
}

items.AddCar.on('click', function(e){
    e.preventDefault()

    const fm = items.frm.BSerializeToJson({
        empty: false,
        boolean: true,
        disabled: true
    })
    
    shopinCar.precio = fm.precio
    shopinCar.articulo = fm.articulo
    shopinCar.cantidad = fm.totalProducto
    shopinCar.codigoProducto = fm.codigo
    shopinCar.nombreProducto = fm.nombre

    setCarItem()
})

