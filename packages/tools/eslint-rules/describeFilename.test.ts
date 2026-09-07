import { RuleTester } from 'eslint';

const rule = require('./describeFilename');

// RuleTester emits its own describe/test blocks, so it must be called at the
// top level rather than from inside a test().
const ruleTester = new RuleTester({
	languageOptions: { ecmaVersion: 2021, sourceType: 'module' },
});

const filename = '/repo/packages/lib/models/Tag.test.ts';

ruleTester.run('describe-filename', rule, {
	valid: [
		// The file name, or any path suffix ending with it.
		{ code: 'describe(\'Tag\', () => {});', filename },
		{ code: 'describe(\'models/Tag\', () => {});', filename },
		{ code: 'describe(\'lib/models/Tag\', () => {});', filename },

		// Supported describe variants.
		{ code: 'describe.skip(\'Tag\', () => {});', filename },
		{ code: 'describe.only(\'Tag\', () => {});', filename },

		// describe.each builds the title from the test data, so a printf
		// placeholder or a $tag may follow the file name.
		{ code: 'describe.each([1])(\'Tag (%j)\', () => {});', filename },
		{ code: 'describe.each([1])(\'Tag $name\', () => {});', filename },
		{ code: 'describe.each`\\na\\n${1}\\n`(\'Tag $a\', () => {});', filename },

		// Nested describes are unrestricted.
		{ code: 'describe(\'Tag\', () => { describe(\'anything\', () => {}); });', filename },

		// Non-test files are not checked.
		{ code: 'describe(\'anything\', () => {});', filename: '/repo/packages/lib/models/Tag.ts' },
	],

	invalid: [
		{ code: 'describe(\'something\', () => {});', filename, errors: [{ messageId: 'mismatch' }] },
		{ code: 'describe(\'Tag rule\', () => {});', filename, errors: [{ messageId: 'mismatch' }] },
		{ code: 'describe(\'services/Tag\', () => {});', filename, errors: [{ messageId: 'mismatch' }] },
		{ code: 'describe.skip(\'nope\', () => {});', filename, errors: [{ messageId: 'mismatch' }] },
		{ code: 'describe.each([1])(\'nope (%j)\', () => {});', filename, errors: [{ messageId: 'mismatch' }] },
		{ code: 'describe.each`\\na\\n${1}\\n`(\'nope $a\', () => {});', filename, errors: [{ messageId: 'mismatch' }] },

		// Dynamic titles cannot be validated, so they are reported.
		{ code: 'describe(`Tag ${x}`, () => {});', filename, errors: [{ messageId: 'dynamic' }] },
		{ code: 'describe(title, () => {});', filename, errors: [{ messageId: 'dynamic' }] },
	],
});
