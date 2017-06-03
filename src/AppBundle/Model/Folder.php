<?php

namespace AppBundle\Model;

class Folder extends BaseItem {

	protected $isVersioned = true;

	static protected $diffableFields = array('title');

	static protected $fields = array(
		'id' => null,
		'created_time' => null,
		'updated_time' => null,
		'parent_id' => null,
		'owner_id' => null,
		'is_encrypted' => null,
		'encryption_method' => null,
		'is_default' => null,
	);

	public function add($ids) {
		$notes = Note::find($ids);
		foreach ($notes as $note) {
			$note->parent_id = $this->id;
			$note->save();
		}
	}

	public function notes() {
		return Note::where('parent_id', '=', $this->id)->get();
	}

	static public function countByOwnerId($ownerId) {
		return Folder::where('owner_id', '=', $ownerId)->count();
	}

	public function delete() {
		if (self::countByOwnerId($this->owner_id) <= 1) throw new \Exception('Cannot delete the last folder');
		
		$notes = $this->notes();
		foreach ($notes as $note) {
			$note->delete();
		}
		return parent::delete();
	}

}
