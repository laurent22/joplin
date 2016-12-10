<?php

namespace AppBundle;

use DiffMatchPatch\DiffMatchPatch;

class Diff {

	static private $dmp_ = null;

	static private function dmp() {
		if (self::$dmp_) return self::$dmp_;
		self::$dmp_ = new DiffMatchPatch();
		return self::$dmp_;
	}

	static public function diff($from, $to) {
		return self::dmp()->patch_toText(self::dmp()->patch_make($from, $to));
	}

	static public function patch($from, $diff) {
		return self::dmp()->patch_apply(self::dmp()->patch_fromText($diff), $from);
	}

	// Basically applies diff(orginal, mod1) to mod2. Note sure if this is really
	// equivalent to a three-way merge.
	static public function merge3($original, $modified1, $modified2) {
		$patches = self::dmp()->patch_make($original, $modified1);
		return self::dmp()->patch_apply($patches, $modified2);
	}


}