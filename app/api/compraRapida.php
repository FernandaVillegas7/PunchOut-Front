<?php

require_once __DIR__ . '/../controllers/CompraRapidaController.php';

use app\controllers\CompraRapidaController;

use const app\controllers\HTTP_BAD_REQUEST;

$controller = new CompraRapidaController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $input = file_get_contents('php://input');
    $method = $_GET['method'] ?? '';

    switch ($method) {

        // case 'compra-rapida':
        //     if ($requestMethod == 'POST') {
        //         $data = json_decode($input, true);

        //         // Espera un array de productos
        //         if (!is_array($data)) {
        //             throw new UnexpectedValueException("Se esperaba un arreglo de productos");
        //         }

        //         // ENVÍA TODO EL ARRAY DE PRODUCTOS DE UNA SOLA VEZ
        //         $controller->compraRapida($data);
        //         exit;
        //     }
        //     break;

        default:
            throw new UnexpectedValueException("Método desconocido");
    }
} catch (\Exception $th) {
    http_response_code(HTTP_BAD_REQUEST);
    echo json_encode([
        'error' => true,
        'message' => $th->getMessage(),
        'obj' => $th->getTrace(),
    ]);
}
