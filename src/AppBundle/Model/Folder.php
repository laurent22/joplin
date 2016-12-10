<?php

namespace AppBundle\Model;

class Folder extends FolderItem {

	protected $versionedFields = array('title');

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
