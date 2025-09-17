<?php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/CRMCotizacionController.php';

use app\controllers\CRMCotizacionController;
use const app\controllers\HTTP_BAD_REQUEST;

header('Content-Type: application/json; charset=utf-8');



try {
    $ctl           = new CRMCotizacionController();
    $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $method        = $_GET['method'] ?? '';

  

    // Ping de salud
    if (isset($_GET['ping'])) {
        
        echo json_encode([
            'ok'     => true,
            'file'   => __FILE__,
            'method' => $method,
            'verb'   => $requestMethod
        ], JSON_PRETTY_PRINT);
        exit;
    }

    switch ($method) {
        case 'get-cotizacion-crm':
           

            if ($requestMethod !== 'GET') {
                
                http_response_code(405);
                echo json_encode(['error' => true, 'message' => 'Método HTTP no permitido']);
                exit;
            }

            $ClienteID = $_GET['ClienteID'] ?? '';
            

            if ($ClienteID === '') {
                
                http_response_code(HTTP_BAD_REQUEST);
                echo json_encode(['error' => true, 'message' => 'Falta el parámetro ClienteID']);
                exit;
            }

            $resp = $ctl->GetCarritoCRM((string)$ClienteID);

            if ($resp === null || $resp === '') {
               
                echo json_encode([
                    'ok'      => false,
                    'message' => 'Respuesta vacía desde controller/callApi',
                    'debug'   => ['ClienteID' => $ClienteID]
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if (is_string($resp)) {
             
                echo $resp;
                exit;
            }

       
            echo json_encode($resp, JSON_UNESCAPED_UNICODE);
            exit;

        case 'exiros-Cotizacion-carrito':
          

            if ($requestMethod !== 'POST') {
                http_response_code(405);
                header('Allow: POST');
                echo json_encode(['error' => true, 'message' => 'Método HTTP no permitido'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $input = file_get_contents('php://input') ?: '';
           

            $data  = json_decode($input, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
              
                http_response_code(HTTP_BAD_REQUEST);
                echo json_encode([
                    'isError' => true,
                    'message' => 'JSON inválido: ' . json_last_error_msg()
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

       

            $result = $ctl->SendCarrito($data);

            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;

        default:
            
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Parámetro "method" inválido o ausente'], JSON_UNESCAPED_UNICODE);
            exit;
    }

} catch (\Throwable $th) {

    http_response_code(HTTP_BAD_REQUEST);
    echo json_encode([
        'error'   => true,
        'message' => $th->getMessage(),
        'obj'     => $th->getTrace(),
    ], JSON_UNESCAPED_UNICODE);
}
