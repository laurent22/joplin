<?php

namespace AppBundle\Model;

class File extends BaseModel {

	static public $mimeTypes = null;
	static public $paths = null;

	public $useUuid = true;
	public $incrementing = false;

	public function toPublicArray() {
		$output = parent::toPublicArray();
		$output['mime_type'] = self::$mimeTypes->idToString($this->mime_type);
		return $output;
	}

	public function delete() {
		@unlink($this->path());
		parent::delete();
	}

	public function path() {
		return self::$paths->uploadsDir() . '/' . BaseModel::hex($this->id);
	}

	static public function pathForId($id) {
		return self::$paths->uploadsDir() . '/' . $id;
	}

	public function moveUploadedFile($file) {
		if (isset($file['error']) && $file['error']) throw new \Exception('Cannot upload file: ' . $file['error']);

		$filePath = $file['tmp_name'];
		$originalName = $file['name'];
		$id = BaseModel::createId();

		$targetPath = self::$paths->uploadsDir() . '/' . BaseModel::hex($id);
		if (file_exists($targetPath)) throw new \Exception('Hash collision'); // Shouldn't happen

		if (!@move_uploaded_file($filePath, $targetPath)) throw new \Exception('Unknown error - file could not be uploaded.');

		$this->id = $id;
		$this->title = $originalName;
		$this->original_name = $originalName;
		$this->mime_type = self::$mimeTypes->idFromPath($targetPath);

		$this->setIsNew(true);
	}

}
