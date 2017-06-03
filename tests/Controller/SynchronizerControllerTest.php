<?php

require_once dirname(dirname(__FILE__)) . '/setup.php';

use AppBundle\Model\Note;
use AppBundle\Model\Change;

class SynchronizerControllerTest extends BaseControllerTestCase  {

	public function setUp() {
		parent::setUp();

		Change::truncate();
		Note::truncate();
	}

	public function testMerge() {
		// Client 1 creates note "abc efg hij"
		// Client 2 gets note via sync
		// Client 3 gets note via sync
		// Client 1 changes note to "abc XXX efg hij"
		// Client 2 changes note to "abc efg YYY hij"
		// Client 1 sync => note is "abc XXX efg YYY hij"
		// Client 2 sync => note is "abc XXX efg YYY hij"
		// Client 3 sync => note is "abc XXX efg YYY hij"

		$this->loadSession(1, 1);

		$client1_revId = 0;

		$note = $this->request('POST', '/notes', null, array(
			'title' => 'abc efg hij',
			'body' => 'my new note',
		));

		$this->loadSession(1, 2);
		$syncResult = $this->request('GET', '/synchronizer');
		$client2_revId = $syncResult['rev_id'];

		$this->loadSession(1, 3);
		$syncResult = $this->request('GET', '/synchronizer');
		$client3_revId = $syncResult['rev_id'];

		$this->loadSession(1, 1);	
		$note = $this->request('PATCH', '/notes/' . $note['id'], array('rev_id' => $client1_revId), array('title' => 'abc XXX efg hij'));

		$this->loadSession(1, 2);
		$note = $this->request('PATCH', '/notes/' . $note['id'], array('rev_id' => $client2_revId), array('title' => 'abc efg YYY hij'));

		$this->loadSession(1, 1);	
		$syncResult1 = $this->request('GET', '/synchronizer', array('rev_id' => $client1_revId));

		$this->loadSession(1, 2);	
		$syncResult2 = $this->request('GET', '/synchronizer', array('rev_id' => $client2_revId));

		$this->loadSession(1, 3);	
		$syncResult3 = $this->request('GET', '/synchronizer', array('rev_id' => $client3_revId));

		$this->assertEquals('abc XXX efg YYY hij', $syncResult1['items'][0]['item']['title']);
		$this->assertEquals('abc XXX efg YYY hij', $syncResult2['items'][0]['item']['title']);
		$this->assertEquals('abc XXX efg YYY hij', $syncResult3['items'][0]['item']['title']);
	}

	public function testConflict() {
		// Client 1 creates note "abc efg hij"
		// Client 2 gets note via sync
		// Client 1 changes note to "XXXXXXXXXXX"
		// Client 2 changes note to "YYYYYYYYYYY"
		// Client 1 sync
		// Client 2 sync
		// => CONFLICT

		$this->loadSession(1, 1);

		$client1_revId = 0;

		$note = $this->request('POST', '/notes', null, array(
			'title' => 'abc efg hij',
			'body' => 'my new note',
		));

		$this->loadSession(1, 2);
		$syncResult = $this->request('GET', '/synchronizer');
		$client2_revId = $syncResult['rev_id'];

		$this->loadSession(1, 1);	
		$note = $this->request('PATCH', '/notes/' . $note['id'], array('rev_id' => $client1_revId), array('title' => 'XXXXXXXXXX'));

		$this->loadSession(1, 2);
		$note = $this->request('PATCH', '/notes/' . $note['id'], array('rev_id' => $client2_revId), array('title' => 'YYYYYYYYYY'));

		$this->loadSession(1, 1);	
		$syncResult1 = $this->request('GET', '/synchronizer', array('rev_id' => $client1_revId));

		$this->loadSession(1, 2);	
		$syncResult2 = $this->request('GET', '/synchronizer', array('rev_id' => $client2_revId));

		// In case of conflict, the string should be set to the last PATCH operation
		$this->assertEquals('YYYYYYYYYY', $syncResult1['items'][0]['item']['title']);

		// TODO: handle conflict
	}

}