<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\Note;
use AppBundle\Exception\NotFoundException;

class NotesController extends ApiController {

	/**
	 * @Route("/notes")
	 */
	public function allAction(Request $request) {
		if ($request->isMethod('POST')) {
			$note = new Note();
			$note->fromPublicArray($request->request->all());
			$note->owner_id = $this->user()->id;
			$note->save();
			return static::successResponse($note->toPublicArray());
		}

		return static::errorResponse('Invalid method');
	}

	/**
	 * @Route("/notes/{id}")
	 */
	public function oneAction($id, Request $request) {
		$note = Note::find(Note::unhex($id));
		if (!$note && !$request->isMethod('PUT')) throw new NotFoundException();	

		if ($request->isMethod('GET')) {
			return static::successResponse($note);
		}

		if ($request->isMethod('PUT')) {
			$isNew = !$note;
			if ($isNew) $note = new Note();
			$data = Note::filter($this->putParameters());
			$note->fromPublicArray($data);
			$note->id = Note::unhex($id);
			$note->owner_id = $this->user()->id;
			$note->setIsNew($isNew);
			$note->save();
			return static::successResponse($note);
		}

		if ($request->isMethod('PATCH')) {
			$data = Note::filter($this->patchParameters());
			$note->fromPublicArray($data);
			$note->id = Note::unhex($id);
			$note->save();
			return static::successResponse($note);
		}

		if ($request->isMethod('DELETE')) {
			$note->delete();
			return static::successResponse();
		}

		return static::errorResponse('Invalid method');
	}

}
