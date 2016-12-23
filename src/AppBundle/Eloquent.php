<?php

namespace AppBundle;

class Eloquent {

	private $capsule_ = null;

	public function __construct($mimeTypes, $paths) {
		$this->capsule_ = new \Illuminate\Database\Capsule\Manager();

		$this->capsule_->addConnection([
			'driver'    => 'mysql',
			'host'      => 'localhost',
			'database'  => 'notes',
			'username'  => 'root',
			'password'  => 'pass',
			'charset'   => 'utf8',
			'collation' => 'utf8_unicode_ci',
			'prefix'    => '',
		]);

		$this->capsule_->bootEloquent();

		// In order to keep things lightweight, the models aren't part of Symfony dependency
		// injection framework, so any service required by a model needs to be injected here. 
		Model\File::$mimeTypes = $mimeTypes;
		Model\File::$paths = $paths;
	}

	public function connection() {
		return $this->capsule_->getConnection('default');
	}

}