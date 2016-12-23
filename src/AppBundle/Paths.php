<?php

namespace AppBundle;

class Paths {

	private $rootDir_ = null;

	public function __construct($rootDir) {
		$this->rootDir_ = $rootDir;
	}

	public function rootDir() {
		return $this->rootDir_;
	}

	public function dataDir() {
		return $this->rootDir() . '/data';
	}

	public function uploadsDir() {
		return $this->dataDir() . '/uploads';
	}

}