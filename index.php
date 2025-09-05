<?php
session_start();

const BASEDATA = "\\app\\viewdata\\";

require_once 'app/config/App.php';
require_once 'vendor/autoload.php';

use app\config\Views;

function debugD($v)
{
    echo '<pre>';
    print_r($v);
    echo '</pre>';
}

$template = new Views();
$vista = $_GET['view'] ?? 'index';

// // Validar si $_SESSION['cliente'] tiene datos
// if (empty($_SESSION['cliente']) && $vista != 'login') {
//     $vista = 'login';
// } elseif (!empty($_SESSION['cliente']) && $vista === 'login') {
//     header('Location: /b2c/index.php');
//     exit;
// }

// Leer la cookie clienteData
$clienteData = [];
if (isset($_COOKIE['clienteData'])) {
    $clienteData = json_decode($_COOKIE['clienteData'], true);
}

// Pasar los datos a la plantilla
$data = [
    'Cliente' => $_SESSION['cliente'] ?? null,
    'Nombre' => $clienteData['nombreCliente'] ?? null, // Obtener el nombre del cliente desde la cookie
    'PlantaSeleccionadaNombre' => $_SESSION['plantaSeleccionadaNombre'] ?? "Porfavor seleccione lugar de entrega",
];

$classData = BASEDATA . ucfirst($vista);

if (class_exists($classData)) {
    // Evita fatal si la clase no implementa getData
    if (method_exists($classData, 'getData')) {
        $data = array_merge($data, $classData::getData());
    }
}

echo $template->loadView($vista, $data);
