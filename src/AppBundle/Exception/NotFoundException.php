<?php

namespace AppBundle\Exception;

class NotFoundException extends BaseException {

	protected $message = 'not found';
	protected $httpStatusCode = 400;

}