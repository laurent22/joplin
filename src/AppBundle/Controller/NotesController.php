<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\Note;
use AppBundle\Exception\NotFoundException;
use AppBundle\Exception\MethodNotAllowedException;

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

		throw new MethodNotAllowedException();
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

		$query = $request->query->all();
		if ($note && isset($query['rev_id'])) $note->revId = $query['rev_id'];

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
			$note->fromPublicArray($this->patchParameters());
			$note->save();
			return static::successResponse($note);
		}

		if ($request->isMethod('DELETE')) {
			$note->delete();
			return static::successResponse();
		}

		throw new MethodNotAllowedException();
	}

}
