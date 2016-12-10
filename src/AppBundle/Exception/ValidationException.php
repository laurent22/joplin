<?php

namespace AppBundle\Exception;

class ValidationException extends BaseException {

	protected $message = 'validation error';
	public $validationErrors = array();

	static public function fromErrors($errors) {
		if (!count($errors)) return new ValidationException();
		$e = new ValidationException($errors[0]['message']);
		$e->validationErrors = $errors;
		return $e;
	}

	public function toErrorArray() {
		$o = parent::toErrorArray();
		$o['validation_errors'] = $this->validationErrors;
		return $o;
	}

}