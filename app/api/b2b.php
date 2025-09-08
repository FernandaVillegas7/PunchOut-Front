<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/Views.php';
require_once __DIR__ . '/../controllers/B2BController.php';

use app\config\Views;
use app\controllers\B2BController;

use const app\controllers\HTTP_BAD_REQUEST;

// If a SessionID is provided in the query, resume that PHP session.
// This is useful for PunchOut flows where third-party cookies may be blocked.
// NOTE: Disabled for development to avoid interference
// if (isset($_GET['SessionID']) && is_string($_GET['SessionID']) && $_GET['SessionID'] !== '') {
//     if (session_status() === PHP_SESSION_ACTIVE) {
//         session_write_close();
//     }
//     @session_id($_GET['SessionID']);
//     @session_start();
//     // Guarantee the expected SessionID key exists for downstream checks
//     if (empty($_SESSION['SessionID'])) {
//         $_SESSION['SessionID'] = session_id();
//     }
// }

$view = new Views();
$controller = new B2BController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $input = file_get_contents('php://input'); // Obtener datos de entrada
    $method = $_GET['method'] ?? ''; // Obtener el método específico (Login, Register, etc.)

    switch ($method) {
        case 'GetExirosProducts':
            // Recoge los parámetros del request
            $data = [
                'pageSize'   => isset($_GET['pageSize']) ? intval($_GET['pageSize']) : 20,
                'pageNumber' => isset($_GET['pageNumber']) ? intval($_GET['pageNumber']) : 0,
                'search'     => isset($_GET['search']) ? $_GET['search'] : '',
                'category'   => isset($_GET['category']) ? $_GET['category'] : '', // minúscula
            ];

            // Llama al método especializado del controlador
            $products = $controller->getExirosProducts($data);

            // // Salida JSON para Select2
            // header('Content-Type: application/json; charset=utf-8');
            // echo json_encode([
            //     'response' => $products
            // ]);
            echo json_encode($products);
            exit;

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
