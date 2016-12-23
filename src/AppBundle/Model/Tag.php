<?php

namespace AppBundle\Model;

class Tag extends BaseItem {

	// A star has the exact same behaviour as a tag, except
	// it might be diplayed differently.
	static private $starTag_ = null;

	static public function starTag($ownerId) {
		if (self::$starTag_) return self::$starTag_;
		$t = Tag::where('internal', '=', 1)
		        ->where('title', '=', 'star')
		        ->first();

		if (!$t) {
			$t = new Tag();
			$t->title = 'star';
			$t->internal = 1;
			$t->owner_id = $ownerId;
			$t->save();
		}

		self::$starTag_ = $t;
		return self::$starTag_;
	}

	static public function star($item) {
		self::starTag($item->owner_id)->add($item);
	}

	static public function unstar($item) {
		self::starTag($item->owner_id)->remove($item);
	}

	static public function isStarred($item) {
		return self::starTag($item->owner_id)->includes($item);
	}

	static public function starredItems($ownerId) {
		return self::starTag($ownerId)->items();
	}

	public function add($item) {
		if ($this->includes($item)) return;

		$t = new Tagged_item();
		$t->tag_id = $this->id;
		$t->item_id = $item->id;
		$t->item_type = $item->itemTypeId();
		$t->save();
	}

	public function includes($item) {
		return !!Tagged_item::where('item_type', '=', $item->itemTypeId())
		                    ->where('item_id', '=', $item->id)
		                    ->first();
	}

	public function remove($item) {
		Tagged_item::where('item_type', '=', $item->itemTypeId())
		           ->where('item_id', '=', $item->id)
		           ->delete();
	}

	// TODO: retrieve items in one SQL query
	public function items() {
		$output = array();
		$taggedItems = Tagged_item::where('tag_id', '=', $this->id)->get();
		foreach ($taggedItems as $taggedItem) {
			$item = BaseItem::byId($taggedItem->item_type, $taggedItem->item_id);
			$output[] = $item;
		}
		return $output;
	}

}
