<?php

namespace AppBundle\Exception;

class ForbiddenException extends BaseException {

	protected $message = 'forbidden';
	protected $httpStatusCode = 403;

}