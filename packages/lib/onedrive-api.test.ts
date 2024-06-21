import OneDriveApi from './onedrive-api';

describe('onedrive-api', () => {
	test.each([
		[{ Authorization: 'testing' }, { Authorization: '[[DELETED]]' }],
		[{ headers: { Authorization: 'testing' } }, { headers: { Authorization: '[[DELETED]]' } }],
		[
			{ foo: { Authorization: 'testing', bar: 'test' }, baz: 'test2', Authorization: 'testing' },
			{ foo: { Authorization: '[[DELETED]]', bar: 'test' }, baz: 'test2', Authorization: '[[DELETED]]' },
		],
		[
			{ a: { b: { c: { d: { e: { f: { g: 'Test' } } } }, Authorization: 'bearer someidhere' } } },
			{ a: { b: { c: { d: { e: { f: '[[depth-exceeded]]' } } }, Authorization: '[[DELETED]]' } } },
		],
	])('authorizationTokenRemoved should remove Authorization field', (object, expected) => {
		const api = new OneDriveApi('testID', 'secret', true);
		expect(api.authorizationTokenRemoved(object)).toMatchObject(expected);
	});
});
