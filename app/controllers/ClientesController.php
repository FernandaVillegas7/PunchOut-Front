<?php

namespace app\controllers;

use Medoo\Medoo;
use app\config\BDConexion;
use app\models\ClienteModel;
use UnexpectedValueException;

class ClientesController extends BaseController
{
    private Medoo $db;

    public function __construct()
    {
        $this->db = BDConexion::getInstance()->getDatabase();
    }

    public function createCliente(ClienteModel $cliente)
    {
        $this->db->pdo->beginTransaction();

        try {

            $insertResult = $this->db->insert(
                "clientes",
                [
                    "Cliente"=> $cliente->cliente,
                    "Telefono"=> $cliente->telefono,
                    "Nombre" => $cliente->nombre,
                    "Correo"=> $cliente->correo,
                    "UserPass"=> password_hash($cliente->clientePass, PASSWORD_DEFAULT)
                ]
            );

            if($insertResult->rowCount() == 0) {
                throw new UnexpectedValueException("Ocurrio un error al crear el registro");
            }

            $this->db->pdo->commit();

            return parent::setResponse(
                code:HTTP_CREATED,
                message:"Registro creado correctamente");

        } catch (\Throwable $th) {
            
            $this->db->pdo->rollBack();

            return parent::setResponse(
                error: true,
                code: HTTP_BAD_REQUEST,
                message:"". $th->getMessage());
        }
    }

    public function loginCliente(string $correo, string $usrPass)
    {
        $usuario = $this->db->get(
            "clientes",
            [
                "ClienteID",
                "Cliente",
                "Nombre",
                "Telefono",
                "Correo",
                "UserPass",
                "IsActive",
            ],
            [
                "Cliente" => $correo,
            ]
        );

        if($usuario && password_verify($usrPass, $usuario['UserPass'])) {

            if($usuario['IsActive'] == 0) {
                return parent::setResponse(
                    error: true,
                    code: HTTP_UNAUTHORIZED,
                    message:'Usuario inactivo, por favor contacte a soporte tecnico');
            }

            $response['Correo'] = $usuario['Correo'];
            $response['Cliente'] = $usuario['Cliente'];
            $response['Nombre'] = $usuario['Nombre'];
            $response['ClienteID'] = $usuario['ClienteID'];
            $response['Telefono'] = $usuario['Telefono'];
            $response['Activo'] = $usuario['IsActive'];

            return parent::setResponse(
                error: false,
                code: HTTP_OK,
                message: 'Inicio de session correcto',
                obj: $response);
        }

        return parent::setResponse(
            error: true,
            code:HTTP_UNAUTHORIZED,
            message:'Codigo o Password incorrectos');

    }

}



