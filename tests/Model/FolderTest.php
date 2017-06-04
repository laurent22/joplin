<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Folder;

class FolderTest extends BaseTestCase {

	public function setUp() {
		parent::setUp();

		Folder::truncate();
	}

	public function testNewFolderBecomesDefault() {
		$f1 = new Folder();
		$f1->is_default = true;
		$f1->owner_id = TestUtils::userId();
		$f1->save();

		$f2 = new Folder();
		$f2->is_default = true;
		$f2->owner_id = TestUtils::userId();
		$f2->save();

		$f1 = Folder::find($f1->id);
		$f2 = Folder::find($f2->id);

		$this->assertTrue(!$f1->is_default);
		$this->assertTrue(!!$f2->is_default);
	}
	
}