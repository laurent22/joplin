<?php

require_once dirname(__FILE__) . '/setup.php';

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;



use AppBundle\Model\BaseModel;


class BaseControllerTestCase extends WebTestCase {

	protected $session_ = null;

	public function setUp() {
		parent::setUp();
	}

	public function tearDown() {
		parent::tearDown();
		$this->clearSession();
	}

	public function request($method, $path, $query = array(), $data = null) {
		if (!$query) $query = array();
		if ($this->session()) $query['session'] = $this->session()->idString();

		if (count($query)) $path .= '?' . http_build_query($query);

		$client = static::createClient();

		try {
			if ($data) {
				$client->request($method, $path, $data);
			} else {
				$client->request($method, $path);
			}
		} catch (\Exception $e) {
			$output = null;
			if (method_exists($e, 'toErrorArray')) {
				$output = $e->toErrorArray();
			} else {
				$output = array(
				 	'error' => $e->getMessage(),
				 	'code' => $e->getCode(),
				 	'type' => get_class($e),
				 	'trace' => $e->getTraceAsString(),
				);
			}
			return $output;
		}

		$r = $client->getResponse();
		if (!$r) throw new Exception('Cannot read response from HTTP request'); // Shouldn't happen

		$r = $r->getContent();
		return json_decode($r, true);
	}

	public function curlCmd($method, $url, $data) {
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

	public function user($num = 1) {
		return TestUtils::user($num);
	}

	public function session() {
		return $this->session_;
	}

	public function loadSession($userNum = 1, $clientNum = 1, $sessionNum = 1) {
		$this->session_ = TestUtils::session($userNum, $clientNum, $sessionNum);
	}

	public function clearSession() {
		$this->session_ = null;
	}

}