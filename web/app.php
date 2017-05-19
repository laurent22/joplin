<?php

use Symfony\Component\HttpFoundation\Request;

/** @var \Composer\Autoload\ClassLoader $loader */
$loader = require __DIR__.'/../app/autoload.php';
include_once __DIR__.'/../var/bootstrap.php.cache';

$env = require 'env.php';

$kernel = new AppKernel($env, false);
$kernel->loadClassCache();
//$kernel = new AppCache($kernel);

// When using the HttpCache, you need to call the method in your front controller instead of relying on the configuration parameter
//Request::enableHttpMethodParameterOverride();

try {
	$request = Request::createFromGlobals();
	$response = $kernel->handle($request);
	$response->send();
	$kernel->terminate($request, $response);
} catch(\Exception $e) {
	// Separate exception handling for anything that could not be caught in ApiController, for
	// example if the route doesn't exist.
	$class = get_class($e);
	$errorType = explode("\\", $class);
	$errorType = $errorType[count($errorType) - 1];
	$response = array(
		'error' => $e->getMessage(),
		'code' => $e->getCode(),
		'type' => $errorType,
	);
	if ($errorType == 'NotFoundHttpException') {
		header('HTTP/1.1 404 Not found');
	} else {
		header('HTTP/1.1 500 Internal Server Error');
	}

	$r = json_encode($response);
	if ($r === false) $r = serialize($response);
	die($r . "\n");
}