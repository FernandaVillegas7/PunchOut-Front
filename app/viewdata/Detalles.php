<?php

namespace app\viewdata;

use app\controllers\ProductosController;

class Detalles
{
    public static function getData()
    {
        $controll = new ProductosController();

        $codigo = $_GET['c'] ?? ''; 
        $sucursal = $_GET['s'] ?? 1;
        $artciulo = $_GET['a'] ?? '';

        $data = $controll->getDetalleProducto($artciulo, $codigo, $sucursal);

        return $data->objResponse;
    }
}
