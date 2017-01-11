<?php

function initialize() {
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);

	session_start();

	unset($_SESSION['sessionId']);
}

function config($name) {
	$host = $_SERVER['HTTP_HOST'];

	$config = array(
		'host' => $host,
		'baseUrl' => $host == 'joplinclient.local' ? 'http://joplin.local' : 'https://joplin.cozic.net',
		'clientId' => 'E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3',
	);
	if (isset($config[$name])) return $config[$name];
	throw new Exception('Unknown config: ' . $name);
}

function curlCmd($method, $url, $data) {
	$cmd = array();
	$cmd[] = 'curl';
	if ($method != 'GET' && $method != 'POST') {
		$cmd[] = '-X ' . $method;
	}
	if ($method != 'GET' && $method != 'DELETE') {
		$cmd[] = "--data '" . http_build_query($data) . "'";
	}
	$cmd[] = "'" . $url . "'";

	return implode(' ', $cmd);	
}

function saveCurlCmd($cmd) {
	$cmds = array();
	if (isset($_SESSION['curlCommands'])) $cmds = $_SESSION['curlCommands'];
	$cmds[] = $cmd;
	while (count($cmds) > 100) {
		array_splice($cmds, 0, 1);
	}
	$_SESSION['curlCommands'] = $cmds;
}

function execRequest($method, $path, $query = array(), $data = null) {
	$url = config('baseUrl') . '/' . $path;
	if (!empty($_SESSION['sessionId']) && !isset($query['session'])) {
		$query['session'] = $_SESSION['sessionId'];
	}
	if (count($query)) $url .= '?' . http_build_query($query);

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
	if ($method != 'GET' && $method != 'POST') {
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
	}
	$response = curl_exec($ch);
	curl_close($ch);

	$curlCmd = curlCmd($method, $url, $data);
	saveCurlCmd($curlCmd);

	$output = json_decode($response, true);
	if ($output === null) {
		$msg = 'Cannot decode JSON: ' . $response . "\n\n" . $curlCmd;
		die($msg);
	}

	return $output;
}

function renderView($name, $parameters = array()) {
	$path = dirname(__FILE__) . '/views/' . $name . '.php';
	if (!file_exists($path)) throw new Exception('View not found: ' . $path);

	extract($parameters);
	ob_start();
	include $path;
	$content = ob_get_contents();
	ob_end_clean();
	return $content;
}

function differentProperties($old, $new, $oldPrefix = '') {
	$output = array();
	foreach ($old as $k1 => $v1) {
		foreach ($new as $k2 => $v2) {
			if ($k1 === $k2 && (string)$v1 !== (string)$v2) {
				$output[$k1] = $v2;
			}
		}
	}
	return $output;
}

function removePrefix($array, $prefix) {
	$output = array();
	foreach ($array as $k => $v) {
		if (strpos($k, $prefix) === 0) {
			$k = substr($k, strlen($prefix));
		}
		$output[$k] = $v;
	}
	return $output;
}

function redirect($path) {
	header('Location: ' . $path);
	die();
}

initialize();

$session = execRequest('POST', 'sessions', null, array(
	'email' => 'laurent@cozic.net',
	'password' => '12345678',
	'client_id' => config('clientId'),
));

$_SESSION['sessionId'] = $session['id'];

$action = isset($_GET['action']) ? $_GET['action'] : 'folders';

if (isset($_POST['create_folder'])) $action = 'create_folder';
if (isset($_POST['delete_folder'])) $action = 'delete_folder';
if (isset($_POST['update_folder'])) $action = 'update_folder';

$pageParams = array(
	'pageTitle' => parse_url(config('baseUrl'), PHP_URL_HOST) . ' - ' . ucfirst($action),
	'headerTitle' => ucfirst($action),
	'contentHtml' => '',
	'baseUrl' => config('baseUrl'),
);

switch ($action) {

	case 'folders':

		$folders = execRequest('GET', 'folders');
		usort($folders, function($a, $b) { return strnatcmp($a['title'], $b['title']); });
		$pageParams['contentHtml'] = renderView('folders', array('folders' => $folders));
		break;

	case 'folder':

		$folder = execRequest('GET', 'folders/' . $_GET['folder_id']);
		$pageParams['contentHtml'] = renderView('folder', array('folder' => $folder));
		break;

	case 'changes':

		// Hack so that all the changes are returned, as if the client requesting them
		// was completely new.
		$session = execRequest('POST', 'sessions', null, array(
			'email' => 'laurent@cozic.net',
			'password' => '12345678',
			'client_id' => 'ABCDABCDABCDABCDABCDABCDABCDABCD',
		));
		$changes = execRequest('GET', 'synchronizer', array('session' => $session['id']));
		$pageParams['contentHtml'] = renderView('changes', array('changes' => $changes));
		break;

	case 'notes':

		$notes = execRequest('GET', 'folders/' . $_GET['folder_id'] . '/notes');
		$pageParams['contentHtml'] = renderView('notes', array('notes' => $notes));
		break;

	case 'create_folder':

		$data = array('title' => $_POST['folder_title']);
		$folder = execRequest('POST', 'folders', null, $data);
		redirect('/');
		break;

	case 'delete_folder':

		$folder = execRequest('DELETE', 'folders/' . $_POST['folder_id']);
		redirect('/');
		break;

	case 'update_folder':

		$oldFolder = json_decode($_POST['original_folder'], true);
		$newFolder = removePrefix($_POST, 'folder_');
		$diff = differentProperties($oldFolder, $newFolder);
		if (count($diff)) {
			execRequest('PATCH', 'folders/' . $_POST['folder_id'], null, $diff);
		}
		redirect('/');
		break;

}

$pageParams['curlCommands'] = isset($_SESSION['curlCommands']) ? $_SESSION['curlCommands'] : array();

echo renderView('page', $pageParams);