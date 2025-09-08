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
        echo json_encode(['error'=>true,'message'=>'Método HTTP no permitido']);
        exit;
    }

    $ClienteID = $_GET['ClienteID'] ?? '';
    if ($ClienteID === '') {
        http_response_code(HTTP_BAD_REQUEST);
        echo json_encode(['error'=>true,'message'=>'Falta el parámetro ClienteID']);
        exit;
    }

    $resp = $ctl->GetCarritoCRM((string)$ClienteID);

    // 🔧 Normaliza para evitar body vacío
    if ($resp === null || $resp === '') {
        echo json_encode([
            'ok'      => false,
            'message' => 'Respuesta vacía desde controller/callApi',
            'debug'   => ['ClienteID' => $ClienteID]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (is_string($resp)) {
        // si te devolvieron texto, imprímelo tal cual
        echo $resp;
        exit;
    }

    // si es array/obj, imprime JSON
    echo json_encode($resp, JSON_UNESCAPED_UNICODE);
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
