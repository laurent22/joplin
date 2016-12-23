<?php

namespace AppBundle;

class MimeTypes {

	private $mimeTypes_ = null;
	private $paths_ = null;
	private $defaultMimeType_ = 'application/octet-stream';
	private $defaultMimeTypeId_ = null;

	public function __construct($paths) {
		$this->paths_ = $paths;
	}

	// Get the mime type from the file extension, if any, or from
	// the file content. The second check will be skipped if the
	// file doesn't exists.
	public function idFromPath($filePath) {
		$ext = pathinfo($filePath, PATHINFO_EXTENSION);
		$r = $this->extensionToMimeTypeId($ext);
		if ($r !== $this->defaultMimeTypeId()) return $r;

		// Else try to get the mime type from the binary content
		if (!file_exists($filePath)) return $this->defaultMimeTypeId();

		$finfo = finfo_open(FILEINFO_MIME_TYPE);
		$r = finfo_file($finfo, $filePath);
		finfo_close($finfo);
		return $r === false ? $this->defaultMimeTypeId() : $this->stringToId($r);
	}

	private function loadMimeTypes() {
		if ($this->mimeTypes_) return;
		$path = $this->paths_->dataDir() . '/mime_types.php';
		if (!file_exists($path)) throw new \Exception(sprintf('File not found: "%s"', $path));
		$this->mimeTypes_ = require $path;
	}

	public function defaultMimeTypeId() {
		if ($this->defaultMimeTypeId_) return $this->defaultMimeTypeId_;
		$this->loadMimeTypes();
		$this->defaultMimeTypeId_ = $this->stringToId($this->defaultMimeType_);
		return $this->defaultMimeTypeId_;
	}

	public function defaultMimeType() {
		return $this->defaultMimeType_;
	}

	public function idToString($id) {
		$this->loadMimeTypes();
		$id = (int)$id;
		if (!isset($this->mimeTypes_[$id])) throw new \Exception(sprintf('Invalid MIME type ID: %s', $id));
		return $this->mimeTypes_[$id]['t'];
	}

	public function stringToId($mimeType) {
		$this->loadMimeTypes();
		$mimeType = strtolower(trim($mimeType));
		if (!$mimeType) return $this->defaultMimeTypeId();

		foreach ($this->mimeTypes_ as $id => $o) {
			if ($o['t'] == $mimeType) return $id;
		}

		return $this->defaultMimeTypeId();
	}

	private function extensionToMimeTypeId($ext) {
		$this->loadMimeTypes();
		$ext = strtolower(trim($ext));
		if (!$ext) return $this->defaultMimeTypeId();

		foreach ($this->mimeTypes_ as $id => $o) {
			foreach ($o['e'] as $e) {
				if ($ext == $e) return $id;
			}
		}

		return $this->defaultMimeTypeId();
	}

}