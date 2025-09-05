<?php
require_once __DIR__ . '/../controllers/AgentController.php';

use app\controllers\AgentController;

use const app\controllers\HTTP_BAD_REQUEST;

$controller = new AgentController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $method = $_GET['method'] ?? ''; // Obtener el método específico (Login, Register, etc.)

    switch ($method) {
        case 'GetDataAgent':
            if ($requestMethod === 'POST') {
                session_start(); // Asegúrate de iniciar la sesión

                // Verificar si las variables de sesión están configuradas
                if (!isset($_SESSION['cliente']) || !isset($_SESSION['plantaSeleccionadaID'])) {
                    http_response_code(HTTP_BAD_REQUEST);
                    echo json_encode([
                        'error' => true,
                        'message' => 'Las variables de sesión cliente o plantaSeleccionadaID no están configuradas.',
                    ]);
                    exit;
                }

                // Llamar al método getDataAgent del controlador
                $controller->getDataAgent($_SESSION['cliente'], $_SESSION['plantaSeleccionadaID']);
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
