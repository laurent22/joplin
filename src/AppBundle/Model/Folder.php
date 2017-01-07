<?php

namespace AppBundle\Model;

class Folder extends BaseItem {

	protected $versionedFields = array('title');
	protected $isVersioned = true;

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
