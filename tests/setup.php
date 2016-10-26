<?php

require_once dirname(__FILE__) . '/BaseTestCase.php';

$dbName = 'notes_test';
$structureFile = dirname(dirname(__FILE__)) . '/structure.sql';

$cmd = sprintf("mysql -u root -ppass -e 'DROP DATABASE IF EXISTS %s; CREATE DATABASE %s;'", $dbName, $dbName);
exec($cmd);

$cmd = sprintf("mysql -u root -ppass %s < '%s'", $dbName, $structureFile);
exec($cmd);

$capsule = new \Illuminate\Database\Capsule\Manager();

$capsule->addConnection([
	'driver'    => 'mysql',
	'host'      => 'localhost',
	'database'  => $dbName,
	'username'  => 'root',
	'password'  => 'pass',
	'charset'   => 'utf8',
	'collation' => 'utf8_unicode_ci',
	'prefix'    => '',
]);

$capsule->bootEloquent();
