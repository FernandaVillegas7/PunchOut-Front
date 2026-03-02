if (!window.__MERSOLSUR__) {
window.__MERSOLSUR__ = true;

const swalTitle = "Mersol Sureste"

function errorResponse(xhr, _textStatus, errorThrown) {
    commonErrorMsg(`${errorThrown} : ${xhr.responseJSON.message}`);
}

function commonErrorMsg(msg, isWarning = false){
    // Swal.fire({
    //     title: swalTitle,
    //     text: msg,
    //     icon: !isWarning ? 'error' : 'warning'
    // });
    console.log(`${swalTitle} - ${msg}`);
}




// resto del código

}