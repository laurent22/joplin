<?php

require_once dirname(__FILE__) . '/BaseTestCase.php';

$dbConfig = array(
	'dbName' => 'notes_test',
	'user' => 'root',
	'password' => 'pass',
	'host' => '127.0.0.1',
);

$structureFile = dirname(dirname(__FILE__)) . '/structure.sql';

$cmd = sprintf("mysql -u %s %s -h %s -e 'DROP DATABASE IF EXISTS %s; CREATE DATABASE %s;'", $dbConfig['user'], empty($dbConfig['password']) ? '' : '-p' . $dbConfig['password'], $dbConfig['host'], $dbConfig['dbName'], $dbConfig['dbName']);
exec($cmd);

$cmd = sprintf("mysql -u %s %s -h %s %s < '%s'", $dbConfig['user'], empty($dbConfig['password']) ? '' : '-p' . $dbConfig['password'], $dbConfig['host'], $dbConfig['dbName'], $structureFile);
exec($cmd);

$capsule = new \Illuminate\Database\Capsule\Manager();

$capsule->addConnection([
	'driver'    => 'mysql',
	'host'      => $dbConfig['host'],
	'database'  => $dbConfig['dbName'],
	'username'  => $dbConfig['user'],
	'password'  => $dbConfig['password'],
	'charset'   => 'utf8',
	'collation' => 'utf8_unicode_ci',
	'prefix'    => '',
]);

$capsule->bootEloquent();
