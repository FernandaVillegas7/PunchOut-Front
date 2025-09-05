<?php
// TODO: AGREGAR DROPDOWN PARA PODER ELEGIR MI DIRECCION DE ENTREGA
namespace app\controllers;

require_once __DIR__ . '/BaseController.php';

class FormsController extends BaseController
{
    public function crearFormularioCliente(array $data)
    {
        session_start();
        $clienteUsuarioID = $_SESSION['clienteUsuarioID'] ?? null;
        $cliente = $_SESSION['cliente'] ?? null;

        // Validaciones
        if (!$clienteUsuarioID) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El clienteUsuarioID no es válido')->showResponse();
        }
        if (!$cliente) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El cliente no es válido')->showResponse();
        }
        if (empty($data['listaSelectFormularioClienteID'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El listaSelectFormularioClienteID es requerido')->showResponse();
        }
        if (empty($data['mensaje'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El mensaje es requerido')->showResponse();
        }

        // Construir el array de datos para enviar al endpoint externo
        $payload = [
            'ClienteUsuarioID' => $clienteUsuarioID,
            'Cliente' => $cliente,
            'ListaSelectFormularioClienteID' => $data['listaSelectFormularioClienteID'],
            'Mensaje' => $data['mensaje'],
        ];

        // Llamar a la API externa con POST
        $response = $this->callApiPost('crear-formulario-cliente', $payload);
        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al enviar el formulario')->showResponse();
        }

        echo json_encode([
            'error' => false,
            'message' => 'Formulario enviado correctamente',
            'data' => $decodedResponse,
        ]);
        exit;
    }

    public function crearFormularioSolicitudAcceso(array $data)
    {

        if (empty($data['nombreEmpresa'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El mensaje es requerido')->showResponse();
        }

        if (empty($data['nombreSolicita'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El mensaje es requerido')->showResponse();
        }

        if (empty($data['correoElectronico'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El mensaje es requerido')->showResponse();
        }

        if (empty($data['numeroTelefono'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El mensaje es requerido')->showResponse();
        }

        if (empty($data['mensaje'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'El mensaje es requerido')->showResponse();
        }

        // Construir el array de datos para enviar al endpoint externo
        $payload = [
            'NombreEmpresa' => $data['nombreEmpresa'],
            'NombreSolicita' => $data['nombreSolicita'],
            'CorreoElectronico' => $data['correoElectronico'],
            'NumeroTelefono' => $data['numeroTelefono'],
            'Mensaje' => $data['mensaje'],
        ];

        // Llamar a la API externa con POST
        $response = $this->callApiPost('crear-solicitud-acceso', $payload);
        $decodedResponse = json_decode($response, true);

        $isError = $decodedResponse['isError'] ?? $decodedResponse['IsError'] ?? false;
        if ($isError) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al enviar el formulario')->showResponse();
        }

        echo json_encode([
            'error' => false,
            'message' => 'Formulario enviado correctamente',
            'data' => $decodedResponse,
        ]);
        exit;
    }

    // MÉTODO NUEVO: POST
    private function callApiPost(string $endpoint, array $data): mixed
    {
        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        $url = $routes[$endpoint] ?? '';

        if (empty($url)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, "La URL para el endpoint '$endpoint' no está configurada")->showResponse();
        }
        if (empty($apiKey)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, "La clave API 'X-API-KEY' no está configurada")->showResponse();
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-KEY: ' . $apiKey,
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Deshabilita la verificación SSL para entornos locales
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);     // Deshabilita la verificación del nombre del host
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);  // Seguir redirecciones
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; PHP cURL)'); // Opcional

        $response = curl_exec($ch);

        if (curl_errno($ch)) {
            $errorMessage = curl_error($ch);
            curl_close($ch);
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, "Error cURL: $errorMessage")->showResponse();
        }

        curl_close($ch);
        return $response;
    }
}
