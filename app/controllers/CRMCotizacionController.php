<?php

namespace app\controllers;

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../config/callApi.php';


class CRMCotizacionController extends BaseController
{
    public function GetCarritoCRM(string $ClienteID)
    {
        $routes = method_exists($this, 'getApiRutes') ? $this->getApiRutes() : [];
        $apiKey = method_exists($this, 'getXApiKey')  ? $this->getXApiKey()  : '';

        return callApi(
            'get-cotizacion-crm', 
            ['ClienteID' => $ClienteID], 
            [ 'routes' => $routes, 'apiKey' => $apiKey]
        );
    }

}