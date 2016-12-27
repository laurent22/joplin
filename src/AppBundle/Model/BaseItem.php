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

	static public function byId($itemTypeId, $itemId) {
		if ($itemTypeId == BaseItem::enumId('type', 'folder')) {
			return Folder::where('id', '=', $itemId)->first();
		} else if ($itemTypeId == BaseItem::enumId('type', 'note')) {
			return Note::where('id', '=', $itemId)->first();
		} else if ($itemTypeId == BaseItem::enumId('type', 'tag')) {
			return Tag::where('id', '=', $itemId)->first();
		}
		
		throw new \Exception('Unsupported item type: ' . $itemTypeId);
	}
	
}
