<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Folder;
use AppBundle\Model\BaseModel;

class BaseModelTest extends BaseTestCase {

	public function testDbValueToPublicValue() {
		$this->assertEquals(true, Folder::dbValueToPublicValue('is_default', '1'));
		$this->assertEquals(true, Folder::dbValueToPublicValue('is_default', true));
		$this->assertEquals(false, Folder::dbValueToPublicValue('is_default', 0));
		$this->assertEquals(false, Folder::dbValueToPublicValue('is_default', '0'));
		$this->assertEquals(123, Folder::dbValueToPublicValue('created_time', '123'));
		$this->assertEquals('the title', Folder::dbValueToPublicValue('title', 'the title'));
	}

}