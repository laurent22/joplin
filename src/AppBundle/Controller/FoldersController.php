<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\Folder;



use AppBundle\Model\BaseItem;

class FoldersController extends ApiController {

	/**
	 * @Route("/folders")
	 */
	public function allAction(Request $request) {
		if ($request->isMethod('GET')) {
			return static::successResponse(Folder::all());
		}

		if ($request->isMethod('POST')) {
			$folder = new Folder();
			$folder->fromPublicArray($request->request->all());
			$folder->owner_id = $this->user()->id;
			$folder->save();
			return static::successResponse($folder);
		}

		return static::errorResponse('Invalid method');
	}

	/**
	 * @Route("/folders/{id}")
	 */
	public function oneAction($id, Request $request) {
		$folder = Folder::byId(Folder::unhex($id));
		if (!$folder && !$request->isMethod('PUT')) return static::errorResponse('Not found', 0, 404);

		if ($request->isMethod('GET')) {
			return static::successResponse($folder);
		}

		if ($request->isMethod('PUT')) {
			if (!$folder) $folder = new Folder();
			$folder->fromPublicArray($this->putParameters());
			$folder->id = Folder::unhex($id);
			$folder->owner_id = $this->user()->id;
			$folder->save();
			return static::successResponse($folder);
		}

		if ($request->isMethod('PATCH')) {
			$data = $this->patchParameters();
			$folder->fromPublicArray($this->patchParameters());
			$folder->save();
			return static::successResponse($folder);
		}

		if ($request->isMethod('DELETE')) {
			$folder->delete();
			return static::successResponse(array('id' => $id));
		}

		return static::errorResponse('Invalid method');
	}

	/**
	 * @Route("/folders/{id}/notes")
	 */
	public function linkAction($id, Request $request) {
		$folder = Folder::byId(Folder::unhex($id));
		if (!$folder) return static::errorResponse('Not found', 0, 404);

		if ($request->isMethod('GET')) {
			return static::successResponse($folder->notes());
		}

		if ($request->isMethod('POST')) {
			$ids = $this->multipleValues($request->request->get('id'));
			if (!count($ids)) static::errorResponse('id parameter is missing');
			$ids = Folder::unhex($ids);
			$folder->add($ids);

			return static::successResponse();
		}

		return static::errorResponse('Invalid method');
	}

}
