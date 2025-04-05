import { validate } from './ValidatedIntegerInput';
import Setting from '@joplin/lib/models/Setting';

describe('ValidatedIntegerInput', () => {
	test.each(
		['aaa', '1a1', '1a', '1.1', '1-1', '1-', '', null],
	)('should return error message for invalid value or empty value for setting without range', async (input) => {
		const md = Setting.settingMetadata('style.editor.contentMaxWidth');
		const value = validate(input, md, md.label());
		expect(value).toBe('Editor maximum width must be a valid whole number');
	});

	test.each(
		['aaa', '1a1', '1a', '1.1', '1-1', '1-', '', null],
	)('should return error message for invalid or empty value for setting with range', async (input) => {
		const md = Setting.settingMetadata('revisionService.ttlDays');
		const value = validate(input, md, md.label());
		expect(value).toBe('Keep note history for must be a valid whole number');
	});

	test.each(
		['0', '-1'],
	)('should return error message for too low integer values', async (input) => {
		const md = Setting.settingMetadata('revisionService.ttlDays');
		const value = validate(input, md, md.label());
		expect(value).toBe('Keep note history for cannot be less than 1');
	});

	test.each(
		['731', '1e20'],
	)('should return error message for too high integer values', async (input) => {
		const md = Setting.settingMetadata('revisionService.ttlDays');
		const value = validate(input, md, md.label());
		expect(value).toBe('Keep note history for cannot be greater than 730');
	});

	test.each(
		['-999999999999999', '0', '999999999999999', '0.0'],
	)('should return empty string for valid integer values for setting without range', async (input) => {
		const md = Setting.settingMetadata('style.editor.contentMaxWidth');
		const value = validate(input, md, md.label());
		expect(value).toBe('');
	});

	test.each(
		['1', '300', '730', '1.0'],
	)('should return empty string for valid integer values for setting with range', async (input) => {
		const md = Setting.settingMetadata('revisionService.ttlDays');
		const value = validate(input, md, md.label());
		expect(value).toBe('');
	});
});
