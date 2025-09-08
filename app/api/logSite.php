
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
                $data = json_decode($input, true);
                $Valor = $data['Valor'] ?? null;
                $FechaHora = $data['FechaHora'] ?? null;
                $IP = $data['IP'] ?? $_SERVER['REMOTE_ADDR'];
                $controller->CrearLogPagina($Valor, $FechaHora, $IP);
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
