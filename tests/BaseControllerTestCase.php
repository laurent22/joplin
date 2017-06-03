<?php

require_once dirname(__FILE__) . '/setup.php';

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class BaseControllerTestCase extends WebTestCase {

	public function request($method, $path, $query = array(), $data = null) {
		if (count($query)) $path .= '?' . http_build_query($query);

		$client = static::createClient();

		try {
			if ($data) {
				$client->request($method, $path, $data);
			} else {
				$client->request($method, $path);
			}
		} catch (Exception $e) {
			if (method_exists($e, 'toErrorArray')) return $e->toErrorArray();
			return array(
			 	'error' => $e->getMessage(),
			 	'code' => $e->getCode(),
			 	'type' => get_class($e),
			);
		}

		$r = $client->getResponse();
		if (!$r) throw new Exception('Cannot read response from HTTP request'); // Shouldn't happen

		$r = $r->getContent();
		return json_decode($r, true);
	}

}