<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\Tag;
use AppBundle\Model\BaseItem;
use AppBundle\Exception\ValidationException;

class TagsController extends ApiController {

	/**
	 * @Route("/tags")
	 */
	public function allAction(Request $request) {
		if ($request->isMethod('POST')) {
			$data = $request->request->all();

			$tag = new Tag();
			$tag->fromPublicArray($data);
			$tag->owner_id = $this->user()->id;
			$tag->validate();
			$tag->save();
			return static::successResponse($tag->toPublicArray());
		}

		throw new MethodNotAllowedException();
	}

	/**
	 * @Route("/tags/{id}")
	 */
	public function oneAction($id, Request $request) {
		$tag = Tag::find(Tag::unhex($id));
		if (!$tag && !$request->isMethod('PUT')) throw new NotFoundException();

		if ($request->isMethod('GET')) {
			return static::successResponse($tag);
		}

		$query = $request->query->all();
		if ($tag && isset($query['rev_id'])) $tag->revId = $query['rev_id'];

		if ($request->isMethod('PUT')) {
			$isNew = !$tag;
			if ($isNew) $tag = new Tag();
			$data = Tag::filter($this->putParameters());
			$tag->fromPublicArray($data);
			$tag->id = Tag::unhex($id);
			$tag->owner_id = $this->user()->id;
			$tag->setIsNew($isNew);
			$tag->save();
			return static::successResponse($tag);
		}

		if ($request->isMethod('PATCH')) {
			$data = $this->patchParameters();
			$tag->fromPublicArray($data);
			$tag->validate();
			$tag->save();
			return static::successResponse($tag);
		}

		if ($request->isMethod('DELETE')) {
			$tag->delete();
			return static::successResponse();
		}

		throw new MethodNotAllowedException();
	}

	/**
	 * @Route("/tags/{id}/items/{itemId}")
	 */
	public function linkedItemAction($id, $itemId = null, Request $request = null) {
		$tag = Tag::byId(Tag::unhex($id));
		if (!$tag) throw new NotFoundException();

		if ($request->isMethod('GET')) {
			return static::successResponse($tag->items());
		}

		if ($request->isMethod('POST')) {
			$item = $request->request->all();
			if (!isset($item['id'])) throw new ValidationException('Item "id" parameter is missing');
			$itemId = $item['id'];
			$item = BaseItem::anyById(BaseItem::unhex($itemId));

			if (!$item) throw new ValidationException('Item not found: ' . $itemId);

			$tag->add($item);

			return static::successResponse($tag);
		}

		if ($request->isMethod('DELETE')) {
			$tag->remove(BaseItem::unhex($itemId));
			return static::successResponse($tag);
		}

		throw new MethodNotAllowedException();
	}

	
}
