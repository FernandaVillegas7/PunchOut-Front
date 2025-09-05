
document.addEventListener("DOMContentLoaded", function () {
    const currentUrl = window.location.pathname;
    const links = document.querySelectorAll('.nav-item.nav-link');

    // quita los active
    links.forEach(link => {
        link.classList.remove('active');
    });

    // Dependiendo la pagina pone el "active" correspondiente
    if (currentUrl.includes('index')) {
        document.getElementById('link-inicio').classList.add('active'); // Activa 'Inicio'
    } else if (currentUrl.includes('shop')) {
        document.getElementById('link-tienda').classList.add('active'); // Activa 'Tienda'
    }
})