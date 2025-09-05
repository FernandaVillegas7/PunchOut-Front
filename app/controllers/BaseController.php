<?php

namespace app\controllers;

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_ACEPTED = 202;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_IM_A_TEAPOT = 418;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_IMPLEMENTED = 501;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const RECORD_ERROR = 'Ocurrio un error al crear el registro';

class BaseController
{
    public bool $error;
    public string $message;
    public string $template;
    public int $responseCode;
    public mixed $objResponse;

    public function showResponse()
    {
        http_response_code($this->responseCode);
        echo json_encode($this, JSON_INVALID_UTF8_IGNORE);
        exit;
    }

    public function tabResponse()
    {
        http_response_code($this->responseCode);
        echo json_encode([
            'error' => $this->error,
            'message' => $this->message,
            'data' => $this->objResponse['data'] ?? [],
            'recordsFiltered' => $this->objResponse['recordsFiltered'] ?? 0,
            'recordsTotal' => $this->objResponse['recordsTotal'] ?? 0
        ], JSON_INVALID_UTF8_IGNORE);
        exit;
    }

    public function setResponse(bool $error = false, int $code = HTTP_OK, string $message = '', mixed $obj = null, string $temp = '')
    {
        $this->error = $error;
        $this->message = $message;
        $this->template = $temp;
        $this->objResponse = $obj;
        $this->responseCode = $code;

        return $this;
    }

    public function formatString($string)
    {
        $search  = ['á', 'é', 'í', 'ó', 'ú', 'Á', 'É', 'Í', 'Ó', 'Ú', 'ñ', 'Ñ'];
        $replace = ['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U', 'n', 'N'];
        $string = str_replace($search, $replace, $string);

        $string = strtolower($string);

        $string = str_replace(' ', '-', $string);

        return $string;
    }

    public function getApiKey(): string
    {
        $vendorDir = dirname(__DIR__);
        $baseDir = dirname($vendorDir);

        $iniData = parse_ini_file($baseDir . DIRECTORY_SEPARATOR . 'app/config/routes.ini', true);
        return $iniData['APIKEY']['key'];
    }

    public function getXApiKey(): string
    {
        $vendorDir = dirname(__DIR__);
        $baseDir = dirname($vendorDir);

        $iniData = parse_ini_file($baseDir . DIRECTORY_SEPARATOR . 'app/config/routes.ini', true);
        return $iniData['APIKEY']['X-API-KEY'];
    }

    public function getApiRutes(): array
    {
        $vendorDir = dirname(__DIR__);
        $baseDir = dirname($vendorDir);

        $iniData = parse_ini_file($baseDir . DIRECTORY_SEPARATOR . 'app/config/routes.ini', true);
        return $iniData['ROUTEAPI'];
    }
}
