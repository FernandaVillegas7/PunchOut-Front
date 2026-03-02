<?php

namespace app\viewdata;

class Preguntas
{
    /**
     * Este método es llamado automáticamente por index.php
     * Devuelve los datos que estarán disponibles en tu archivo Twig.
     */
    public static function getData()
    {
        
        return [
            'tituloPagina' => 'Preguntas Frecuentes | Centro de Ayuda',
            'seccionActiva' => 'preguntas' // Útil si quieres resaltar algo en el menú
        ];
    }
}