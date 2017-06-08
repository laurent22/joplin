<?php

namespace AppBundle\Model;

use \Illuminate\Database\Eloquent\Model;
use \Illuminate\Support\Facades\DB;
use \Illuminate\Database\Eloquent\Collection;
use AppBundle\Exception\ValidationException;

class BaseModel extends \Illuminate\Database\Eloquent\Model {

	static public $cache_ = null;

	public $timestamps = false;
	public $useUuid = false;
	public $revId = 0;

	// Diffable fields are those for which a diff is recorded on each change
	// (such as the title or body of a note). The value of these fields is
	// (currently) not recorded anywhere as-is - it needs to be rebuilt based on
	// the diffs. The advantage of these fields is that they can be modified
	// from different clients and the final value will be set correctly via
	// three-way merge.
	// These special fields need to be get and set via diffableField() and 
	// setDiffableField()
	protected $changedDiffableFields = array();
	static protected $diffableFields = array();

	protected $isVersioned = false;
	private $isNew = null;

	static private $clientId = null;
	static protected $enums = array();
	static protected $defaultValidationRules = array();
	static protected $defaultValidationMessages = array(
		'required' => '{key} is required',
		'notEmpty' => '{key} cannot be empty',
		'minLength' => '{key} must be at least {arg0} characters long',
		'maxLength' => '{key} must not be longer than {arg0} characters',
		'function' => '{key} is invalid',
	);

	public function __construct($attributes = array()) {
		parent::__construct($attributes);
	}

	static protected function cache() {
		return self::$cache_;
	}

	static public function setClientId($clientId) {
		self::$clientId = $clientId;
	}

	static public function clientId() {
		return self::$clientId;
	}

	static public function anythingToAsciiTable($data, $fields = null) {
		$data = self::anythingToPublicArray($data);
		if (!count($data)) return '';
		$header = array();
		$r = $data[0];
		foreach ($r as $k => $v) {
			$header[] = $k;
		}

		$lengths = array();
		foreach ($header as $f) {
			$lengths[$f] = max(strlen($f), self::fieldMaxLength($f, $data));
		}

		if (!$fields) {
			$fields = $header;
		} else {
			$header = $fields;
		}

		$rows = array();

		$dividers = array();
		$row = array();
		foreach ($header as $k) {
			$row[] = str_pad($k, $lengths[$k]);
		}
		$rows[] = $row;
		$dividers[] = ' | ';

		$row = array();
		foreach ($header as $k) {
			$row[] = str_repeat('-', $lengths[$k]);
		}
		$rows[] = $row;
		$dividers[] = '-|-';

		foreach ($data as $r) {
			$row = array();
			foreach ($r as $k => $v) {
				if (!in_array($k, $fields)) continue;
				$row[$k] = str_pad($v, $lengths[$k]);
			}
			$rows[] = $row;
			$dividers[] = ' | ';
		}

		$i = 0;
		$output = '';
		foreach ($rows as $row) {
			$line = '';
			foreach ($row as $v) {
				if ($line != '') $line .= $dividers[$i];
				$line .= $v;
			}
			$output .= $line . "\n";
			$i++;
		}

		return $output;
	}

	static private function fieldMaxLength($field, $data) {
		$s = 0;
		foreach ($data as $row) {
			$s = max(strlen($row[$field]), $s);
		}
		return $s;
	}

	static public function anythingToPublicArray($data) {
		$output = $data;

		if ($output instanceof Collection) $output = $output->all();

		if ($output instanceof BaseModel) {
			$output = $output->toPublicArray();
		} else if (is_array($output)) {
			foreach ($output as $k => $v) {
				$output[$k] = self::anythingToPublicArray($v);
			}
		}

		return $output;
	}

	// Note: this is used for both PATCH and PUT requests, so fields not
	// in the array must not be reset.
	public function fromPublicArray($array) {
		foreach ($array as $k => $v) {
			if (in_array($k, array('parent_id', 'client_id', 'item_id', 'user_id', 'owner_id'))) {
				$this->{$k} = self::unhex($v);
			} else if (static::isDiffableField($k)) {
				$this->setDiffableField($k, $v);
			} else {
				$this->{$k} = $v;
			}
		}
	}

	static public function dbValueToPublicValue($fieldName, $fieldValue) {
		if (static::isDiffableField($fieldName)) return (string)$fieldValue;
		if (!static::isValidField($fieldName)) throw new \Exception('Unknown field: ' . $fieldName);

		switch (static::$fields[$fieldName]['public']) {
			case 'string':
				return (string)$fieldValue;
				break;
			case 'int':
				return (int)$fieldValue;
				break;
			case 'bool':
				return $fieldValue === '1' || $fieldValue === 1 || $fieldValue === true;
				break;
		}

		return $fieldValue;
	}

	public function toPublicArray() {
		$output = $this->toArray();
		if ($this->useUuid) {
			$output['id'] = self::hex($output['id']);
		}

		if (!empty($output['parent_id'])) $output['parent_id'] = self::hex($output['parent_id']);
		if (!empty($output['owner_id'])) $output['owner_id'] = self::hex($output['owner_id']);
		if (!empty($output['client_id'])) $output['client_id'] = self::hex($output['client_id']);
		if (!empty($output['item_id'])) $output['item_id'] = self::hex($output['item_id']);
		if (!empty($output['user_id'])) $output['user_id'] = self::hex($output['user_id']);
		if (!empty($output['tag_id'])) $output['tag_id'] = self::hex($output['tag_id']);

		foreach ($output as $k => $v) {
			if (isset(static::$enums[$k])) {
				$output[$k] = static::enumName($k, $v);
			}
			$output[$k] = static::dbValueToPublicValue($k, $v);
		}

		if (isset($output['item_type'])) {
			$output['item_type'] = BaseItem::enumName('type', $output['item_type'], true);
		}

		foreach (static::$diffableFields as $field) {
			$output[$field] = $this->diffableField($field);
		}

		return $output;
	}

	public function idString() {
		return $this->useUuid ? self::hex($this->id) : (string)$this->id;
	}

	public function diffableField($fieldName) {
		if (array_key_exists($fieldName, $this->changedDiffableFields)) return $this->changedDiffableFields[$fieldName];
		return Change::fullFieldText($this->id, $fieldName);
	}

	static public function isDiffableField($fieldName) {
		return in_array($fieldName, static::$diffableFields);
	}

	public function setDiffableField($fieldName, $fieldValue) {
		if ($this->diffableField($fieldName) == $fieldValue) return;
		$this->changedDiffableFields[$fieldName] = $fieldValue;
	}

	static public function createId() {
		return openssl_random_pseudo_bytes(16);
	}

	static public function hex($id) {
		if (is_array($id)) {
			foreach ($id as $k => $v) {
				$id[$k] = self::hex($v);
			}
			return $id;
		}
		return bin2hex($id);
	}

	static public function unhex($s) {
		if (!strlen($s)) return null;

		if (is_array($s)) {
			foreach ($s as $k => $v) {
				$s[$k] = self::unhex($v);
			}
			return $s;
		}
		$output = @hex2bin($s);
		if ($output === false) return null;
		return $output;
	}

	public function owner() {
		if (!isset($this->owner_id)) return null;
		return User::find($this->owner_id);
	}

	static public function isValidField($f) {
		if (array_key_exists($f, static::$fields)) return true;
		if (static::isDiffableField($f)) return true;
		return false;
	}

	static public function filter($data, $keepId = false) {
		$output = array();
		foreach ($data as $k => $v) {
			if (!static::isValidField($k)) continue;
			$output[$k] = $v;
		}
		if (!$keepId) unset($output['id']);
		return $output;
	}

	public function validate() {
		$rules = static::$defaultValidationRules;
		$errors = array();
		
		foreach ($rules as $key => $keyRules) {
			foreach ($keyRules as $rule) {
				$ok = true;
				$message = null;
				switch ($rule['type']) {

					// Note: Cannot use property_exists() since all the key are retrieved via the magic
					// method __get() so `isset()` must be used instead. However it means that this:
					//    $user = new User();
					//    $user->email = null;
					//    isset($user->email)
					// returns false

					case 'required':

						if (!isset($this->{$key})) $ok = false;
						break;

					case 'notEmpty':

						if (isset($this->{$key}) && !strlen((string)$this->{$key})) $ok = false;
						break;

					case 'minLength':

						if (isset($this->{$key}) && strlen((string)$this->{$key}) < $rule['args'][0]) $ok = false;
						break;

					case 'maxLength':

						if (isset($this->{$key}) && strlen((string)$this->{$key}) > $rule['args'][0]) $ok = false;
						break;

					case 'function':

						$ok = call_user_func_array($rule['args'][0], array($key, $rule, $this));
						if (is_array($ok)) {
							$message = $ok['message'];
							$ok = $ok['valid'];
						}
						break;

					default:

						throw new \Exception(sprintf('unsupported validation rule: "%s"', $rule['name']));

				}

				if (!$ok) {
					$errors[] = array(
						'key' => $key,
						'type' => $rule['type'] == 'function' ? 'other' : $rule['type'],
						'message' => $message ? $message : static::validationMessage($key, $rule, $this),
					);
				}
			}
		}

		if (count($errors)) throw ValidationException::fromErrors($errors);
	}

	static public function validationMessage($key, $rule, $object) {
		$msg = static::$defaultValidationMessages[$rule['type']];
		if (isset($rule['message'])) $msg = $rule['message'];
		$msg = str_replace('{key}', $key, $msg);
		$msg = str_replace('{value}', isset($object->{$key}) ? $object->{$key} : '', $msg);
		$args = isset($rule['args']) ? $rule['args'] : array();
		for ($i = 0; $i < count($args); $i++) {
			$v = $args[$i];
			if (is_array($v)) $v = '';
			if (is_object($v) && !method_exists($v, '__toString')) $v = '';
			$v = (string)$v;
			$msg = str_replace(sprintf('{arg%s}', $i), $v, $msg);
		}
		return $msg;
	}

	static public function enumName($enumType, $enumId, $returnNullOnError = false) {
		foreach (static::$enums[$enumType] as $index => $name) {
			if ($index + 1 == $enumId) return $name;
		}
		if ($returnNullOnError) return null;
		throw new \Exception(sprintf('Invalid enum: %s/%s', $enumType, $enumId));
	}

	static public function enumId($enumType, $enumName, $returnNullOnError = false) {
		if (!isset(static::$enums[$enumType])) throw new \Exception(sprintf('Invalid enum type: %s', $enumType));
		foreach (static::$enums[$enumType] as $index => $name) {
			if ($name == $enumName) return $index + 1;
		}
		if ($returnNullOnError) return null;
		throw new \Exception(sprintf('Invalid enum: %s/%s', $enumType, $enumName));
	}

	// Allows caller to force the model to be detected as new,
	// even when the model already has an ID (to handle PUT
	// calls that manually set the ID).
	public function setIsNew($v) {
		$this->isNew = $v;
	}

	public function isNew() {
		return !$this->id || $this->isNew === true;
	}

	public function save(Array $options = array()) {
		$isNew = $this->isNew();

		if ($this->useUuid && $isNew && !$this->id) $this->id = self::createId();
		$this->updated_time = time(); // TODO: maybe only update if one of the fields, or if some of versioned data has changed
		if ($isNew) $this->created_time = time();

		if ($this->isVersioned) {
			$changedFields = array_merge($this->getDirty(), $this->changedDiffableFields);
			unset($changedFields['updated_time']);
		}

		$output = parent::save($options);

		$this->isNew = null;

		if ($this->isVersioned) {
			if (count($changedFields)) {
				$this->trackChanges($isNew ? 'create' : 'update', $changedFields);
			}
			$this->changedDiffableFields = array();
		}

		return $output;
	}

	public function delete() {
		$output = parent::delete();

		if (count($this->isVersioned)) {
			$this->trackChanges('delete');
		}

		return $output;
	}

	protected function trackChanges($type, $changedFields = array()) {
		if ($type == 'delete') {
			$change = $this->newChange($type);
			$change->save();
		} else if ($type == 'create' || $type == 'update') {
			// When recording a "create" event, we only record the diffable fields because the complete history
			// is required to build their value. There's no need to record the other fields since they are
			// new and the client needs to retrieve and save all of them.
			//
			// When recording an "update" event, all the modified fields, diffable or not, are recorded.
			foreach ($changedFields as $field => $value) {
				if ($type == 'create' && !in_array($field, static::$diffableFields)) continue;

				$change = $this->newChange($type);
				$change->item_field = $field;
				$change->previous_id = $this->revId;
				if (in_array($field, static::$diffableFields)) $change->createDelta($changedFields[$field]);
				$change->save();
			}
		} else {
			throw new \Exception('Unknown type: ' . $type);
		}
	}

	private function classItemTypeName() {
		$s = strtolower(get_called_class());
		$s = explode("\\", $s);
		return $s[count($s) - 1];
	}

	private function newChange($type) {
		if (static::clientId() === null) throw new \Exception('Client ID must be specified');

		$change = new Change();
		$change->user_id = $this->owner_id;
		$change->client_id = static::clientId();
		$change->item_type = BaseItem::enumId('type', $this->classItemTypeName());
		$change->type = Change::enumId('type', $type);
		$change->item_id = $this->id;
		return $change;
	}

	static public function byId($id) {
		$Class = get_called_class();
		return $Class::find($id);
		// $Class = get_called_class();
		// return $this->getOrSet($Class.$id, function() use($Class, $id) {
		// 	return $Class::find($id);
		// });
	}

}
