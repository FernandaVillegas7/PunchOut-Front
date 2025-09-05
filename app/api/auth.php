<?php

require_once __DIR__ . '/../controllers/AuthController.php';

use app\controllers\AuthController;

use const app\controllers\HTTP_BAD_REQUEST;

$controller = new AuthController();

try {
    $requestMethod = $_SERVER['REQUEST_METHOD'];
    $input = file_get_contents('php://input'); // Obtener datos de entrada
    $method = $_GET['method'] ?? ''; // Obtener el método específico (Login, Register, etc.)

    switch ($method) {
        case 'Login':
            if ($requestMethod === 'POST') {
                // Mapear datos de entrada
                $data = json_decode($input, true);
                $usuario = $data['usuario'] ?? '';
                $userPass = $data['userPass'] ?? '';

                // Llamar al método de login del controlador
                $response = $controller->login($usuario, $userPass);

                // Manejar la respuesta
                if (!$response->error) {
                    // Configurar sesión si el login es exitoso
                    session_start();
                    $_SESSION['clienteUsuarioID'] = $response->objResponse['clienteUsuarioID'];
                }

                // Enviar respuesta al cliente
                http_response_code($response->responseCode);
                echo json_encode([
                    'error' => $response->error,
                    'message' => $response->message,
                ]);
                exit;
            }
            break;

        case 'RenderAuthForm':
            if ($requestMethod === 'GET') {
                // Renderizar la página del formulario de autenticación
                // $controller->renderAuthForm();
                exit;
            }
            break;

        case 'Register':
            // Otros métodos como Register pueden ser implementados aquí
            break;

        // * VERSION NUEVA
        case 'Authenticate':
            if ($requestMethod === 'POST') {
                session_start(); // Asegúrate de iniciar la sesión

                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                if (empty($_SESSION['clienteUsuarioID'])) {
                    http_response_code(HTTP_BAD_REQUEST);
                    echo json_encode([
                        'error' => true,
                        'message' => 'ClienteID no está configurado en la sesión.',
                    ]);
                    exit;
                }

                $clienteUsuarioID = $_SESSION['clienteUsuarioID'];
                $code = $data['code'] ?? '';

                if (empty($code)) {
                    http_response_code(HTTP_BAD_REQUEST);
                    echo json_encode([
                        'error' => true,
                        'message' => 'El código de autenticación es requerido.',
                    ]);
                    exit;
                }

                // Llamar al método authenticate del controlador
                $controller->authenticate($clienteUsuarioID, $code);
                exit;
            }
            break;

        case 'GetUserClientData':
            if ($requestMethod === 'GET') {
                session_start(); // Asegúrate de iniciar la sesión

                if (empty($_SESSION['cliente'])) {
                    http_response_code(HTTP_BAD_REQUEST);
                    echo json_encode([
                        'error' => true,
                        'message' => 'ClienteID no está configurado en la sesión.',
                    ]);
                    exit;
                }

                $cliente = $_SESSION['cliente'];

                // Llamar al método getUserClientData del controlador
                $controller->getUserClientData($cliente);
                exit;
            }
            break;

        // case 'GetUserClientData':
        //     if ($requestMethod === 'GET') {
        //         session_start(); // Asegúrate de iniciar la sesión

        //         if (empty($_SESSION['cliente'])) {
        //             http_response_code(HTTP_BAD_REQUEST);
        //             echo json_encode([
        //                 'error' => true,
        //                 'message' => 'ClienteID no está configurado en la sesión.',
        //             ]);
        //             exit;
        //         }

        //         $cliente = $_SESSION['cliente'];

        //         // Llamar al método getUserClientData del controlador
        //         $controller->getUserClientData($cliente);
        //         exit;
        //     }
        //     break;

        case 'GetUserClientAccounts':
            if ($requestMethod === 'POST') {
                session_start(); // Asegúrate de iniciar la sesión

                if (empty($_SESSION['cliente'])) {
                    http_response_code(HTTP_BAD_REQUEST);
                    echo json_encode([
                        'error' => true,
                        'message' => 'ClienteID no está configurado en la sesión.',
                    ]);
                    exit;
                }

                $cliente = $_SESSION['cliente'];

                // Llamar al método getUserClientAccounts del controlador
                $controller->getUserClientAccounts($cliente);
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
