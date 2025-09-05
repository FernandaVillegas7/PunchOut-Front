<?php

namespace app\controllers;

require_once __DIR__ . '/../config/BDConexion.php';
require_once __DIR__ . '/BaseController.php';

use app\config\BDConexion;

class LogSiteController extends BaseController
{
    public function CrearLogPagina($Valor, $FechaHora, $IP)
    {
        if (empty($Valor) || empty($FechaHora) || empty($IP)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'Todos los campos son requeridos')->showResponse();
        }

        try {
            $db = BDConexion::getInstance()->getDatabase();
            $insertId = $db->insert('LogsPaginas', [
                'Valor' => $Valor,
                'FechaHora' => $FechaHora,
                'IP' => $IP
            ]);

            if ($insertId) {
                $this->setResponse(false, HTTP_CREATED, 'Log creado correctamente', [
                    'LogPaginaID' => $db->id()
                ])->showResponse();
            } else {
                $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, 'No se pudo crear el log')->showResponse();
            }
        } catch (\Exception $e) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, 'Error al insertar log: ' . $e->getMessage())->showResponse();
        }
    }
}
