<?php

session_start();

require_once '../vendor/autoload.php';
require_once 'config/App.php';

const BASE_ENDPOINT = 'api'.DIRECTORY_SEPARATOR;

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With');

$uri = explode('api/', $_SERVER['REDIRECT_URL']);
$input = file_get_contents('php://input');
$endpointAndMethod = @explode('/', $uri[1]);
$endpoint = $endpointAndMethod[0] ?? '';
$method = $endpointAndMethod[1] ?? '';
$requestMethod = $_SERVER['REQUEST_METHOD'];
$mapper = (new \JsonMapper\JsonMapperFactory())->bestFit();

$error_messages = [
    400 => ['error' => true, 'message' => 'Bad Request'],
    501 => ['error' => true, 'message' => 'Not Implemented ???'],
    404 => ['error' => true, 'message' => 'Not Found']
];

if (empty($endpoint) || !file_exists(BASE_ENDPOINT. $endpoint . '.php')) {
    $response_code = (empty($endpoint)) ? 400 : 501;
    http_response_code($response_code);
    echo json_encode($error_messages[$response_code]);
    exit;
}

if(empty($method)){
    http_response_code(404);
    echo json_encode($error_messages[404]);
    exit;
}

require_once BASE_ENDPOINT.$endpoint.'.php';
