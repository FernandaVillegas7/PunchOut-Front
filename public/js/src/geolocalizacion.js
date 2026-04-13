document.addEventListener("DOMContentLoaded", function() {
    if(!localStorage.getItem('sucursalID')) {
        AskUbicacion();
    }
});

function AskUbicacion() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position){
                    localStorage.setItem('latUsuario', position.coords.latitude);
                    localStorage.setItem('lonUsuario', position.coords.longitude);
                    localStorage.setItem('sucursalID', 1);

                    document.dispatchEvent(new Event('ubication'));
                },
            function(error) {
                askSucursal();
            },
            {enableHighAccuracy: false, maximumAge:0}
        );
    } else {
        askSucursal();
    }
}

function askSucursal(){
    Swal.fire({
        title: 'Consultar disponibilidad de productos',
        html: `
            <p style="font-size: 1rem; margin-bottom: 10px;">¿Cuál es tu sucursal más cercana?</p>
            <p style="font-size: 0.85rem; color: #6c757d;">
               <strong>Nota:</strong> Esta información es vital para el cálculo estratégico de la existencia de mercancía.
            </p>
        `,
        icon: 'info',
        showDenyButton: true,
        confirmButtonText: 'Monterrey (Apodaca)',
        denyButtonText: 'Veracruz',
        confirmButtonColor: '#343a40',
        denyButtonColor: '#dc3545',
        allowOutsideClick: false,
        allowEscapeKey: false
    }).then((result) => {
        if(result.isConfirmed){
            localStorage.setItem('sucursalID', 3);
        }
        else if (result.isDenied) {
            localStorage.setItem('sucursalID', 2);
        }
        document.dispatchEvent(new Event('unication'));
    });
}

