<?php

function escapePathElement($element) {
	$valid = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ÀàÁáÂâÃãÄäÇçÈèÉéÊêËëÌìÍíÎîÏïÑnÒòÓóÔôÕõÖöŠšÚùÛúÜûÙüÝyŸÿŽz_- ().,';
	$output = '';
	$chars = preg_split('//u', $element, -1, PREG_SPLIT_NO_EMPTY); // Split a UTF-8 string into characters
	foreach ($chars as $c) {
		if (strpos($valid, $c) !== false) {
			$output .= $c;
		} else {
			$output .= rawurlencode($c);
		}
	}
	return $output;
}

function escapePath($path) {
	$output = '';
	$elements = preg_split('/[\\\\\/]/', $path);
	for ($i = 0; $i < count($elements); $i++) {
		$e = $elements[$i];
		if ($i > 0) $output .= '/';
		$output .= escapePathElement($e);
	}
	return $output;
}

class Api {

	private $sessionId = null;
	private $baseUrl = null;

	public function __construct($baseUrl) {
		$this->baseUrl = $baseUrl;
	}

	static public function createId($string) {
		// TODO: This needs to be unique per user
		return md5('gKcr0 ^L3UL^fJV%1IW~~/Q`.,WRAr</8@$.k|uyK-w^d:k|{h!%(};|)OY9^lu=' . $string);
	}

	public function setSessionId($sessionId) {
		$this->sessionId = $sessionId;
	}

	public function toCurlCmd($method, $url, $data = null) {
		$cmd = 'curl';

		$addMethod = true;
		if ($method == 'GET') $addMethod = false;
		if ($method == 'POST' && count($data)) $addMethod = false;
		if ($addMethod) $cmd .= ' -X ' . $method;

		if ($data) {
			foreach ($data as $k => $v) {
				$cmd .= ' -F "' . $k . '=' . rawurlencode($v) . '"';
			}
		}

		$cmd .= ' ' . "'" . $url . "'";
		return $cmd;
	}

	public function exec($method, $path, $query = null, $data = null) {
		$url = $this->baseUrl . '/' . $path;

		if (!$query) $query = array();
		if ($this->sessionId) $query['session'] = $this->sessionId;
		if (count($query)) $url .= '?' . http_build_query($query);

		$ch = curl_init($url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		if ($method == 'PATCH' || $method == 'PUT' || $method == 'DELETE') {
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
		}

		$cmd = $this->toCurlCmd($method, $url, $data);
		echo $cmd . "\n";

		$content = curl_exec($ch);
		curl_close($ch);

		$output = json_decode($content, true);
		if ($output === null) throw new Exception('Invalid response: ' . $content . "\n\nCommand: " . $cmd . "\n");
		if (isset($output['error'])) throw new Exception('API error: ' . $content . "\n\nCommand: " . $cmd . "\n");

		return $output;
	}

	public function login($email, $password, $clientId) {
		$method = 'POST';
		$path = 'sessions';
		$data = array(
			'email' => $email,
			'password' => $password,
			'client_id' => $clientId,
		);

		return $this->exec($method, $path, null, $data);
	}

}

class Config {

	protected $dirPath = null;

	public function __construct($dirPath) {
		$this->dirPath = $dirPath;
	}

	protected function load() {
		$c = @file_get_contents($this->dirPath . '/config.json');
		$c = json_decode($c, true);
		if ($c === null) $c = array();
		if (!isset($c['last_sync_id'])) $c['last_sync_id'] = 0;
		if (!isset($c['last_sync_time'])) $c['last_sync_time'] = 0;
		if (!isset($c['folder_items'])) $c['folder_items'] = array();
		if (!isset($c['client_id'])) $c['client_id'] = null;
		if (!isset($c['session_id'])) $c['session_id'] = null;
		return $c;
	}

	protected function save($c) {
		file_put_contents($this->dirPath . '/config.json', json_encode($c));
	}

	public function get($name) {
		$c = $this->load();
		if (!isset($c[$name])) throw new Exception('Invalid key name: ' . $name);
		return $c[$name];
	}

	public function set($name, $value) {
		$c = $this->load();
		$c[$name] = $value;
		$this->save($c);
	}

}

class FolderItem {

	private $title = '';
	private $body = '';
	private $id;
	private $parentId;
	private $isFolder;
	private $modTime;

	public function setTitle($v) { $this->title = $v; }
	public function setBody($v) { $this->body = $v; }
	public function setId($v) { $this->id = $v; }
	public function setParentId($v) { $this->parentId = $v; }
	public function setIsFolder($v) { $this->isFolder = $v; }
	public function setModTime($v) { $this->modTime = $v; }

	public function title() { return $this->title; }
	public function body() { return $this->body; }
	public function id() { return $this->id; }
	public function parentId() { return $this->parentId; }
	public function isFolder() { return $this->isFolder; }
	public function isNote() { return !$this->isFolder(); }
	public function modTime() { return $this->modTime; }

	public function toApiArray() {
		$output = array(
			'title' => $this->title(),
			'parent_id' => $this->parentId(),
		);
		if ($this->isNote()) $output['body'] = $this->body();
		return $output;
	}

	public function fromApiArray($type, $array) {
		$this->setTitle($array['title']);
		if ($type == 'note') $this->setBody($array['body']);
		$this->setId($array['id']);
		$this->setParentId($array['parent_id']);
		$this->setIsFolder($type == 'folder');
	}

}

class FolderItems {

	private $items = array();

	private function getFolderItems($dir, $parentId, &$output) {
		$paths = glob($dir . '/*');
		foreach ($paths as $path) {
			$isFolder = is_dir($path);
			$modTime = filemtime($path);

			$o = new FolderItem();
			$o->setTitle(basename($path));
			$o->setId(Api::createId($parentId . '_' . $o->title()));
			$o->setParentId($parentId);
			$o->setIsFolder($isFolder);
			$o->setModTime($modTime);

			if (!$isFolder) $o->setBody(file_get_contents($path));
			$output[] = $o;
			if ($isFolder) $this->getFolderItems($path, $o->id(), $output);
		}
	}

	public function fromPath($path) {
		$this->items = array();
		$this->getFolderItems($path, null, $this->items);
	}

	public function all() {
		return $this->items;
	}

	public function add($item) {
		$this->items[] = $item;
	}

	public function setById($id, $item) {
		$found = false;
		for ($i = 0; $i < count($this->items); $i++) {
			$it = $this->items[$i];
			if ($it->id() == $id) {
				$found = true;
				$this->items[$i] = $item;
				break;
			}
		}

		if (!$found) {
			$this->items[] = $item;
		}
	}

	public function byId($id) {
		foreach ($this->all() as $item) {
			if ($item->id() == $id) return $item;
		}
		return null;
	}

	public function itemFullPath($item) {
		if (!$item->parentId()) return $item->title();
		$parent = $this->byId($item->parentId());
		if (!$parent) throw new Exception('Cannot find parent with ID ' . $item->parentId());
		return escapePath($this->itemFullPath($parent) . '/' . $item->title());
	}

}

$shortopts = "";
$longopts = array(
    "config:",
    "sync",
);

$flags = getopt($shortopts, $longopts);

if (!isset($flags['config'])) $flags['config'] = '/home/laurent/src/notes/cli-client/.config';

$config = new Config($flags['config']);

$dataPath = '/home/laurent/src/notes/cli-client/test_' . $config->get('client_id');

$api = new Api('http://127.0.0.1:8000');
$session = $api->login('test@example.com', '12345678', $config->get('client_id'));
$api->setSessionId($session['id']);

if (array_key_exists('sync', $flags)) {
	$syncStartTime = time();
	$lastSyncTime = $config->get('last_sync_time');
	$folderItems = new FolderItems();
	$folderItems->fromPath($dataPath);

	// ------------------------------------------------------------------------------------------
	// Get latest changes from API
	// ------------------------------------------------------------------------------------------

	$response = $api->exec('GET', 'synchronizer', array('last_id' => $config->get('last_sync_id')));
	// $response = $api->exec('GET', 'synchronizer', array('last_id' => 80));

	$pathMap = array();
	$folders = array();
	$notes = array();
	$maxId = null;
	foreach ($response['items'] as $item) {
		$folderItem = new FolderItem();

		switch ($item['type']) {

			case 'create':
			case 'update':

				$resource = $api->exec('GET', $item['item_type'] . 's/' . $item['item_id']);
				$folderItem->fromApiArray($item['item_type'], $resource);
				break;

			default:

				throw new Exception('Unsupported action type: ' . $item['type']);

		}

		$folderItems->setById($folderItem->id(), $folderItem);

		$maxId = max($item['id'], $maxId);
	}

	foreach ($folderItems->all() as $item) {
		$relativePath = $folderItems->itemFullPath($item);
		$path = $dataPath . '/' . $relativePath;

		foreach (array('folder', 'note') as $itemType) {
			if ($item->isFolder() && $itemType == 'folder') {
				@mkdir($path, 0755, true); // Ignore "File exists" warning
				if (!is_dir($path)) throw new Exception('Could not create folder at ' . $path);
			}

			if ($item->isNote() && $itemType == 'note') {
				if ($item->body() !== file_get_contents($path)) {
					file_put_contents($path, $item->body());
				}
			}
		}

		$pathMap[$item->id()] = $relativePath;
	}

	// ------------------------------------------------------------------------------------------
	// Send changed notes and folders to API
	// ------------------------------------------------------------------------------------------

	foreach ($folderItems->all() as $item) {
		if ($item->modTime() < $lastSyncTime) continue;

		if ($item->isFolder()) {
			$api->exec('PUT', 'folders/' . $item->id(), null, $item->toApiArray());
		} else {
			$api->exec('PUT', 'notes/' . $item->id(), null, $item->toApiArray());
		}
	}

	$config->set('last_sync_time', $syncStartTime);
	$config->set('folder_items', json_encode($pathMap));
	if ($maxId !== null) $config->set('last_sync_id', $maxId);
}