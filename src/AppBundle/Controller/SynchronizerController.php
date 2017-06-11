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
		if (!$this->user() || !$this->session()) throw new UnauthorizedException();

		$lastChangeId = (int)$request->query->get('rev_id');
		$limit = (int)$request->query->get('limit');
		//$curl 'http://192.168.1.3/synchronizer?rev_id=6973&session=02d0e9ca42cbbc2d35efb1bc790b9eec'

		$actions = Change::changesDoneAfterId($this->user()->id, $this->session()->client_id, $lastChangeId, $limit);
		return static::successResponse($actions);
	}

}
