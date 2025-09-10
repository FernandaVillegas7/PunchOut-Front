<?php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/CRMCotizacionController.php';

use app\controllers\CRMCotizacionController;
use const app\controllers\HTTP_BAD_REQUEST;

header('Content-Type: application/json; charset=utf-8');

echo "[INIT] cotizacionCRM.php cargado\n"; flush();

try {
    $ctl           = new CRMCotizacionController();
    $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $method        = $_GET['method'] ?? '';

    echo "[INFO] Método: $method | Verbo HTTP: $requestMethod\n"; flush();

    // Ping de salud
    if (isset($_GET['ping'])) {
        echo "[PING] Respondido\n"; flush();
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
            echo "[ENTER] get-cotizacion-crm\n"; flush();

            if ($requestMethod !== 'GET') {
                echo "[ERROR] Verbo no permitido para get-cotizacion-crm\n"; flush();
                http_response_code(405);
                echo json_encode(['error' => true, 'message' => 'Método HTTP no permitido']);
                exit;
            }

            $ClienteID = $_GET['ClienteID'] ?? '';
            echo "[INFO] ClienteID: $ClienteID\n"; flush();

            if ($ClienteID === '') {
                echo "[ERROR] Falta ClienteID\n"; flush();
                http_response_code(HTTP_BAD_REQUEST);
                echo json_encode(['error' => true, 'message' => 'Falta el parámetro ClienteID']);
                exit;
            }

            $resp = $ctl->GetCarritoCRM((string)$ClienteID);

            if ($resp === null || $resp === '') {
                echo "[WARN] Respuesta vacía\n"; flush();
                echo json_encode([
                    'ok'      => false,
                    'message' => 'Respuesta vacía desde controller/callApi',
                    'debug'   => ['ClienteID' => $ClienteID]
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if (is_string($resp)) {
                echo "[OK] Respuesta tipo string\n"; flush();
                echo $resp;
                exit;
            }

            echo "[OK] Respuesta tipo array\n"; flush();
            echo json_encode($resp, JSON_UNESCAPED_UNICODE);
            exit;

        case 'exiros-Cotizacion-carrito':
            echo "[ENTER] exiros-Cotizacion-carrito\n"; flush();

            if ($requestMethod !== 'POST') {
                echo "[ERROR] Verbo no permitido para exiros-Cotizacion-carrito\n"; flush();
                http_response_code(405);
                header('Allow: POST');
                echo json_encode(['error' => true, 'message' => 'Método HTTP no permitido'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $input = file_get_contents('php://input') ?: '';
            echo "[INFO] JSON recibido: $input\n"; flush();

            $data  = json_decode($input, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                echo "[ERROR] JSON inválido: " . json_last_error_msg() . "\n"; flush();
                http_response_code(HTTP_BAD_REQUEST);
                echo json_encode([
                    'isError' => true,
                    'message' => 'JSON inválido: ' . json_last_error_msg()
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            echo "[OK] JSON decodificado correctamente\n"; flush();

            $result = $ctl->SendCarrito($data);

            echo "[RESPUESTA] Desde SendCarrito: \n"; flush();
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;

        default:
            echo "[ERROR] Método no reconocido: $method\n"; flush();
            http_response_code(400);
            echo json_encode(['error' => true, 'message' => 'Parámetro "method" inválido o ausente'], JSON_UNESCAPED_UNICODE);
            exit;
    }

} catch (\Throwable $th) {
    echo "[FATAL] Excepción atrapada: " . $th->getMessage() . "\n"; flush();
    http_response_code(HTTP_BAD_REQUEST);
    echo json_encode([
        'error'   => true,
        'message' => $th->getMessage(),
        'obj'     => $th->getTrace(),
    ], JSON_UNESCAPED_UNICODE);
}
