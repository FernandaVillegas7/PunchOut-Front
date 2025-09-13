<?php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/MisComprasController.php';

use app\controllers\MisComprasController;
use const app\controllers\HTTP_BAD_REQUEST;

header('Content-Type: application/json; charset=utf-8');

try {
  $ctl    = new MisComprasController();
  $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  $method        = $_GET['method'] ?? '';

  // Ping de diagnóstico para confirmar que este archivo es el que corre
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
    case 'exiros-get-compra':
      if ($requestMethod !== 'GET') {
        http_response_code(405);
        echo json_encode(['error'=>true,'message'=>'Método HTTP no permitido']);
        exit;
      }

      // Acepta ?id= o ?carritoExirosId=
      $clienteID = $_GET['clienteID'] ?? null;
      if (empty($clienteID)) {
        http_response_code(HTTP_BAD_REQUEST);
        echo json_encode(['error'=>true,'message'=>'Falta parámetro cliente']);
        exit;
      }

      $resp = $ctl->ExirosGetCompra($clienteID);
      echo is_string($resp) ? $resp : json_encode($resp);
      exit;

 case 'exiros-cambiar-estado':
    if ($requestMethod !== 'POST') {
        http_response_code(405);
        echo json_encode(['error'=>true,'message'=>'Método HTTP no permitido']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $carritoId = !empty($input['CarritoExirosID']) ? (int)$input['CarritoExirosID'] : 0;
    $nuevoEstadoId = !empty($input['NuevoEstadoCarrito']) ? (int)$input['NuevoEstadoCarrito'] : 0;

    if ($carritoId === 0 || $nuevoEstadoId === 0) {
        http_response_code(HTTP_BAD_REQUEST);
        echo json_encode([
            'error'=>true,
            'message'=>'Faltan parámetros',
            'input'=>$input
        ]);
        exit;
    }

    $resp = $ctl->ExirosCambiarEstadoCarrito($carritoId, $nuevoEstadoId);

    // Aquí devolvemos tal cual lo que venga del backend
    echo is_string($resp) ? $resp : json_encode($resp);
    exit;



     case 'exiros-estado-carrito':
      if ($requestMethod !== 'GET'){
        http_response_code(405);
        echo json_encode (['error'=>true,'message'=>'Método HTTP no permitido']);
        exit;
      }

      $estadoCarrito = $_GET['estadoCarrito'] ?? null;
      $resp = $ctl->ExirosGetEstadoCarrito($estadoCarrito);
      echo is_string($resp) ? $resp : json_encode($resp);
      exit;

    default:
      http_response_code(501);
      echo json_encode(['error'=>true,'message'=>'No implementado (method desconocido)']);
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
