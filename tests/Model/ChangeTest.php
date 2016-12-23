<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\BaseModel;
use AppBundle\Model\BaseItem;
use AppBundle\Model\Note;
use AppBundle\Model\Change;

class ChangeTest extends BaseTestCase {

	public function setUp() {
		parent::setUp();

		Change::truncate();
		Note::truncate();
	}

	public function testDiff() {
		$text1 = 'abcd efgh ijkl';

		$itemId = $this->createModelId('note');

		$change = new Change();
		$change->user_id = $this->user()->id;
		$change->client_id = $this->clientId();
		$change->item_type = BaseItem::enumId('type', 'note');
		$change->item_field = BaseModel::enumId('field', 'body');
		$change->type = Change::enumId('type', 'create');
		$change->item_id = $itemId;
		$change->createDelta($text1);
		$change->save();
		
		$text2 = 'cd efgh NEW ijkl';

		$change = new Change();
		$change->user_id = $this->user()->id;
		$change->client_id = $this->clientId();
		$change->item_type = BaseItem::enumId('type', 'note');
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
		$change->item_type = BaseItem::enumId('type', 'note');
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
		$change->item_type = BaseItem::enumId('type', 'note');
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
		$change->item_type = BaseItem::enumId('type', 'note');
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

	public function testListChanges() {
		$n1 = new Note();
		$n1->fromPublicArray(array('body' => 'test'));
		$n1->owner_id = $this->userId();
		$n1->save();

		$n1->fromPublicArray(array('body' => 'test change'));
		$n1->save();

		$r = Change::changesDoneAfterId($this->userId(), $this->clientId(1), 0);

		$this->assertCount(2, $r);
		$this->assertFalse($r['has_more']);
		$this->assertCount(0, $r['items']); // Since client 1 is the one that made the changes, no sync data needs to be returned

		$r = Change::changesDoneAfterId($this->userId(), $this->clientId(2), 0);

		$this->assertCount(1, $r['items']);

		$n2 = new Note();
		$n2->fromPublicArray(array('body' => 'second note'));
		$n2->owner_id = $this->userId();
		$n2->save();

		$r = Change::changesDoneAfterId($this->userId(), $this->clientId(2), 0);

		$this->assertCount(2, $r['items']);

		$r = Change::changesDoneAfterId($this->userId(), $this->clientId(2), $r['items'][0]['id']);

		$this->assertCount(1, $r['items']);

		$n1->delete();

		$r = Change::changesDoneAfterId($this->userId(), $this->clientId(2), 0);
		
		$this->assertCount(1, $r['items']);
	}

	public function testMultiClients() {
		// Simulates synchronization with multiple clients:
		// - One client creates two notes.
		// - Another client (but same user) creates three notes.
		// - Check that sets of notes is the same for both clients.
		
		$clientNotes = array(1 => array(), 2 => array());

		for ($clientId = 1; $clientId <= 2; $clientId++) {
			BaseModel::setClientId($this->clientId($clientId));

			$noteCount = $clientId == 1 ? 2 : 3;
			for ($i = 1; $i <= $noteCount; $i++) {
				$n = new Note();
				$n->fromPublicArray(array('body' => 'note C' . $clientId . ' - ' . $i));
				$n->owner_id = $this->userId();
				$n->save();

				$clientNotes[$clientId][] = $n->toPublicArray();
			}
		}

		for ($clientId = 1; $clientId <= 2; $clientId++) {
			$r = Change::changesDoneAfterId($this->userId(), $this->clientId($clientId), 0);
			$this->assertCount($clientId == 1 ? 3 : 2, $r['items']);

			foreach ($r['items'] as $item) {
				$item = $item->toPublicArray();
				$this->assertEquals('create', $item['type']);
				
				$n = Note::find(BaseModel::unhex($item['item_id']));
				$clientNotes[$clientId][] = $n->toPublicArray();
			}
		}

		$this->assertEquals(count($clientNotes[1]), count($clientNotes[2]));

		foreach ($clientNotes[1] as $n1) {
			$foundCount = 0;
			foreach ($clientNotes[2] as $n2) {
				if ($n1['body'] === $n2['body']) $foundCount++;
			}
			$this->assertEquals(1, $foundCount);
		}
	}
	
}