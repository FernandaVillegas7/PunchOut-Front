<?php
// Configuramos la zona horaria para que el log coincida con la hora local
date_default_timezone_set('America/Mexico_City'); 

// Recibir los datos en formato JSON desde JavaScript
$input = file_get_contents('php://input');
$request = json_decode($input, true);

if ($request) {
    $fecha = date('Y-m-d H:i:s');
    $tipo = str_pad($request['type'], 5); // INFO, OK, ERROR
    $origen = str_pad($request['origen'], 15); // CompraRapida o DetallesCarrito
    $session = $request['session'] ? $request['session'] : 'Sin_Sesion';
    $mensaje = $request['message'];
    
    // Si hay datos extra (IDs, URLs, objetos), los convertimos a texto
    $extra = '';
    if (!empty($request['data'])) {
        $extra = is_array($request['data']) || is_object($request['data']) 
                 ? json_encode($request['data'], JSON_UNESCAPED_UNICODE) 
                 : $request['data'];
        $extra = " | Detalles: " . $extra;
    }

    // Estructura limpia de la línea del log
    $linea = "[$fecha] [$tipo] [$session] [$origen] - $mensaje $extra" . PHP_EOL;

    // Ruta donde se creará el log (quedará en app/api/flujo_exiros.log)
    $archivoLog = __DIR__ . '/flujo_exiros.log';
    
    // Escribimos en el archivo (FILE_APPEND asegura que no se borre lo anterior)
    file_put_contents($archivoLog, $linea, FILE_APPEND | LOCK_EX);
}

// Responder para que la petición JavaScript se complete correctamente
echo json_encode(["status" => "log_guardado"]);