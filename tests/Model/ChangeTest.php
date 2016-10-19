<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\BaseModel;
use AppBundle\Model\FolderItem;
use AppBundle\Model\Note;
use AppBundle\Model\Change;

class ChangeTest extends BaseTestCase {

	public function setUp() {
		parent::setUp();

		Change::truncate();
		Note::truncate();
	}

	public function tearDown() {

	}

	public function testDiff() {
		$text1 = 'abcd efgh ijkl';

		$itemId = $this->createModelId('note');

		$change = new Change();
		$change->user_id = $this->user()->id;
		$change->client_id = $this->clientId();
		$change->item_type = FolderItem::enumId('type', 'note');
		$change->item_field = BaseModel::enumId('field', 'body');
		$change->type = Change::enumId('type', 'create');
		$change->item_id = $itemId;
		$change->createDelta($text1);
		$change->save();
		
		$text2 = 'cd efgh NEW ijkl';

		$change = new Change();
		$change->user_id = $this->user()->id;
		$change->client_id = $this->clientId();
		$change->item_type = FolderItem::enumId('type', 'note');
		$change->item_field = BaseModel::enumId('field', 'body');
		$change->type = Change::enumId('type', 'update');
		$change->item_id = $itemId;
		$change->createDelta($text2);
		$change->save();

		$r = Change::fullFieldText($itemId, BaseModel::enumId('field', 'body'));

		$this->assertEquals($r, $text2);
	}

	public function testDiff3Ways() {
		// Scenario where two different clients change the same note at the same time.
		//
		// Client 1: 'abcd efgh ijkl' => 'cd efgh ijkl FROMCLIENT2'
		// Client 2: 'abcd efgh ijkl' => 'abcd CLIENT1 efgh ijkl'
		// Expected: 'cd CLIENT1 efgh ijkl FROMCLIENT2'

		$text1 = 'abcd efgh ijkl';

		$itemId = $this->createModelId('note');

		$change = new Change();
		$change->user_id = $this->user()->id;
		$change->client_id = $this->clientId(1);
		$change->item_type = FolderItem::enumId('type', 'note');
		$change->item_field = BaseModel::enumId('field', 'body');
		$change->type = Change::enumId('type', 'create');
		$change->item_id = $itemId;
		$change->createDelta($text1);
		$change->save();

		$changeId1 = $change->id;
		
		$text2 = 'cd efgh ijkl FROMCLIENT2';

		$change = new Change();
		$change->user_id = $this->user()->id;
		$change->client_id = $this->clientId(2);
		$change->item_type = FolderItem::enumId('type', 'note');
		$change->item_field = BaseModel::enumId('field', 'body');
		$change->type = Change::enumId('type', 'update');
		$change->item_id = $itemId;
		$change->previous_id = $changeId1;
		$change->createDelta($text2);
		$change->save();

		$changeId2 = $change->id;

		$text3 = 'abcd CLIENT1 efgh ijkl';

		$change = new Change();
		$change->user_id = $this->user()->id;
		$change->client_id = $this->clientId(1);
		$change->item_type = FolderItem::enumId('type', 'note');
		$change->item_field = BaseModel::enumId('field', 'body');
		$change->type = Change::enumId('type', 'update');
		$change->item_id = $itemId;
		$change->previous_id = $changeId1;
		$change->createDelta($text3);
		$change->save();

		$changeId3 = $change->id;

		$r = Change::fullFieldText($itemId, BaseModel::enumId('field', 'body'));

		$this->assertEquals($r, 'cd CLIENT1 efgh ijkl FROMCLIENT2');
	}

	public function testRevId() {
		$n = new Note();
		$n->setVersionedFieldValue('body', 'abcd efgh');
		$n->save();

		$noteId = $n->id;

		$n = Note::find($noteId);
		$d = $n->toPublicArray();
		$this->assertEquals(1, $d['rev_id']);

		$n->setVersionedFieldValue('body', '123456');
		$n->save();

		$n = Note::find($noteId);
		$d = $n->toPublicArray();
		$this->assertEquals(2, $d['rev_id']);
	}
	
}