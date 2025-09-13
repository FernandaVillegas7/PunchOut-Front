<?php

function callApi(string $endpoint, array $data, array $options = [])
{
 
    // $options debe incluir 'routes' y 'apiKey'
    $routes = $options['routes'] ?? [];
    $apiKey = $options['apiKey'] ?? '';
    $method = strtoupper($options['method'] ?? 'GET'); // por defecto GET

    $url = $routes[$endpoint] ?? '';
    if (empty($url)) {
        throw new Exception("La URL para el endpoint '$endpoint' no está configurada");
    }
    if (empty($apiKey)) {
        throw new Exception("La clave API 'X-API-KEY' no está configurada");
    }

    $ch = curl_init();

   if ($method === 'POST') {
    $payload = json_encode($data);  

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-KEY: ' . $apiKey,
    ]);
        } else {
        //  GET por defecto
        $queryString = http_build_query($data);
        $url = $url . (strpos($url, '?') === false ? '?' : '&') . $queryString;

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPGET, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-KEY: ' . $apiKey,
        ]);
    }

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
