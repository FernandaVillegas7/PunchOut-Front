<?php

namespace app\config;

use app\controllers\SucursalesController;
use app\controllers\CategoriaController;
use Twig\Error\LoaderError;

const NOTFOUND = 'views/errors/404.twig';
const VIEWPATH = 'views/';
const VIEWPARTIAL = 'modules/';
const SERVERERROR = 'views/errors/500.twig';

class Views
{
    public $twigEnvironment;
    private string $appDir;
    private string $baseDir;

    public function __construct()
    {
        $this->appDir = dirname(__DIR__);
        $this->baseDir = dirname($this->appDir);
        $this->twigInit();
    }

    public function loadView(string $view, array $data = []): string
    {
        try {

            if (isset($_SESSION['Cliente']) || isset($_SESSION['ClienteID'])) {
                $data = array_merge($_SESSION, $data);
            }

            $viewLoad = $this->viewExist($view) ? VIEWPATH . "{$view}.twig" : NOTFOUND;

            // $data = array_merge($this->getDefaultData(), $data);

            return $this->twigEnvironment->load($viewLoad)->render($data);
        } catch (LoaderError $e) {

            $template = $this->twigEnvironment->load(SERVERERROR);
            return $template->render(['Message' => $e->getMessage()]);
        } catch (\Throwable $th) {
            $template = $this->twigEnvironment->load(SERVERERROR);
            return $template->render(['Message' => $th->getMessage()]);
        }
    }

    public function loadPartials(string $view, array $data = []): string
    {
        return $this->twigEnvironment->load(VIEWPARTIAL . "{$view}")->render($data);
    }

    private function twigInit(): void
    {

        $fileSystemLoader = new \Twig\Loader\FilesystemLoader("{$this->baseDir}/template");
        $this->twigEnvironment = new \Twig\Environment($fileSystemLoader, ['debug' => true]);
        $this->twigEnvironment->addExtension(new \Twig\Extension\DebugExtension());

        $this->twigEnvironment->addFilter(new \Twig\TwigFilter('filemtime_version', function ($path) {
            $fullPath = $this->baseDir . '/' . $path;
            if (file_exists($fullPath)) {
                return $path . '?v=' . filemtime($fullPath);
            }
            return $path;
        }));

        $this->twigEnvironment->addFilter(new \Twig\TwigFilter('image_exist', function ($path) {
            $fullPath = $this->baseDir . '/' . $path;
            if (!file_exists($fullPath)) {
                return 'public/img/noimg.png';
            }
            return $path;
        }));
    }

    private function viewExist(string $view): bool
    {
        $templatePath = DIRECTORY_SEPARATOR . 'template/views/' . $view . ".twig";
        $file = $this->baseDir . $templatePath;
        return file_exists($file);
    }

    private function getDefaultData(): array
    {
        $cat = new CategoriaController();
        $suc = new SucursalesController();

        if (empty($_SESSION['categorias'])) {
            $_SESSION['categorias'] = $cat->getRemListaCategorias()->objResponse;
            $_SESSION['sucursales'] = $suc->getSucursalesMenu()->objResponse;
        }

        return [
            'Categorias' => $_SESSION['categorias'],
            'Sucursales' => $_SESSION['sucursales'],
        ];
    }
}
