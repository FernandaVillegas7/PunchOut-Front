<?php

function callApi(string $endpoint, array $data, array $options = [])
{
    // $options debe incluir 'routes' y 'apiKey'
    $routes = $options['routes'] ?? [];
    $apiKey = $options['apiKey'] ?? '';
    $method = strtoupper($options['method'] ?? 'GET'); // GET por defecto para compatibilidad

    $url = $routes[$endpoint] ?? '';
    if (empty($url)) {
        throw new Exception("La URL para el endpoint '$endpoint' no está configurada");
    }
    if (empty($apiKey)) {
        throw new Exception("La clave API 'X-API-KEY' no está configurada");
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; PHP cURL)');

    $headers = [
        'X-API-KEY: ' . $apiKey,
    ];

    if ($method === 'POST') {
        // Enviar JSON en el cuerpo
        $body = json_encode($data, JSON_UNESCAPED_UNICODE);
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    } else {
        // GET con query string (comportamiento previo)
        $queryString = http_build_query($data);
        $finalUrl = $url . (str_contains($url, '?') ? '&' : '?') . $queryString;
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_URL, $finalUrl);
        curl_setopt($ch, CURLOPT_HTTPGET, true);
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        $errorMessage = curl_error($ch);
        curl_close($ch);
        throw new Exception("Error cURL: $errorMessage");
    }

    curl_close($ch);
    return $response;
}
