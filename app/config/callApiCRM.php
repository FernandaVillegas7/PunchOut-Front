<?php

function callApiCRM(string $endpoint, array $data, array $options = [])
{
    echo "[DEBUG] Iniciando callApi() para: $endpoint\n"; flush();

    $routes = $options['routes'] ?? [];
    $apiKey = $options['apiKey'] ?? '';

    $url = $routes[$endpoint] ?? '';
    if (empty($url)) {
        echo "[ERROR] URL vacía para '$endpoint'\n"; flush();
        throw new Exception("La URL para el endpoint '$endpoint' no está configurada");
    }

    if (empty($apiKey)) {
        echo "[ERROR] API key vacía\n"; flush();
        throw new Exception("La clave API 'X-API-KEY' no está configurada");
    }

    // ✨ Aquí preparamos el JSON plano como en Postman
    $jsonPayload = json_encode($data, JSON_UNESCAPED_UNICODE);
    echo "[PAYLOAD]\n$jsonPayload\n"; flush();

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($jsonPayload),
        'X-API-KEY: ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; PHP cURL)');

    echo "[INFO] Ejecutando cURL...\n"; flush();
    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        $errorMessage = curl_error($ch);
        echo "[cURL ERROR] $errorMessage\n"; flush();
        curl_close($ch);
        throw new Exception("Error cURL: $errorMessage");
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo "[HTTP $httpCode] Respuesta:\n$response\n"; flush();

    return $response;
}

