<?php

namespace AppBundle\Model;

class Note extends BaseItem {

	protected $diffableFields = array('title', 'body');
	protected $isVersioned = true;

}
