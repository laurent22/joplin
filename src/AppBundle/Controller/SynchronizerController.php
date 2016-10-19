<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\Action;
use AppBundle\Exception\UnauthorizedException;

/*

JS


class Session
	::login()

class Synchronizer
	::fromId(id)

class Note

class User


HISTORY

client_id, create, type, id => get full object from api
update, type, id => get full object from api
delete, type, id => remove object

Revisions
----------------
id
client_id
(user_id ?)
action (create, update, delete)
item_type (note, folder)
item_field (title, body, completed...)
item_id

if current client ID = revision.client_id - skip

Current client id = 123

Client ID | Action | Item ID
------------------------------------
456         delete   777
123         update   777 - conflict - move to folder - note that deleted by X and then modified by Y


Client ID | Action | Item ID         | Rev ID
------------------------------------------------------
456         update   777             | 2
123         update   777 - conflict  | 3

Find rev 1 and do three way merge with 2 and 3 - means there's a need to store history of all versions of body/title



// Each item should have a revision ID.
// When processing revisions => if item revision = revision.id - skip


API CALL

/synchronizer/?last_id=<last_id_that_caller_synched_to>

SIMPLE IMPLEMENTATION:

loop through changes
create list of actions:
	create one action per item ID / field (by merging all into one)

loop through actions
skip current client id = action.client_id

send back list:

{
	sync_id: 132456,
	notes: [
		{
			action: 'update',
			field: 'body',
			body: 'blabla'
		}
	],
	has_more: true
}

If has_more, resume with last sync_id



*/

class SynchronizerController extends ApiController {

	/**
	 * @Route("/synchronizer")
	 */
	public function allAction(Request $request) {
		$id = (int)$request->query->get('last_id');

		if (!$this->user() || !$this->session()) throw new UnauthorizedException();

		$actions = Action::actionsDoneAfterId($this->user()->id, $this->session()->client_id, $id);
		return static::successResponse($actions);
	}

}
