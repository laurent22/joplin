<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use AppBundle\Model\BaseModel;
use AppBundle\Model\Session;
use AppBundle\Model\User;
use AppBundle\Exception\ForbiddenException;
use AppBundle\Exception\UnauthorizedException;
use Illuminate\Database\Eloquent\Collection;
use AppBundle\Exception\BaseException;

abstract class ApiController extends Controller {

	protected $db = null;
	protected $session = null;
	protected $user = null;

	private $useTestUserAndSession = false;
	private $testClientNum = 1;

	public function setContainer(\Symfony\Component\DependencyInjection\ContainerInterface $container = null) {
		parent::setContainer($container);

		set_exception_handler(function($e) {
			if ($e instanceof BaseException) {
				$r = $e->toJsonResponse();
				$r->send();
				echo "\n";
			} else {
				$r = array(
					'error' => $e->getMessage(),
					'code' => 0,
					'type' => 'Exception',
					//'trace' => $e->getTraceAsString(),
				);
				$response = new JsonResponse($r);
				$response->setStatusCode(500);
				$response->send();
				echo "\n";


				// $msg = array();
				// $msg[] = 'Exception: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine();
				// $msg[] = '';
				// $msg[] = $e->getTraceAsString();
				// echo implode("\n", $msg);
				// echo "\n";
			}
		});

		// HACK: get connection once here so that it's initialized and can 
		// be accessed from models.
		$this->db = $this->get('app.eloquent')->connection();

		$s = $this->session();

		// TODO: find less hacky way to get request path and method
		$requestPath = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
		$requestPath = ltrim($requestPath, '/');
		$requestPath = rtrim($requestPath, '?');
		$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

		$sessionRequired = true;
		if ($method == 'POST' && $requestPath == 'sessions') $sessionRequired = false;
		if ($method == 'POST' && $requestPath == 'users') $sessionRequired = false;

		// TODO: to keep it simple, only respond to logged in users, but in theory some data
		// could be public.
		if ($sessionRequired && (!$s || !$this->user())) throw new UnauthorizedException('A session and user are required');

		BaseModel::setClientId($s ? $s->client_id : 0);
	}

	protected function session() {
		if ($this->useTestUserAndSession) {
			$session = Session::find(Session::unhex('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'));
			if ($session) return $session;
			// if ($session) {
			// 	$ok = $session->delete();
			// 	if (!$ok) throw new \Exception("Cannot delete session");
			// }
			$session = new Session();
			$session->id = Session::unhex('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
			$session->owner_id = Session::unhex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
			$session->client_id = Session::unhex($this->testClientNum == 1 ? 'C1C1C1C1C1C1C1C1C1C1C1C1C1C1C1C1' : 'C2C2C2C2C2C2C2C2C2C2C2C2C2C2C2C2');
			$session->save();
			return $session;
		}

		if ($this->session) return $this->session;
		$request = $this->container->get('request_stack')->getCurrentRequest();
		$this->session = Session::find(BaseModel::unhex($request->query->get('session')));
		return $this->session;
	}

	protected function user() {
		if ($this->useTestUserAndSession) {
			$user = User::find(User::unhex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'));
			if (!$user) {
				$user = new User();
				$user->id = User::unhex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
				$user->owner_id = $user->id;
				$user->email = 'test@example.com';
				$user->password = Session::hashPassword('12345678');
				$user->save();
			}
			return $user;
		}


		if ($this->user) return $this->user;
		$s = $this->session();
		$this->user = $s ? $s->owner() : null;
		return $this->user;
	}

	protected function userId() {
		$u = $this->user();
		return $u ? $u->id : 0;
	}

	protected function aclCheck($resource) {
		if (!is_array($resource)) $resource = array($resource);
		$user = $this->user();
		if (!$user) throw new ForbiddenException();
		foreach ($resource as $r) {
			if (!isset($r->owner_id)) continue;
			if ($r->owner_id != $user->id) throw new ForbiddenException();
		}
	}

	static protected function successResponse($data = null) {
		$output = BaseModel::anythingToPublicArray($data);
		return new JsonResponse($output);
	}

	static protected function errorResponse($message, $errorCode = 0, $httpCode = 400) {
		$o = array('error' => $message, 'code' => $errorCode);
		$response = new JsonResponse($o);
		$response->setStatusCode($httpCode);
		return $response;
	}

	protected function multipleValues($v) {
		if ($v === null || $v === false) return array();
		if (strpos((string)$v, ';') === false) return array($v);
		return explode(';', $v);
	}

	// PHP doesn't parse PATCH and PUT requests automatically, so it needs
	// to be done manually.
	// http://stackoverflow.com/a/5488449/561309
	protected function patchParameters() {
		$output = array();
		$input = file_get_contents('php://input');

		// Two content types are supported:
		//
		// multipart/form-data; boundary=------------------------68670b1a1565e787
		// application/x-www-form-urlencoded

		if (!isset($_SERVER['CONTENT_TYPE']) || $_SERVER['CONTENT_TYPE'] == 'application/x-www-form-urlencoded') {
			parse_str($input, $output);
		} else {
			if (!isset($_SERVER['CONTENT_TYPE'])) throw new \Exception("Cannot decode input data");
			preg_match('/boundary=(.*)$/', $_SERVER['CONTENT_TYPE'], $matches);
			if (!isset($matches[1])) throw new \Exception("Cannot decode input data");
			$boundary = $matches[1];
			$blocks = preg_split("/-+$boundary/", $input);
			array_pop($blocks);
			foreach ($blocks as $id => $block) {
				if (empty($block)) continue;

				// you'll have to var_dump $block to understand this and maybe replace \n or \r with a visibile char

				// parse uploaded files
				if (strpos($block, 'application/octet-stream') !== FALSE) {
					// match "name", then everything after "stream" (optional) except for prepending newlines 
					preg_match("/name=\"([^\"]*)\".*stream[\n|\r]+([^\n\r].*)?$/s", $block, $matches);
				} else {
					// match "name" and optional value in between newline sequences
					preg_match('/name=\"([^\"]*)\"[\n|\r]+([^\n\r].*)?\r$/s', $block, $matches);
				}
				if (!isset($matches[2])) {
					// Regex above will not find anything if the parameter has no value. For example
					// "parent_id" below:

					// Content-Disposition: form-data; name="parent_id"
					//
					//
					// Content-Disposition: form-data; name="id"
					//
					// 54ad197be333c98778c7d6f49506efcb

					$output[$matches[1]] = '';
				} else {
					$output[$matches[1]] = $matches[2];
				}
			}
		}

		return $output;
	}

	protected function putParameters() {
		return $this->patchParameters();
	}

}
