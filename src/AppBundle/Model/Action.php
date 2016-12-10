<?php

namespace AppBundle\Model;

class Action extends BaseModel {

	static protected $enums = array(
		'type' => array('create', 'update', 'delete'),
	);

	static public function actionsDoneAfterId($userId, $clientId, $actionId) {
		$limit = 100;
		$items = self::where('id', '>', $actionId)
		             ->where('user_id', '=', $userId)
		             ->where('client_id', '!=', $clientId)
		             ->orderBy('id')
		             ->limit($limit + 1)
		             ->get();
		$hasMore = $limit < count($items);
		if ($hasMore) array_pop($items);

		return array(
			'has_more' => $hasMore,
			'items' => $items,
		);
	}
	
}
