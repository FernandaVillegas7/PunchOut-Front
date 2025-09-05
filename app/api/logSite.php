
<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../controllers/LogSiteController.php';

use app\controllers\LogSiteController;

use const app\controllers\HTTP_BAD_REQUEST;

$controller = new LogSiteController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $input = file_get_contents('php://input'); // Obtener datos de entrada
    $method = $_GET['method'] ?? ''; // Obtener el método específico (Login, Register, etc.)

    switch ($method) {
        case 'CrearLogPagina':
            if ($requestMethod === 'POST') {
                $data = json_decode($input, true) ?: [];
                $Valor = isset($data['Valor']) ? trim((string)$data['Valor']) : null;
                // Default FechaHora to now if missing/empty (Y-m-d H:i:s)
                $FechaHora = isset($data['FechaHora']) && trim((string)$data['FechaHora']) !== ''
                    ? trim((string)$data['FechaHora'])
                    : date('Y-m-d H:i:s');
                // Prefer provided IP when truthy, else REMOTE_ADDR, else null
                $providedIP = isset($data['IP']) ? trim((string)$data['IP']) : '';
                $IP = $providedIP !== '' ? $providedIP : ($_SERVER['REMOTE_ADDR'] ?? null);

                $controller->CrearLogPagina($Valor, $FechaHora, $IP);
                exit;
            } else {
                http_response_code(405);
                header('Content-Type: application/json');
                echo json_encode(['error' => true, 'message' => 'Método no permitido']);
                exit;
            }
            break;

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
