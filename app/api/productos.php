<?php

use app\config\Views;
use app\controllers\ProductosController;
use app\models\post\PostProductSearchModel;

use const app\controllers\HTTP_BAD_REQUEST;

$view = new Views();
$controll = new ProductosController();
//hola mundo
try {

    if($requestMethod == 'POST'){
        if($method === 'Lista'){
            $data = $mapper->mapObjectFromString($input, new PostProductSearchModel());
            $response = $controll->getRemProductos($data);
            $response->showResponse();
       }
    }
    
    //     if($method === 'infity'){
    //         $data = $mapper->mapObjectFromString($input, new PostProductSearchModel());
    //         $response = $controll->getRemProductos($data);

    //         $temp = $view->loadPartials('items.twig', $response->objResponse);

    //         http_response_code(200);
    //         echo json_encode([
    //             'error' => true,
    //             'message' => $temp
    //         ]);

    //         exit();
    //     }
    // }

    // if($requestMethod == 'GET' && $method == 'search'){
    //     $search = $_GET['s'] ?? '';
    //     $response = $controll->searchProduct($search);
    //     $response->showResponse();
    // }

    // throw new UnexpectedValueException("Metodo no permitido");

} catch (\Throwable $th) {
    http_response_code(HTTP_BAD_REQUEST);
    echo json_encode([
        'error' => true,
        'message' => $th->getMessage()
    ]);
}
