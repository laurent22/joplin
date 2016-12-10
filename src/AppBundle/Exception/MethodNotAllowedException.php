<?php

namespace AppBundle\Exception;

class MethodNotAllowedException extends BaseException {

	protected $message = 'method not allowed';
	protected $httpStatusCode = 405;

}