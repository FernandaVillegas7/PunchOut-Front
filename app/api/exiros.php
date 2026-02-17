<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../controllers/ExirosController.php';

use app\controllers\ExirosController;
use const app\controllers\HTTP_BAD_REQUEST;

// If a SessionID is provided in the query, resume that PHP session.
// This helps when the browser blocks third-party cookies during PunchOut.
if (isset($_GET['SessionID']) && is_string($_GET['SessionID']) && $_GET['SessionID'] !== '') {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    @session_id($_GET['SessionID']);
    @session_start();
    if (empty($_SESSION['SessionID'])) {
        $_SESSION['SessionID'] = session_id();
    }
}

$controller = new ExirosController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $method = $_GET['method'] ?? '';

    switch ($method) {
        case 'loginToken':
            if ($requestMethod === 'POST') {
                // Recibe el cXML como POST o body
                $result = $controller->getLoginToken();

                if ($result['error']) {
                    http_response_code($result['code']);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode($result);
                    exit;
                }

                $timestamp = date('c'); // ISO 8601
                $sessionId = $result['data']['SessionID'];
                $protocol = $result['protocol'] ?? 'cXML';
                $startUrl = "https://exiros.mersolsureste.com.mx/shop?SessionID={$sessionId}";

                if (strcasecmp($protocol, 'OCI') === 0) {
                    // For OCI logins, redirect the browser into the shop with SessionID
                    header('Location: ' . $startUrl, true, 302);
                    exit;
                }

                // Devuelve página HTML (OCI) que redirige al StartPage; se deja el cXML original como respaldo en comentarios
                header('Content-Type: text/html; charset=UTF-8');

                // Escape URL for XML (ampersands, etc.)
                $escapedStartUrl = htmlspecialchars($startUrl, ENT_XML1 | ENT_COMPAT, 'UTF-8');

                $html = <<<HTML
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Redirigiendo…</title>
        <meta http-equiv="refresh" content="0;url={$escapedStartUrl}" />
        <script>
            // Redirección inmediata (fallback si meta refresh no aplica)
            window.location.replace("{$escapedStartUrl}");
        </script>
    </head>
    <body>
        <noscript>
            Si no eres redirigido automáticamente, haz clic aquí:
            <a href="{$escapedStartUrl}">Ir a la tienda</a>
        </noscript>
    </body>
    </html>
    HTML;

                echo $html;
                exit;
            }
            break;

        case 'validateSessionID':
            if ($requestMethod === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);
                $sessionID = $data['SessionID'] ?? ($_POST['SessionID'] ?? $_GET['SessionID'] ?? '');

                $response = $controller->validateSessionID($sessionID);

                if ($response->error) {
                    header('Location: https://http.cat/images/401.jpg');
                    http_response_code($response->responseCode);
                    exit;
                }

                http_response_code($response->responseCode);
                echo json_encode([
                    'error' => $response->error,
                    'message' => $response->message,
                    'clienteUsuarioID' => $response->objResponse['clienteUsuarioID'] ?? null,
                    'extrinsics' => $response->objResponse['extrinsics'] ?? null,
                    'HOOK_URL' => $response->objResponse['HOOK_URL'] ?? null
                ]);
                exit;
            }
            break;

        case 'ExirosProductDetail':
            // Recoge los parámetros del request
            $data = [
                'articulo' => isset($_GET['articulo']) ? $_GET['articulo'] : '',
            ];

            $product = $controller->ExirosProductDetail($data);

            echo json_encode($product);
            break;

        case 'get-carrito':
            // devuelve el carrito actual desde la sesión
            $cart = $controller->GetCarrito();
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode($cart);
            exit;

        case 'insert-carrito':
            if ($requestMethod === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                // Validar JSON
                if (json_last_error() !== JSON_ERROR_NONE) {
                    http_response_code(400);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode([
                        'isError' => true,
                        'message' => 'JSON inválido en el body: ' . json_last_error_msg()
                    ]);
                    exit;
                }

                // Validar keys mínimas
                if (!isset($data['cantidad']) || !isset($data['codigoInterno'])) {
                    http_response_code(400);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode([
                        'isError' => true,
                        'message' => 'Se requieren cantidad y codigoInterno'
                    ]);
                    exit;
                }

                // Opcional: log para depuración
                // error_log('insert-carrito body: ' . print_r($data, true));

                $controller->InsertArticulo($data);
                exit;
            }
            break;

        case 'remove-carrito':
            if ($requestMethod === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    http_response_code(400);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode(['isError' => true, 'message' => 'JSON inválido: ' . json_last_error_msg()]);
                    exit;
                }

                $result = $controller->RemoveArticulo($data);
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode($result);
                exit;
            }
            break;

        case 'SaveCarrito':
            if ($requestMethod === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    http_response_code(400);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode([
                        'isError' => true,
                        'message' => 'JSON inválido en el body: ' . json_last_error_msg()
                    ]);
                    exit;
                }

                $result = $controller->SaveCarrito($data ?? []);

                // The controller already normalizes the response and carries data (NuevoCarritoID)  
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode($result);
                exit;
            }
            break;

        case 'get-session':
            $session = $controller->GetSession();
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode($session);
            exit;

        case 'totalCarritoCount':
            if ($requestMethod === 'GET') {
                $result = $controller->TotalCarritoCount();
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode($result);
                exit;
            }
            break;

        case 'SaveCarrito':
            if ($requestMethod === 'POST') {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    http_response_code(400);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode([
                        'isError' => true,
                        'message' => 'JSON inválido en el body: ' . json_last_error_msg()
                    ]);
                    exit;
                }

                $result = $controller->SaveCarrito($data ?? []);

                // The controller already normalizes the response and carries data (NuevoCarritoID)
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode($result);
                exit;
            }
            break;
            
        
        case 'ExirosGetCategorias':

            // Controller method does not expect external $data; call without arguments
            $categorias = $controller->ExirosGetCategorias();

            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode($categorias);
            exit;
            break;


        default:
            http_response_code(405);
            echo json_encode([
                'error' => true,
                'message' => 'Método HTTP no permitido'
            ]);
            exit;
    }
} catch (\Exception $th) {
    http_response_code(HTTP_BAD_REQUEST);
    echo json_encode([
        'error' => true,
        'message' => $th->getMessage(),
        'trace' => $th->getTrace(),
    ]);
}
