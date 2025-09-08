<?php

namespace app\controllers;

require_once __DIR__ . '/../config/callApi.php';
require_once __DIR__ . '/BaseController.php';

class B2BController extends BaseController
{
    public function getExirosProducts(array $data)
    {
        // Ensure session is started and aligned with provided SessionID if any
        if (session_status() !== PHP_SESSION_ACTIVE) {
            @session_start();
        }

        // If SessionID not present in session, attempt to resume using query param
        if (empty($_SESSION['SessionID'])) {
            $sid = $_GET['SessionID'] ?? null;
            if (is_string($sid) && $sid !== '') {
                // Switch to provided session id
                @session_write_close();
                @session_id($sid);
                @session_start();
                if (empty($_SESSION['SessionID'])) {
                    // Guarantee key presence for downstream checks
                    $_SESSION['SessionID'] = session_id();
                }
            }
        }

        // Final guard
        //TODO: DESACTIVAR PARA DESARROLLO
        // if (empty($_SESSION['SessionID'])) {
        //     $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        // }

        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        // Clean payload: remove empty-string/null filters but keep zero values
        $payload = array_filter($data, function ($v) {
            return !($v === '' || $v === null);
        });
        try {
            $response = callApi('exiros-search-products', $payload, [
                'routes' => $routes,
                'apiKey' => $apiKey
            ]);
        } catch (\Exception $e) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, $e->getMessage())->showResponse();
        }

        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener los productos')->showResponse();
        }

        // Devolver los productos
        return [
            'products' => $decodedResponse['products'] ?? [],
            'searchCount' => $decodedResponse['total'] ?? 0
        ];
    }
}
