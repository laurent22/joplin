<?php

use PHPUnit\Framework\TestCase;

use AppBundle\Model\BaseModel;
use AppBundle\Model\User;
use AppBundle\Model\Session;

class BaseTestCase extends TestCase {

	protected function createModelId($type, $num = 1) {
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

	protected function clientId($num = 1) {
		return $this->createModelId('client', $num);
	}

	protected function userId($num = 1) {
		return $this->createModelId('user', $num);
	}

	protected function user($num = 1) {
		$id = $this->userId($num);
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

	protected function session($userNum = 1, $clientNum = 1, $sessionNum = 1) {
		$userId = $this->createModelId('user', $userNum);
		$clientId = $this->createModelId('client', $clientNum);
		$sessionId = $this->createModelId('session', $sessioNum);

		$session = Session::find($sessionId);
		if ($session) return $session;

		$session = new Session();
		$session->id = $sessionId;
		$session->owner_id = $userId;
		$session->client_id = $clientId;
		$session->save();

		return $session;
	}

	public function setUp() {
		BaseModel::setClientId($this->clientId());
	}

	public function tearDown() {

	}

}