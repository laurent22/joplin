<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\Folder;
use AppBundle\Exception\NotFoundException;
use AppBundle\Exception\MethodNotAllowedException;

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
			$folder->validate();
			$folder->save();
			return static::successResponse(Folder::find($folder->id));
		}

		throw new MethodNotAllowedException();
	}

	/**
	 * @Route("/folders/{id}")
	 */
	public function oneAction($id, Request $request) {
		$folder = Folder::byId(Folder::unhex($id));
		if (!$folder && !$request->isMethod('PUT')) throw new NotFoundException();

		if ($request->isMethod('GET')) {
			return static::successResponse($folder);
		}

		$query = $request->query->all();
		if ($folder && isset($query['rev_id'])) $folder->revId = $query['rev_id'];

		if ($request->isMethod('PUT')) {
			$isNew = !$folder;
			if ($isNew) $folder = new Folder();
			$folder->fromPublicArray(Folder::filter($this->putParameters()));
			$folder->id = Folder::unhex($id);
			$folder->owner_id = $this->user()->id;
			$folder->setIsNew($isNew);
			$folder->validate();
			$folder->save();
			return static::successResponse($folder);
		}

		if ($request->isMethod('PATCH')) {
			$data = $this->patchParameters();
			$folder->fromPublicArray(Folder::filter($this->patchParameters()));
			$folder->id = Folder::unhex($id);
			$folder->validate();
			$folder->save();
			return static::successResponse($folder);
		}

		if ($request->isMethod('DELETE')) {
			$folder->delete();
			return static::successResponse(array('id' => $id));
		}

		throw new MethodNotAllowedException();
	}

	/**
	 * @Route("/folders/{id}/notes")
	 */
	public function linkAction($id, Request $request) {
		$folder = Folder::byId(Folder::unhex($id));
		if (!$folder) throw new NotFoundException();

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

		throw new MethodNotAllowedException();
	}

}
