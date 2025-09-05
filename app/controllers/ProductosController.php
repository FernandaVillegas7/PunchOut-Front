<?php

namespace app\controllers;

use GuzzleHttp\Client;
use app\models\post\PostProductSearchModel;

class ProductosController extends BaseController
{
    private $gusCliente;

    public function __construct()
    {
        $this->gusCliente = new Client();
    }

    public function searchProduct(string $search)
    {
        $rutas = parent::getApiRutes();
        $key = parent::getApiKey();
        $result = null;

        try {

            $apiResponse = $this->gusCliente->request('GET', "{$rutas['doper']}B2CSearchProducts", [
                'query' => [
                    'pageSize' => 10,
                    'pageNumber' => 0,
                    'SucursalID' => 1,
                    'search' => $search
                ],
                'headers' => [
                    'APIKey' => $key
                ],
                'verify' => false
            ]);

            if ($apiResponse->getStatusCode() === 200) {
                $data = json_decode($apiResponse->getBody(), true); // Decodificar el JSON en un array

                $result = parent::setResponse(code: $apiResponse->getStatusCode(), obj: $data);
            } else {
                $result = parent::setResponse(code: $apiResponse->getStatusCode(), obj: (string) $apiResponse->getBody());
            }

            return $result;
        } catch (\Throwable $th) {
            return parent::setResponse(code: HTTP_BAD_REQUEST, obj: [], message: $th->getMessage());
        }
    }

    public function getRemProductos(PostProductSearchModel  $model)
    {
        $rutas = parent::getApiRutes();
        $key = parent::getApiKey();
        $result = null;

        try {
            $apiResponse = $this->gusCliente->request('POST', "{$rutas['doper']}B2CProducts", [
                'json' => $model,
                'headers' => [
                    'APIKey' => $key
                ],
                'verify' => false
            ]);

            if ($apiResponse->getStatusCode() === 200) {
                $data = json_decode($apiResponse->getBody(), true); // Decodificar el JSON en un array

                $result = parent::setResponse(code: $apiResponse->getStatusCode(), obj: $data);
            } else {
                $result = parent::setResponse(code: $apiResponse->getStatusCode(), obj: (string) $apiResponse->getBody());
            }

            return $result;
        } catch (\Throwable $th) {
            return parent::setResponse(code: HTTP_BAD_REQUEST, obj: [], message: $th->getMessage());
        }
    }

    public function getDetalleProducto(string $articulo, string $codigo, int $sucursalID)
    {
        $rutas = parent::getApiRutes();
        $key = parent::getApiKey();
        $result = null;

        try {

            $apiResponse = $this->gusCliente->request('GET', "{$rutas['doper']}B2CSingleProduct", [
                'query' => [
                    'Articulo' => $codigo,
                    'SucursalID' => $sucursalID,
                    'CodigoInterno' => $articulo
                ],
                'headers' => [
                    'APIKey' => $key
                ],
                'verify' => false
            ]);


            if ($apiResponse->getStatusCode() === 200) {
                $data = json_decode($apiResponse->getBody(), true); // Decodificar el JSON en un array

                $result = parent::setResponse(code: $apiResponse->getStatusCode(), obj: $data);
            } else {
                $result = parent::setResponse(code: $apiResponse->getStatusCode(), obj: (string) $apiResponse->getBody());
            }

            return $result;
        } catch (\Throwable $th) {
            return parent::setResponse(code: HTTP_BAD_REQUEST, obj: [], message: $th->getMessage());
        }
    }

    // // public function getProductosB2C()
    // // {
    // //     $rutas = parent::getApiRutes();

    // //     try {

    // //         $apiResponse = $this->gusCliente->request('GET', "{$rutas['productos']}ListaProductosB2C", [
    // //             'query' => [
    // //                 'search' => ' ',
    // //                 'start'  => 0,
    // //                 'length' => 9
    // //             ]
    // //         ]);

    // //         if ($apiResponse->getStatusCode() === 200) {
    // //             $data = json_decode($apiResponse->getBody(), true); // Decodificar el JSON en un array

    // //             return parent::setResponse(code: $apiResponse->getStatusCode(), obj: $data['data']);
    // //         } else {
    // //             return parent::setResponse(code: $apiResponse->getStatusCode(), obj: (string) $apiResponse->getBody());
    // //         }
    // //     } catch (\Throwable $th) {
    // //         return parent::setResponse(code: HTTP_BAD_REQUEST, obj: ['error' => $th->getMessage()]);
    // //     }
    // // }
}
