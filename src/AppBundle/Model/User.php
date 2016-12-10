<?php

namespace AppBundle\Model;

use AppBundle\Exception\ValidationException;

class User extends BaseModel {

	public $useUuid = true;
	public $incrementing = false;

	public function __construct($attributes = array()) {
		parent::__construct($attributes);

		static::$defaultValidationRules['email'] = array(
			array('type' => 'required'),
			array('type' => 'notEmpty'),
			array('type' => 'function', 'args' => array(array('AppBundle\Model\User', 'validateUniqueEmail')), 'message' => 'email "{value}" is already in use'),
		);
		static::$defaultValidationRules['password'] = array(
			array('type' => 'required'),
			array('type' => 'minLength', 'args' => array(8)),
		);
	}

	public function toPublicArray() {
		$output = parent::toPublicArray();
		unset($output['password']);
		return $output;
	}

	public function byEmail($email) {
		return self::where('email', '=', $email)->first();
	}

	public function save(Array $options = array()) {
		$isNew = !$this->id;

		parent::save($options);
		if ($isNew) {
			$this->owner_id = $this->id;
			parent::save($options);
		}
	}

	static public function validateUniqueEmail($key, $rule, $data) {
		if (!isset($data['email'])) return true;
		$u = self::byEmail($data['email']);
		return !$u;
	}

}
