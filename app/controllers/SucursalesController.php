<?php

namespace app\controllers;

use Medoo\Medoo;
use app\config\BDConexion;

class SucursalesController extends BaseController
{
    private Medoo $db;

    public function __construct()
    {
        $this->db = BDConexion::getInstance()->getDatabase();
    }

    public function getSucursalesMenu()
    {
        $data = $this->db->select(
            "sucursales",
            [
                "Sucursal",
                "Domicilio",
                "Telefono",
            ],
            [
                "Activo" => 1
            ]
        );

        $sucursal = array_map(function ($row) {
            return [
                "Sucursal" => $row["Sucursal"],
                "Domicilio" => $row["Domicilio"],
                "Telefono" => $row["Telefono"],
                "url" => parent::formatString($row["Sucursal"])
            ];
        }, $data);

        return parent::setResponse(obj: $sucursal);
    }
}
