<?php

namespace AppBundle\Model;

class BaseItem extends BaseModel {

	public $useUuid = true;
	public $incrementing = false;

	static protected $enums = array(
		'type' => array('folder', 'note', 'tag'),
	);

	public function itemTypeId() {
		$typeName = null;
		switch (get_called_class()) {
			case 'AppBundle\Model\Folder':
				$typeName = 'folder';
				break;
			case 'AppBundle\Model\Note':
				$typeName = 'note';
				break;
			case 'AppBundle\Model\Tag':
				$typeName = 'tag';
				break;
		}

		if (!$typeName) throw new \Exception('Unknown item class: ' . get_called_class());
		
		return self::enumId('type', $typeName);
	}

	static public function byTypeAndId($itemTypeId, $itemId) {
		if ($itemTypeId == BaseItem::enumId('type', 'folder')) {
			return Folder::find($itemId);
		} else if ($itemTypeId == BaseItem::enumId('type', 'note')) {
			return Note::find($itemId);
		} else if ($itemTypeId == BaseItem::enumId('type', 'tag')) {
			return Tag::find($itemId);
		}
		
		throw new \Exception('Unsupported item type: ' . $itemTypeId);
	}

	// Use only if type of item is unknown
	static public function anyById($itemId) {
		$folder = Folder::find($itemId);
		if ($folder) return $folder;
		return Note::find($itemId);
	}
	
}
