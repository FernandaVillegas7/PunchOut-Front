function registrarLogPagina() {
    // Obtener la URL actual
    const Valor = window.location.href;
    // Obtener la fecha y hora actual en formato compatible con MySQL
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const FechaHora = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Obtener la IP pública del cliente usando un servicio externo
    fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
            const IP = data.ip || '';
            // Enviar el log al backend
            fetch('/app/api/logSite.php?method=CrearLogPagina', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Valor, FechaHora, IP })
            })
            // No es necesario manejar la respuesta para el log
            .catch(err => { /* opcional: console.error('Error al registrar log:', err); */ });
        })
        .catch(() => {
            // Si no se puede obtener la IP, aún así intenta registrar el log sin IP
            fetch('/app/api/logSite.php?method=CrearLogPagina', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Valor, FechaHora, IP: '' })
            });
        });
}

const instance = tippy('#soporte-btn', {
    content: '¿Problemas con la pagina? Envia tus quejas, sugerencias y dudas dando click aqui',
    placement: 'bottom',
    theme: 'light',
    animation: 'fade',
});

instance[0].show();
setTimeout(() => {
    instance[0].hide();
}, 5000);

tippy('#perfil-btn', {
    content: 'Perfil y contacto',
    placement: 'bottom',
    theme: 'light',
    animation: 'fade',
});

// Helper: obtain SessionID from URL or sessionStorage
function __getPunchoutSID() {
    try {
        var m = location.search.match(/[?&]SessionID=([^&#]*)/);
        if (m && m[1]) {
            var sid = decodeURIComponent(m[1].replace(/\+/g, ' '));
            try { sessionStorage.setItem('punchoutSessionID', sid); } catch(_) {}
            return sid;
        }
    } catch(_) {}
    try { return sessionStorage.getItem('punchoutSessionID'); } catch(_) { return null; }
}

// Cart badge updater (PunchOut-safe): prefers SessionID param; falls back to cookie session
window.updateCartBadge = function updateCartBadge(){
    if (!window.jQuery) return; // wait until jQuery is present
    var sid = __getPunchoutSID();
    var url = 'app/api/exiros.php?method=totalCarritoCount' + (sid ? ('&SessionID=' + encodeURIComponent(sid)) : '');
    $.ajax({ type: 'GET', url: url, dataType: 'json' })
    .done(function(res){
        var n = (res && res.data && typeof res.data.total === 'number') ? res.data.total : 0;
        var el = document.getElementById('TotalCarrito');
        if (el) el.textContent = String(n);
    }).fail(function(xhr){
        // Optional retry without SID if first attempt failed
        if (sid && xhr && xhr.status === 401) {
            $.ajax({ type: 'GET', url: 'app/api/exiros.php?method=totalCarritoCount', dataType: 'json' })
            .done(function(res){
                var n = (res && res.data && typeof res.data.total === 'number') ? res.data.total : 0;
                var el = document.getElementById('TotalCarrito');
                if (el) el.textContent = String(n);
            }).fail(function(){
                var el = document.getElementById('TotalCarrito');
                if (el) el.textContent = '0';
            });
            return;
        }
        var el = document.getElementById('TotalCarrito');
        if (el) el.textContent = '0';
    });
};

// Kick off once jQuery is available (in case scripts load out of order)
(function waitForJQ(){
    if (window.jQuery) {
        try { window.updateCartBadge(); } catch(_){}
        try { registrarLogPagina(); } catch(_){}
    } else {
        setTimeout(waitForJQ, 250);
    }
})();