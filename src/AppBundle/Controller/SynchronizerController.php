<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\Change;
use AppBundle\Exception\UnauthorizedException;

class SynchronizerController extends ApiController {

	/**
	 * @Route("/synchronizer")
	 */
	public function allAction(Request $request) {
		$lastChangeId = (int)$request->query->get('rev_id');

		if (!$this->user() || !$this->session()) throw new UnauthorizedException();

		$actions = Change::changesDoneAfterId($this->user()->id, $this->session()->client_id, $lastChangeId);
		return static::successResponse($actions);
	}

}
