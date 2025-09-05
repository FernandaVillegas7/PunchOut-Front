<?php

require_once __DIR__ . '/../controllers/CarritoController.php';

use app\controllers\CarritoController;

use const app\controllers\HTTP_BAD_REQUEST;

$controller = new CarritoController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $input = file_get_contents('php://input'); // Obtener datos de entrada
    $method = $_GET['method'] ?? ''; // Obtener el método específico (Login, Register, etc.)

    switch ($method) {
        // case 'create-carrito':
        //     if ($requestMethod === 'POST') {
        //         session_start(); // Asegúrate de iniciar la sesión

        //         if (empty($_SESSION['cliente'])) {
        //             http_response_code(HTTP_BAD_REQUEST);
        //             echo json_encode([
        //                 'error' => true,
        //                 'message' => 'ClienteID no está configurado en la sesión.',
        //             ]);
        //             exit;
        //         }
        //         // Llamar al método getUserClientAccounts del controlador
        //         $controller->Carrito();
        //         exit;
        //     }
        //     break;

        // case 'totalItems':
        //     if ($requestMethod == 'GET') {
        //         $response = $controll->getTotalArticulos($_SESSION['SessionSeed'] ?? '');
        //         $response->showResponse();
        //     }
        //     break;

        // case 'insertItemCarrito':
        //     if ($requestMethod == 'POST') {
        //         $data = json_decode($input, true);
        //         $carritoID = $data['carritoID'] ?? '';
        //         $totalProducto = $data['totalProducto'] ?? '';
        //         $articulo = $data['producto'] ?? '';
        //         $controller->insertItemCarrito($data);
        //         exit;
        //     }
        //     break;

        // case 'getCarrito':
        //     if ($requestMethod == 'GET') {
        //         $response = $controller->getCarrito();
        //         $response->showResponse();
        //         exit;
        //     }
        //     break;

        // case 'updateCantidadItemCarrito':
        //     if ($requestMethod == 'PUT') {
        //         $data = json_decode($input, true);
        //         $controller->updateCantidadItemCarrito($data);
        //         exit;
        //     }
        //     break;

        // case 'eliminarItemCarrito':
        //     if ($requestMethod == 'PUT') {
        //         $data = json_decode($input, true);
        //         $controller->eliminarItemCarrito($data);
        //         exit;
        //     }
        //     break;


        default:
            throw new UnexpectedValueException("Método desconocido");
    }
} catch (\Exception $th) {
    // Manejo de excepciones
    http_response_code(HTTP_BAD_REQUEST);
    echo json_encode([
        'error' => true,
        'message' => $th->getMessage(),
        'obj' => $th->getTrace(),
    ]);
}



// use app\config\Views;
// use app\models\CarritoModel;
// use app\controllers\CarritoController;

// use const app\controllers\HTTP_BAD_REQUEST;

// $controll = new CarritoController();
// $view = new Views();

// try {

//     if ($requestMethod == 'POST' && $method === 'setItemInCar') {
//         $data = $mapper->mapObjectFromString($input, new CarritoModel());
//         $data->cliente = $_SESSION['Cliente'];
//         $data->sessionSeed = $_SESSION['SessionSeed'];
//         $response = $controll->setArticuloCarrito($data);
//         $response->showResponse();
//     }

//     if ($requestMethod == 'GET') {
//         if ($method === 'totalItems') {
//             $response = $controll->getTotalArticulos($_SESSION['SessionSeed'] ?? '');
//             $response->showResponse();
//         }

//         if ($method === 'updateQuantity') {
//             $item = $_GET['carritoID'] ?? 0;
//             $cantidad = $_GET['cantidad'] ?? 0;

//             $response = $controll->updateItemQuantity($item, $cantidad);
//             $response->showResponse();
//         }

//         if ($method === 'dropItem') {
//             $itemID = $_GET['itemID'] ?? 0;

//             $response = $controll->dropItemCarrito($itemID);

//             $list = $controll->getListItems($_SESSION['SessionSeed'] ?? '');
//             $data = ['itemsList' => $list->objResponse];

//             $response->template = $view->loadPartials('tablaArticulos.twig', $data);
//             $response->showResponse();
//         }

//         if ($method === 'ItemList') {
//             $list = $controll->getListItems($_SESSION['SessionSeed'] ?? '1019e3f9a78a9d02a83e457b856933fb');

//             $data = [
//                 'itemsList' => $list->objResponse
//             ];

//             $temp = $view->loadPartials('tablaArticulos.twig', $data);

//             http_response_code(200);
//             echo json_encode([
//                 'error' => true,
//                 'message' => $temp
//             ]);

//             exit();
//         }
//     }

//     throw new UnexpectedValueException("Metodo no permitido");
// } catch (\Throwable $th) {

//     http_response_code(HTTP_BAD_REQUEST);
//     echo json_encode([
//         'error' => true,
//         'message' => $th->getMessage()
//     ]);
// }
