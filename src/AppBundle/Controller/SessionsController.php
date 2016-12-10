<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\User;
use AppBundle\Model\Session;
use AppBundle\Exception\NotFoundException;
use AppBundle\Exception\MethodNotAllowedException;


use AppBundle\Model\Action;

class SessionsController extends ApiController {

	/**
	 * @Route("/sessions")
	 */
	public function allAction(Request $request) {
		if ($request->isMethod('POST')) {
			$data = $request->request->all();
			// Note: the login method will throw an exception in case of failure
			$session = Session::login($data['email'], $data['password'], Session::unhex($data['client_id']));
			return static::successResponse($session);
		}

		throw new MethodNotAllowedException();
	}

	/**
	 * @Route("/sessions/{id}", name="one_session")
	 */
	public function oneAction($id, Request $request) {
		$session = Session::find(Session::unhex($id));
		if (!$session) throw new NotFoundException();
		return static::successResponse($session);
	}

}
