<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Folder;

class FoldersControllerTest extends BaseControllerTestCase  {

	public function setUp() {
		parent::setUp();

		Folder::truncate();
	}

	public function testDuplicateTitle() {
		$this->loadSession(1, 1);

		$f1 = $this->request('POST', '/folders', null, array('title' => 'one'));

		$r = $this->request('POST', '/folders', null, array('title' => 'one'));

		$this->assertArrayHasKey('error', $r);
		$this->assertEquals('Validation', $r['type']);

		$r = $this->request('PUT', '/folders/' . Folder::createId(), null, array('title' => 'one'));
		$this->assertEquals('Validation', $r['type']);

		$f2 = $this->request('POST', '/folders', null, array('title' => 'two'));
		$r = $this->request('PATCH', '/folders/' . $f2['id'], null, array('title' => 'one'));
		$this->assertEquals('Validation', $r['type']);
	}

	public function testNotDuplicateTitle() {
		$this->loadSession(1, 1);

		$f1 = $this->request('POST', '/folders', null, array('title' => 'one'));
		$f2 = $this->request('PUT', '/folders/' . $f1['id'], null, array('title' => 'one'));

		$this->assertEquals($f1['id'], $f2['id']);

		$f2 = $this->request('PATCH', '/folders/' . $f1['id'], null, array('title' => 'one'));

		$this->assertEquals($f1['id'], $f2['id']);
	}

	// public function testEmoticonText() {
	// 	$this->loadSession(1, 1);

	// 	var_dump(mb_check_encoding('Voiture 🚘', 'UTF-8'));die();
	// 	$text1 = iconv('UTF-8', 'UCS-2LE', 'Voiture 🚘');
	// 	var_dump($text1);
	// 	die();

	// 	$f1 = $this->request('POST', '/folders', null, array('title' => 'Voiture 🚘'));

	// 	var_dump($f1);
	// 	die();
	// }

}