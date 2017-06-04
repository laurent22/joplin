<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Tag;
use AppBundle\Model\Folder;
use AppBundle\Model\Note;

class TagsControllerTest extends BaseControllerTestCase  {

	public function setUp() {
		parent::setUp();

		Tag::truncate();
		Note::truncate();
		Folder::truncate();
	}

	public function testCreate() {
		$this->loadSession(1, 1);

		$t = $this->request('POST', '/tags', null, array('title' => 'my tag'));

		$this->assertEquals('my tag', $t['title']);
	}

	public function testTagNote() {
		$this->loadSession(1, 1);

		$tag = $this->request('POST', '/tags', null, array('title' => 'my tag'));

		$note = $this->request('POST', '/notes', null, array('title' => 'my note'));
		$this->request('POST', '/tags/' . $tag['id'] . '/items', null, array('id' => $note['id']));
		$items = $this->request('GET', '/tags/' . $tag['id'] . '/items');
		$this->assertEquals(1, count($items));
		$this->assertEquals('note', $items[0]['item_type']);
		$this->assertEquals($note['id'], $items[0]['item_id']);
		$this->assertEquals($tag['id'], $items[0]['tag_id']);

		$folder = $this->request('POST', '/folders', null, array('title' => 'my folder'));
		$this->request('POST', '/tags/' . $tag['id'] . '/items', null, array('id' => $folder['id']));
		$items = $this->request('GET', '/tags/' . $tag['id'] . '/items');
		$this->assertEquals(2, count($items));
		$this->assertEquals('folder', $items[1]['item_type']);
		$this->assertEquals($folder['id'], $items[1]['item_id']);
		$this->assertEquals($tag['id'], $items[1]['tag_id']);

		$this->request('DELETE', '/tags/' . $tag['id'] . '/items/' . $note['id']);
		$items = $this->request('GET', '/tags/' . $tag['id'] . '/items');
		$this->assertEquals(1, count($items));
		$this->assertEquals('folder', $items[0]['item_type']);
	}

	public function testValidation() {

		$this->loadSession(1, 1);

		$tag1 = $this->request('POST', '/tags', null, array('title' => 'my tag'));
		$tag2 = $this->request('POST', '/tags', null, array('title' => 'my tag'));

		$this->assertEquals('Validation', $tag2['type']);

		$empty = $this->request('POST', '/tags', null, array('title' => ''));

		$this->assertEquals('Validation', $empty['type']);

		$tag2 = $this->request('POST', '/tags', null, array('title' => 'my tag 2'));

		$duplicate = $this->request('PATCH', '/tags/' . $tag2['id'], null, array('title' => 'my tag'));

		$this->assertEquals('Validation', $duplicate['type']);

		$modOwnTitle = $this->request('PATCH', '/tags/' . $tag2['id'], null, array('title' => 'my tag 2'));

		$this->assertEquals($tag2['id'], $modOwnTitle['id']);
	}

}