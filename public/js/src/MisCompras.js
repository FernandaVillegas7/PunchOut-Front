// Configuración global
const repoBase = '/AXEL-B2B-EXIROS-FRONT';
// const repoBase = '/B2B-EXIROS-FRONT'; 
const apiMisCompras = `${repoBase}/app/api/misCompras.php`;

let comprasCache = []; // aquí guardamos todas las compras que vienen del API
let currentClienteID = "";

(function () {
  // Utilidades
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function fmtMoney(v, currency) {
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(num(v));
    } catch {
      return `${currency || 'MXN'} ${num(v).toFixed(2)}`;
    }
  }
  function byId(id) { return document.getElementById(id); }

  // Fetch a la API PHP
  async function fetchCompras(apiUrl, clienteID) {
    const url = `${apiUrl}?method=exiros-get-compra&clienteID=${encodeURIComponent(clienteID)}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
    }
    return res.json();
  }

  //  Fetch estados de carrito
  async function fetchEstados(apiUrl) {
    const url = `${apiUrl}?method=exiros-estado-carrito`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
    }
    return res.json();
  }

  //  Llenar el select con estados
  async function llenarSelectEstados(apiUrl) {
    const select = byId('selectEstatus');
    if (!select) return;

    try {
      const estados = await fetchEstados(apiUrl);
      select.innerHTML = `<option value="">Todos</option>`;
      estados.forEach(est => {
        select.innerHTML += `<option value="${est.estadoCarrito}">${est.nombre}</option>`;
      });
    } catch (e) {
      console.error("Error cargando estados:", e);
    }
  }

  const estadoBadgeMap = {
    "Creado": "bg-secondary",
    "Comprado": "bg-primary",
    "Enviado": "bg-info",
    "Cancelado": "bg-danger",
    "Eliminado": "bg-dark",
    "En proceso": "bg-warning text-dark",
    "Rechazado": "bg-danger",
    "Entregado": "bg-success",
    "Cotización": "bg-light text-dark"
  };

  //Fetch al cambio de estado 
async function cambiarEstadoCarrito(apiUrl, carritoId, nuevoEstadoId) {
  const url = `${apiUrl}?method=exiros-cambiar-estado`; 
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CarritoExirosID: parseInt(carritoId, 10),
      NuevoEstadoCarrito: parseInt(nuevoEstadoId, 10)
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Error al cambiar estado :: ${txt}`);
  }
  return res.json();
}


  //  Render del acordeón con compras
  function buildCompraAccordion(data, clienteID) {
    const compras = Array.isArray(data) ? data : [data];

    return `
      <div class="accordion" id="comprasLista">
        ${compras.map((compra, idx) => {
          const carritoId = compra.carritoExirosID || compra.carritoExirosId || compra.carritoExiros || `—${idx}`;
          const items = Array.isArray(compra.items) ? compra.items : (Array.isArray(compra.Items) ? compra.Items : []);
          const currency = (items[0] && items[0].currency) || 'MXN';

          const subtotal = items.reduce((s, it) => s + num(it.unitPrice ?? it.itemPrice) * num(it.quantity), 0);
          const total = subtotal; // impuestos/envío = 0

          const accId = `col-${carritoId}`;
          const hdrId = `hdr-${carritoId}`;
          const estadoNombre = compra.estado ? compra.estado.nombre : 'N/D';
          const badgeClass = estadoBadgeMap[estadoNombre] || 'bg-secondary';

          //FechaCracion
          const fechaCreacion = compra.fechaCreacion || compra.fecha || null;
          console.log(compra);

          const rows = items.map((it, idx2) => `
            <tr>
              <td>${idx2 + 1}</td>
              <td class="fw-semibold">${it.codigoArticulo || it.supplierPartID || ''}</td>
              <td>
                ${it.shortname || it.longname || ''}
                <div class="small text-muted">
                  ${it.manufacturer ? `Fabricante: ${it.manufacturer}` : ''}${it.manufacturer && it.manufacturerModelNumber ? ' — ' : ''}${it.manufacturerModelNumber ? `Modelo: ${it.manufacturerModelNumber}` : ''}
                </div>
              </td>
              <td class="text-end">${num(it.quantity).toFixed(2)}</td>
              <td class="text-center">${it.unitOfMeasure || it.uniteOfMeasure || it.unit || 'EA'}</td>
              <td class="text-end money">${fmtMoney(it.unitPrice ?? it.itemPrice, it.currency)}</td>
              <td class="text-end money">${fmtMoney(num(it.unitPrice ?? it.itemPrice) * num(it.quantity), it.currency)}</td>
            </tr>
          `).join('');

          return `
            <div class="accordion-item mb-3">
              <h2 class="accordion-header" id="${hdrId}">
                <button class="accordion-button collapsed" type="button"
                        data-bs-toggle="collapse" data-bs-target="#${accId}"
                        aria-expanded="false" aria-controls="${accId}">
                  <div class="w-100 d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
                    <div class="d-flex flex-wrap gap-3">
                      <span class="fw-semibold">Carrito #${carritoId}</span>
                      ${compra.folioCotizacion ? `<span class="text-muted">Folio: ${compra.folioCotizacion}</span>` : ''}
                      ${compra.estado ? `<span class="text-muted">Estado: ${compra.estado.descripcion}</span>` : ''}
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge ${badgeClass} badge-estado" data-carrito="${carritoId}" style="cursor:pointer">${estadoNombre}</span>
                      <span class="h6 mb-0 money">${fmtMoney(total, currency)}</span>
                    </div>
                  </div>
                </button>
              </h2>
              <div id="${accId}" class="accordion-collapse collapse" aria-labelledby="${hdrId}" data-bs-parent="#comprasLista">
                <div class="accordion-body">
                  <!-- Resumen + tabla -->
                  <div class="row g-3">
                    <div class="col-12 col-lg-4">
                      <div class="border rounded p-3 h-100">
                        <div class="fw-semibold mb-2">Resumen</div>
                        <div class="small">
                          <div><strong>Carrito:</strong> ${carritoId}</div>
                          ${compra.buyerCookie ? `<div><strong>Buyer Cookie:</strong> ${compra.buyerCookie}</div>` : ''}
                          ${compra.sessionID ? `<div><strong>Session ID:</strong> ${compra.sessionID}</div>` : ''}
                          <div><strong>Moneda:</strong> ${currency}</div>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between small"><span>Subtotal</span><span class="money">${fmtMoney(subtotal, currency)}</span></div>
                        <div class="d-flex justify-content-between fw-semibold"><span>Total</span><span class="money">${fmtMoney(total, currency)}</span></div>
                        <hr>
                            <a class="btn btn-danger btn-sm"
                       href="${repoBase}/cotizar?clienteID=${encodeURIComponent(clienteID)}&carritoId=${encodeURIComponent(carritoId)}">
                      Volver a comprar
                    </a>
                      </div>
                    </div>
                    <div class="col-12 col-lg-8">
                      <div class="border rounded p-0">
                        <div class="table-responsive">
                          <table class="table table-sm table-hover align-middle mb-0">
                            <thead class="table-light">
                              <tr>
                                <th>#</th><th>Código</th><th>Descripción</th>
                                <th class="text-end">Cantidad</th>
                                <th class="text-center">Unidad</th>
                                <th class="text-end">Precio</th>
                                <th class="text-end">Importe</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${rows || `<tr><td colspan="7" class="text-center text-muted py-4">Sin artículos</td></tr>`}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

// Enganchar eventos para cambiar estado
function bindEventosCambiarEstado(api, root) {
  document.querySelectorAll('.badge-estado').forEach(badge => {
    badge.addEventListener("click", async (e) => {
      const carritoId = e.target.getAttribute("data-carrito");

      const select = document.createElement("select");
      select.className = "form-select form-select-sm";
      select.innerHTML = `<option value="">Seleccione estado...</option>`;

      try {
        const estados = await fetchEstados(api);
        estados.forEach(est => {
          select.innerHTML += `<option value="${est.estadoCarrito}">${est.nombre}</option>`;
        });
      } catch (err) {
        console.error("Error cargando estados:", err);
      }

      e.target.replaceWith(select);

      select.addEventListener("change", async () => {
        const nuevoEstadoId = parseInt(select.value, 10);
        if (!nuevoEstadoId) {
          alert("Selecciona un estado válido");
          return;
        }

        try {
          console.log("Disparando cambio de estado");
          console.log("CarritoID:", carritoId, "Nuevo estado ID:", nuevoEstadoId);

          const resp = await cambiarEstadoCarrito(api, carritoId, nuevoEstadoId);
          console.log("Respuesta cambiarEstadoCarrito:", resp);

          const actualizado = comprasCache.find(c => c.carritoExirosID == carritoId);
         
          if (actualizado) {
            actualizado.estado = resp.data;
            console.log("Estado actualizado en cache:", actualizado.estado);
          } else {
            console.warn("No se encontró el carrito en comprasCache con ID:", carritoId);
          }

          const rootNode = byId("comprasRoot");
          if (!rootNode) {
            alert("No se encontró el contenedor principal (comprasRoot)");
            return;
          }
          
          console.log("Root antes de repintar:", rootNode);

          rootNode.innerHTML = buildCompraAccordion(comprasCache, currentClienteID);
          console.log("DOM repintado con acordeón");

          bindEventosCambiarEstado(api, rootNode); //usar el nuevo rootNode aquí
          console.log("Eventos re-enganchados");
        } catch (err) {
          console.error("Error al cambiar el estado:", err);
          alert("Error cambiando estado: " + err.message);
        }
      });
    });
  });
}



  //  Init
async function init() {
  const root = byId('comprasRoot');
  if (!root) return;

  const api = root.getAttribute('data-api') || apiMisCompras;
  llenarSelectEstados(api);

  const input = byId('buscarCliente');
  const selectEstatus = byId('selectEstatus');
  const folioInput = byId('buscarFolio');
  const fechaDesde = byId('fechaDesde');
  const fechaHasta = byId('fechaHasta');

  async function buscar(clienteDemo) {
    const clienteID = clienteDemo || input.value.trim();
    const folio = folioInput ? folioInput.value.trim().toLowerCase() : "";
    const estadoSeleccionado = selectEstatus ? selectEstatus.value : "";
    const desde = fechaDesde ? fechaDesde.value : "";
    const hasta = fechaHasta ? fechaHasta.value : "";
    

    if (!clienteID) {
      root.innerHTML = `<div class="alert alert-secondary" role="alert">
         Ingrese un código de cliente válido. 
        </div>`;
      return;
    }

    root.innerHTML = `<div class="text-muted py-3">Buscando compras de <b>${clienteID}</b>…</div>`;

    try {
      const data = await fetchCompras(api, clienteID);
      comprasCache = Array.isArray(data) ? data : [data];
      currentClienteID = clienteID;
      let resultado = comprasCache;

      //  Filtrar por folio o número de carrito
      if (folio) {
        resultado = resultado.filter(c => {
          const carritoId = String(c.carritoExirosID || c.carritoExirosId || "").toLowerCase();
          const folioC = String(c.folioCotizacion || "").toLowerCase();
          return carritoId.includes(folio) || folioC.includes(folio);
        });
      }

      //  Filtrar por estado
      if (estadoSeleccionado) {
        resultado = resultado.filter(c =>
          c.estado && String(c.estado.estadoCarrito) === String(estadoSeleccionado)
        );
      }

      //  Filtrar por fechas
      if (desde || hasta) {
        resultado = resultado.filter(c => {
          const fechaStr = c.fechaCreacion || c.fecha || ""; 
          if (!fechaStr) return false;

          const desdeDate = desde ? new Date(`${desde}T00:00:00`) : null;
          const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : null;
          const fechaCompra = new Date(fechaStr);

          if (desdeDate && fechaCompra < desdeDate) return false;
          if (hastaDate && fechaCompra > hastaDate) return false;
          return true;
        });
      }

      root.innerHTML = buildCompraAccordion(resultado, clienteID);
      bindEventosCambiarEstado(api, root);
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="alert alert-danger" role="alert">
          No se pudo cargar la compra. <code>${String(e.message)}</code>
        </div>`;
    }
  }

  // Buscar cliente con Enter
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        buscar();
      }
    });
  }

  // Botón aplicar filtro
  const aplicar = byId('btnAplicarFiltro');
  if (aplicar) {
    aplicar.addEventListener("click", () => buscar());
  }

  // Filtro por estado
  if (selectEstatus) {
    selectEstatus.addEventListener("change", () => {
      buscar();
    });
  }

  // Filtro dinámico por folio / número carrito
  if (folioInput) {
    folioInput.addEventListener("input", () => buscar());
  }

  // Filtros por fecha
  if (fechaDesde) fechaDesde.addEventListener("change", () => buscar());
  if (fechaHasta) fechaHasta.addEventListener("change", () => buscar());

  // Opcional: búsqueda inicial
  // buscar("CL-00078");
}



  document.addEventListener('DOMContentLoaded', init);
})();
