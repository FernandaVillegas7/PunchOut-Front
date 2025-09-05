
const apiCar = 'api/carrito/'

const shopinCar = 
{   
    precio: 0,
    cantidad: 0,
    articulo: '',
    nombreProducto: '',
    codigoProducto: ''
}

// function getTotalItems(){
//     $.ajax({
//         type: "GET",
//         url: `${apiCar}totalItems`,
//         dataType: "JSON",
//         success: function (response) {
//             $('#TotalCar').html(response.objResponse ?? 0);
//         },
//         error: errorResponse
//     });
// }

function setToast(message){
    Toastify({
        text: message,
        avatar: "public/img/mersolito.webp",
        duration: 3000,
        newWindow: true,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: "#ffffff", // Fondo blanco
            color: "#333333", // Color de texto oscuro para contraste
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)", // Sombra para mejor visibilidad
            display: "flex",
            alignItems: "center",
            padding: "10px 15px",
            borderRadius: "4px"
        },
        onClick: function () { } // Callback after click
    }).showToast();
}

// function setCarItem(){
//     $.ajax({
//         type: "POST",
//         url: `${apiCar}setItemInCar`,
//         data: JSON.stringify(shopinCar),
//         dataType: "JSON",
//         success: function (response) {
//             setToast(response.message)
//             getTotalItems()
//         },
//         error: errorResponse
//     });
// }

function getDetalleProducto(e){
    e.preventDefault()

    let product = {}
    const data = $(this).data()

    if(data.product === undefined){
        product = data.detail
    }else{
        const decode = decodeURI(data.product)
        product = JSON.parse(decode)
    }

    shopinCar.nombreProducto = product.name
    shopinCar.codigoProducto = product.code
    shopinCar.cantidad = 1
    shopinCar.articulo = product.articulo
    shopinCar.precio = product.priceData.salePrice

    setCarItem()
}

$('.addCar').on('click', getDetalleProducto)

$('.btEdit').on('click', function(e){
    e.preventDefault()

    $(this).hide()
    const itemID = $(this).data('item')
    
    $(`.driveRush${itemID}`).show()
    
})

// $('#tbListItems').on('click','.dropItem', function(e){
//     e.preventDefault()

//     const itemID = $(this).data('id')

//     $.ajax({
//         type: "GET",
//         url: `${apiCar}dropItem`,
//         data: {
//             itemID: itemID
//         },
//         dataType: "JSON",
//         success: function (response) {
//             console.log(response);
//             $('#extras').html(response.template)
//             getTotalItems()
//         },
//         error: errorResponse
//     });
    
// })

// $('#listaProductos').on('click', '.addCar', getDetalleProducto)


// getTotalItems()
