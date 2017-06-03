<?php

namespace AppBundle\Model;

class Note extends BaseItem {

	protected $isVersioned = true;

	static protected $diffableFields = array('title', 'body');
	
	static protected $fields = array(
		'id' => null,
		'completed' => null,
		'created_time' => null,
		'updated_time' => null,
		'latitude' => null,
		'longitude' => null,
		'altitude' => null,
		'parent_id' => null,
		'owner_id' => null,
		'is_encrypted' => null,
		'encryption_method' => null,
		'order' => null,
		'is_todo' => null,
		'todo_due' => null,
		'todo_completed' => null,
		'application_data' => null,
		'author' => null,
		'source' => null,
		'source_application' => null,
		'source_url' => null,
	);

	static public function filter($data, $keepId = false) {
		$output = parent::filter($data);
		if (array_key_exists('longitude', $output)) $output['longitude'] = (string)number_format($output['longitude'], 8);
		if (array_key_exists('latitude', $output)) $output['latitude'] = (string)number_format($output['latitude'], 8);
		if (array_key_exists('altitude', $output)) $output['altitude'] = (string)number_format($output['altitude'], 4);
		return $output;
	}

}
