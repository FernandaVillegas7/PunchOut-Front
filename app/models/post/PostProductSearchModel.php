<?php 

namespace app\models\post;

class PostProductSearchModel 
{
    public int $pageSize;
    public int $pageNumber;
    public int $sucursalID;
    public string $searchQuery;
    public array $categoriesID;
}
