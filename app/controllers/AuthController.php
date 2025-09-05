<?php

namespace app\controllers;

require_once __DIR__ . '/BaseController.php';

class AuthController extends BaseController
{
    public function login($usuario, $userPass)
    {
        if (empty($usuario) || empty($userPass)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'Usuario y contraseña son requeridos')->showResponse();
        }

        $data = [
            'username' => $usuario,
            'password' => $userPass,
        ];

        $response = $this->callApi('login', $data); // Llamar al método callApi

        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, $decodedResponse['errorMessage'] ?? 'Credenciales inválidas')->showResponse();
        }

        if (isset($decodedResponse['success']) && !$decodedResponse['success']) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, $decodedResponse['errorMessage'] ?? 'Credenciales inválidas')->showResponse();
        }

        if (isset($decodedResponse['data']['clienteUsuarioID'])) {
            session_start();
            $_SESSION['clienteUsuarioID'] = $decodedResponse['data']['clienteUsuarioID']; // Almacenar clienteUsuarioID en la sesión
            $_SESSION['telefono'] = $decodedResponse['data']['telefono']; // Almacenar teléfono en la sesión

            $this->setResponse(false, HTTP_OK, 'Login exitoso', [
                'clienteUsuarioID' => $_SESSION['clienteUsuarioID'], // Ahora clienteUsuarioID está configurado
                'telefono' => $_SESSION['telefono'],
            ])->showResponse();
        }

        $this->setResponse(true, HTTP_UNAUTHORIZED, 'Credenciales inválidas')->showResponse();
    }

    public function authenticate($clienteUsuarioID, $code)
    {
        if (empty($clienteUsuarioID) || empty($code)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'ClienteUsuarioID y código son requeridos')->showResponse();
        }

        $data = [
            'clienteUsuarioID' => $clienteUsuarioID,
            'code' => $code,
        ];

        $response = $this->callApi('authenticate', $data); // Llamar al método callApi
        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error en la autenticación')->showResponse();
        }

        if (isset($decodedResponse['data']['cliente'])) {
            if (session_status() !== PHP_SESSION_ACTIVE) {
                session_start();
            }
            $_SESSION['cliente'] = $decodedResponse['data']['cliente'];
            // Solo realizar la consulta si tenemos un dato cliente en la sesión
            if (!empty($_SESSION['cliente'])) {
                $clientData = $this->getClientData($_SESSION['cliente']);
                if ($clientData) {
                    setcookie('clienteData', json_encode($clientData), time() + (86400 * 7), "/");
                }
            }

            $this->setResponse(false, HTTP_OK, 'Autenticación exitosa', [
                'cliente' => $_SESSION['cliente'],
            ])->showResponse();
        }

        $this->setResponse(true, HTTP_BAD_REQUEST, 'Respuesta inesperada de la API')->showResponse();
    }

    private function getClientData($clienteUsuarioID)
    {
        $data = [
            'Cliente' => $clienteUsuarioID,
        ];

        $response = $this->callApi('user-client-data', $data); // Llamar al endpoint para obtener datos del cliente
        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            return null; // Manejar error si ocurre
        }

        return $decodedResponse['data'] ?? null;
    }

    public function getUserClientData($cliente)
    {
        if (empty($cliente)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'Cliente es requerido')->showResponse();
        }

        $data = [
            'Cliente' => $cliente,
        ];

        // Llamar al endpoint user-client-data
        $response = $this->callApi('user-client-data', $data);
        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener los datos del cliente')->showResponse();
        }

        // Enviar los datos al cliente
        $this->setResponse(false, HTTP_OK, 'Datos del cliente obtenidos correctamente', $decodedResponse['data'] ?? [])->showResponse();
    }

    public function getUserClientAccounts($cliente)
    {
        if (empty($cliente)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'Cliente es requerido')->showResponse();
        }

        $data = [
            'Cliente' => $cliente,
        ];

        // Llamar al endpoint user-client-accounts
        $response = $this->callApi('user-client-accounts', $data);
        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener las cuentas del cliente')->showResponse();
        }

        // Enviar los datos al cliente
        $this->setResponse(false, HTTP_OK, 'Cuentas del cliente obtenidas correctamente', $decodedResponse['data'] ?? [])->showResponse();
    }

    private function callApi(string $endpoint, array $data): mixed
    {
        $routes = $this->getApiRutes(); // Obtener las rutas de la API desde routes.ini
        $apiKey = $this->getXApiKey(); // Obtener la API Key desde routes.ini

        $url = $routes[$endpoint] ?? ''; // Buscar la URL del endpoint en las rutas

        if (empty($url)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, "La URL para el endpoint '$endpoint' no está configurada")->showResponse();
        }

        if (empty($apiKey)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, "La clave API 'X-API-KEY' no está configurada")->showResponse();
        }

        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-KEY: ' . $apiKey,
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);  // Deshabilitar la verificación SSL para entornos locales
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);     // Deshabilitar la verificación del nombre del host

        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);  // <--- ¡Agrega esto!

        $response = curl_exec($ch);

        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); // Obtener el código de respuesta HTTP
        error_log("Código de respuesta HTTP: $httpCode"); // Registrar el código de respuesta

        if (curl_errno($ch)) {
            $errorMessage = curl_error($ch);
            curl_close($ch);
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, "Error cURL: $errorMessage")->showResponse();
        }

        curl_close($ch);

        if ($httpCode !== 200) { // Si no es 200, la URL no es accesible o hay un error
            $this->setResponse(true, HTTP_BAD_REQUEST, "Error al conectar con el endpoint. Código HTTP: $httpCode")->showResponse();
        }

        return $response;
    }
}
