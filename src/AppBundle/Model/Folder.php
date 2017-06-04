<?php

namespace AppBundle\Model;

class Folder extends BaseItem {

	protected $isVersioned = true;

	static protected $diffableFields = array('title');

	static protected $fields = array(
		'id' => array('public' => 'string'),
		'created_time' => array('public' => 'int'),
		'updated_time' => array('public' => 'int'),
		'parent_id' => array('public' => 'string'),
		'owner_id' => array('public' => 'string'),
		'is_encrypted' => array('public' => 'bool'),
		'encryption_method' => array('public' => 'string'),
		'is_default' => array('public' => 'bool'),
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

	static public function defaultFolder($ownerId) {
		return self::where('owner_id', '=', $ownerId)->where('is_default', '=', 1)->first();
	}

	public function delete() {
		if (self::countByOwnerId($this->owner_id) <= 1) throw new \Exception('Cannot delete the last folder');
		
		$notes = $this->notes();
		foreach ($notes as $note) {
			$note->delete();
		}
		return parent::delete();
	}

	public function save(Array $options = array()) {
		$dirty = $this->getDirty();
		
		$output = parent::save($options);

		// If the folder was set to be the new default, set all the other folders to non-default.
		if ($output && isset($dirty['is_default'])) {
			if (!!$dirty['is_default']) {
				self::where('owner_id', '=', $this->owner_id)->where('id', '!=', $this->id)->update(array('is_default' => 0));
			}
		}

		return $output;
	}

}
