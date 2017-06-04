<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use AppBundle\Controller\ApiController;
use AppBundle\Model\User;
use AppBundle\Model\Session;
use AppBundle\Model\Change;
use AppBundle\Model\BaseItem;
use AppBundle\Exception\ValidationException;


use AppBundle\Diff;

use DiffMatchPatch\DiffMatchPatch;



class UsersController extends ApiController {

	/**
	 * @Route("/users")
	 */
	public function allAction(Request $request) {
		if ($request->isMethod('POST')) {
			$user = new User();
			$user->fromPublicArray($request->request->all());
			$user->validate();
			$user->password = Session::hashPassword($user->password); // Password is only hashed now so that validation can check its length
			$user->save();
			return static::successResponse($user->toPublicArray());
		}

		return static::errorResponse('Invalid method');
	}

	/**
	 * @Route("/users/{id}")
	 */
	public function oneAction($id, Request $request) {
		$user = User::find(User::unhex($id));
		if (!$user) return static::errorResponse('Not found', 0, 404);
		$this->aclCheck($user);
		return static::successResponse($user);
	}

}
