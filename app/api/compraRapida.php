<?php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/CRMCotizacionController.php';

use app\controllers\CRMCotizacionController;
use const app\controllers\HTTP_BAD_REQUEST;

header('Content-Type: application/json; charset=utf-8');

try {
  $ctl    = new CRMCotizacionController();
  $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  $method        = $_GET['method'] ?? '';

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
   case 'compra-rapida':
    if ($requestMethod !== 'POST') {
        http_response_code(405);
        echo json_encode(['error'=>true,'message'=>'Método HTTP no permitido']);
        exit;
    }

    // Leer body
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input)) {
        http_response_code(HTTP_BAD_REQUEST);
        echo json_encode([
            'error'=>true,
            'message'=>'Payload vacío o inválido'
        ]);
        exit;
    }

    // 🚨 Ya NO pedimos ClienteID ni items, simplemente pasamos todo el JSON
    $resp = $ctl->SendCarrito($input);

    // Responder
    echo is_string($resp) ? $resp : json_encode($resp);
    exit;


    default:
      http_response_code(400);
      echo json_encode(['error'=>true,'message'=>'Parámetro "method" inválido o ausente']);
      exit;
  }
} catch (\Throwable $th) {
  http_response_code(HTTP_BAD_REQUEST);
  echo json_encode([
    'error'   => true,
    'message' => $th->getMessage()
  ]);
  exit;
}
