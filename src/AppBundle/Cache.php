<?php

namespace AppBundle;

use Symfony\Component\Cache\Adapter\FilesystemAdapter;

class Cache {

	private $cacheDir_ = null;
	private $adapter_ = null;

	public function __construct($kernelCacheDir) {
		$this->cacheDir_ = $kernelCacheDir . '/cache_service';
		if (!file_exists($this->cacheDir_)) mkdir($this->cacheDir_, 0755, true);
	}

	private function adapter() {
		if (!$this->adapter_) $this->adapter_ = new FilesystemAdapter('', 0, $this->cacheDir_);
		return $this->adapter_;
	}

	public function get($k) {
		$item = $this->adapter()->getItem($k);
		return $item->isHit() ? json_decode($item->get(), true) : null;
	}

	public function set($k, $v, $expiryTime = null) {
		$item = $this->adapter()->getItem($k);
		$item->set(json_encode($v));
		if ($expiryTime) $item->expiresAfter($expiryTime);
		$this->adapter()->save($item);
		return $item;
	}

	public function delete($k) {
		return $this->adapter()->deleteItem($k);
	}

	public function getOrSet($k, $func, $expiryTime = null) {
		$v = $this->get($k);
		if ($v === null) {
			$v = $func();
			$this->set($k, $v, $expiryTime);
		}
		return $v;
	}

}