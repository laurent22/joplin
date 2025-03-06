import normalizeAccelerator from './normalizeAccelerator';
import { CodeMirrorVersion } from './types';

describe('normalizeAccelerator', () => {
	test.each([
		['Z', { v6: 'z', v5: 'Z' }],
		['Alt+A', { v6: 'Alt-a', v5: 'Alt-A' }],
		['Shift+A', { v6: 'Shift-a', v5: 'Shift-A' }],
		['Shift+Up', { v6: 'Shift-ArrowUp', v5: 'Shift-Up' }],
	])(
		'should convert single-letter key names to lowercase for CM6, keep case unchanged for CM5 (%j)',
		(original, expected) => {
			expect(normalizeAccelerator(
				original, CodeMirrorVersion.CodeMirror6,
			)).toBe(expected.v6);
			expect(normalizeAccelerator(
				original, CodeMirrorVersion.CodeMirror5,
			)).toBe(expected.v5);
		},
	);
});
