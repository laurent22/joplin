<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Folder;

class FoldersControllerTest extends BaseControllerTestCase  {

	public function setUp() {
		parent::setUp();

		Folder::truncate();
	}

	public function testDefault() {
		// $this->loadSession(1, 1);

		// $f1 = $this->request('POST', '/folders', null, array(
		// 	'title' => 'first folder',
		// 	'is_default' => true,
		// ));

		// $this->assertArrayHasKey('is_default', $f1);
		// $this->assertTrue($f1['is_default']);

		// $f2 = $this->request('POST', '/folders', null, array(
		// 	'title' => 'first folder',
		// 	'is_default' => true,
		// ));

		// $f1 = $this->request('GET', '/folders/' . $f1['id']);

		// $this->assertFalse($f1['is_default']);
	}

}