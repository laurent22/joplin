<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\BaseModel;
use AppBundle\Model\File;
use AppBundle\Exception\ValidationException;

class FilesController extends ApiController {

	/**
	 * @Route("/files")
	 */
	public function allAction(Request $request) {
		if ($request->isMethod('POST')) {
			if (!isset($_FILES['file'])) throw new ValidationException('Missing "file" parameter');

			$file = new File();
			$file->moveUploadedFile($_FILES['file']);
			$file->owner_id = $this->userId();
			$file->save();

			return static::successResponse($file);
		}

		return static::errorResponse('Invalid method');
	}

	/**
	 * @Route("/files/{id}")
	 */
	public function oneAction($id, Request $request) {
		$file = File::find(File::unhex($id));
		if (!$file) return static::errorResponse('Not found', 0, 404);

		if ($request->isMethod('GET')) {
			return static::successResponse($file);
		}

		if ($request->isMethod('PATCH')) {
			$data = $this->patchParameters();
			foreach ($data as $n => $v) {
				$file->{$n} = $v;
			}
			$file->save();
			return static::successResponse($file);
		}

		if ($request->isMethod('DELETE')) {
			$file->delete();
			return static::successResponse();
		}

		return static::errorResponse('Invalid method');
	}

}
