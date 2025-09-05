<?php

namespace app\viewdata;

use app\controllers\CarritoController;

class Cart
{
    public static function getData()
    {
        $controll = new CarritoController();

        $data = $controll->getListItems($_SESSION['SessionSeed']);

        return [
            'itemsList' => $data->objResponse
        ];
    }
}
