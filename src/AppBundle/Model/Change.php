<?php

namespace AppBundle\Model;

use AppBundle\Diff;

class Change extends BaseModel {

	static protected $enums = array(
		'type' => array('create', 'update', 'delete'),
	);

	static public function changesDoneAfterId($userId, $clientId, $fromChangeId) {
		// Simplification:
		//
		// - If create, update, delete => return nothing
		// - If create, update => return last, and set type as 'create'
		// - If update, update, delete, update => return 'delete' only
		// - If update, update, update => return last

		$limit = 100;
		$changes = self::where('id', '>', $fromChangeId)
		               ->where('user_id', '=', $userId)
		               ->where('client_id', '!=', $clientId)
		               ->orderBy('id')
		               ->limit($limit + 1)
		               ->get();

		$hasMore = $limit < count($changes);
		if ($hasMore) array_pop($changes);

		$itemIdToChange = array();
		$itemIdToChangedFields = array();
		$createdItems = array();
		$deletedItems = array();
		foreach ($changes as $change) {
			if ($change->type == Change::enumId('type', 'create')) {
				$createdItems[] = $change->item_id;
			} else if ($change->type == Change::enumId('type', 'delete')) {
				$deletedItems[] = $change->item_id;
			} else { // Update
				if (!isset($itemIdToChangedFields[$change->item_id])) $itemIdToChangedFields[$change->item_id] = array();
				$itemIdToChangedFields[$change->item_id][] = $change->item_field;
			}

			$itemIdToChange[$change->item_id] = $change;
		}


		$output = array();
		foreach ($itemIdToChange as $itemId => $change) {
			if (in_array($itemId, $createdItems) && in_array($itemId, $deletedItems)) {
				// Item both created then deleted - skip
				continue;
			}

			$syncItem = array(
				'id' => (string)$change->id,
				'type' => self::enumName('type', $change->type),
				'item_id' => self::hex($change->item_id),
				'item_type' => FolderItem::enumName('type', $change->item_type),
			);

			if (in_array($itemId, $deletedItems)) {
				// Item was deleted at some point - just return one 'delete' event
				$syncItem['type'] = 'delete';
			} else if (in_array($itemId, $createdItems)) {
				// Item was created then updated - just return one 'create' event with the latest changes
				$syncItem['type'] = 'create';
				$syncItem['item'] = self::requireItemById($change->item_type, $change->item_id);
			} else {
				$syncItem['item_fields'] = $itemIdToChangedFields[$change->item_id];
				$syncItem['item'] = self::requireItemById($change->item_type, $change->item_id);
			}

			$output[] = $syncItem;
		}

		// This is important so that the client knows that the last item in the list
		// is really the last change that was made; and so they can keep this ID
		// as reference for the next synchronization.
		usort($output, function($a, $b) {
			return strnatcmp($a['id'], $b['id']);
		});

		foreach ($output as $k => $syncItem) {
			if (isset($syncItem['item'])) {
				$item = $syncItem['item']->toPublicArray();
				if ($syncItem['type'] == 'update') {
					foreach ($item as $field => $value) {
						if (in_array($field, $syncItem['item_fields'])) continue;
						unset($item[$field]);
					}
					unset($syncItem['item_fields']);
				}
				$syncItem['item'] = $item;
				$output[$k] = $syncItem;
			}
		}

		return array(
			'has_more' => $hasMore,
			'items' => $output,
		);
	}

	static private function requireItemById($itemTypeId, $itemId) {
		$item = BaseItem::byTypeAndId($itemTypeId, $itemId);
		if (!$item) throw new \Exception('No such item: ' . $itemTypeId . ' ' . $itemId);
		return $item;
	}

	static public function itemFieldHistory($itemId, $itemField, $toId = null) {
		$query = self::where('item_id', '=', $itemId);
		$query->where('item_field', '=', $itemField);
		if ($toId) $query->where('id', '<=', $toId);
		$query->orderBy('id');
		return $query->get();
	}

	static public function fullFieldText($itemId, $itemField, $toId = null) {
		$output = '';
		$changes = self::itemFieldHistory($itemId, $itemField, $toId);
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
		}

		return $output;
	}

	public function createDelta($newText) {
		$currentText = self::fullFieldText($this->item_id, $this->item_field, $this->previous_id);
		$this->delta = Diff::diff($currentText, $newText);
	}
	
}
