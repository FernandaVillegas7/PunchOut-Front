<?php

use app\models\ClienteModel;
use app\models\post\PostLoginModel;
use app\controllers\ClientesController;

use const app\controllers\HTTP_BAD_REQUEST;

$controll = new ClientesController();

try{

    switch ($requestMethod) {
        case 'POST':

            if($method === 'Create'){
                $data = $mapper->mapObjectFromString($input, new ClienteModel());
                $response = $controll->createCliente($data);
                $response->showResponse();
            }
    
            if($method === 'Login'){
                $data = $mapper->mapObjectFromString($input, new PostLoginModel());
                $response = $controll->loginCliente($data->usuario, $data->userPass);

                if(!$response->error){
                    $_SESSION['Activo'] = $response->objResponse['Activo'];
                    $_SESSION['Correo'] = $response->objResponse['Correo'];
                    $_SESSION['Nombre'] = $response->objResponse['Nombre'];
                    $_SESSION['Cliente'] = $response->objResponse['Cliente'];
                    $_SESSION['ClienteID'] = $response->objResponse['ClienteID'];
                    $_SESSION['Telefono'] = $response->objResponse['Telefono'];
                    $_SESSION['SessionSeed'] = md5(date('ymdhis').$response->objResponse['Cliente']);
                }

                http_response_code($response->responseCode);

                echo json_encode(array(
                    'error' => $response->error,
                    'message' => $response->message
                ));

                exit;
            }

            break;

        case 'GET':
        case 'PUT':
        case 'DELETE':

            throw new UnexpectedValueException("Metodo desconocido");
            break;
        default:
            # code...
            break;
    }


}catch(\Exception $th){

    http_response_code(HTTP_BAD_REQUEST);
    echo json_encode(array(
        'error' => true,
        'message' => $th->getMessage(),
        'obj' => $th->getTrace()
    ));

}
