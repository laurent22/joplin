<?php

namespace AppBundle\Model;

use AppBundle\Exception\NotFoundException;
use AppBundle\Exception\AuthException;

class Session extends BaseModel {

	public $useUuid = true;
	public $incrementing = false;

	static public function hashPassword($password) {
		return password_hash($password, PASSWORD_DEFAULT);
	}

	static public function verifyPassword($password, $hash) {
		return password_verify($password, $hash);
	}

	static public function passwordMinLength() {
		return 8;
	}

	static public function login($email, $password, $clientId) {
		$user = User::byEmail($email);
		if (!$user) throw new NotFoundException("User not found");

		$ok = self::verifyPassword($password, $user->password);
		if (!$ok) throw new AuthException();

		$session = new Session();
		$session->owner_id = $user->id;
		$session->client_id = $clientId;
		$session->save();

		return $session;
	}

}
