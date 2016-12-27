<?php

namespace AppBundle\Model;

class FolderItem extends BaseModel {

	public $useUuid = true;
	public $incrementing = false;

	static protected $enums = array(
		'type' => array('folder', 'note'),
	);

}
