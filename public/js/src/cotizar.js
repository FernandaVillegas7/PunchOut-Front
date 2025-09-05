
// let itemsCotiazcion = []

// const apiProducto = 'api/productos/'

// function formatResult(repo) {
//     if (repo.loading) {
//         return repo.text;
//     }

//     let $container = `<div class="row">
//                         <div class="col-md-2 text-center">
//                             <img alt="" class="img-fluid w-50" src="https://mersolsureste.com.mx/articulos/index.php?clave=${repo.code}&amp;img=${repo.id}">
//                         </div>
//                         <div class="col-md-10">
//                         ${repo.text}
//                         </div>
//                     </div>` 

//     return $($container)
// }

// function listItems() {

//     let row = `<tr>
//                 <td colspan="6">No se ha ingresado ningun articulo</td>
//             </tr>`

//     let total = 0

//     if (itemsCotiazcion.length > 0) {
//         row = ''

//         itemsCotiazcion.forEach((item, index) => {
//             total += item.subTotal

//             row += `<tr>
//                 <td>${index + 1}</td>
//                 <td>
//                     <div class="row">
//                         <div class="col-md-4 zoom-img-wrapper">
//                             <img alt="${item.codigoProducto}" class="img-fluid w-50  zoom-img" src="https://mersolsureste.com.mx/articulos/index.php?clave=${item.clave}&amp;img=${item.articulo}">
//                         </div>
//                         <div class="col-md-8">
//                             ${item.nombreProducto}
//                         </div>
//                     </div>
//                 </td>
//                 <td>${item.cantidad}</td>
//                 <td>$ ${numeral(item.precio).format('0,0.00')}</td>
//                 <td>$ ${numeral(item.subTotal).format('0,0.00')}</td>
//                 <td>
//                     <button class="btn btn-danger btm-sm drop" data-index="${index}">
//                         <i class="fa-solid fa-circle-minus"></i>
//                     </button>
//                 </td>
//             </tr>`
//         })
//     }

//     $('#itemList').html(row)
//     $('#totalItems').html(`$ ${numeral(total).format('0,0.00')}`)
// }

// // $('#articulo').select2({
// //     placeholder: "Selecciona una opción",
// //     allowClear: true,
// //     minimumResultsForSearch: 0,
// //     delay: 300,
// //     selectOnClose: true,
// //     ajax: {
// //         url: `${apiProducto}search`,
// //         dataType: 'JSON',
// //         data: function (params) {
// //             let query = {
// //                 search: params.term || ''
// //             }

// //             return query;
// //         },
// //         processResults: function (result) {
// //             return {
// //                 results: result.objResponse.products.map(c => {
// //                     return {
// //                         'id': c.articulo,
// //                         'text': `${c.code} - ${c.description}`,
// //                         'clave': c.code,
// //                         'price': c.priceData
// //                     }
// //                 })
// //             }
// //         },
// //     },
// //     templateResult: formatResult
// // })

$('#btnSolicitar').on('click', function(e){
    e.preventDefault();
    console.log(JSON.stringify(itemsCotiazcion, null, 2));
});

//     // // Swal.showLoading()

//     // // console.log('esto primero ');
    
//     // // itemsCotiazcion.forEach(item => {
//     // //     shopinCar.precio = item.precio
//     // //     shopinCar.articulo = item.articulo
//     // //     shopinCar.cantidad = item.cantidad
//     // //     shopinCar.nombreProducto = item.nombreProducto
//     // //     shopinCar.codigoProducto = item.codigoProducto

//     // //     setCarItem()
//     // // })

//     // // console.log('esto despues')

// })

// $('#btnAgregar').on('click', function(e){
//     e.preventDefault()

//     const cantidad = parseInt($('#cantidad').val()) || 0;
//     const extras = $('#articulo').select2('data')[0]

//     if(cantidad === 0){
//         return 
//     }

//     itemsCotiazcion.push({
//         precio: extras.price.salePrice,
//         articulo: extras.id,
//         cantidad: cantidad, 
//         subTotal: (extras.price.salePrice * cantidad),
//         nombreProducto: extras.text,
//         codigoProducto: extras.clave
//     })

//     listItems()
// })

// $('#itemList').on('click','.drop', function(e){
//     e.preventDefault()

//     const index = $(this).data('index')

//     itemsCotiazcion.splice(index, 1)

//     listItems()
// })
