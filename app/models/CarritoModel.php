<?php 

namespace app\models;

class CarritoModel
{   
    public bool $procesado;
    public float $precio;
    public int $cantidad;
    public int $carritoID;
    public string $cliente; 
    public string $articulo;
    public string $sessionSeed;
    public string $nombreProducto;
    public string $codigoProducto;
}
