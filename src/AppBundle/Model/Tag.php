<?php

namespace AppBundle\Model;

use AppBundle\Exception\ForbiddenException;

class Tag extends BaseItem {

	static protected $fields = array(
		'id' => null,
		'title' => null,
		'owner_id' => null,
		'created_time' => null,
		'updated_time' => null,
	);

	public function add($item) {
		if ($this->includes($item->id)) return;

		if ($item->owner_id != $this->owner_id) throw new ForbiddenException();

		$t = new Tagged_item();
		$t->tag_id = $this->id;
		$t->item_id = $item->id;
		$t->item_type = $item->itemTypeId();
		$t->save();
	}

	public function includes($itemId) {
		return !!Tagged_item::where('item_id', '=', $itemId)
		                    ->where('tag_id', '=', $this->id)
		                    ->first();
	}

	public function remove($itemId) {
		return Tagged_item::where('tag_id', '=', $this->id)->where('item_id', '=', $itemId)->delete();
	}

	public function items() {
		$output = array();
		return Tagged_item::where('tag_id', '=', $this->id)->get();
	}

}
