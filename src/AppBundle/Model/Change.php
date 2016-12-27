<?php

namespace AppBundle\Model;

use AppBundle\Diff;

class Change extends BaseModel {

	static protected $enums = array(
		'type' => array('create', 'update', 'delete'),
	);

	static public function changesDoneAfterId($userId, $clientId, $changeId) {
		// Simplification:
		//
		// - If create, update, delete => return nothing
		// - If create, update => return last, and set type as 'create'
		// - If update, update, delete, update => return 'delete' only
		// - If update, update, update => return last

		$limit = 100;
		$changes = self::where('id', '>', $changeId)
		             ->where('user_id', '=', $userId)
		             ->where('client_id', '!=', $clientId)
		             ->orderBy('id')
		             ->limit($limit + 1)
		             ->get();

		$hasMore = $limit < count($changes);
		if ($hasMore) array_pop($changes);

		$itemIdToChange = array();
		$createdItems = array();
		$deletedItems = array();
		foreach ($changes as $change) {
			if ($change->type == Change::enumId('type', 'create')) {
				$createdItems[] = $change->item_id;
			} else if ($change->type == Change::enumId('type', 'delete')) {
				$deletedItems[] = $change->item_id;
			}

			$itemIdToChange[$change->item_id] = $change;
		}

		$output = array();
		foreach ($itemIdToChange as $itemId => $change) {
			if (in_array($itemId, $createdItems) && in_array($itemId, $deletedItems)) {
				// Item both created then deleted - skip
				continue;
			}

			if (in_array($itemId, $deletedItems)) {
				// Item was deleted at some point - just return one 'delete' event
				$change->type = Change::enumId('type', 'delete');
			} else if (in_array($itemId, $createdItems)) {
				// Item was created then updated - just return one 'create' event with the latest changes
				$change->type = Change::enumId('type', 'create');
			}

			$output[] = $change;
		}

		return array(
			'has_more' => $hasMore,
			'items' => $output,
		);
	}

	static public function itemFieldHistory($itemId, $itemField, $toId = null) {
		$query = self::where('item_id', '=', $itemId);
		$query->where('item_field', '=', $itemField);
		if ($toId) $query->where('id', '<=', $toId);
		$query->orderBy('id');
		return $query->get();
	}

	static public function fullFieldText($itemId, $itemField, $toId = null, $returnRevId = false) {
		$output = '';
		$changes = self::itemFieldHistory($itemId, $itemField, $toId);
		$revId = 0;
		for ($i = 0; $i < count($changes); $i++) {
			$change = $changes[$i];
			if (!empty($change->delta)) {
				$result = Diff::patch($output, $change->delta);
				if (!count($result[1])) throw new \Exception('Unexpected result format for patch operation: ' . json_encode($result));
				if (!$result[1][0]) {
					// Could not patch the string. TODO: handle conflict
				}
				$output = $result[0];
			}

			$revId = $change->id;
		}

		return $returnRevId ? array('text' => $output, 'revId' => $revId) : $output;
	}

	public function createDelta($newText) {
		$currentText = self::fullFieldText($this->item_id, $this->item_field, $this->previous_id);
		$this->delta = Diff::diff($currentText, $newText);
	}
	
}
