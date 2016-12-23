<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Note;
use AppBundle\Model\Tag;

class TagTest extends BaseTestCase {

	public function setUp() {
		parent::setUp();
	}

	public function testTagging() {
		$note = new Note();
		$note->save();

		$tag = new Tag();
		$tag->owner_id = $this->userId();
		$tag->save();

		$this->assertFalse($tag->includes($note));

		$tag->add($note);
		$items = $tag->items();
		$this->assertEquals(1, count($items));

		$tag->add($note);
		$items = $tag->items();
		$this->assertEquals(1, count($items));

		$note2 = new Note();
		$note2->save();

		$tag->add($note2);
		$items = $tag->items();
		$this->assertEquals(2, count($items));

		$this->assertEquals($note->id, $items[0]->id);
		$this->assertEquals($note2->id, $items[1]->id);
		$this->assertTrue($tag->includes($note));
		$this->assertTrue($tag->includes($note2));

		$tag->remove($note);
		$items = $tag->items();
		$this->assertEquals(1, count($items));

		$tag->remove($note2);
		$items = $tag->items();
		$this->assertEquals(0, count($items));
	}

	public function testStarring() {
		$note = new Note();
		$note->owner_id = $this->userId();
		$note->save();

		$this->assertFalse(Tag::isStarred($note));

		Tag::star($note);
		$this->assertTrue(Tag::isStarred($note));
		$this->assertEquals(1, count(Tag::starredItems($this->userId())));

		Tag::star($note);
		$this->assertEquals(1, count(Tag::starredItems($this->userId())));

		Tag::unstar($note);
		$this->assertFalse(Tag::isStarred($note));
	}
	
}