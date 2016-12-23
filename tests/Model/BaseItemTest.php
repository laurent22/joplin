<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\BaseItem;
use AppBundle\Model\Note;
use AppBundle\Model\Folder;
use AppBundle\Model\Tag;

class BaseItemTest extends BaseTestCase {

	public function setUp() {
		parent::setUp();
	}

	public function testItemType() {
		$n = new Note();
		$this->assertEquals(BaseItem::enumId('type', 'note'), $n->itemTypeId());
		$n = new Folder();
		$this->assertEquals(BaseItem::enumId('type', 'folder'), $n->itemTypeId());
		$n = new Tag();
		$this->assertEquals(BaseItem::enumId('type', 'tag'), $n->itemTypeId());
	}

}