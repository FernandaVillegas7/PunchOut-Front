<?php
declare(strict_types=1);

namespace app\controllers;

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../config/callApi.php';

/**
 * Controller: usa BaseController para obtener $routes (ROUTEAPI) y $apiKey
 * y alimenta a callApi($endpoint, $data, ['routes'=>..., 'apiKey'=>...]).
 */
class MisComprasController extends BaseController
{
    /**
     * Obtiene UNA compra por ID desde .NET
     * Backend espera query: ?carritoExirosId={id}
     */
    public function ExirosGetCompra(string $clienteID)
    {
        // Se asume que tu BaseController expone estos helpers:
        // - getApiRutes()   -> array de rutas (de sección [ROUTEAPI] de config.ini)
        // - getXApiKey()    -> string con la API Key (de sección [API])
        $routes = method_exists($this, 'getApiRutes') ? $this->getApiRutes() : [];
        $apiKey = method_exists($this, 'getXApiKey')  ? $this->getXApiKey()  : '';

        // Llamada al endpoint configurado como 'exiros-get-compra'
        // Pasamos el parámetro que .NET espera: carritoExirosId
        return callApi(
            'exiros-get-compra',
            ['clienteID' => $clienteID],
            ['routes' => $routes, 'apiKey' => $apiKey]
        );
    }

    public function ExirosGetEstadoCarrito(?int $estadoCarrito =  null){
        $routes = method_exists($this, 'getApiRutes') ? $this->getApiRutes() : [];
        $apiKey = method_exists($this, 'getXApiKey')  ? $this->getXApiKey()  : '';

        $params = [];
        if(!is_null($estadoCarrito)){
            $params['estadoCarrito'] = $estadoCarrito;
        }

        return callApi(
            'exiros-estado-carrito',
            $params,
            ['routes' => $routes, 'apiKey' => $apiKey]
        );
    }

    public function ExirosCambiarEstadoCarrito(int $carritoId, int $nuevoEstadoId)
{
    $routes = method_exists($this, 'getApiRutes') ? $this->getApiRutes() : [];
    $apiKey = method_exists($this, 'getXApiKey') ? $this->getXApiKey() : '';

    return callApi(
        'exiros-cambiar-estado',
        [
            'CarritoExirosID'      => $carritoId,
            'NuevoEstadoCarrito' => $nuevoEstadoId
        ],
        [
            'routes' => $routes,
            'apiKey' => $apiKey,
            'method' => 'POST'   
        ]
    );
}



}
