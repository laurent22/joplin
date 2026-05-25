// Based on @joplin/fork-uslug
//
// The original is Copyright (c) 2012 Jeremy Selier
//
// MIT Licensed
//
// You may find a copy of this license in the LICENSE file that should have been provided
// to you with a copy of this software.

import uslug from './uslug';
const word0 = 'Ελληνικά';
const word1 = [word0, word0].join('-');
const word2 = [word0, word0].join(' - ');

const tests: [string, string][] = [
	['', ''],
	['The \u212B symbol invented by A. J. \u00C5ngstr\u00F6m (1814, L\u00F6gd\u00F6, \u2013 1874) denotes the length 10\u207B\u00B9\u2070 m.', 'the-å-symbol-invented-by-a-j-ångström-1814-lögdö-1874-denotes-the-length-1010-m'],
	['Быстрее и лучше!', 'быстрее-и-лучше'],
	['xx x  - "#$@ x', 'xx-x-x'],
	['Bän...g (bang)', 'bäng-bang'],
	[word0, word0.toLowerCase()],
	[word1, word1.toLowerCase()],
	[word2, word1.toLowerCase()],
	['    a ', 'a'],
	['tags/', 'tags'],
	['y_u_no', 'y_u_no'],
	['el-ni\xf1o', 'el-ni\xf1o'],
	['x荿', 'x荿'],
	['ϧ΃蒬蓣', '\u03e7蒬蓣'],
	['¿x', 'x'],
	['汉语/漢語', '汉语漢語'],
	['فار,سي', 'فارسي'],
	['เแโ|ใไ', 'เแโใไ'],
	['日本語ドキュメンテ(ーション)', '日本語ドキュメンテーション'],
	['一二三四五六七八九十！。。。', '一二三四五六七八九十'],
	['संसद में काम नहीं तो वेतन क्यों?', 'संसद-में-काम-नहीं-तो-वेतन-क्यों'],
	['เร่งรัด \'ปรับเงินเดือนท้องถิ่น 1 ขั้น\' ตามมติ ครม.', 'เร่งรัด-ปรับเงินเดือนท้องถิ่น-1-ขั้น-ตามมติ-ครม'],
	['オバマ大統領が病院爆撃の調査へ同意するように、協力してください！', 'オバマ大統領が病院爆撃の調査へ同意するように-協力してください'],
	['일본정부 법무대신(法務大臣): 우리는 일본 입관법의 재검토를 요구한다!', '일본정부-법무대신法務大臣-우리는-일본-입관법의-재검토를-요구한다'],
	['😁', 'grin'],
	['😁a', 'grina'],
	['🐶🐶🐶🐱', 'dogdogdogcat'],
];
describe('uslug', () => {
	it.each(tests)('should convert %s to %s', (input, expected) => {
		expect(uslug(input)).toBe(expected);
	});
	it('should support "allowedChars"', () => {
		expect(uslug('qbc,fe', { allowedChars: 'q' })).toBe('qbcfe');
	});
});
