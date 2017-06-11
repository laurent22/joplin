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

	// Temporary fix to go around diffmatchpach bug:
	// https://github.com/yetanotherape/diff-match-patch/issues/9
	static private function encodingFix($s) {
		return $s;
		return iconv('UTF-8', 'ISO-8859-1//IGNORE', $s);
	}

	static public function decodeFix($s) {
		return $s;
		return iconv('ISO-8859-1', 'UTF-8', $s);
	}

	static public function diff($from, $to) {
		$from = self::encodingFix($from);
		$to = self::encodingFix($to);
		return self::dmp()->patch_toText(self::dmp()->patch_make($from, $to));
	}

	static public function patch($from, $diff) {
		$from = self::encodingFix($from);
		return self::dmp()->patch_apply(self::dmp()->patch_fromText($diff), $from);
	}

	// Basically applies diff(orginal, mod1) to mod2. Note sure if this is really
	// equivalent to a three-way merge.
	static public function merge3($original, $modified1, $modified2) {
		$patches = self::dmp()->patch_make($original, $modified1);
		return self::dmp()->patch_apply($patches, $modified2);
	}


}