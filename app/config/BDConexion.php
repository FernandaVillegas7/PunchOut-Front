<?php

namespace app\config;

use Medoo\Medoo;

class BDConexion
{
    private static $instance;
    private $database;

    private function __construct()
    {

        $ini = parse_ini_file('config.ini', true);

        extract($ini['BDCONF']);

        $this->database = new Medoo([
            'type' => 'mysql',
            'host' => $host,
            'database' => $schema,
            'username' => $username,
            'password' => $password
        ]);

    }

    public static function getInstance()
    {
        if (!self::$instance) {
            self::$instance = new BDConexion();
        }
        return self::$instance;
    }

    public function getDatabase()
    {
        return $this->database;
    }
}



