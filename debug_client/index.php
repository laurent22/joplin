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

	$baseUrl = 'https://joplin.cozic.net';
	if ($host == 'joplinclient.local') {
		$baseUrl = 'http://joplin.local';
	}
	if ($host == 'note_debug.local') {
		$baseUrl = 'http://127.0.0.1:8000';
	}

	$config = array(
		'host' => $host,
		'baseUrl' => $baseUrl,
		'clientId' => 'E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3',
		'email' => 'laurent@cozic.net',
		'password' => '12345678',
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
	if ($method != 'GET' && $method != 'POST') {
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
	}
	if ($method == 'PUT' || $method == 'PATCH') {
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
	}
	if ($data) {
		curl_setopt($ch, CURLOPT_POSTFIELDS, $method == 'POST' ? $data : http_build_query($data));
	}
	$response = curl_exec($ch);
	curl_close($ch);

	$curlCmd = curlCmd($method, $url, $data);
	saveCurlCmd($curlCmd);

	$output = json_decode($response, true);
	if ($output === null) {
		throw new Exception('Cannot decode JSON: ' . $response . "\n" . $curlCmd);
	}

	if (isset($output['error'])) {
		throw new Exception('API error: ' . $response . "\n" . $curlCmd);
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

try {
	$session = execRequest('POST', 'sessions', null, array(
		'email' => config('email'),
		'password' => config('password'),
		'client_id' => config('clientId'),
	));
} catch (Exception $e) {
	die('Could not login. Please check credentials. ' . $e->getMessage());
}

$_SESSION['sessionId'] = $session['id'];

if (!isset($_GET['action'])) {
	$action = 'items';
	$_GET['type'] = 'folder';
} else {
	$action = $_GET['action'];
}

if (isset($_POST['create_item'])) $action = 'create_item';
if (isset($_POST['delete_folder'])) $action = 'delete_folder';
if (isset($_POST['delete_item'])) $action = 'delete_item';
if (isset($_POST['update_folder'])) $action = 'update_folder';
if (isset($_POST['update_note'])) $action = 'update_note';
if (isset($_POST['update_item'])) $action = 'update_item';

$pageParams = array(
	'pageTitle' => parse_url(config('baseUrl'), PHP_URL_HOST) . ' - ' . ucfirst($action),
	'headerTitle' => ucfirst($action),
	'contentHtml' => '',
	'baseUrl' => config('baseUrl'),
);

switch ($action) {

	case 'items':

		$type = $_GET['type'];
		$parentId = isset($_GET['parent_id']) ? $_GET['parent_id'] : null;

		if ($type == 'folder') {
			$path = 'folders';
			$pageParams['headerTitle'] = 'Folders';
		} else if ($type == 'note') {
			$path = 'folders/' . $_GET['parent_id'] . '/notes';
			$folder = execRequest('GET', 'folders/' . $parentId);
			$pageParams['headerTitle'] = 'Notes in ' . $folder['title'];
		}

		$items = execRequest('GET', $path);
		usort($items, function($a, $b) { return strnatcmp($a['title'], $b['title']); });
		$pageParams['contentHtml'] = renderView('items', array('items' => $items, 'type' => $type, 'parentId' => $parentId));
		break;

	case 'item':

		$path = $_GET['type'] . 's';
		$item = execRequest('GET', $path . '/' . $_GET['item_id']);
		$pageParams['contentHtml'] = renderView('item', array('item' => $item, 'type' => $_GET['type']));
		break;

	case 'changes':

		// Hack so that all the changes are returned, as if the client requesting them
		// was completely new.
		$session = execRequest('POST', 'sessions', null, array(
			'email' => config('email'),
			'password' => config('password'),
			'client_id' => 'ABCDABCDABCDABCDABCDABCDABCDABCD',
		));
		if (isset($session['error'])) throw new Exception('Could not login. Please check credentials. ' . json_encode($session));
		$changes = execRequest('GET', 'synchronizer', array('session' => $session['id']));
		$pageParams['contentHtml'] = renderView('changes', array('changes' => $changes));
		break;

	case 'create_item':

		$parentId = !empty($_POST['parent_id']) ? $_POST['parent_id'] : null;
		$path = $_POST['type'] . 's';
		$data = array(
			'title' => $_POST['item_title']
		);
		if ($parentId) $data['parent_id'] = $parentId;
		$item = execRequest('POST', $path, null, $data);

		$query = array(
			'action' => 'items',
			'type' => $_POST['type'],
			'parent_id' => $parentId,
		);

		redirect('/?' . http_build_query($query));
		break;

	case 'delete_item':

		$path = $_POST['type'] . 's';
		$item = execRequest('DELETE', $path . '/' . $_POST['item_id']);
		redirect('/');
		break;

	case 'update_item':

		$oldItem = json_decode($_POST['original_item'], true);
		$newItem = removePrefix($_POST, 'item_');
		$diff = differentProperties($oldItem, $newItem);
		$path = $_POST['type'] . 's';
		if (count($diff)) {
			execRequest('PATCH', $path . '/' . $_POST['item_id'], null, $diff);
		}

		$query = array(
			'action' => 'item',
			'type' => $_POST['type'],
			'item_id' => $_POST['item_id'],
		);

		redirect('/?' . http_build_query($query));
		break;

}

$pageParams['curlCommands'] = isset($_SESSION['curlCommands']) ? $_SESSION['curlCommands'] : array();

echo renderView('page', $pageParams);