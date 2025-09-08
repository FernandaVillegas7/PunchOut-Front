<?php

function callApi(string $endpoint, array $data, array $options = [])
{
    // $options debe incluir 'routes' y 'apiKey'
    $routes = $options['routes'] ?? [];
    $apiKey = $options['apiKey'] ?? '';

    $url = $routes[$endpoint] ?? '';
    if (empty($url)) {
        throw new Exception("La URL para el endpoint '$endpoint' no está configurada");
    }
    if (empty($apiKey)) {
        throw new Exception("La clave API 'X-API-KEY' no está configurada");
    }

    $queryString = http_build_query($data);
    $url = $url . '?' . $queryString;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HTTPGET, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-KEY: ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; PHP cURL)');

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        $errorMessage = curl_error($ch);
        curl_close($ch);
        throw new Exception("Error cURL: $errorMessage");
    }

    curl_close($ch);
    return $response;
}
