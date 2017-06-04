<?php

namespace AppBundle\Model;

class Tagged_item extends BaseModel {

	static protected $fields = array(
		'id' => null,
		'tag_id' => null,
		'item_id' => null,
		'item_type' => null,
		'created_time' => null,
		'updated_time' => null,
	);

}
