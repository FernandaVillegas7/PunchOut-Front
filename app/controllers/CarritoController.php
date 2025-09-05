<?php

namespace app\controllers;

require_once __DIR__ . '/BaseController.php';

class CarritoController extends BaseController
{

    public function Carrito()
    {

        // if ($_SESSION['Username'] && $_SESSION['HOOK_URL']) {
        //     session_start();
        // } else {
        //     session_start();
        //     $clienteUsuarioID = $_SESSION['clienteUsuarioID'] ?? null;
        //     $listaPreciosEsp = $_SESSION['listaPreciosEsp'] ?? null;
        //     $sucursalID = $_SESSION['sucursalEmpresa'] ?? null;
        //     $plantaSeleccionadaID = $_SESSION['plantaSeleccionadaID'] ?? null;

        //     if (
        //         !isset($clienteUsuarioID)
        //         || !isset($listaPreciosEsp)
        //         || !isset($sucursalID)
        //         || !isset($plantaSeleccionadaID)
        //     ) {
        //         $this->setResponse(true, HTTP_BAD_REQUEST, '')->showResponse();
        //     }

        //     $data = [
        //         'UsuarioID' => $_SESSION['usuarioID'],
        //         'ClienteUsuarioID' => $_SESSION['clienteUsuarioID'],
        //         // 'AgenteID' = $_SESSION['clienteUsuarioID'],
        //         'AgenteID' => $_SESSION['agenteID'],
        //         'IntelID' => $_SESSION['intelID'],
        //         'ListaPrecio' => $_SESSION['listaPreciosEsp'],
        //         'Sucursal' => $_SESSION['sucursalEmpresa'],
        //         'PlantaID' => $_SESSION['plantaSeleccionadaID'],
        //     ];

        //     // Llamar al endpoint user-client-accounts
        //     $response = $this->callApi('create-carrito', $data);
        //     $decodedResponse = json_decode($response, true);
        //     $_SESSION['carritoID'] = $decodedResponse['data']['carritoID'];

        //     if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
        //         $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener el ID del carrito')->showResponse();
        //     }

        //     // Enviar los datos al cliente
        //     $this->setResponse(false, HTTP_OK, 'Carrito Obtenido', $decodedResponse['data'] ?? [])->showResponse();
        // }



        // if ($_SESSION['Username'] && $_SESSION['HOOK_URL']) {
        //     session_start();
        // } else {
        //     session_start();
        //     $clienteUsuarioID = $_SESSION['clienteUsuarioID'] ?? null;
        //     $listaPreciosEsp = $_SESSION['listaPreciosEsp'] ?? null;
        //     $sucursalID = $_SESSION['sucursalEmpresa'] ?? null;
        //     $plantaSeleccionadaID = $_SESSION['plantaSeleccionadaID'] ?? null;

        //     if (
        //         !isset($clienteUsuarioID)
        //         || !isset($listaPreciosEsp)
        //         || !isset($sucursalID)
        //         || !isset($plantaSeleccionadaID)
        //     ) {
        //         $this->setResponse(true, HTTP_BAD_REQUEST, '')->showResponse();
        //     }

        //     $data = [
        //         'UsuarioID' => $_SESSION['usuarioID'],
        //         'ClienteUsuarioID' => $_SESSION['clienteUsuarioID'],
        //         // 'AgenteID' = $_SESSION['clienteUsuarioID'],
        //         'AgenteID' => $_SESSION['agenteID'],
        //         'IntelID' => $_SESSION['intelID'],
        //         'ListaPrecio' => $_SESSION['listaPreciosEsp'],
        //         'Sucursal' => $_SESSION['sucursalEmpresa'],
        //         'PlantaID' => $_SESSION['plantaSeleccionadaID'],
        //     ];

        //     // Llamar al endpoint user-client-accounts
        //     $response = $this->callApi('create-carrito', $data);
        //     $decodedResponse = json_decode($response, true);
        //     $_SESSION['carritoID'] = $decodedResponse['data']['carritoID'];

        //     if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
        //         $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener el ID del carrito')->showResponse();
        //     }

        //     // Enviar los datos al cliente
        //     $this->setResponse(false, HTTP_OK, 'Carrito Obtenido', $decodedResponse['data'] ?? [])->showResponse();
        // }
    }

    public function insertItemCarrito(array $data)
    {
        $payload = [
            'CarritoID' => $data['carritoID'] ?? '',
            'Cantidad' => $data['totalProducto'] ?? '',
            'CodigoArticulo' => $data['producto'] ?? ''
        ];

        $response = $this->callApi('insert-item-carrito-estesi', $payload);
        $decodedResponse = json_decode($response, true);

        if ($decodedResponse['isError'] === true) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al insertar el item en el carrito')->showResponse();
        }

        // Enviar los datos al cliente
        $this->setResponse(false, HTTP_OK, 'Item insertado en el carrito', $decodedResponse['data'] ?? [])->showResponse();
    }

    public function getCarrito()
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        $carritoID = $_SESSION['carritoID'] ?? null;
        $plantaID = $_SESSION['plantaSeleccionadaID'] ?? null;

        if (empty($carritoID) || empty($plantaID)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'CarritoID o PlantaID no disponibles en sesión')->showResponse();
        }

        $data = [
            'CarritoID' => $carritoID,
            'PlantaID' => $plantaID,
        ];

        $response = $this->callApi('get-carrito', $data, 'GET');
        $decodedResponse = json_decode($response, true);

        if (!empty($decodedResponse['isError'])) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener el carrito')->showResponse();
        }

        $this->setResponse(false, HTTP_OK, 'Carrito obtenido', $decodedResponse['data'] ?? [])->showResponse();
    }

    public function updateCantidadItemCarrito(array $data)
    {
        $payload = [
            'ItemCarritoID' => $data['ItemCarritoID'] ?? '',
            'Cantidad' => $data['Cantidad'] ?? ''
        ];

        $response = $this->callApi('update-cantidad-item-carrito', $payload, 'PUT');
        $decodedResponse = json_decode($response, true);

        if (!is_array($decodedResponse)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'Respuesta inválida del servicio externo')->showResponse();
        }

        if (isset($decodedResponse['isError']) && $decodedResponse['isError'] === true) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al actualizar la cantidad del item')->showResponse();
        }

        $this->setResponse(
            false,
            HTTP_OK,
            $decodedResponse['message'] ?? 'Cantidad actualizada correctamente.',
            $decodedResponse['data'] ?? []
        )->showResponse();
    }

    public function eliminarItemCarrito(array $data)
    {
        $payload = [
            'ItemCarritoID' => $data['ItemCarritoID'] ?? ''
        ];

        $response = $this->callApi('eliminar-item-carrito', $payload, 'PUT');
        $decodedResponse = json_decode($response, true);

        if (!is_array($decodedResponse)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'Respuesta inválida del servicio externo')->showResponse();
        }

        if (isset($decodedResponse['isError']) && $decodedResponse['isError'] === true) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al eliminar el item del carrito')->showResponse();
        }

        $this->setResponse(
            false,
            HTTP_OK,
            $decodedResponse['message'] ?? 'Item eliminado correctamente.',
            $decodedResponse['data'] ?? []
        )->showResponse();
    }


    private function callApi(string $endpoint, array $data = [], string $method = 'POST'): mixed
    {
        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        $url = $routes[$endpoint] ?? '';

        if (empty($url)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, "La URL para el endpoint '$endpoint' no está configurada")->showResponse();
        }

        if (empty($apiKey)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, "La clave API 'X-API-KEY' no está configurada")->showResponse();
        }

        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'X-API-KEY: ' . $apiKey,
        ];

        $method = strtolower($method);

        if ($method === 'get') {
            $url .= '?' . http_build_query($data);
            curl_setopt($ch, CURLOPT_HTTPGET, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        } elseif ($method === 'put') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        } else {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (curl_errno($ch)) {
            $errorMessage = curl_error($ch);
            curl_close($ch);
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, "Error cURL: $errorMessage")->showResponse();
        }

        curl_close($ch);

        if ($httpCode !== 200) {
            $this->setResponse(true, HTTP_BAD_REQUEST, "Error al conectar con el endpoint. Código HTTP: $httpCode")->showResponse();
        }

        return $response;
    }
}





// namespace app\controllers;

// use Medoo\Medoo;
// use app\config\BDConexion;
// use app\models\CarritoModel;
// use UnexpectedValueException;

// class CarritoController extends BaseController
// {
//     private Medoo $db;

//     public function __construct()
//     {
//         $this->db = BDConexion::getInstance()->getDatabase();
//     }

//     public function getListItems(string $sessionSeed)
//     {
//         $data = $this->db->select(
//             'carrito',
//             [

//                 'Precio',
//                 'Cliente',
//                 'Articulo',
//                 'Cantidad',
//                 'CarritoID',
//                 'FechaRegistro',
//                 'CodigoProducto',
//                 'NombreProducto',
//             ],
//             [
//                 'SessionSeed' => $sessionSeed,
//                 'Procesado' => 0
//             ]
//         );

//         return parent::setResponse(
//             code: HTTP_OK,
//             obj: $data ?? []
//         );
//     }

//     public function updateItemQuantity(int $carritoID, int $cantidad)
//     {
//         $this->db->pdo->beginTransaction();

//         try {

//             $updateResult = $this->db->update(
//                 'carrito',
//                 ['Cantidad' => $cantidad],
//                 ['CarritoID' => $carritoID]
//             );

//             if ($updateResult->rowCount() == 0) {
//                 throw new UnexpectedValueException(RECORD_ERROR);
//             }

//             $this->db->pdo->commit();

//             return parent::setResponse(
//                 code: HTTP_ACEPTED,
//                 message: "Registro eliminado correctamente"
//             );
//         } catch (\Throwable $th) {

//             $this->db->pdo->rollBack();

//             return parent::setResponse(
//                 error: true,
//                 code: HTTP_BAD_REQUEST,
//                 message: "" . $th->getMessage()
//             );
//         }
//     }

//     public function dropItemCarrito(int $carritoID)
//     {
//         $this->db->pdo->beginTransaction();

//         try {

//             $delteReult = $this->db->delete('carrito', ['CarritoID' => $carritoID]);

//             if ($delteReult->rowCount() == 0) {
//                 throw new UnexpectedValueException("Ocurrio un error al crear el registro");
//             }

//             $this->db->pdo->commit();

//             return parent::setResponse(
//                 code: HTTP_ACEPTED,
//                 message: "Registro eliminado correctamente"
//             );
//         } catch (\Throwable $th) {

//             $this->db->pdo->rollBack();

//             return parent::setResponse(
//                 error: true,
//                 code: HTTP_BAD_REQUEST,
//                 message: "" . $th->getMessage()
//             );
//         }
//     }

//     public function getTotalArticulos(string $sessionSeed)
//     {
//         $data = $this->db->count("carrito", ['SessionSeed' => $sessionSeed]);
//         return parent::setResponse(
//             error: false,
//             code: HTTP_OK,
//             obj: $data
//         );
//     }

//     public function setBulkItemsCar(array $itemList)
//     {
//         $this->db->pdo->beginTransaction();

//         try {

//             $data = array_map(function ($carrito) {
//                 return [
//                     "Precio" => $carrito['precio'],
//                     "Cliente" => $carrito['cliente'],
//                     "Articulo" => $carrito['articulo'],
//                     "Cantidad" => $carrito['cantidad'],
//                     "SessionSeed" => $carrito['sessionSeed'],
//                     "NombreProducto" => $carrito['nombreProducto'],
//                     "CodigoProducto" => $carrito['codigoProducto']
//                 ];
//             }, $itemList);

//             $insertResult = $this->db->insert(
//                 'carrito',
//                 $data
//             );

//             if ($insertResult->rowCount() == 0) {
//                 throw new UnexpectedValueException(RECORD_ERROR);
//             }

//             $this->db->pdo->commit();

//             return parent::setResponse(
//                 code: HTTP_CREATED,
//                 message: "Los articulos se ingresaron correctamente"
//             );
//         } catch (\Throwable $th) {
//             $this->db->pdo->rollBack();

//             return parent::setResponse(
//                 error: true,
//                 code: HTTP_BAD_REQUEST,
//                 message: $th->getMessage(),
//                 obj: $this->db->error
//             );
//         }
//     }

//     public function setArticuloCarrito(CarritoModel $carrito)
//     {
//         $this->db->pdo->beginTransaction();

//         try {

//             if ($this->itemExist($carrito->articulo, $carrito->sessionSeed)) {
//                 $data = $this->itemUpdateQuatity(
//                     $carrito->articulo,
//                     $carrito->sessionSeed,
//                     $carrito->cantidad
//                 );

//                 if ($data == 0) {
//                     throw new UnexpectedValueException(RECORD_ERROR);
//                 }
//             } else {

//                 $insertResult = $this->db->insert(
//                     "carrito",
//                     [
//                         "Precio" => $carrito->precio,
//                         "Cliente" => $carrito->cliente,
//                         "Articulo" => $carrito->articulo,
//                         "Cantidad" => $carrito->cantidad,
//                         "SessionSeed" => $carrito->sessionSeed,
//                         "NombreProducto" => $carrito->nombreProducto,
//                         "CodigoProducto" => $carrito->codigoProducto
//                     ]
//                 );

//                 if ($insertResult->rowCount() == 0) {
//                     throw new UnexpectedValueException(RECORD_ERROR);
//                 }
//             }

//             $this->db->pdo->commit();

//             return parent::setResponse(
//                 code: HTTP_CREATED,
//                 message: "El articulo se a agregado correctamente"
//             );
//         } catch (\Throwable $th) {

//             $this->db->pdo->rollBack();

//             return parent::setResponse(
//                 error: true,
//                 code: HTTP_BAD_REQUEST,
//                 message: "" . $th->getMessage()
//             );
//         }
//     }

//     private function itemUpdateQuatity(string $articulo, string $sessionSeed, int $cantidad)
//     {
//         $quantity = $this->db->get(
//             'carrito',
//             'Cantidad',
//             [
//                 'Articulo' => $articulo,
//                 'SessionSeed' => $sessionSeed
//             ]
//         );

//         $nuevaCantidad = $quantity + $cantidad;

//         $updateResult = $this->db->update(
//             'carrito',
//             ['Cantidad' => $nuevaCantidad],
//             [
//                 'Articulo' => $articulo,
//                 'SessionSeed' => $sessionSeed
//             ]
//         );

//         return $updateResult->rowCount();
//     }

//     private function itemExist(string $articulo, string $sessionSeed)
//     {
//         return $this->db->has('carrito', ['Articulo' => $articulo, 'SessionSeed' => $sessionSeed]);
//     }
// }
