<?php

function callApiCRM(string $endpoint, array $data, array $options = [])
{
    $routes = $options['routes'] ?? [];
    $apiKey = $options['apiKey'] ?? '';

    $url = $routes[$endpoint] ?? '';
    if (empty($url)) {
        throw new Exception("La URL para el endpoint '$endpoint' no está configurada");
    }

    if (empty($apiKey)) {
        throw new Exception("La clave API 'X-API-KEY' no está configurada");
    }

    // ✨ Payload en JSON plano
    $jsonPayload = json_encode($data, JSON_UNESCAPED_UNICODE);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $jsonPayload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: ' . strlen($jsonPayload),
            'X-API-KEY: ' . $apiKey,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; PHP cURL)',
        CURLOPT_TIMEOUT        => 30,
    ]);

    $response = curl_exec($ch);

    if ($response === false) {
        $errorMessage = curl_error($ch);
        curl_close($ch);
        throw new Exception("Error cURL: $errorMessage");
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // ⚡ Validar respuesta HTTP
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new Exception("Error HTTP $httpCode al llamar '$endpoint'. Respuesta: $response");
    }

    return $response;
}
