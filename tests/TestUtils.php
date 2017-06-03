<?php

use AppBundle\Model\BaseModel;
use AppBundle\Model\User;
use AppBundle\Model\Session;

class TestUtils {

	static public function createModelId($type, $num = 1) {
		$c = '';
		if ($type == 'user') {
			$c = 'A';
		} else if ($type == 'client') {
			$c = 'C';
		} else if ($type == 'session') {
			$c = 'B';
		} else if ($type == 'note') {
			$c = 'D';
		}
		return BaseModel::unhex(str_repeat($c . $num, 16));
	}

	static public function clientId($num = 1) {
		return self::createModelId('client', $num);
	}

	static public function userId($num = 1) {
		return self::createModelId('user', $num);
	}

	static public function user($num = 1) {
		$id = self::userId($num);
		$user = User::find($id);
		if ($user) return $user;

		$user = new User();
		$user->id = $id;
		$user->owner_id = $user->id;
		$user->email = BaseModel::hex($id) . '@example.com';
		$user->password = '$2y$10$YJeArRNypSbmpWG3RA83n.o78EVlyyVCFN71lWJ7.Omc1VEdwmX5W'; // Session::hashPassword('12345678');
		$user->save();

		return $user;
	}

	static public function session($userNum = 1, $clientNum = 1) {
		$user = self::user($userNum);
		$clientId = self::createModelId('client', $clientNum);

		$session = Session::where('owner_id', '=', $user->id)->where('client_id', '=', $clientId)->first();
		if ($session) return $session;

		$sessionId = BaseModel::unhex(str_repeat('FF' . $userNum . $clientNum, 8));

		$session = new Session();
		$session->id = $sessionId;
		$session->owner_id = $user->id;
		$session->client_id = $clientId;
		$session->save();

		return $session;
	}

}