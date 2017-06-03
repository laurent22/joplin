<?php

namespace AppBundle;

class Eloquent {

	private $capsule_ = null;

	public function __construct($dbParams, $mimeTypes, $paths, $cache) {
		// TODO: find better way to pass around test db config
		if (isset($_SERVER['JOPLIN_TESTING']) && $_SERVER['JOPLIN_TESTING']) {
			$dbParams = $_SERVER['JOPLIN_TESTING_DB_CONFIG'];
		}

		$this->capsule_ = new \Illuminate\Database\Capsule\Manager();

		$dbParamsDefaults = array(
			'driver'    => 'mysql',
			'charset'   => 'utf8',
			'collation' => 'utf8_unicode_ci',
			'prefix'    => '',
		);

		$dbParams = array_merge($dbParamsDefaults, $dbParams);

		$this->capsule_->addConnection($dbParams);
		$this->capsule_->bootEloquent();

		// Fix as described in https://github.com/laravel/framework/issues/6322
		$this->capsule_->getContainer()->bind('Illuminate\Contracts\Debug\ExceptionHandler', 'AppBundle\Exception\ExceptionHandler');

		// In order to keep things lightweight, the models aren't part of Symfony dependency
		// injection framework, so any service required by a model needs to be injected here. 
		Model\File::$mimeTypes_ = $mimeTypes;
		Model\File::$paths_ = $paths;
		Model\BaseModel::$cache_ = $cache;
	}

	public function connection() {
		return $this->capsule_->getConnection('default');
	}

}