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

	static protected $defaultValidationRules = array(
		'title' => array(
			array('type' => 'notEmpty'),
			array('type' => 'function', 'args' => array(array('AppBundle\Model\Folder', 'validateUniqueTitle'))),
		),
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

	static public function allByOwnerId($ownerId) {
		return Folder::where('owner_id', '=', $ownerId)->get();
	}

	static public function byTitle($ownerId, $title) {
		$folders = static::allByOwnerId($ownerId);
		foreach ($folders as $folder) {
			if ($folder->diffableField('title') == $title) return $folder;
		}
		return null;
	}

	static public function validateUniqueTitle($key, $rule, $object) {
		$title = $object->diffableField('title');
		$folder = self::byTitle($object->owner_id, $title);
		if ($folder && $folder->id == $object->id) return true;
		return array(
			'valid' => !$folder,
			'message' => sprintf('title "%s" is already in use', $title),
		);
	}

}
