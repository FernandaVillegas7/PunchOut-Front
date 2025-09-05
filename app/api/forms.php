<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/Views.php';
require_once __DIR__ . '/../controllers/FormsController.php';

use app\config\Views;
use app\controllers\FormsController;

use const app\controllers\HTTP_BAD_REQUEST;

$view = new Views();
$controller = new FormsController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $input = file_get_contents('php://input'); // Obtener datos de entrada
    $method = $_GET['method'] ?? ''; // Obtener el método específico (Login, Register, etc.)

    switch ($method) {

        case 'CrearFormularioCliente':
            if ($requestMethod === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                // Validación básica
                if (!isset($data['listaSelectFormularioClienteID']) || !isset($data['mensaje'])) {
                    http_response_code(HTTP_BAD_REQUEST);
                    echo json_encode([
                        'error' => true,
                        'message' => 'Faltan datos para crear el formulario',
                    ]);
                    exit;
                }

                $controller->crearFormularioCliente($data);
                exit;
            }
            break;

        case 'CrearFormularioSolicitudAcceso':
            if ($requestMethod === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                // Validación básica de los campos requeridos
                if (
                    empty($data['nombreEmpresa']) ||
                    empty($data['nombreSolicita']) ||
                    empty($data['correoElectronico']) ||
                    empty($data['numeroTelefono']) ||
                    empty($data['mensaje'])
                ) {
                    http_response_code(HTTP_BAD_REQUEST);
                    echo json_encode([
                        'error' => true,
                        'message' => 'Faltan datos para crear el formulario',
                    ]);
                    exit;
                }

                $controller->crearFormularioSolicitudAcceso($data);
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
