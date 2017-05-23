<?php

namespace AppBundle\Model;

class Folder extends BaseItem {

	protected $diffableFields = array('title');
	protected $isVersioned = true;

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

}
