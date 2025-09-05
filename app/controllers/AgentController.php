<?php

namespace app\controllers;

require_once __DIR__ . '/BaseController.php';

class AgentController extends BaseController
{
    public function getDataAgent($cliente, $plantaID)
    {
        // Construir los datos para la solicitud
        $data = [
            'Cliente' => $cliente,
            'PlantaID' => $plantaID,
        ];

        // Llamar al endpoint Api/B2B/GetDataAgent
        $response = $this->callApi('get-data-agent', $data);
        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener los datos del agente')->showResponse();
        }

        // Enviar los datos al cliente
        $this->setResponse(false, HTTP_OK, 'Datos del agente obtenidos correctamente', $decodedResponse['data'] ?? [])->showResponse();
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
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Deshabilitar la verificación SSL para entornos locales
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);     // Deshabilitar la verificación del nombre del host
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);  // Seguir redirecciones
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; PHP cURL)'); // Opcional, mejora compatibilidad

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
