<?php

namespace app\controllers;

require_once __DIR__ . '/BaseController.php';
// include the callApi helper if available; many environments may have
// slightly different layout or missing file — guard to avoid fatal errors.
$callApiPath = __DIR__ . '/../config/callApi.php';
if (file_exists($callApiPath)) {
    require_once $callApiPath;
} else {
    // try a couple of common alternate locations (case variations / parent folders)
    $alt1 = __DIR__ . '/../../app/config/callApi.php';
    $alt2 = __DIR__ . '/../../config/callApi.php';
    if (file_exists($alt1)) {
        require_once $alt1;
    } elseif (file_exists($alt2)) {
        require_once $alt2;
    } else {
        error_log('ExirosController: callApi.php not found at expected locations: ' . implode(', ', [$callApiPath, $alt1, $alt2]));
        // define a stub to fail loudly when called, avoiding a fatal include error
        if (!function_exists('callApi')) {
            function callApi(string $endpoint, array $data, array $options = [])
            {
                throw new \Exception("callApi helper not found on server; expected callApi.php to be present.");
            }
        }
    }
}

class ExirosController extends BaseController
{
    public function getLoginToken()
    {
        session_start();

        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $isForm = stripos($contentType, 'application/x-www-form-urlencoded') !== false
            || stripos($contentType, 'multipart/form-data') !== false
            || (!empty($_POST) && empty($_POST['cXML']));

        if ($isForm) {
            $hookUrl = $_POST['HOOK_URL'] ?? $_POST['hook_url'] ?? '';
            $username = $_POST['USERNAME'] ?? $_POST['USER'] ?? $_POST['username'] ?? '';
            $password = $_POST['PASSWORD'] ?? $_POST['password'] ?? '';

            $buyerCookie = $_POST['BUYER_COOKIE'] ?? $_POST['buyer_cookie'] ?? session_id();

            // Validate credentials against configuration (routes.ini [OCI])
            try {
                $vendorDir = dirname(__DIR__);
                $baseDir = dirname($vendorDir);
                $iniData = parse_ini_file($baseDir . DIRECTORY_SEPARATOR . 'app/config/routes.ini', true, INI_SCANNER_TYPED);
                $ociUser = $iniData['OCI']['username'] ?? null;
                $ociPass = $iniData['OCI']['password'] ?? null;
            } catch (\Throwable $e) {
                $ociUser = null;
                $ociPass = null;
            }

            // If config exists, enforce it; otherwise allow but warn (development fallback)
            if ($ociUser !== null && $ociPass !== null) {
                $isValid = hash_equals((string)$ociUser, (string)$username) && hash_equals((string)$ociPass, (string)$password);
                if (!$isValid) {
                    return [
                        'error' => true,
                        'code' => defined('HTTP_UNAUTHORIZED') ? HTTP_UNAUTHORIZED : 401,
                        'protocol' => 'OCI',
                        'message' => 'Credenciales OCI inválidas',
                        'data' => [
                            'reason' => 'USERNAME o PASSWORD incorrectos'
                        ]
                    ];
                }
            }

            // Build extrinsics from all POST fields for traceability (excluding sensitive if needed)
            $extrinsics = [];
            foreach ($_POST as $k => $v) {
                // You could mask password here if preferred
                $extrinsics[$k] = is_array($v) ? json_encode($v) : (string)$v;
            }

            session_regenerate_id(true);
            $phpSessionId = session_id();
            $_SESSION['cliente'] = $phpSessionId;
            $_SESSION['SessionID'] = $phpSessionId;
            $_SESSION['BuyerCookie'] = $buyerCookie;
            $_SESSION['BrowserFormPostUrl'] = $hookUrl;
            $_SESSION['Extrinsics'] = $extrinsics;
            $_SESSION['Username'] = $username;
            $_SESSION['Password'] = $password;

            return [
                'error'   => false,
                'code'    => 200,
                'protocol' => 'OCI',
                'message' => 'Login correcto (OCI)',
                'data'    => [
                    'SessionID'          => $phpSessionId,
                    'BrowserFormPostUrl' => $hookUrl,
                    'Extrinsics'         => $extrinsics
                ]
            ];
        }

        // cXML path
        $cxmlRaw = isset($_POST['cXML']) ? $_POST['cXML'] : file_get_contents('php://input');
        if (empty($cxmlRaw)) {
            return [
                'error' => true,
                'code' => defined('HTTP_BAD_REQUEST') ? HTTP_BAD_REQUEST : 400,
                'message' => 'No se recibió cXML en la petición.'
            ];
        }

        // Parsear el cXML
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($cxmlRaw);
        if ($xml === false) {
            return [
                'error' => true,
                'code' => defined('HTTP_BAD_REQUEST') ? HTTP_BAD_REQUEST : 400,
                'message' => 'cXML inválido.'
            ];
        }

        // Extraer datos relevantes
        $header = $xml->Header;
        $from = $header->From->Credential->Identity ?? '';
        $to = $header->To->Credential->Identity ?? '';
        $sender = $header->Sender->Credential->Identity ?? '';
        $sharedSecret = $header->Sender->Credential->SharedSecret ?? '';

        $request = $xml->Request->PunchOutSetupRequest;
        $buyerCookie = (string)($request->BuyerCookie ?? '');
        $browserFormPostUrl = (string)($request->BrowserFormPost->URL ?? '');
        $supplierSetupUrl = (string)($request->SupplierSetup->URL ?? '');

        // Extrinsics (pueden variar)
        $extrinsics = [];
        if (isset($request->Extrinsic)) {
            foreach ($request->Extrinsic as $extrinsic) {
                $name = (string)$extrinsic['name'];
                $extrinsics[$name] = (string)$extrinsic;
            }
        }

        // Validación básica: require BuyerCookie, BrowserFormPostUrl is optional (we can fallback)
        if (empty($buyerCookie)) {
            return [
                'error' => true,
                'code' => defined('HTTP_BAD_REQUEST') ? HTTP_BAD_REQUEST : 400,
                'message' => 'BuyerCookie es requerido en el cXML.'
            ];
        }

        // Debug logs to help diagnose missing StartPage/URL issues
        error_log('getLoginToken: extracted BuyerCookie=' . $buyerCookie . ' BrowserFormPostUrl=' . $browserFormPostUrl . ' SupplierSetupUrl=' . $supplierSetupUrl);

        // Use the real PHP session id so we can resume this session later
        // Regenerate the PHP session id to avoid session fixation attacks
        session_regenerate_id(true);
        $phpSessionId = session_id();

        // Guarda datos en la sesión PHP
        $_SESSION['cliente'] = $phpSessionId;
        $_SESSION['SessionID'] = $phpSessionId; // keep compatibility with existing checks
        $_SESSION['BuyerCookie'] = $buyerCookie;
        $_SESSION['BrowserFormPostUrl'] = $browserFormPostUrl;
        $_SESSION['Extrinsics'] = $extrinsics;
        // $_SESSION['Username'] = $username;
        // $_SESSION['Password'] = $password; 

        // Respuesta (puedes ajustar formato según lo que espera el comprador)
        return [
            'error'   => false,
            'code'    => 200,
            'protocol' => 'cXML',
            'message' => 'Login correcto',
            'data'    => [
                // devolvemos el PHP session id como SessionID
                'SessionID'         => $phpSessionId,
                'BuyerCookie'       => $buyerCookie,
                'BrowserFormPostUrl' => $browserFormPostUrl,
                'Extrinsics'        => $extrinsics
            ]
        ];
    }

    public function validateSessionID($sessionID)
    {

        // If session_id differs from provided, try to resume the provided session id
        $currentSessionId = session_id();
        if (empty($currentSessionId) || $currentSessionId !== $sessionID) {
            // Set the session id to the provided SessionID and start session
            session_write_close();
            session_id($sessionID);
            session_start();
        } else {
            // ensure session is started
            if (session_status() !== PHP_SESSION_ACTIVE) {
                session_start();
            }
        }

        // Validar que el SessionID exista y coincida con el de la sesión
        if (isset($_SESSION['SessionID']) && $_SESSION['SessionID'] === $sessionID) {
            return (object)[
                'error' => false,
                'responseCode' => 200,
                'message' => 'Sesión válida',
                'objResponse' => [
                    'clienteUsuarioID' => $_SESSION['cliente'] ?? null,
                    'HOOK_URL' => $_SESSION['BrowserFormPostUrl'] ?? null,
                    'extrinsics' => $_SESSION['Extrinsics'] ?? []
                ]
            ];
        }

        return (object)[
            'error' => true,
            'responseCode' => defined('HTTP_UNAUTHORIZED') ? HTTP_UNAUTHORIZED : 401,
            'message' => 'Sesión inválida o expirada'
        ];
    }

    // public function SaveCarrito(array $data)
    // {
    //     session_start();
    //     // TODO: HABILITAR SESION AQUI - Validar que exista SessionID de PunchOut
    //     // $sessionID = $_SESSION['SessionID'] ?? null;
    //     // if (empty($sessionID)) {
    //     //     $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
    //     // }

    //     // 1) Resolver hook/credenciales y sesión
    //     $sessionId = $data['SessionID'] ?? ($_SESSION['SessionID'] ?? session_id());
    //     $hookFromPayload = $data['hook'] ?? $data['Hook'] ?? null; // admit both cases
    //     $buyerCookie = $data['BuyerCookie']
    //         ?? ($hookFromPayload['buyerCookie'] ?? null)
    //         ?? ($_SESSION['BuyerCookie'] ?? null);
    //     $browserFormPostUrl = $data['BrowserFormPostUrl']
    //         ?? ($hookFromPayload['browserFormPostUrl'] ?? null)
    //         ?? ($_SESSION['BrowserFormPostUrl'] ?? null);
    //     $hookUrl = $data['HookUrl'] ?? $browserFormPostUrl; // default to BrowserFormPostUrl if HookUrl absent

    //     // Extrinsics: allow string or array/object
    //     $extrinsicsValue = $data['Extrinsics']
    //         ?? ($hookFromPayload['extrinsics'] ?? ($_SESSION['Extrinsics'] ?? []));
    //     if (is_array($extrinsicsValue) || is_object($extrinsicsValue)) {
    //         $extrinsicsStr = json_encode($extrinsicsValue, JSON_UNESCAPED_UNICODE);
    //     } else {
    //         // assume already JSON/string
    //         $extrinsicsStr = (string)$extrinsicsValue;
    //     }

    //     // Opcionales de estado/cXML
    //     $cxmlResponse = $data['cXMLResponse'] ?? '';
    //     $statusResponse = $data['StatusResponse'] ?? 'OK';

    //     // Credenciales: tomar de payload o de config [OCI]
    //     try {
    //         $vendorDir = dirname(__DIR__);
    //         $baseDir = dirname($vendorDir);
    //         $iniData = parse_ini_file($baseDir . DIRECTORY_SEPARATOR . 'app/config/routes.ini', true, INI_SCANNER_TYPED);
    //         $cfgUser = $iniData['OCI']['username'] ?? null;
    //         $cfgPass = $iniData['OCI']['password'] ?? null;
    //     } catch (\Throwable $e) {
    //         $cfgUser = null;
    //         $cfgPass = null;
    //     }
    //     $username = $data['Username'] ?? $data['USER'] ?? $cfgUser ?? '';
    //     $password = $data['Password'] ?? $data['PASSWORD'] ?? $cfgPass ?? '';

    //     // 2) Resolver items: admitir $data['Items'] (ya en formato final) o mapear desde $data['items'] exportado por JS
    //     $itemsOut = [];
    //     if (!empty($data['Items']) && is_array($data['Items'])) {
    //         // Vienen preformateados: normalizar Partida según el orden recibido
    //         $idx = 0;
    //         foreach ($data['Items'] as $it) {
    //             $idx++;
    //             // Mantener el item tal cual, pero forzar Partida por orden y defaults de IDs si faltan
    //             if (!is_array($it)) { $it = (array)$it; }
    //             $it['ItemsCarritosExirosID'] = isset($it['ItemsCarritosExirosID']) ? (int)$it['ItemsCarritosExirosID'] : 0;
    //             $it['CarritoExiros'] = isset($it['CarritoExiros']) ? (int)$it['CarritoExiros'] : 0;
    //             $it['Partida'] = $idx; // asegurar que Partida siga el orden recibido (1-based)
    //             $itemsOut[] = $it;
    //         }
    //     } else {
    //         // Mapear desde export de JS: puede venir como items: [{ item: { ... } }, ...] o directamente items: [{...}]
    //         $jsItems = $data['items'] ?? [];
    //         if (is_array($jsItems)) {
    //             $n = 0;
    //             foreach ($jsItems as $wrap) {
    //                 $n++;
    //                 $it = isset($wrap['item']) && is_array($wrap['item']) ? $wrap['item'] : (is_array($wrap) ? $wrap : []);
    //                 $itemsOut[] = [
    //                     'ItemsCarritosExirosID'   => 0,
    //                     'Partida'                 => $n,
    //                     'CarritoExiros'           => 0,
    //                     'Shortname'               => (string)($it['shortname'] ?? ''),
    //                     'Longname'                => (string)($it['longname'] ?? ''),
    //                     'UnitOfMeasure'           => (string)($it['unitOfMeasure'] ?? ''),
    //                     'ItemPrice'               => (float)($it['itemPrice'] ?? $it['UnitPrice'] ?? 0),
    //                     'PriceUnit'               => (int)($it['priceUnit'] ?? 1),
    //                     'UnitPrice'               => (float)($it['unitPrice'] ?? $it['ItemPrice'] ?? 0),
    //                     'Quantity'                => (int)($it['quantity'] ?? 0),
    //                     'Currency'                => (string)($it['currency'] ?? 'MXN'),
    //                     'Category'                => (string)($it['category'] ?? ''),
    //                     'SupplierPartID'          => (string)($it['supplierPartID'] ?? ''),
    //                     'SupplierPartAuxiliaryID' => (string)($it['supplierPartAuxiliaryID'] ?? ''),
    //                     'Manufacturer'            => (string)($it['manufacturer'] ?? ''),
    //                     'ManufacturerModelNumber' => (string)($it['manufacturerModelNumber'] ?? ''),
    //                     'CodigoArticulo'          => (string)($it['codigoArticulo'] ?? $it['codigoInterno'] ?? '')
    //                 ];
    //             }
    //         }
    //     }

    //     // 3) Construir payload final para API remota
    //     $payload = [
    //         'HookUrl'            => (string)($hookUrl ?? ''),
    //         'Username'           => (string)$username,
    //         'Password'           => (string)$password,
    //         'BuyerCookie'        => (string)($buyerCookie ?? ''),
    //         'SessionID'          => (string)($sessionId ?? ''),
    //         'BrowserFormPostUrl' => (string)($browserFormPostUrl ?? ''),
    //         'Extrinsics'         => (string)$extrinsicsStr,
    //         'cXMLResponse'       => (string)$cxmlResponse,
    //         'StatusResponse'     => (string)$statusResponse,
    //         'Items'              => $itemsOut,
    //     ];

    //     // 4) Enviar a endpoint remoto
    //     $routes = $this->getApiRutes();
    //     $apiKey = $this->getXApiKey();
    //     try {
    //         $response = callApi('exiros-guardar-compra', $payload, [
    //             'routes' => $routes,
    //             'apiKey' => $apiKey,
    //             'method' => 'POST'
    //         ]);
    //     } catch (\Exception $e) {
    //         // Error de transporte o helper
    //         return [
    //             'isError' => true,
    //             'message' => $e->getMessage(),
    //             'data' => null
    //         ];
    //     }

    //     $decoded = json_decode($response, true);
    //     if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
    //         // Respuesta no JSON; regresa raw
    //         return [
    //             'isError' => false,
    //             'message' => 'Respuesta no-JSON recibida',
    //             'data'    => $response
    //         ];
    //     }

    //     // Normaliza esquema de respuesta
    //     if (isset($decoded['isError']) && $decoded['isError']) {
    //         return [
    //             'isError' => true,
    //             'message' => $decoded['message'] ?? 'Error al guardar compra Exiros',
    //             'data'    => $decoded['data'] ?? null
    //         ];
    //     }

    //     return [
    //         'isError' => false,
    //         'message' => $decoded['message'] ?? 'Compra guardada correctamente',
    //         'data'    => $decoded['data'] ?? $decoded
    //     ];
    // }

    public function ExirosProductDetail($data)
    {
        // Obtener SessionID del parámetro
        $sessionID = $data['SessionID'] ?? $_GET['SessionID'] ?? null;

        if (empty($sessionID)) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        }

        // Validar y reanudar la sesión como en validateSessionID
        $currentSessionId = session_id();
        if (empty($currentSessionId) || $currentSessionId !== $sessionID) {
            session_write_close();
            session_id($sessionID);
            session_start();
        } else {
            if (session_status() !== PHP_SESSION_ACTIVE) {
                session_start();
            }
        }

        // Verificar que la sesión contenga el SessionID válido
        if (!isset($_SESSION['SessionID']) || $_SESSION['SessionID'] !== $sessionID) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        }

        $articulo = $data['articulo'] ?? '';

        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        try {
            $response = callApi('exiros-product-detail', ['articulo' => $articulo], [
                'routes' => $routes,
                'apiKey' => $apiKey
            ]);
        } catch (\Exception $e) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, $e->getMessage())->showResponse();
        }

        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener el producto')->showResponse();
        }

        return [
            'isError' => false,
            'message' => $decodedResponse['message'] ?? '',
            'data'    => $decodedResponse['data'] ?? null
        ];
    }

    public function InsertArticulo(array $data)
    {
        // Verificar si la sesión ya está activa antes de iniciarla
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        // Validar que exista SessionID de PunchOut
        $sessionID = $_SESSION['SessionID'] ?? null;
        if (empty($sessionID)) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        }

        $cantidad = isset($data['cantidad']) ? (int)$data['cantidad'] : 0;
        $codigoInterno = $data['codigoInterno'] ?? '';
        if ($cantidad <= 0 || empty($codigoInterno)) {
            $this->setResponse(true, HTTP_BAD_REQUEST, 'Cantidad y Código de Artículo son requeridos y deben ser válidos')->showResponse();
        }

        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        try {
            $response = callApi('exiros-product-detail', ['articulo' => $codigoInterno], [
                'routes' => $routes,
                'apiKey' => $apiKey
            ]);
        } catch (\Exception $e) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, $e->getMessage())->showResponse();
        }

        $decodedResponse = json_decode($response, true);
        if (!isset($decodedResponse['data']) || $decodedResponse['isError'] === true) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, $decodedResponse['message'] ?? 'Error al obtener el producto')->showResponse();
        }

        $producto = $decodedResponse['data'];
        $producto['quantity'] = $cantidad;
        $producto['amountTotal'] = $cantidad * (float)$producto['amount'];

        // Inicializa el carrito si no existe
        if (!isset($_SESSION['carrito']) || !is_array($_SESSION['carrito'])) {
            $_SESSION['carrito'] = [];
        }

        // Usa codigoInterno como clave única
        $_SESSION['carrito'][$codigoInterno] = $producto;

        $this->setResponse(false, HTTP_OK, 'Item insertado en el carrito', [
            'item' => $producto,
            'carrito' => array_values($_SESSION['carrito'])
        ])->showResponse();
    }

    public function GetCarrito()
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        // Validar que exista SessionID de PunchOut
        $sessionID = $_SESSION['SessionID'] ?? null;
        if (empty($sessionID)) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        }
        $carrito = $_SESSION['carrito'] ?? [];

        return [
            'isError' => false,
            'message' => 'Carrito obtenido correctamente',
            'data' => array_values($carrito)
        ];
    }

    public function RemoveArticulo(array $data)
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        // Validar que exista SessionID de PunchOut
        $sessionID = $_SESSION['SessionID'] ?? null;
        if (empty($sessionID)) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        }

        $codigoInterno = $data['codigoInterno'] ?? '';
        if (empty($codigoInterno)) {
            return ['isError' => true, 'message' => 'codigoInterno es requerido'];
        }

        if (isset($_SESSION['carrito'][$codigoInterno])) {
            unset($_SESSION['carrito'][$codigoInterno]);
        }

        return [
            'isError' => false,
            'message' => 'Artículo eliminado del carrito',
            'data' => array_values($_SESSION['carrito'] ?? [])
        ];
    }

    public function TotalCarritoCount()
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        // Validar que exista SessionID de PunchOut
        $sessionID = $_SESSION['SessionID'] ?? null;
        if (empty($sessionID)) {
            $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        }

        $carrito = $_SESSION['carrito'] ?? [];
        $total = 0;
        if (is_array($carrito)) {
            foreach ($carrito as $it) {
                $q = 0;
                if (is_array($it)) {
                    $q = (int)($it['quantity'] ?? $it['cantidad'] ?? 0);
                }
                if ($q <= 0) {
                    $q = 1;
                }
                $total += $q;
            }
        }

        return [
            'isError' => false,
            'message' => 'Total de artículos en carrito',
            'data'    => ['total' => $total]
        ];
    }

    public function SaveCarrito(array $data)
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        // TODO: HABILITAR SESION AQUI - Validar que exista SessionID de PunchOut
        // $sessionID = $_SESSION['SessionID'] ?? null;
        // if (empty($sessionID)) {
        //     $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        // }

        // 1) Resolver hook/credenciales y sesión
        $sessionId = $data['SessionID'] ?? ($_SESSION['SessionID'] ?? session_id());
        $hookFromPayload = $data['hook'] ?? $data['Hook'] ?? null; // admit both cases
        $buyerCookie = $data['BuyerCookie']
            ?? ($hookFromPayload['buyerCookie'] ?? null)
            ?? ($_SESSION['BuyerCookie'] ?? null);
        $browserFormPostUrl = $data['BrowserFormPostUrl']
            ?? ($hookFromPayload['browserFormPostUrl'] ?? null)
            ?? ($_SESSION['BrowserFormPostUrl'] ?? null);
        $hookUrl = $data['HookUrl'] ?? $browserFormPostUrl; // default to BrowserFormPostUrl if HookUrl absent

        // Extrinsics: allow string or array/object
        $extrinsicsValue = $data['Extrinsics']
            ?? ($hookFromPayload['extrinsics'] ?? ($_SESSION['Extrinsics'] ?? []));
        if (is_array($extrinsicsValue) || is_object($extrinsicsValue)) {
            $extrinsicsStr = json_encode($extrinsicsValue, JSON_UNESCAPED_UNICODE);
        } else {
            // assume already JSON/string
            $extrinsicsStr = (string)$extrinsicsValue;
        }

        // Opcionales de estado/cXML
        $cxmlResponse = $data['cXMLResponse'] ?? '';
        $statusResponse = $data['StatusResponse'] ?? 'OK';

        // Credenciales: tomar de payload o de config [OCI]
        try {
            $vendorDir = dirname(__DIR__);
            $baseDir = dirname($vendorDir);
            $iniData = parse_ini_file($baseDir . DIRECTORY_SEPARATOR . 'app/config/routes.ini', true, INI_SCANNER_TYPED);
            $cfgUser = $iniData['OCI']['username'] ?? null;
            $cfgPass = $iniData['OCI']['password'] ?? null;
        } catch (\Throwable $e) {
            $cfgUser = null;
            $cfgPass = null;
        }
        $username = $data['Username'] ?? $data['USER'] ?? $cfgUser ?? '';
        $password = $data['Password'] ?? $data['PASSWORD'] ?? $cfgPass ?? '';

        // 2) Resolver items: admitir $data['Items'] (ya en formato final) o mapear desde $data['items'] exportado por JS
        $itemsOut = [];
        if (!empty($data['Items']) && is_array($data['Items'])) {
            // Vienen preformateados: normalizar Partida según el orden recibido
            $idx = 0;
            foreach ($data['Items'] as $it) {
                $idx++;
                // Mantener el item tal cual, pero forzar Partida por orden y defaults de IDs si faltan
                if (!is_array($it)) {
                    $it = (array)$it;
                }
                $it['ItemsCarritosExirosID'] = isset($it['ItemsCarritosExirosID']) ? (int)$it['ItemsCarritosExirosID'] : 0;
                $it['CarritoExiros'] = isset($it['CarritoExiros']) ? (int)$it['CarritoExiros'] : 0;
                $it['Partida'] = $idx; // asegurar que Partida siga el orden recibido (1-based)
                $itemsOut[] = $it;
            }
        } else {
            // Mapear desde export de JS: puede venir como items: [{ item: { ... } }, ...] o directamente items: [{...}]
            $jsItems = $data['items'] ?? [];
            if (is_array($jsItems)) {
                $n = 0;
                foreach ($jsItems as $wrap) {
                    $n++;
                    $it = isset($wrap['item']) && is_array($wrap['item']) ? $wrap['item'] : (is_array($wrap) ? $wrap : []);
                    $itemsOut[] = [
                        'ItemsCarritosExirosID'   => 0,
                        'Partida'                 => $n,
                        'CarritoExiros'           => 0,
                        'Shortname'               => (string)($it['shortname'] ?? ''),
                        'Longname'                => (string)($it['longname'] ?? ''),
                        'UnitOfMeasure'           => (string)($it['unitOfMeasure'] ?? ''),
                        'ItemPrice'               => (float)($it['itemPrice'] ?? $it['UnitPrice'] ?? 0),
                        'PriceUnit'               => (int)($it['priceUnit'] ?? 1),
                        'UnitPrice'               => (float)($it['unitPrice'] ?? $it['ItemPrice'] ?? 0),
                        'Quantity'                => (int)($it['quantity'] ?? 0),
                        'Currency'                => (string)($it['currency'] ?? 'MXN'),
                        'Category'                => (string)($it['category'] ?? ''),
                        'SupplierPartID'          => (string)($it['supplierPartID'] ?? ''),
                        'SupplierPartAuxiliaryID' => (string)($it['supplierPartAuxiliaryID'] ?? ''),
                        'Manufacturer'            => (string)($it['manufacturer'] ?? ''),
                        'ManufacturerModelNumber' => (string)($it['manufacturerModelNumber'] ?? ''),
                        'CodigoArticulo'          => (string)($it['codigoArticulo'] ?? $it['codigoInterno'] ?? '')
                    ];
                }
            }
        }

        // 3) Construir payload final para API remota
        $payload = [
            'HookUrl'            => (string)($hookUrl ?? ''),
            'Username'           => (string)$username,
            'Password'           => (string)$password,
            'BuyerCookie'        => (string)($buyerCookie ?? ''),
            'SessionID'          => (string)($sessionId ?? ''),
            'BrowserFormPostUrl' => (string)($browserFormPostUrl ?? ''),
            'Extrinsics'         => (string)$extrinsicsStr,
            'cXMLResponse'       => (string)$cxmlResponse,
            'StatusResponse'     => (string)$statusResponse,
            'Items'              => $itemsOut,
            'FolioCotizacion' => (string)($data['FolioCotizacion'] ?? $data['folioCotizacion'] ?? '')
        ];

        // 4) Enviar a endpoint remoto
        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        try {
            $response = callApi('exiros-Cotizacion-carrito', $payload, [
                'routes' => $routes,
                'apiKey' => $apiKey,
                'method' => 'POST'
            ]);
        } catch (\Exception $e) {
            // Error de transporte o helper
            return [
                'isError' => true,
                'message' => $e->getMessage(),
                'data' => null
            ];
        }

        $decoded = json_decode($response, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            // Respuesta no JSON; regresa raw
            return [
                'isError' => false,
                'message' => 'Respuesta no-JSON recibida',
                'data'    => $response
            ];
        }

        // Normaliza esquema de respuesta
        if (isset($decoded['isError']) && $decoded['isError']) {
            return [
                'isError' => true,
                'message' => $decoded['message'] ?? 'Error al guardar compra Exiros',
                'data'    => $decoded['data'] ?? null
            ];
        }

        return [
            'isError' => false,
            'message' => $decoded['message'] ?? 'Compra guardada correctamente',
            'data'    => $decoded['data'] ?? $decoded
        ];
    }

    public function GetSession()
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        // GetSession es para obtener la sesión inicial, no requiere validación previa
        // La validación de SessionID se hace en otros endpoints que usan la sesión

        $name = session_name();
        $id = session_id();
        $cookie = $_COOKIE[$name] ?? null;

        // Include any PunchOut hook data saved during getLoginToken (BuyerCookie, BrowserFormPostUrl, Extrinsics)
        $buyerCookie = $_SESSION['BuyerCookie'] ?? null;
        $browserFormPostUrl = $_SESSION['BrowserFormPostUrl'] ?? null;
        $extrinsics = $_SESSION['Extrinsics'] ?? [];

        return [
            'isError' => false,
            'message' => 'Session obtenida',
            'data' => [
                'sessionName' => $name,
                'sessionID' => $id,
                'cookieValue' => $cookie,
                'hook' => [
                    'buyerCookie' => $buyerCookie,
                    'browserFormPostUrl' => $browserFormPostUrl,
                    'extrinsics' => $extrinsics
                ]
            ]
        ];
    }



    public function ExirosGetCategorias()
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        // Validar que exista SessionID de PunchOut
        //TODO: VALIDAR SESION, NO OLVIDAR
        // $sessionID = $_SESSION['SessionID'] ?? null;
        // if (empty($sessionID)) {
        //     $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        // }

        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        try {
            $response = callApi('exiros-get-categorias', [], [
                'routes' => $routes,
                'apiKey' => $apiKey
            ]);
        } catch (\Exception $e) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, $e->getMessage())->showResponse();
        }

        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener las categorias')->showResponse();
        }

        return [
            'isError' => false,
            'message' => $decodedResponse['message'] ?? '',
            'data'    => $decodedResponse['data'] ?? null
        ];
    }
   
    public function ExirosSugerencias($data)
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        
        // TODO: VALIDAR SESION, NO OLVIDAR
        // $sessionID = $_SESSION['SessionID'] ?? null;
        // if (empty($sessionID)) {
        //     $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        // }

        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        
        try {
            // Mandamos llamar a 'exiros-sugerencias' y le pasamos el arreglo $data
            // que contiene ['articulo' => 'FETU-002258', 'top' => 4]
            $response = callApi('exiros-sugerencias', $data, [
                'routes' => $routes,
                'apiKey' => $apiKey,
                'method' => 'GET' 
            ]);
        } catch (\Exception $e) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, $e->getMessage())->showResponse();
        }

        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener las sugerencias')->showResponse();
        }

        return [
            'isError' => false,
            'message' => $decodedResponse['message'] ?? '',
            'data'    => $decodedResponse['data'] ?? [] // Retornamos un arreglo vacío si no hay sugerencias
        ];
    }
    
    public function ExirosStock($articulo)
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        
        // TODO: VALIDAR SESION, NO OLVIDAR (Manteniendo tus estándares actuales)
        // $sessionID = $_SESSION['SessionID'] ?? null;
        // if (empty($sessionID)) {
        //     $this->setResponse(true, HTTP_UNAUTHORIZED, 'SessionID de PunchOut no válido o no encontrado')->showResponse();
        // }

        $routes = $this->getApiRutes();
        $apiKey = $this->getXApiKey();
        
        try {
            // Nota de Arquitectura: El front envía '$articulo', 
            // pero lo empaquetamos como 'codigoInterno' porque así lo exige tu endpoint de C#
            $data = ['codigoInterno' => $articulo];
            
            // Usamos tu helper con un alias para la ruta ('exiros-stock')
            $response = callApi('exiros-stock', $data, [
                'routes' => $routes,
                'apiKey' => $apiKey,
                'method' => 'GET' 
            ]);
        } catch (\Exception $e) {
            $this->setResponse(true, HTTP_INTERNAL_SERVER_ERROR, $e->getMessage())->showResponse();
        }

        $decodedResponse = json_decode($response, true);

        if (isset($decodedResponse['isError']) && $decodedResponse['isError']) {
            $this->setResponse(true, HTTP_BAD_REQUEST, $decodedResponse['message'] ?? 'Error al obtener el inventario')->showResponse();
        }

        return [
            'isError' => false,
            'message' => $decodedResponse['message'] ?? 'Consulta de stock exitosa',
            // Si por alguna razón la data viene vacía, retornamos null de forma segura
            'data'    => $decodedResponse['data'] ?? null 
        ];
    }
}

