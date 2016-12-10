<?php

namespace AppBundle\Exception;

use Symfony\Component\HttpFoundation\JsonResponse;

class BaseException extends \Exception {

	protected $httpStatusCode = 400;

	public function getType() {
		$t = str_replace('Exception', '', get_called_class());
		$t = str_replace("AppBundle\\\\", '', $t);
		return $t;
	}

	public function getHttpStatusCode() {
		return $this->httpStatusCode;
	}

	public function toErrorArray() {
		$o = array();
		$o['error'] = $this->getMessage();
		if ($this->getCode()) $o['code'] = $this->getCode();
		$o['type'] = $this->getType();
		return $o;
	}

	public function toJsonResponse($errorObject = null) {
		if (!$errorObject) $errorObject = $this->toErrorArray();
		$response = new JsonResponse($errorObject);
		$response->setStatusCode($this->getHttpStatusCode());
		return $response;
	}

}