<?php

$_SERVER['JOPLIN_TESTING'] = true;

require_once dirname(__FILE__) . '/TestUtils.php';
require_once dirname(__FILE__) . '/BaseTestCase.php';
require_once dirname(__FILE__) . '/BaseControllerTestCase.php';



// use DiffMatchPatch\DiffMatchPatch;
// $dmp = new DiffMatchPatch();
// $diff = $dmp->patch_make('car', 'car 🚘');
// var_dump($dmp->patch_toText($diff));
// var_dump($dmp->patch_apply($diff, 'car'));

// //$dmp->patch_toText($dmp->patch_make($from, $to));
// die();



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

$capsuleConfig = [
	'driver'    => 'mysql',
	'host'      => $dbConfig['host'],
	'database'  => $dbConfig['dbName'],
	'username'  => $dbConfig['user'],
	'password'  => $dbConfig['password'],
	'charset'   => 'utf8',
	'collation' => 'utf8_unicode_ci',
	'prefix'    => '',
];

$capsule->addConnection($capsuleConfig);

$_SERVER['JOPLIN_TESTING_DB_CONFIG'] = $capsuleConfig;

$capsule->bootEloquent();