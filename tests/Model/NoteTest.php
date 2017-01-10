<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Note;

class NoteTest extends BaseTestCase {

	public function setUp() {
		parent::setUp();
	}

	public function testCanSaveAndLoad() {
		$note = new Note();
		$note->setDiffableField('title', 'the title');
		$note->setDiffableField('body', 'the body');
		$note->save();

		$note = $note->find($note->id);
		$this->assertNotNull($note);
		$this->assertEquals('the title', $note->diffableField('title'));
		$this->assertEquals('the body', $note->diffableField('body'));
	}

	public function testFromToPublicArray() {
		$a = array(
			'title' => 'the title',
			'body' => 'the body',
		);
		$note = new Note();
		$note->fromPublicArray($a);
		$note->save();

		$note = $note::find($note->id);
		$b = $note->toPublicArray();

		$this->assertEquals('the title', $b['title']);
		$this->assertEquals('the body', $b['body']);
	}
	
}