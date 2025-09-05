<?php

namespace app\controllers;

use Medoo\Medoo;
use GuzzleHttp\Client;
use app\config\BDConexion;

class CategoriaController extends BaseController
{
    private Medoo $db;
    private $cliente;
    private $apiRoutes;
    private string $key;

    public function __construct() 
    {

        $this->apiRoutes = parent::getApiRutes();
        $this->cliente = new Client();
        $this->key = parent::getApiKey();
        $this->db = BDConexion::getInstance()->getDatabase();
    }

    public function getRemListaCategorias(int $sucursalID = 1)
    {
        try {
            $response = $this->cliente->request("GET", "{$this->apiRoutes['doper']}GetCategorias", [
                'query' => [
                    'SucursalID' => $sucursalID
                ],
                'headers' => [
                    'APIKey' => $this->key
                ],
                'verify' => false
            ]);
    
            if ($response->getStatusCode() === 200) {
                $data = json_decode($response->getBody(), true); // Decodificar el JSON en un array
                return parent::setResponse(code: $response->getStatusCode(), obj: $data);
            }
    
        } catch (\Throwable $th) {
            return parent::setResponse(code: HTTP_BAD_REQUEST, obj: [], message: $th->getMessage());
        }

    }

    public function getListaCategorias()
    {
        $data = $this->db->select(
            "categorias",
            [
                'CategoriaID',
                'Categoria'
            ],
            [
                "Activo" => 1
            ]
        );

        return parent::setResponse(obj: $data);
    }
}



