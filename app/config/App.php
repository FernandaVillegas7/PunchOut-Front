<?php

class App
{
    public static function classLoader(string $classname)
    {
        $vendorDir = dirname(__DIR__);
        $baseDir = dirname($vendorDir);

        $filepath = $baseDir.DIRECTORY_SEPARATOR.$classname.'.php';

        if($_SERVER['HTTP_HOST'] != 'localhost'){
            $filepath = str_replace('\\',DIRECTORY_SEPARATOR, $filepath);
        }

        if(is_readable($filepath)){
            require_once $filepath;
        }
    }
}

spl_autoload_register(['App', 'classLoader']);

