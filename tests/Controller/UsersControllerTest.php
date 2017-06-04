<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\User;

class UsersControllerTest extends BaseControllerTestCase  {

	public function setUp() {
		parent::setUp();

		User::truncate();
	}

	public function testCreate() {
		$u = $this->request('POST', '/users', null, array('email' => 'john@example.com', 'password' => '12345678'));

		$this->assertEquals('john@example.com', $u['email']);
		$this->assertArrayNotHasKey('password', $u);
	}

	public function testValidate() {
		$u = $this->request('POST', '/users', null, array('email' => '', 'password' => '12345678'));

		$this->assertEquals('Validation', $u['type']);

		$u = $this->request('POST', '/users', null, array('email' => 'john@example.com', 'password' => '12'));

		$this->assertEquals('Validation', $u['type']);

		$u1 = $this->request('POST', '/users', null, array('email' => 'john@example.com', 'password' => '12345678'));
		$duplicateEmail = $this->request('POST', '/users', null, array('email' => 'john@example.com', 'password' => '12345678'));

		$this->assertEquals('Validation', $u['type']);
	}

}