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
      $id = $_GET['id'] ?? $_GET['carritoExirosId'] ?? null;
      if ($id === null || $id === '') {
        http_response_code(HTTP_BAD_REQUEST);
        echo json_encode(['error'=>true,'message'=>'Falta parámetro id']);
        exit;
      }

      $resp = $ctl->ExirosGetCompra((int)$id);
      echo is_string($resp) ? $resp : json_encode($resp);
      exit;

    default:
      http_response_code(501);
      echo json_encode(['error'=>true,'message'=>'Not Implemented (method desconocido)']);
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
