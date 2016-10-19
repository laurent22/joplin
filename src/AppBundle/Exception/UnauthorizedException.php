<?php

namespace AppBundle\Exception;

class UnauthorizedException extends BaseException {

	protected $message = 'unauthorized';
	protected $httpStatusCode = 401;

}