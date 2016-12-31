<?php

function config($name) {
	$config = array(
		'baseUrl' => 'http://joplin.local',
	);
	if (isset($config[$name])) {
		return $config[$name];
	}
	throw new Exception('Unknown config: ' . $name);
}

function execRequest($method, $path, $query = null, $data = null) {
	$url = config('baseUrl') . '/' . $path;
	if ($query) $url .= '?' . http_build_query($query);

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
	$response = curl_exec($ch);
	curl_close($ch);

	$output = json_decode($response, true);
	if ($output === null) {
		return array('error' => 'Cannot decode JSON', 'body' => $response);
	}

	return $output;
}

$session = execRequest('POST', 'session', null, array(
	'email' => 'laurent@cozic.net',
	'password' => '12345678',
));

var_dump($session);

die();