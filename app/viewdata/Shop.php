<?php

namespace app\viewdata;

use app\models\post\PostProductSearchModel;
use app\controllers\ProductosController;

class Shop
{
    public static function getData(): array
    {
        try {
            $buscar = new PostProductSearchModel();

            // Parámetros de búsqueda con defaults seguros
            $buscar->pageSize = isset($_GET['ps']) ? (int)$_GET['ps'] : 50;
            $buscar->pageNumber = isset($_GET['n']) ? (int)$_GET['n'] : 0;
            $buscar->searchQuery = isset($_GET['s']) ? (string)$_GET['s'] : '';
            // Sucursal por defecto (coincide con searchProduct)
            $buscar->sucursalID = isset($_GET['sid']) ? (int)$_GET['sid'] : 1;

            $cats = $_GET['c'] ?? [0];
            if (!is_array($cats)) { $cats = [$cats]; }
            $buscar->categoriesID = array_map(static function ($v) { return (int)$v; }, $cats);

            $controller = new ProductosController();
            $response = $controller->getRemProductos($buscar);

            // Devuelve el objeto de respuesta o un arreglo vacío
            return is_array($response->objResponse ?? null) ? $response->objResponse : ($response->objResponse ?? []);
        } catch (\Throwable $e) {
            // Fallback silencioso para evitar fatales en la vista
            return [];
        }
    }
}
