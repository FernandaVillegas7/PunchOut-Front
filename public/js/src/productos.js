
const apiProductos = "api/productos/"
const apiB2B = "app/api/b2b.php?method=";

// // let loading = false;
// // let pagina = 0

document.addEventListener("DOMContentLoaded", function () {
    const target = document.querySelector(".bigfoot");
    let page = 1;
    let loading = false;
    
});

const searchObj = {
    pageSize: 10,
    pageNumber: 0,
    sucursalID: 1,
    searchQuery: "",
    categoriesID: [0]
}

function GetProductos() {
    $.ajax({
        type: "POST",
        url: `${apiProductos}Lista`,
        data: JSON.stringify(searchObj),
        dataType: "JSON",
        success: function (response) {
            const productos = response.objResponse.products

            let items = ''

            if (productos.length > 0) {
                productos.forEach(p => {

                    let detalle = `detalles?a=${p.articulo}&c=${p.code}`

                    let productJSON = JSON.stringify(p);

                    items += `<div class="col-lg-3 col-md-4 col-sm-6 pb-1">
                                <div class="product-item bg-light mb-4">
                                    <div class="product-img position-relative overflow-hidden">
                                        <img alt="" class="img-fluid w-100" src="${p.pictures[0].url}" alt="">
                                        <div class="product-action">
                                            <a class="btn btn-outline-dark btn-square addCar hover-text-danger-parent" href="#" data-cantidad="1" data-product="${encodeURI(productJSON)}">
                                                <i class="fa fa-shopping-cart hover-text-danger"></i>
                                            </a>

                                            <a class="btn btn-outline-dark btn-square hover-text-danger-parent" href="${detalle}">
                                                <i class="fa fa-search hover-text-danger"></i>
                                            </a>
                                        </div>
                                    </div>

                                    <div class="p-3">
                                        <p CLASS="text-danger">${p.brand}</p>
                                        <a class="h5 text-decoration-none text-truncate" href="detalles">${p.articulo}</a>
                                        <p class="h6 text-decoration-none text-truncate" style="font-weight: normal;">
                                            ${p.description}
                                        </p>
                                        <p style="font-size: 0.75rem; font-weight: bold;" class="text-truncate">
                                            CODE:${p.code}
                                        </p>
                                        <div class="d-flex mt-2">
                                            <h5 class="text-dark">$ ${p.priceData.salePrice} ${p.priceData.currencyIso}</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>`
                })

                $('#listaProductos').html(items)

            }
        },
        error: function (xhr) {
            console.table(xhr)
        }
    })
}

GetProductos()
