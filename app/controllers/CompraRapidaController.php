<?php

namespace app\controllers;

require_once __DIR__ . '/BaseController.php';

class CompraRapidaController extends BaseController
{
    public function compraRapida(array $items)
    {
        session_start();
        // Contruimos el json
        $jsonEnviar = [
            'UsuarioID' => $_SESSION['usuarioID'] ?? null,
            'ClienteUsuarioID' => $_SESSION['clienteUsuarioID'],
            'AgenteID' => $_SESSION['agenteID'],
            'IntelID' => $_SESSION['intelID'] ?? null,
            'ListaPrecio' => $_SESSION['listaPreciosEsp'],
            'SucursalID' => $_SESSION['sucursalEmpresa'],
            'ItemsCotizacionXML' => []
        ];

        foreach ($items as $item) {
            $jsonEnviar['ItemsCotizacionXML'][] = [
                'Partida' => $item['partida'],
                'Cantidad' => $item['cantidad'],
                'CodigoArticulo' => $item['articulo'],
            ];
        }

        // var_dump($jsonEnviar);

        $response = $this->callApi('carrito-rapido', $jsonEnviar);
        $decodedResponse = json_decode($response, true);

        if (!empty($decodedResponse['isError'])) {
            $this->setResponse(
                true,
                HTTP_BAD_REQUEST,
                $decodedResponse['message'] ?? 'Error en API',
                $decodedResponse['data'] ?? null
            )->showResponse();
        }

        $this->setResponse(
            false,
            HTTP_OK,
            $decodedResponse['message'] ?? 'Cotización creada correctamente.',
            $decodedResponse['data'] ?? null
        )->showResponse();
    }


}
